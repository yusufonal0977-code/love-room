// İlk giriş turu: odaya ilk kez giren kişiye alttaki düğmeleri sırayla gösterip neler yapabileceğini anlatır.
// Bir kez gösterilir (profile.tourSeen); menüdeki "Nasıl kullanılır?" ile yeniden açılabilir.
// Adımlardaki kısa sessiz videolar gerçek oyundan kaydedilir: tiktok-oto/tour-clips.mjs → assets/tour/<ad>.mp4
import { h } from '../ui.js';
import { t } from '../i18n.js';

const STEPS = [
  { media: 'hosgeldin', title: 'Evine hoş geldin', text: 'Burası ikinizin ortak evi. Yürümek için yere dokun (bilgisayarda WASD ya da oklar). Bir eşyaya dokununca onu kullanırsın: kanepeye oturur, TV\'yi açar, kediyi seversin.' },
  { media: 'konusma', el: ['micBtn', 'camBtn'], title: 'Sesli ve görüntülü konuşun', text: 'Partnerin eve gelince sesli sohbet kendiliğinden açılır. Mikrofonunu ve kameranı buradan açıp kapatırsın.' },
  { media: 'izle', el: ['screenBtn'], title: 'Birlikte izleyin', text: 'Salondaki TV\'de YouTube ya da video linki ikinizde aynı saniyede oynar. Bilgisayardan ekranını da TV\'ye yansıtabilirsin.' },
  { media: 'sevgi', el: ['heartBtn', 'hugBtn', 'kissBtn'], title: 'Sevgini göster', text: 'Kalp gönder; partnerinin yanına gidince sarıl ya da öp.' },
  { el: ['chatBtn'], title: 'Yazışın', text: 'Sohbetten mesaj yaz; mesajın karakterinin üstünde balon olarak da görünür.' },
  { media: 'birlikte', el: ['hubBtn'], title: 'Birlikte yapılacaklar', text: 'Oyunlar, birlikte çizim, fotoğraf kabini, ortak albüm, günlük, geleceğe mektup, evcil hayvan ve evi düzenleme burada.' },
  { el: ['menuBtn'], title: 'Menü', text: 'Partnerine davet linkini buradan gönderirsin. Karakterini düzenleme, dil ve hesap ayarları da burada.' },
];

/** Turu açar; bitince ya da geçilince onDone çağrılır. */
export function startTour(onDone) {
  let i = 0;
  const ring = h('div', { class: 'tourring' });
  const title = h('b'), text = h('p'), dots = h('div', { class: 'tourdots' });
  const media = h('video', { class: 'tourmedia', muted: true, autoplay: true, loop: true, playsInline: true, preload: 'auto' });
  const back = h('button', { class: 'link', onclick: () => go(i - 1) }, t('Geri'));
  const next = h('button', { class: 'primary', onclick: () => go(i + 1) });
  const card = h('div', { class: 'tourcard', role: 'dialog' }, media, title, text, dots,
    h('div', { class: 'row' }, h('button', { class: 'link', onclick: finish }, t('Turu geç')), back, next));
  const wrap = h('div', { class: 'tour' }, ring, card);
  document.body.append(wrap);
  const onResize = () => show();
  addEventListener('resize', onResize);

  function show() {
    const s = STEPS[i];
    media.hidden = !s.media;
    if (!s.media) media.pause();
    if (s.media && !media.src.endsWith(`/${s.media}.mp4`)) { media.poster = `assets/tour/${s.media}.jpg`; media.src = `assets/tour/${s.media}.mp4`; media.play().catch(() => {}); }
    title.textContent = t(s.title);
    text.textContent = t(s.text);
    dots.innerHTML = '';
    STEPS.forEach((_, k) => dots.append(h('i', { class: k === i ? 'on' : '' })));
    back.hidden = i === 0;
    next.textContent = t(i === STEPS.length - 1 ? 'Başlayalım' : 'İleri');
    const els = (s.el || []).map((id) => document.getElementById(id)).filter((e) => e && e.offsetParent !== null);
    if (!els.length) { // vurgulanacak düğme yok: ekran yine kararır, kart ortada
      Object.assign(ring.style, { left: innerWidth / 2 + 'px', top: innerHeight / 2 + 'px', width: '0px', height: '0px' });
      card.className = 'tourcard center'; return;
    }
    const rs = els.map((e) => e.getBoundingClientRect());
    const box = { l: Math.min(...rs.map((r) => r.left)) - 6, t: Math.min(...rs.map((r) => r.top)) - 6, r: Math.max(...rs.map((r) => r.right)) + 6, b: Math.max(...rs.map((r) => r.bottom)) + 6 };
    Object.assign(ring.style, { left: box.l + 'px', top: box.t + 'px', width: box.r - box.l + 'px', height: box.b - box.t + 'px' });
    // Kart, vurgulanan düğmelerin üstünde; ekrandan taşmasın
    card.className = 'tourcard';
    const cw = Math.min(340, innerWidth - 24);
    const mid = (box.l + box.r) / 2;
    Object.assign(card.style, { width: cw + 'px', left: Math.max(12, Math.min(innerWidth - cw - 12, mid - cw / 2)) + 'px', bottom: innerHeight - box.t + 14 + 'px', top: 'auto' });
  }
  function go(k) {
    if (k < 0) return;
    if (k >= STEPS.length) return finish();
    i = k; show();
  }
  function finish() {
    removeEventListener('resize', onResize);
    media.pause();
    wrap.remove();
    onDone?.();
  }
  show();
}
