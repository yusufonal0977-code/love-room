// Admin odasında sesli konuşma: odadaki her admin diğerleriyle doğrudan (WebRTC, eşler arası) bağlanır.
//
// Sinyalleşme: admin/signal/{alıcı}/{id} = { from, t: 'offer'|'answer'|'ice', sdp | c, at }  (okununca silinir)
// Kimin teklif açacağı sabittir (uid'i küçük olan), böylece iki taraf aynı anda teklif yapmaz.
// Mikrofon evdeki mikrofon butonuna bağlıdır: oradan kapatınca adminler de duymaz.
import { ICE_SERVERS } from '../config.js';
import { db, ref, push, remove, onChildAdded, serverTimestamp, now } from '../fb.js';

export function createAdminVoice(ctx) {
  const { uid } = ctx;
  const peers = new Map(); // uid -> { pc, pending, audio, level }
  let mic = null, stopSig = null, muteTimer = null, joinedAt = 0, actx = null;
  const send = (to, msg) => push(ref(db, `admin/signal/${to}`), { ...msg, from: uid, at: serverTimestamp() }).catch(() => {});

  async function getMic() {
    if (mic) return mic;
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { mic = null; }
    return mic;
  }
  function meter(p, stream) {
    try {
      actx ??= new AudioContext();
      const an = actx.createAnalyser(); an.fftSize = 256;
      actx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => { if (!peers.has(p.id)) return; an.getByteFrequencyData(buf); p.level = buf.reduce((a, b) => a + b, 0) / buf.length; setTimeout(tick, 80); };
      tick();
    } catch { /* ses ölçümü desteklenmiyor */ }
  }
  function peer(id) {
    let p = peers.get(id);
    if (p) return p;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const audio = new Audio(); audio.autoplay = true; audio.playsInline = true;
    p = { id, pc, pending: [], audio, level: 0 };
    peers.set(id, p);
    mic?.getTracks().forEach((tr) => pc.addTrack(tr, mic));
    if (!mic) pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.onicecandidate = (e) => e.candidate && send(id, { t: 'ice', c: e.candidate.toJSON() });
    pc.ontrack = (e) => { audio.srcObject = e.streams[0] || new MediaStream([e.track]); audio.play().catch(() => {}); meter(p, audio.srcObject); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') { close(id); setTimeout(() => sync(lastIds), 1500); } // yeniden dene
    };
    return p;
  }
  async function offer(id) {
    const p = peer(id);
    const o = await p.pc.createOffer();
    await p.pc.setLocalDescription(o);
    send(id, { t: 'offer', sdp: o.sdp });
  }
  async function onSignal(m) {
    if (!m?.from || (m.at || 0) < joinedAt - 5000) return;
    const p = peer(m.from);
    try {
      if (m.t === 'offer') {
        await p.pc.setRemoteDescription({ type: 'offer', sdp: m.sdp });
        const a = await p.pc.createAnswer();
        await p.pc.setLocalDescription(a);
        send(m.from, { t: 'answer', sdp: a.sdp });
        flush(p);
      } else if (m.t === 'answer') { await p.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }); flush(p); }
      else if (m.t === 'ice') { if (p.pc.remoteDescription) await p.pc.addIceCandidate(m.c); else p.pending.push(m.c); }
    } catch (e) { console.warn('admin ses', e); }
  }
  function flush(p) { p.pending.splice(0).forEach((c) => p.pc.addIceCandidate(c).catch(() => {})); }
  function close(id) { const p = peers.get(id); if (!p) return; p.pc.close(); p.audio.srcObject = null; peers.delete(id); }

  /** Odadaki adminler değişince: yenilere bağlan (uid'i küçük olan teklif açar), gidenleri kapat. */
  let lastIds = [];
  function sync(ids) {
    lastIds = ids;
    if (!stopSig) return;
    for (const id of [...peers.keys()]) if (!ids.includes(id)) close(id);
    for (const id of ids) if (!peers.has(id) && uid < id) offer(id).catch(() => {});
  }
  async function join() {
    if (stopSig) return;
    joinedAt = now();
    await getMic();
    stopSig = onChildAdded(ref(db, `admin/signal/${uid}`), (s) => { const m = s.val(); remove(s.ref).catch(() => {}); onSignal(m); }, () => {});
    // Mikrofon evdeki mikrofon butonunu izler
    muteTimer = setInterval(() => { const on = !!ctx.call?.micOn; mic?.getAudioTracks().forEach((tr) => (tr.enabled = on)); }, 400);
    sync(lastIds);
  }
  function leave() {
    stopSig?.(); stopSig = null; clearInterval(muteTimer);
    for (const id of [...peers.keys()]) close(id);
    mic?.getTracks().forEach((tr) => tr.stop()); mic = null;
  }
  return { join, leave, sync, talking: (id) => (peers.get(id)?.level || 0) > 18, connected: () => [...peers.values()].filter((p) => p.pc.connectionState === 'connected').length };
}
