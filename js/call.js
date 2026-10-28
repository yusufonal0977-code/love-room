// Sesli/görüntülü sohbet (WebRTC, eşler arası). Sinyalleşme Firebase üzerinden.
//
// İki kişi de odadayken bağlantı kendiliğinden kurulur (konuşma her zaman açık bir oda gibi).
// Bağlantıda baştan üç kanal açılır: ses, kamera ve ekran paylaşımı. Kamerayı/ekranı açıp kapatmak
// yeniden anlaşma gerektirmez; sadece o kanaldaki görüntü değişir.
import { ICE_SERVERS } from './config.js';

export function createCall({ uid, send, onRemote, onState }) {
  let pc = null, partner = null, pendingIce = [];
  let mic = null, cam = null, screen = null;
  const remote = { audio: new MediaStream(), cam: new MediaStream(), screen: new MediaStream() };
  const levels = { me: 0, partner: 0 };
  let audioCtx = null;

  async function getMic() {
    if (mic) return mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      meter('me', mic);
    } catch {
      mic = null;
      onState?.({ micError: true });
    }
    return mic;
  }

  /** Ses seviyesi: konuşan kişinin isminin yanında dalga gösterilir. */
  function meter(who, stream) {
    try {
      audioCtx ??= new AudioContext();
      const src = audioCtx.createMediaStreamSource(stream);
      const an = audioCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        let sum = 0;
        for (const v of buf) sum += v;
        levels[who] = sum / buf.length;
        requestAnimationFrame(tick);
      };
      tick();
    } catch { /* ses ölçümü desteklenmiyor */ }
  }

  function newPeer() {
    pc?.close();
    pendingIce = [];
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pc.onicecandidate = (e) => e.candidate && send(partner, { t: 'ice', c: e.candidate.toJSON() });
    pc.ontrack = (e) => {
      const slot = e.transceiver.mid === '0' ? 'audio' : e.transceiver.mid === '1' ? 'cam' : 'screen';
      remote[slot].getTracks().forEach((t) => remote[slot].removeTrack(t));
      remote[slot].addTrack(e.track);
      if (slot === 'audio') meter('partner', remote.audio);
      onRemote?.(slot, remote[slot]);
    };
    pc.onconnectionstatechange = () => {
      onState?.({ connection: pc.connectionState });
      if (pc.connectionState === 'failed' && isOfferer()) restart();
    };
    return pc;
  }

  const isOfferer = () => partner && uid < partner;

  async function attachTracks() {
    const tr = pc.getTransceivers();
    await tr[0]?.sender.replaceTrack(mic?.getAudioTracks()[0] ?? null);
    await tr[1]?.sender.replaceTrack(cam?.getVideoTracks()[0] ?? null);
    await tr[2]?.sender.replaceTrack(screen?.getVideoTracks()[0] ?? null);
  }

  async function restart() {
    if (!partner) return;
    newPeer();
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    await attachTracks();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send(partner, { t: 'offer', sdp: offer.sdp });
  }

  async function onSignal(msg) {
    try {
      await handle(msg);
    } catch {
      // Eski bir teklife gelen geç cevap vb.: yok say; bağlantı yeni teklifle kurulur.
    }
  }

  async function handle(msg) {
    if (msg.from !== partner) return;
    if (msg.t === 'offer') {
      newPeer();
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      pc.getTransceivers().forEach((t) => (t.direction = 'sendrecv'));
      await attachTracks();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send(partner, { t: 'answer', sdp: answer.sdp });
      flush();
    } else if (msg.t === 'answer' && pc) {
      await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      flush();
    } else if (msg.t === 'ice') {
      if (pc?.remoteDescription) await pc.addIceCandidate(msg.c).catch(() => {});
      else pendingIce.push(msg.c);
    } else if (msg.t === 'hello' && isOfferer() && (!pc || ['failed', 'closed', 'disconnected'].includes(pc.connectionState) || !pc.remoteDescription)) {
      restart();
    }
  }
  function flush() {
    const q = pendingIce;
    pendingIce = [];
    q.forEach((c) => pc.addIceCandidate(c).catch(() => {}));
  }

  return {
    levels,
    remote,
    getMic,
    onSignal,
    /** Partner odaya girdi/çıktı. */
    async setPartner(p) {
      if (p === partner) return;
      partner = p;
      if (!p) { pc?.close(); pc = null; onState?.({ connection: 'closed' }); return; }
      await getMic();
      if (isOfferer()) restart();
      else send(partner, { t: 'hello' }); // teklifçi tarafı uyandır
    },
    get micOn() { return !!mic?.getAudioTracks()[0]?.enabled; },
    toggleMic() {
      const t = mic?.getAudioTracks()[0];
      if (t) t.enabled = !t.enabled;
      return !!t?.enabled;
    },
    async toggleCam() {
      if (cam) {
        cam.getTracks().forEach((t) => t.stop());
        cam = null;
      } else {
        try { cam = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } }); }
        catch { onState?.({ camError: true }); return false; }
      }
      if (pc) await attachTracks();
      return !!cam;
    },
    get camStream() { return cam; },
    async toggleScreen() {
      if (screen) {
        screen.getTracks().forEach((t) => t.stop());
        screen = null;
      } else {
        try {
          screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          screen.getVideoTracks()[0].onended = () => { screen = null; if (pc) attachTracks(); onState?.({ screen: false }); };
        } catch { return false; }
      }
      if (pc) await attachTracks();
      return !!screen;
    },
    get screenStream() { return screen; },
  };
}
