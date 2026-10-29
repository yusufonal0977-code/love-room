// Ortak sorumluluklar: kedimiz (mama, sevgi, oyun), balkondaki çiçeğimiz ve rozetler.
//
// live/{rid}/pet    = { name, food, love, play, at, xp }   değerler zamanla azalır (saatte 4 puan)
// live/{rid}/flower = { growth, water: {uid: zaman}, blooms }
// live/{rid}/stats  = sayaçlar (rozetler bunlardan hesaplanır)
import { h, icon, openSheet, toast } from '../ui.js';
import { serverTimestamp, set, update, now } from '../fb.js';
import { DECOR, bump } from '../scenes.js';
import { t } from '../i18n.js';

const HOUR = 3_600_000, DAY = 24 * HOUR;
const clamp = (v) => Math.max(0, Math.min(100, Math.round(v)));

export const BADGES = [
  { id: 'carer', name: 'Bakıcı', desc: 'Kedimize ilk kez baktınız', stat: 'pet', n: 1, icon: 'paw', col: '#ffc93c' },
  { id: 'petlover', name: 'Pet', desc: 'Kedimize 30 kez baktınız', stat: 'pet', n: 30, icon: 'paw', col: '#ff7a59' },
  { id: 'parent', name: 'Ebeveyn', desc: 'Kedimize 100 kez baktınız', stat: 'pet', n: 100, icon: 'heart', col: '#ff4f7b' },
  { id: 'together', name: 'Kanepe Çifti', desc: '20 kez yan yana oturdunuz', stat: 'together', n: 20, icon: 'sofa', col: '#3fb7a4' },
  { id: 'hugger', name: 'Sarılgan', desc: '50 kez sarıldınız', stat: 'hugs', n: 50, icon: 'hug', col: '#ff9ec4' },
  { id: 'kisser', name: 'Öpücük Canavarı', desc: '50 öpücük', stat: 'kisses', n: 50, icon: 'kiss', col: '#ff4f7b' },
  { id: 'movie', name: 'Film Delisi', desc: '10 film/video izlediniz', stat: 'movies', n: 10, icon: 'tv', col: '#5b8def' },
  { id: 'dj', name: 'DJ Çift', desc: '10 kez birlikte müzik açtınız', stat: 'songs', n: 10, icon: 'music', col: '#1db954' },
  { id: 'artist', name: 'Ressamlar', desc: '200 fırça darbesi', stat: 'strokes', n: 200, icon: 'brush', col: '#9b6bff' },
  { id: 'memory', name: 'Anı Avcısı', desc: 'Albüme 10 fotoğraf', stat: 'photos', n: 10, icon: 'album', col: '#ff7a59' },
  { id: 'writer', name: 'Günlükçü', desc: 'Günlüğe 10 sayfa', stat: 'diary', n: 10, icon: 'book', col: '#c8874f' },
  { id: 'curious', name: 'Meraklı', desc: 'Kavanoza 20 cevap', stat: 'answers', n: 20, icon: 'jar', col: '#8fd0ff' },
  { id: 'gardener', name: 'Bahçıvan', desc: 'Çiçeğinizi açtırdınız', stat: 'blooms', n: 1, icon: 'flower', col: '#4fbf6a' },
  { id: 'champ', name: 'Şampiyon', desc: 'Oyunlarda 10 galibiyet', stat: 'wins', n: 10, icon: 'game', col: '#ffc93c' },
  { id: 'decorator', name: 'Dekoratör', desc: 'Evi 10 kez düzenlediniz', stat: 'decor', n: 10, icon: 'paint', col: '#ff9a76' },
  { id: 'explorer', name: 'Kâşif', desc: 'Evin dört odasını da gezdiniz', stat: 'rooms', n: 4, icon: 'sofa', col: '#b39ddb' },
];

export function createCare(ctx) {
  const { live, uid } = ctx;
  let pet = null, flower = null, stats = null, petBody = null, flowerBody = null;

  // ---------- Kedi ----------
  const petNow = () => {
    const p = pet || { name: 'Pamuk', food: 80, love: 80, play: 80, at: now(), xp: 0 };
    const hrs = Math.max(0, (now() - (p.at || now())) / HOUR);
    return { ...p, food: clamp(p.food - hrs * 4), love: clamp(p.love - hrs * 3), play: clamp(p.play - hrs * 3.5) };
  };
  const level = (xp) => 1 + Math.floor((xp || 0) / 10);
  const title = (lv) => (lv >= 10 ? 'Ebeveynler' : lv >= 4 ? 'Pet arkadaşları' : 'Bakıcılar');
  function syncDecor() { const p = petNow(); Object.assign(DECOR.pet, { food: p.food, love: p.love, play: p.play }); }
  live.on('pet', (v) => { pet = v; syncDecor(); renderPet(); });
  setInterval(syncDecor, 30_000);

  async function care(kind) {
    const p = petNow();
    const gain = { food: 35, love: 30, play: 30 }[kind];
    if (p[kind] >= 98) return toast(t(kind === 'food' ? '{name} tok 😺' : kind === 'love' ? '{name} şu an yeterince sevildi 😺' : '{name} şu an yeterince oynadı 😺', { name: p.name }));
    await set(live.ref('pet'), { name: p.name, food: p.food, love: p.love, play: p.play, [kind]: clamp(p[kind] + gain), xp: (p.xp || 0) + 1, at: serverTimestamp() });
    live.stat('pet');
    ctx.onPetCare?.(kind);
  }
  function bar(label, v, col) {
    return h('div', { class: 'stat' }, h('span', {}, label), h('div', { class: 'meter' }, h('i', { style: { width: v + '%', background: v < 25 ? '#ff4f7b' : col } })), h('b', {}, v));
  }
  function renderPet() {
    if (!petBody || !document.body.contains(petBody)) return;
    const p = petNow(), lv = level(p.xp);
    petBody.innerHTML = '';
    const name = h('input', { value: p.name, maxLength: 14 });
    name.onchange = () => update(live.ref('pet'), { name: name.value.trim() || 'Pamuk' });
    petBody.append(
      h('label', {}, 'Adı', name),
      h('p', { class: 'small' }, t('Seviye {lv} · {title} · {n} bakım', { lv, title: t(title(lv)), n: p.xp || 0 })),
      bar('Mama', p.food, '#ffc93c'), bar('Sevgi', p.love, '#ff7aa3'), bar('Oyun', p.play, '#8fd0ff'),
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: () => care('food') }, 'Mama ver'),
        h('button', { onclick: () => care('love') }, 'Sev'),
        h('button', { onclick: () => care('play') }, 'Oyna'),
      ),
      h('p', { class: 'small' }, 'Değerler zamanla azalır. İkiniz de bakabilirsiniz; kedi acıkınca başının üstünde balon çıkar.'),
    );
  }
  function openPet() {
    petBody = openSheet({ title: 'Kedimiz', iconName: 'paw', onClose: () => (petBody = null) });
    renderPet();
  }

  // ---------- Çiçek ----------
  const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const stageOf = (g) => (g >= 70 ? 3 : g >= 35 ? 2 : g >= 10 ? 1 : 0);
  function syncFlower() {
    const f = flower || {};
    const last = Math.max(0, ...Object.values(f.water || {}));
    DECOR.flower.stage = stageOf(f.growth || 0);
    DECOR.flower.wilt = !!last && now() - last > 3 * DAY;
    bump();
  }
  live.on('flower', (v) => { flower = v; syncFlower(); renderFlower(); });
  setInterval(syncFlower, 60_000);

  async function water() {
    const f = flower || { growth: 0, water: {} };
    const today = dayStart(now());
    if ((f.water?.[uid] || 0) >= today) return toast('Bugün suladın 💧 Yarın yine gel.');
    const pu = ctx.partnerUid();
    const both = pu && (f.water?.[pu] || 0) >= today;
    const before = stageOf(f.growth || 0);
    const growth = Math.min(100, (f.growth || 0) + 6 + (both ? 6 : 0));
    await update(live.ref('flower'), { growth, [`water/${uid}`]: serverTimestamp() });
    toast(both ? t('İkiniz de suladınız, çiçek iki kat büyüdü 🌱💧') : t('Suladın 💧 {name} da sularsa daha hızlı büyür.', { name: ctx.partnerName() }));
    if (stageOf(growth) === 3 && before < 3) { live.stat('blooms'); toast('Çiçeğiniz açtı! 🌸', 4000); }
  }
  function renderFlower() {
    if (!flowerBody || !document.body.contains(flowerBody)) return;
    const f = flower || { growth: 0, water: {} };
    const st = stageOf(f.growth || 0), today = dayStart(now());
    const pu = ctx.partnerUid();
    flowerBody.innerHTML = '';
    flowerBody.append(
      h('p', {}, t(['Tohum', 'Filiz', 'Tomurcuk', 'Çiçek açtı 🌸'][st]) + (DECOR.flower.wilt ? ' · ' + t('susuz kaldı, boynunu büktü') : '')),
      h('div', { class: 'meter big' }, h('i', { style: { width: (f.growth || 0) + '%', background: '#4fbf6a' } })),
      h('p', { class: 'small' }, t('Bugün: sen {me} · {name} {them}', { me: t((f.water?.[uid] || 0) >= today ? 'suladın ✔' : 'sulamadın'), name: ctx.partnerName(), them: t(pu && (f.water?.[pu] || 0) >= today ? 'suladı ✔' : 'sulamadı') })),
      h('div', { class: 'row' },
        h('button', { class: 'primary', onclick: water }, 'Sula'),
        st === 3 ? h('button', { onclick: async () => { await set(live.ref('flower'), { growth: 0, water: {} }); toast('Yeni tohum ekildi 🌱'); } }, 'Yeni tohum ek') : null,
      ),
      h('p', { class: 'small' }, 'Her biriniz günde bir kez sulayabilir. Aynı gün ikiniz de sularsanız iki kat büyür; 3 gün sulanmazsa solar.'),
    );
  }
  function openFlower() {
    flowerBody = openSheet({ title: 'Çiçeğimiz', iconName: 'flower', onClose: () => (flowerBody = null) });
    renderFlower();
  }

  // ---------- Rozetler ----------
  const unlocked = (s) => new Set(BADGES.filter((b) => (s?.[b.stat] || 0) >= b.n).map((b) => b.id));
  live.on('stats', (v) => {
    const before = stats ? unlocked(stats) : null;
    stats = v || {};
    if (!before) return;
    BADGES.filter((b) => unlocked(stats).has(b.id) && !before.has(b.id)).forEach((b) => { toast(t('Yeni rozet: {name} 🏅', { name: t(b.name) }), 4000); ctx.onBadge?.(b); });
  });
  // Kâşif: bu cihazda gezilen odalar
  const visited = new Set(JSON.parse(localStorage.getItem('lr.rooms') || '["salon"]'));
  function visit(scene) {
    if (visited.has(scene)) return;
    visited.add(scene);
    localStorage.setItem('lr.rooms', JSON.stringify([...visited]));
    if ((stats?.rooms || 0) < visited.size) update(live.ref('stats'), { rooms: visited.size });
  }
  function openBadges() {
    const body = openSheet({ title: 'Rozetlerimiz', iconName: 'badge', wide: true });
    const got = unlocked(stats);
    body.append(h('p', { class: 'small' }, t('{n} / {total} rozet', { n: got.size, total: BADGES.length })),
      h('div', { class: 'badges' }, ...BADGES.map((b) => {
        const v = Math.min(b.n, stats?.[b.stat] || 0), ok = got.has(b.id);
        return h('div', { class: 'badge' + (ok ? ' ok' : '') },
          h('div', { class: 'medal', style: { background: ok ? b.col : '' }, html: icon(b.icon) }),
          h('b', {}, b.name), h('small', {}, b.desc), ok ? null : h('div', { class: 'meter' }, h('i', { style: { width: (v / b.n) * 100 + '%' } })));
      })));
  }

  return { openPet, openFlower, openBadges, care, visit };
}
