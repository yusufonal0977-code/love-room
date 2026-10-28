// Küçük pencere modu: başka bir şeyle uğraşırken ev (ve partnerin) ekranın köşesinde kalsın.
// Chrome/Edge (bilgisayar): gerçek küçük pencere (Document Picture-in-Picture) — içinde oda, partnerin
// kamerası, mikrofon ve kalp düğmesi. Diğer tarayıcılar: video resim-içinde-resim (oda görüntüsü).
import { h, icon, toast } from '../ui.js';

export function createPip(ctx) {
  const { game } = ctx;
  let win = null, timer = null, vid = null;

  async function openDoc() {
    win = await window.documentPictureInPicture.requestWindow({ width: 380, height: 360 });
    const d = win.document;
    d.head.append(h('style', {}, `
      body{margin:0;background:#000;color:#fff6d8;font-family:system-ui,sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
      canvas{flex:1;min-height:0;width:100%;object-fit:contain;image-rendering:pixelated}
      .row{display:flex;gap:6px;padding:6px;justify-content:center;background:#15120b}
      button{background:#221d13;color:#fff6d8;border:2px solid #3a3320;border-radius:10px;width:44px;height:40px;display:grid;place-items:center;cursor:pointer}
      button.off{opacity:.5} svg{width:22px;height:22px}
      video{position:absolute;right:8px;top:8px;width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid #fcdf4b}`));
    const c = d.createElement('canvas');
    c.width = 192 * 2; c.height = 144 * 2;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const v = d.createElement('video');
    v.autoplay = v.playsInline = v.muted = true;
    const mic = h('button', { title: 'Mikrofon', html: icon(ctx.call.micOn ? 'mic' : 'micOff') });
    mic.onclick = () => { ctx.toggleMic(); mic.innerHTML = icon(ctx.call.micOn ? 'mic' : 'micOff'); };
    const heart = h('button', { title: 'Kalp', html: icon('heart'), onclick: () => ctx.react('heart') });
    const back = h('button', { title: 'Geri dön', html: icon('full'), onclick: () => win.close() });
    d.body.append(c, v, h('div', { class: 'row' }, mic, heart, back));
    const draw = () => {
      g.drawImage(game.canvas, 0, 0, c.width, c.height);
      const s = ctx.call.remote.cam;
      v.style.display = s.getVideoTracks().length && ctx.partnerCam() ? '' : 'none';
      if (v.srcObject !== s) v.srcObject = s;
    };
    // Ana sekme arka planda kalsa da oyun bu pencerenin karesiyle çizilsin
    game.setRaf((f) => win.requestAnimationFrame(f));
    ctx.onFrame = draw;
    win.addEventListener('pagehide', () => { game.setRaf(null); ctx.onFrame = null; win = null; });
  }

  async function openVideo() {
    // Partnerin kamerası açıksa onu, değilse odanın görüntüsünü küçük pencerede göster
    vid ??= Object.assign(document.createElement('video'), { muted: true, playsInline: true });
    const cam = ctx.call.remote.cam;
    if (cam.getVideoTracks().length && ctx.partnerCam()) vid.srcObject = cam;
    else {
      const c = document.createElement('canvas');
      c.width = 384; c.height = 288;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      clearInterval(timer);
      timer = setInterval(() => g.drawImage(game.canvas, 0, 0, c.width, c.height), 66);
      vid.srcObject = c.captureStream(15);
    }
    await vid.play();
    await vid.requestPictureInPicture();
    vid.addEventListener('leavepictureinpicture', () => clearInterval(timer), { once: true });
  }

  return {
    get supported() { return 'documentPictureInPicture' in window || !!document.pictureInPictureEnabled; },
    async toggle() {
      try {
        if (win) { win.close(); return; }
        if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return; }
        if ('documentPictureInPicture' in window) await openDoc();
        else if (document.pictureInPictureEnabled) await openVideo();
        else toast('Bu tarayıcı küçük pencere modunu desteklemiyor.');
      } catch (e) { console.warn(e); toast('Küçük pencere açılamadı.'); }
    },
  };
}
