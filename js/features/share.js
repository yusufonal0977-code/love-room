// Paylaşım kartları: evde yaptıklarınızı hazır şablonlarla görsele çevirip Instagram/TikTok/WhatsApp'ta paylaşın.
// Hikâye (1080×1920) ya da kare (1080×1080); üç şablon; altta getloveroom.com ve #GetLoveRoom.
import { h, icon, openSheet, toast, loadImg, saveImage } from '../ui.js';
import { t } from '../i18n.js';
import { petSprites, drawPetAcc } from '../art.js';
import { APP_URL } from '../config.js';

const TEMPLATES = {
  night: { name: 'Gece', bg: ['#0d0b1a', '#2a1f4d'], ink: '#fff6d8', accent: '#fcdf4b', soft: 'rgba(255,246,216,.6)', deco: 'stars' },
  pastel: { name: 'Pastel', bg: ['#ffd6e5', '#fff1c9'], ink: '#3a2418', accent: '#ff4f7b', soft: 'rgba(58,36,24,.6)', deco: 'hearts' },
  sunset: { name: 'Gün batımı', bg: ['#ff8a4c', '#5b3a8a'], ink: '#fff6e6', accent: '#ffe08a', soft: 'rgba(255,246,230,.75)', deco: 'sun' },
};
const FORMATS = { story: [1080, 1920], square: [1080, 1080] };
const FONT = "'Pixelify Sans', 'Tajawal', system-ui, sans-serif";

export function createShare(ctx) {
  const { game } = ctx;
  let kind = 'room', tpl = 'night', fmt = 'story';

  const names = () => {
    const meMoon = ctx.mySide() === 'moon';
    const a = `☀️ ${meMoon ? ctx.partnerName() : ctx.myName()}`, b = `🌙 ${meMoon ? ctx.myName() : ctx.partnerName()}`;
    return `${a}  &  ${b}`;
  };

  /** Her paylaşım türü: başlık, alt yazı, ana görsel çizimi ve hazır açıklama. */
  const KINDS = {
    room: { label: 'Evimiz', async make() {
      const src = game.canvas;
      return { title: t('Bizim küçük evimiz'), sub: names(), image: src, pixel: true, caption: t('Kilometreler arada, aynı odadayız 💞') };
    } },
    days: { label: 'Gün sayacı', async make() {
      const s = ctx.life.since();
      if (!s) return { error: t('Önce İlişki saatinden sevgili olduğunuz günü girin.') };
      return { title: t('Birlikte'), big: String(s.total), sub: t('gündür sevgiliyiz 💞'), sub2: names(), caption: t('Birlikte {n}. günümüz 💞', { n: s.total }) };
    } },
    jar: { label: 'Kavanoz cevabı', async make() {
      const j = ctx.life.jarNow();
      if (!j) return { error: t('Önce ikiniz de kavanozdaki bir soruyu cevaplayın.') };
      return { title: t('Soru kavanozu'), quote: t(j.q), answers: [[ctx.myName(), j.mine], [ctx.partnerName(), j.theirs]], caption: t('Birbirimize sorduk 🫙') };
    } },
    pet: { label: 'Evcil dostumuz', async make() {
      const p = ctx.care.petNow();
      const sp = petSprites(p.species, p.color);
      const c = document.createElement('canvas');
      c.width = 40; c.height = 26;
      const g = c.getContext('2d');
      const img = sp.right[0], x0 = Math.round(20 - img.width / 2), y0 = 24 - img.height;
      g.drawImage(img, x0, y0);
      if (p.acc !== 'none') drawPetAcc(g, p.acc, x0 + sp.head[0][0], y0 + sp.head[0][1]);
      return { title: t('Evcil dostumuz'), image: c, pixel: true, transparent: true, sub: p.name, sub2: names(), caption: t('Ailemizin minik üyesi: {name} 🐾', { name: p.name }) };
    } },
    badges: { label: 'Rozetlerimiz', async make() {
      const list = ctx.care.unlockedBadges();
      if (!list.length) return { error: t('Henüz rozetiniz yok. Birlikte vakit geçirdikçe açılır.') };
      return { title: t('Rozetlerimiz'), badges: list.slice(0, 9), sub2: names(), caption: t('{n} rozet topladık 🏅', { n: list.length }) };
    } },
    photo: { label: 'Son fotoğrafımız', async make() {
      const it = await ctx.photos.latest();
      if (!it) return { error: t('Albüm boş. Önce kabinde bir şerit çekin.') };
      return { title: it.title || t('Bir anımız'), image: await loadImg(it.img), sub2: names(), caption: t('Uzaktan ama birlikte 📸') };
    } },
    drawing: { label: 'Çizimimiz', async make() {
      const d = ctx.draw.snapshot();
      if (!d) return { error: t('Şövale boş. Önce birlikte bir şey çizin.') };
      return { title: t('Birlikte çizdik'), image: await loadImg(d), framed: true, sub2: names(), caption: t('İki kişilik bir resim 🎨') };
    } },
  };

  // ---------- Çizim ----------
  function wrap(g, text, x, y, maxW, lh, maxLines = 6) {
    const words = String(text).split(/\s+/);
    let line = '', lines = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    lines = lines.slice(0, maxLines);
    lines.forEach((l, i) => g.fillText(l, x, y + i * lh));
    return lines.length * lh;
  }
  function deco(g, T, W, H) {
    g.save();
    for (let i = 0; i < 70; i++) {
      const x = (i * 197) % W, y = (i * 331) % H, s = 3 + (i % 4) * 2;
      g.globalAlpha = 0.18 + (i % 5) * 0.06;
      g.fillStyle = T.accent;
      if (T.deco === 'stars') { g.fillRect(x, y, s, s); }
      else if (T.deco === 'hearts') { g.fillRect(x, y, s, s); g.fillRect(x + s + 2, y, s, s); g.fillRect(x - 1, y + s, s * 2 + 4, s); g.fillRect(x + s / 2, y + s * 2, s + 2, s); }
      else { g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  }
  async function svgImg(name, color) {
    const svg = icon(name).replace('currentColor', color).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ');
    return loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  }

  async function render(data) {
    const T = TEMPLATES[tpl], [W, H] = FORMATS[fmt];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, W * 0.3, H);
    grd.addColorStop(0, T.bg[0]); grd.addColorStop(1, T.bg[1]);
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    deco(g, T, W, H);
    await document.fonts?.ready;
    const story = fmt === 'story';
    g.textAlign = 'center'; g.fillStyle = T.soft;
    g.font = `600 ${story ? 40 : 34}px ${FONT}`;
    g.fillText('Get Love Room', W / 2, story ? 130 : 80);
    g.fillStyle = T.ink;
    g.font = `700 ${story ? 84 : 66}px ${FONT}`;
    let y = story ? 260 : 165;
    y += wrap(g, data.title, W / 2, y, W - 160, story ? 96 : 76, 2);
    const box = { x: 90, y: y + 10, w: W - 180, h: (story ? H - 330 : H - 150) - (y + 10) - (data.sub || data.sub2 ? 130 : 20) };

    if (data.image) {
      const img = data.image, iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
      const s = Math.min(box.w / iw, box.h / ih);
      const dw = iw * s, dh = ih * s, dx = (W - dw) / 2, dy = box.y + (box.h - dh) / 2;
      g.save();
      g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 40;
      if (data.framed) { g.fillStyle = '#fffaf0'; g.fillRect(dx - 24, dy - 24, dw + 48, dh + 48); }
      g.imageSmoothingEnabled = !data.pixel;
      g.fillStyle = '#000';
      if (!data.framed && !data.transparent) g.fillRect(dx - 8, dy - 8, dw + 16, dh + 16);
      g.shadowBlur = 0;
      g.drawImage(img, dx, dy, dw, dh);
      g.restore();
    } else if (data.big) {
      g.fillStyle = T.accent;
      g.font = `700 ${story ? 300 : 240}px ${FONT}`;
      g.fillText(data.big, W / 2, box.y + box.h / 2 + (story ? 100 : 80));
    } else if (data.quote) {
      g.font = `600 ${story ? 58 : 46}px ${FONT}`; g.fillStyle = T.accent;
      let qy = box.y + 60;
      qy += wrap(g, '“' + data.quote + '”', W / 2, qy, W - 200, story ? 70 : 56, 5) + 40;
      for (const [who, ans] of data.answers) {
        g.font = `700 ${story ? 44 : 36}px ${FONT}`; g.fillStyle = T.ink;
        g.fillText(who, W / 2, qy); qy += story ? 60 : 48;
        g.font = `${story ? 44 : 34}px system-ui, sans-serif`; g.fillStyle = T.soft;
        qy += wrap(g, ans, W / 2, qy, W - 220, story ? 56 : 44, story ? 4 : 2) + (story ? 40 : 24);
      }
    } else if (data.badges) {
      const cols = 3, size = Math.min(220, box.w / cols - 30);
      const rows = Math.ceil(data.badges.length / cols);
      let by = box.y + (box.h - rows * (size + 80)) / 2;
      for (let i = 0; i < data.badges.length; i++) {
        const b = data.badges[i], col = i % cols, row = (i / cols) | 0;
        const n = Math.min(cols, data.badges.length - row * cols);
        const cx = W / 2 + (col - (n - 1) / 2) * (size + 50), cy = by + row * (size + 80) + size / 2;
        g.fillStyle = b.col; g.beginPath(); g.arc(cx, cy, size / 2, 0, Math.PI * 2); g.fill();
        const ic = await svgImg(b.icon, '#1a1608');
        g.drawImage(ic, cx - size * 0.28, cy - size * 0.28, size * 0.56, size * 0.56);
        g.fillStyle = T.ink; g.font = `600 ${story ? 34 : 28}px ${FONT}`;
        g.fillText(t(b.name), cx, cy + size / 2 + 44);
      }
    }
    g.fillStyle = T.ink;
    let sy = box.y + box.h + 70;
    if (data.sub) { g.font = `700 ${story ? 64 : 50}px ${FONT}`; g.fillText(data.sub, W / 2, sy); sy += story ? 80 : 62; }
    if (data.sub2) { g.font = `600 ${story ? 46 : 38}px ${FONT}`; g.fillStyle = T.soft; g.fillText(data.sub2, W / 2, sy); }
    g.fillStyle = T.accent; g.font = `700 ${story ? 46 : 36}px ${FONT}`;
    g.fillText('getloveroom.com', W / 2, H - (story ? 150 : 70));
    g.fillStyle = T.soft; g.font = `600 ${story ? 36 : 30}px ${FONT}`;
    if (story) g.fillText('#GetLoveRoom', W / 2, H - 95);
    return c;
  }

  // ---------- Pencere ----------
  async function open(preset) {
    if (preset) kind = preset;
    const body = openSheet({ title: 'Paylaş', iconName: 'share', wide: true });
    const prev = h('img', { class: 'sharepreview', alt: '' });
    const status = h('p', { class: 'small center' }, 'Hazırlanıyor…');
    const row = (items, cur, set) => h('div', { class: 'tabs' }, ...Object.entries(items).map(([k, v]) => h('button', { class: k === cur ? 'sel' : '', onclick: () => { set(k); open(); } }, v.label || v.name || v)));
    body.append(
      row(KINDS, kind, (k) => (kind = k)),
      row(TEMPLATES, tpl, (k) => (tpl = k)),
      row({ story: 'Hikâye 9:16', square: 'Kare 1:1' }, fmt, (k) => (fmt = k)),
      status, prev,
    );
    const data = await KINDS[kind].make();
    if (data.error) { status.textContent = data.error; return; }
    const canvas = await render(data);
    const url = canvas.toDataURL('image/png');
    prev.src = url;
    status.textContent = '';
    const caption = `${data.caption} #GetLoveRoom ${APP_URL.startsWith('http://localhost') ? 'https://getloveroom.com' : APP_URL}`;
    body.append(h('div', { class: 'row wrap' },
      h('button', { class: 'primary', html: `${icon('share')} Paylaş`, onclick: async () => {
        try {
          const blob = await (await fetch(url)).blob();
          const file = new File([blob], `getloveroom-${kind}.png`, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: caption }); ctx.live.stat('shares'); return; }
        } catch (e) { if (e?.name === 'AbortError') return; }
        saveImage(url, `getloveroom-${kind}.png`);
        navigator.clipboard?.writeText(caption).catch(() => {});
        toast(t('Görsel indirildi, açıklama kopyalandı'));
      } }),
      h('button', { html: `${icon('download')} Galeriye kaydet`, onclick: () => saveImage(url, `getloveroom-${kind}.png`) }),
      h('button', { onclick: async () => { await navigator.clipboard?.writeText(caption); toast(t('Açıklama kopyalandı')); } }, 'Açıklamayı kopyala'),
    ), h('p', { class: 'small' }, document.createTextNode(caption)));
  }

  return { open };
}
