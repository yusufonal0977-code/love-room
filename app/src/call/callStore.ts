import { Platform } from 'react-native';
import { create } from 'zustand';
import type { CallKind, CallSignal } from '@loveroom/shared';
import { getSocket } from '../sync/socket';

/**
 * Sesli/görüntülü arama (WebRTC, eşler arası). Sunucu yalnızca sinyal mesajlarını iletir;
 * ses ve görüntü doğrudan iki tarayıcı arasında akar.
 *
 * Akış: arayan "ring" → aranan kabul eder ("accept") → arayan "offer" → aranan "answer"
 * → iki taraf ICE adaylarını takas eder → bağlantı kurulur.
 *
 * Not: Sadece STUN kullanılıyor. Bazı kurumsal/mobil ağlarda bağlantı için TURN sunucusu
 * gerekir (ör. Twilio, Metered, kendi coturn kurulumunuz) — ICE_SERVERS'a eklenir.
 */
const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const RING_TIMEOUT_MS = 35_000;

export type CallStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active';

interface CallState {
  status: CallStatus;
  kind: CallKind;
  peerId: string | null;
  local: MediaStream | null;
  remote: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  startedAt: number | null;
  /** Kısa süreli bilgi mesajı ("Cevap gelmedi" vb.). */
  notice: string | null;
}

const initial: CallState = {
  status: 'idle',
  kind: 'video',
  peerId: null,
  local: null,
  remote: null,
  micOn: true,
  camOn: true,
  startedAt: null,
  notice: null,
};

export const useCall = create<CallState>(() => initial);
const set = useCall.setState;
const get = useCall.getState;

/** Şimdilik web'de: mobil için react-native-webrtc içeren bir development build gerekir. */
export const callSupported = () =>
  Platform.OS === 'web' &&
  typeof RTCPeerConnection !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia;

let pc: RTCPeerConnection | null = null;
let pendingIce: RTCIceCandidateInit[] = [];
let ringTimer: ReturnType<typeof setTimeout> | null = null;

const send = (s: CallSignal) => getSocket()?.emit('call:signal', s);

function getMedia(kind: CallKind) {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
    video: kind === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
  });
}

function mediaError(e: unknown) {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError') return 'Kamera/mikrofon izni verilmedi.';
  if (name === 'NotFoundError') return 'Kamera ya da mikrofon bulunamadı.';
  return 'Kamera/mikrofon açılamadı.';
}

export async function startCall(kind: CallKind) {
  if (!callSupported() || get().status !== 'idle') return;
  set({ ...initial, status: 'outgoing', kind });
  try {
    const local = await getMedia(kind);
    if (get().status !== 'outgoing') return stopStream(local);
    set({ local, micOn: true, camOn: kind === 'video' });
  } catch (e) {
    return endCall(mediaError(e));
  }
  send({ type: 'ring', kind });
  ringTimer = setTimeout(() => {
    if (get().status !== 'outgoing') return;
    send({ type: 'hangup' });
    endCall('Cevap gelmedi. Belki sonra 💌');
  }, RING_TIMEOUT_MS);
}

export async function acceptCall() {
  const { status, kind } = get();
  if (status !== 'incoming') return;
  set({ status: 'connecting' });
  try {
    const local = await getMedia(kind);
    set({ local, micOn: true, camOn: kind === 'video' });
  } catch (e) {
    send({ type: 'decline' });
    return endCall(mediaError(e));
  }
  // Aranan taraf bağlantıyı önceden hazırlar; teklif (offer) gelince hemen cevaplar.
  createPeer();
  send({ type: 'accept' });
}

export function declineCall() {
  if (get().status !== 'incoming') return;
  send({ type: 'decline' });
  endCall(null);
}

export function hangUp() {
  if (get().status === 'idle') return;
  send({ type: 'hangup' });
  endCall(null);
}

export async function handleSignal(s: CallSignal, from: string) {
  const status = get().status;
  try {
    switch (s.type) {
      case 'ring':
        if (status !== 'idle') return void send({ type: 'busy' });
        set({ ...initial, status: 'incoming', kind: s.kind, peerId: from });
        return;
      case 'accept': {
        if (status !== 'outgoing') return;
        clearRing();
        set({ status: 'connecting', peerId: from });
        const p = createPeer();
        const offer = await p.createOffer();
        await p.setLocalDescription(offer);
        send({ type: 'offer', sdp: offer.sdp ?? '' });
        return;
      }
      case 'offer': {
        if (!pc) return;
        await pc.setRemoteDescription({ type: 'offer', sdp: s.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'answer', sdp: answer.sdp ?? '' });
        flushIce();
        return;
      }
      case 'answer':
        if (!pc) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: s.sdp });
        flushIce();
        return;
      case 'ice':
        if (pc?.remoteDescription) await pc.addIceCandidate(s.candidate).catch(() => {});
        else pendingIce.push(s.candidate);
        return;
      case 'decline':
        if (status === 'outgoing') endCall('Şu an açamıyor.');
        return;
      case 'busy':
        if (status === 'outgoing') endCall('Şu an meşgul.');
        return;
      case 'hangup':
        if (status !== 'idle') endCall(status === 'incoming' ? 'Cevapsız arama 💌' : 'Arama sona erdi.');
        return;
    }
  } catch {
    send({ type: 'hangup' });
    endCall('Bağlantı kurulamadı.');
  }
}

function createPeer() {
  pc?.close();
  pendingIce = [];
  const p = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const local = get().local;
  local?.getTracks().forEach((t) => p.addTrack(t, local));

  p.onicecandidate = (e) => {
    if (!e.candidate) return;
    send({
      type: 'ice',
      candidate: { candidate: e.candidate.candidate, sdpMid: e.candidate.sdpMid, sdpMLineIndex: e.candidate.sdpMLineIndex },
    });
  };
  p.ontrack = (e) => set({ remote: e.streams[0] ?? new MediaStream([e.track]) });
  p.onconnectionstatechange = () => {
    if (p !== pc) return;
    if (p.connectionState === 'connected' && get().status !== 'active') set({ status: 'active', startedAt: Date.now() });
    if (p.connectionState === 'failed') {
      send({ type: 'hangup' });
      endCall('Bağlantı kurulamadı. Ağınız doğrudan bağlantıyı engelliyor olabilir.');
    }
  };
  pc = p;
  return p;
}

function flushIce() {
  const queued = pendingIce;
  pendingIce = [];
  queued.forEach((c) => pc?.addIceCandidate(c).catch(() => {}));
}

function clearRing() {
  if (ringTimer) clearTimeout(ringTimer);
  ringTimer = null;
}

function stopStream(s: MediaStream | null) {
  s?.getTracks().forEach((t) => t.stop());
}

/** Aramayı yerelde kapatır (karşı tarafa haber vermez). */
export function endCall(notice: string | null) {
  clearRing();
  pc?.close();
  pc = null;
  pendingIce = [];
  stopStream(get().local);
  set({ ...initial, notice });
  if (notice) setTimeout(() => get().notice === notice && set({ notice: null }), 4500);
}

export function toggleMic() {
  const { local, micOn } = get();
  local?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
  set({ micOn: !micOn });
}

export function toggleCam() {
  const { local, camOn } = get();
  local?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
  set({ camOn: !camOn });
}
