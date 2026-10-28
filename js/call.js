// Sesli/görüntülü sohbet (WebRTC, eşler arası). Sinyalleşme Firebase üzerinden.
//
// İki kişi de odadayken bağlantı kendiliğinden kurulur (konuşma her zaman açık bir oda gibi).
// Bağlantıda baştan dört kanal açılır: mikrofon, kamera, ekran görüntüsü ve ekran sesi. Kamerayı/ekranı
// açıp kapatmak yeniden anlaşma gerektirmez; sadece o kanaldaki parça değişir.
// Farklı ağlarda (mobil veri, sıkı modemler) bağlantı config.js'teki TURN sunucusu üzerinden geçer.
import { ICE_SERVERS } from './config.js';

const SLOTS = ['audio', 'cam', 'screen', 'screenAudio'];

/** Tarayıcı hatasını kullanıcıya anlaşılır bir cümleye çevirir. */
export function mediaError(e, what) {
  const n = e?.name || '';
  if (!window.isSecureContext) return `${what} sadece https adresinde çalışır.`;
  if (n === 'NotAllowedError' || n === 'SecurityError') return `${what} izni verilmedi. Adres çubuğundaki kilit 🔒 simgesinden izin verip sayfayı yenile.`;
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return `${what} bulunamadı.`;
  if (n === 'NotReadableError' || n === 'AbortError') return `${what} başka bir uygulama tarafından kullanılıyor (Zoom, Discord vb. kapat).`;
  return `${what} açılamadı.`;
}

export function createCall({ uid, send, onRemote, onState }) {
  let pc = null, partner = null, pendingIce = [];
  let mic = null, cam = null, screen = null;
  let discT = null;
  const remote = Object.fromEntries(SLOTS.map((s) => [s, new MediaStream()]));
  const levels = { me: 0, partner: 0 };
  const status = { mic: 'unknown', micError: '', connection: 'idle', route: '' };
  let audioCtx = null;
  const emit = (patch) => { Object.assign(status, patch); onState?.({ ...status, ...patch }); };

  async function getMic() {
    if (mic) return mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      meter('me', mic);
      emit({ mic: 'ok', micError: '' });
      if (pc) await attachTracks();
    } catch (e) {
      mic = null;
      emit({ mic: 'error', micError: mediaError(e, 'Mikrofon') });
    }
    return mic;
  }

  /** Ses seviyesi: konuşan kişinin isminin yanında dalga gösterilir. */
  const meters = {};
  function meter(who, stream) {
    try {
      audioCtx ??= new AudioContext();
      meters[who]?.disconnect();
      const src = audioCtx.createMediaStreamSource(stream);
      const an = audioCtx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      meters[who] = src;
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        if (meters[who] !== src) return;
        an.getByteFrequencyData(buf);
        let sum = 0;
        for (const v of buf) sum += v;
        levels[who] = sum / buf.length;
        setTimeout(tick, 60); // rAF değil: sekme arka planda da çalışsın
      };
      tick();
    } catch { /* ses ölçümü desteklenmiyor */ }
  }

  function newPeer() {
    pc?.close();
    pendingIce = [];
    pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const me = pc;
    pc.onicecandidate = (e) => e.candidate && me === pc && send(partner, { t: 'ice', c: e.candidate.toJSON() });
    pc.ontrack = (e) => {
      const slot = SLOTS[+e.transceiver.mid] ?? 'screen';
      const st = remote[slot];
      st.getTracks().forEach((t) => st.removeTrack(t));
      st.addTrack(e.track);
      if (slot === 'audio') meter('partner', st);
      onRemote?.(slot, st);
    };
    pc.onconnectionstatechange = () => {
      if (me !== pc) return;
      const s = pc.connectionState;
      emit({ connection: s });
      clearTimeout(discT);
      if (s === 'connected') routeInfo();
      if (s === 'failed') reconnect();
      // Kısa kopmalar kendiliğinden düzelir; 5 sn'den uzunsa yeniden kur.
      if (s === 'disconnected') discT = setTimeout(() => pc?.connectionState === 'disconnected' && reconnect(), 5000);
    };
    return pc;
  }

  /** Bağlantı doğrudan mı yoksa TURN aktarıcısıyla mı kuruldu (tanı penceresi için). */
  async function routeInfo() {
    try {
      const stats = await pc.getStats();
      let pair = null;
      stats.forEach((r) => { if (r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected)) pair = r; });
      const local = pair && stats.get(pair.localCandidateId);
      emit({ route: local?.candidateType === 'relay' ? 'aktarıcı (TURN)' : local ? 'doğrudan' : '' });
    } catch { /* yok say */ }
  }

  const isOfferer = () => partner && uid < partner;

  async function attachTracks() {
    if (!pc) return;
    const tr = pc.getTransceivers();
    const tracks = [mic?.getAudioTracks()[0], cam?.getVideoTracks()[0], screen?.getVideoTracks()[0], screen?.getAudioTracks()[0]];
    for (let i = 0; i < 4; i++) if (tr[i]) await tr[i].sender.replaceTrack(tracks[i] ?? null).catch(() => {});
    // Film kalitesi: ekran paylaşımına yüksek bit hızı
    if (tr[2] && screen) {
      try {
        const p = tr[2].sender.getParameters();
        p.encodings = p.encodings?.length ? p.encodings : [{}];
        p.encodings[0].maxBitrate = 6_000_000;
        p.encodings[0].maxFramerate = 30;
        p.degradationPreference = 'maintain-framerate';
        await tr[2].sender.setParameters(p);
      } catch { /* bazı tarayıcılar desteklemez */ }
    }
  }

  async function restart() {
    if (!partner) return;
    newPeer();
    emit({ connection: 'connecting' });
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('video', { direction: 'sendrecv' });
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    await attachTracks();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    send(partner, { t: 'offer', sdp: offer.sdp });
  }

  function reconnect() {
    if (!partner) return;
    if (isOfferer()) restart();
    else send(partner, { t: 'hello', force: true });
  }

  async function onSignal(msg) {
    try {
      await handle(msg);
    } catch (e) {
      // Eski bir teklife gelen geç cevap vb.: yok say; bağlantı yeni teklifle kurulur.
      console.debug('sinyal yok sayıldı', e);
    }
  }

  async function handle(msg) {
    if (msg.from !== partner) return;
    if (msg.t === 'offer') {
      newPeer();
      emit({ connection: 'connecting' });
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      pc.getTransceivers().forEach((t) => (t.direction = 'sendrecv'));
      await attachTracks();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send(partner, { t: 'answer', sdp: answer.sdp });
      flush();
    } else if (msg.t === 'answer' && pc && pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
      flush();
    } else if (msg.t === 'ice') {
      if (pc?.remoteDescription) await pc.addIceCandidate(msg.c).catch(() => {});
      else pendingIce.push(msg.c);
    } else if (msg.t === 'hello' && isOfferer() && (msg.force || !pc || ['failed', 'closed', 'disconnected'].includes(pc.connectionState) || !pc.remoteDescription)) {
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
    status,
    getMic,
    onSignal,
    reconnect,
    /** Tarayıcıların otomatik ses engelini aşmak için bir dokunuşla çağrılır. */
    unlock() { audioCtx?.state === 'suspended' && audioCtx.resume(); },
    /** Partner odaya girdi/çıktı. */
    async setPartner(p) {
      if (p === partner) return;
      partner = p;
      if (!p) { pc?.close(); pc = null; emit({ connection: 'idle', route: '' }); return; }
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
        try { cam = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' } }); }
        catch (e) { onState?.({ ...status, camError: mediaError(e, 'Kamera') }); return false; }
      }
      await attachTracks();
      return !!cam;
    },
    get camStream() { return cam; },
    get canShareScreen() { return !!navigator.mediaDevices?.getDisplayMedia; },
    async toggleScreen() {
      if (screen) {
        screen.getTracks().forEach((t) => t.stop());
        screen = null;
      } else {
        try {
          // Film için: 1080p/30fps, sekme/sistem sesi dahil, hareket öncelikli kodlama
          screen = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            systemAudio: 'include',
            selfBrowserSurface: 'exclude',
          });
          const v = screen.getVideoTracks()[0];
          if (v) { v.contentHint = 'motion'; v.onended = () => { screen = null; attachTracks(); onState?.({ ...status, screen: false }); }; }
          const a = screen.getAudioTracks()[0];
          if (a) a.contentHint = 'music';
          if (!a) onState?.({ ...status, screenNoAudio: true });
        } catch { return false; }
      }
      await attachTracks();
      return !!screen;
    },
    get screenStream() { return screen; },
    /** Hazır bir akışı TV kanalından gönderir (telefondan video dosyası ya da arka kamera). null → durdur. */
    async useStream(stream) {
      if (screen && screen !== stream) screen.getTracks().forEach((t) => t.stop());
      screen = stream || null;
      const v = stream?.getVideoTracks()[0];
      if (v) {
        v.contentHint = 'motion';
        v.addEventListener('ended', () => { if (screen === stream) { screen = null; attachTracks(); onState?.({ ...status, screen: false }); } });
      }
      await attachTracks();
      return !!screen;
    },
  };
}
