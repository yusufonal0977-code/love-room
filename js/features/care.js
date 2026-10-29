// Ortak sorumluluklar: evcil dostumuz (mama, sevgi, oyun, temizlik), balkondaki çiçeğimiz ve rozetler.
//
// live/{rid}/pet    = { name, species, color, acc, food, love, play, clean, at, xp }   değerler zamanla azalır
// live/{rid}/flower = { growth, water: {uid: zaman}, blooms }
// live/{rid}/stats  = sayaçlar (rozetler bunlardan hesaplanır)
import { h, icon, openSheet, toast } from '../ui.js';
import { serverTimestamp, set, update, now } from '../fb.js';
import { DECOR, bump } from '../scenes.js';
import { petSprites, drawPetAcc, PET_COLORS, PET_ACC } from '../art.js';
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

  // ---------- Evcil dostumuz ----------
  // Tür (kedi/köpek/tavşan), renk ve aksesuar seçilebilir; seviye arttıkça yeni aksesuarlar açılır.
  // live/{rid}/petCall = { x, y, at }: "Yanıma çağır" deyince hayvanı simüle eden cihaz (oda kurucusu) onu çağırır.
  const petNow = () => {
    const p = { name: t('Pamuk'), species: 'cat', color: PET_COLORS[0], acc: 'none', food: 80, love: 80, play: 80, clean: 80, at: now(), xp: 0, ...(pet || {}) };
    const hrs = Math.max(0, (now() - (p.at || now())) / HOUR);
    return { ...p, food: clamp(p.food - hrs * 4), love: clamp(p.love - hrs * 3), play: clamp(p.play - hrs * 3.5), clean: clamp((p.clean ?? 80) - hrs * 2) };
  };
  const level = (xp) => 1 + Math.floor((xp || 0) / 10);
  const title = (lv) => (lv >= 10 ? 'Ebeveynler' : lv >= 4 ? 'Pet arkadaşları' : 'Bakıcılar');
  const SPECIES = { cat: 'Kedi', dog: 'Köpek', bunny: 'Tavşan' };
  const ACC = { none: 'Yok', bow: 'Fiyonk', collar: 'Tasma', hat: 'Şapka', crown: 'Taç' };
  const SAYS = {
    cat: { food: '{name} mırlayarak yedi 😺', love: '{name} sana sokuldu 😻', play: '{name} yün yumağının peşinde 🧶', clean: '{name} pırıl pırıl oldu 🫧' },
    dog: { food: '{name} kuyruğunu sallayarak yedi 🐶', love: '{name} seni yaladı 🥰', play: '{name} topu getirdi 🎾', clean: '{name} silkelendi, her yer su 💦' },
    bunny: { food: '{name} havucu kemirdi 🥕', love: '{name} burnunu oynattı 🐰', play: '{name} zıp zıp zıpladı ✨', clean: '{name} pamuk gibi oldu 🫧' },
  };
  function syncDecor() { const p = petNow(); Object.assign(DECOR.pet, { species: p.species, color: p.color, acc: p.acc, food: p.food, love: p.love, play: p.play, clean: p.clean }); }
  live.on('pet', (v) => { pet = v; syncDecor(); renderPet(); });
  live.on('petCall', (v) => { if (v && ctx.isHost() && now() - (v.at || 0) < 8000) ctx.game.petCome(v.x, v.y); });
  setInterval(syncDecor, 30_000);

  const save = (p, extra = {}) => set(live.ref('pet'), { name: p.name, species: p.species, color: p.color, acc: p.acc, food: p.food, love: p.love, play: p.play, clean: p.clean, xp: p.xp || 0, at: serverTimestamp(), ...extra });

  async function care(kind) {
    const p = petNow();
    const gain = { food: 35, love: 30, play: 30, clean: 40 }[kind];
    if (p[kind] >= 98) return toast(t(kind === 'food' ? '{name} tok 😺' : kind === 'love' ? '{name} şu an yeterince sevildi 😺' : kind === 'clean' ? '{name} zaten tertemiz ✨' : '{name} şu an yeterince oynadı 😺', { name: p.name }));
    const before = level(p.xp);
    await save(p, { [kind]: clamp(p[kind] + gain), xp: (p.xp || 0) + 1 });
    live.stat('pet');
    toast(t((SAYS[p.species] || SAYS.cat)[kind], { name: p.name }));
    if (level((p.xp || 0) + 1) > before) toast(t('{name} seviye atladı: {lv}! 🎉', { name: p.name, lv: level((p.xp || 0) + 1) }), 3500);
  }
  function call() {
    if (ctx.game.me.scene !== 'salon') return toast(t('{name} salonda; çağırmak için salona git.', { name: petNow().name }));
    const { x, y } = ctx.game.me;
    if (ctx.isHost()) ctx.game.petCome(x, y);
    else set(live.ref('petCall'), { x: Math.round(x), y: Math.round(y), at: now() });
    toast(t('{name} geliyor! 🐾', { name: petNow().name }));
  }
  function bar(label, v, col) {
    return h('div', { class: 'stat' }, h('span', {}, label), h('div', { class: 'meter' }, h('i', { style: { width: v + '%', background: v < 25 ? '#ff4f7b' : col } })), h('b', {}, v));
  }
  function preview(p) {
    const c = h('canvas', { width: 32, height: 26, class: 'petprev' });
    const g = c.getContext('2d');
    const sp = petSprites(p.species, p.color);
    const img = sp.right[0];
    const x0 = Math.round(16 - img.width / 2), y0 = 24 - img.height;
    g.drawImage(img, x0, y0);
    if (p.acc !== 'none') drawPetAcc(g, p.acc, x0 + sp.head[0][0], y0 + sp.head[0][1]);
    return c;
  }
  function renderPet() {
    if (!petBody || !document.body.contains(petBody)) return;
    const p = petNow(), lv = level(p.xp);
    const prog = ((p.xp || 0) % 10) * 10;
    petBody.innerHTML = '';
    const name = h('input', { value: p.name, maxLength: 14 });
    name.onchange = () => update(live.ref('pet'), { name: name.value.trim() || t('Pamuk') });
    const pick = (items, cur, onPick, render) => h('div', { class: 'opts' }, ...items.map((it) => {
      const b = render(it);
      if (it.value === cur) b.classList.add('sel');
      if (it.locked) { b.disabled = true; b.title = t('Seviye {lv} ile açılır', { lv: it.locked }); }
      b.onclick = () => onPick(it.value);
      return b;
    }));
    petBody.append(
      h('div', { class: 'pethead' }, preview(p), h('div', { class: 'grow' },
        h('label', {}, 'Adı', name),
        h('p', { class: 'small' }, t('Seviye {lv} · {title} · {n} bakım', { lv, title: t(title(lv)), n: p.xp || 0 })),
        h('div', { class: 'meter' }, h('i', { style: { width: prog + '%' } })),
      )),
      bar('Mama', p.food, '#ffc93c'), bar('Sevgi', p.love, '#ff7aa3'), bar('Oyun', p.play, '#8fd0ff'), bar('Temizlik', p.clean, '#9ee6a8'),
      h('div', { class: 'row wrap petacts' },
        h('button', { class: 'primary', onclick: () => care('food') }, 'Mama ver'),
        h('button', { onclick: () => care('love') }, 'Sev'),
        h('button', { onclick: () => care('play') }, 'Oyna'),
        h('button', { onclick: () => care('clean') }, 'Yıka'),
        h('button', { onclick: call }, 'Yanıma çağır'),
      ),
      h('small', {}, 'Tür'),
      pick(Object.entries(SPECIES).map(([value, label]) => ({ value, label })), p.species, (v) => update(live.ref('pet'), { species: v }), (it) => h('button', {}, it.label)),
      h('small', {}, 'Renk'),
      pick(PET_COLORS.map((value) => ({ value })), p.color, (v) => update(live.ref('pet'), { color: v }), (it) => h('button', { class: 'sw', style: { background: it.value } })),
      h('small', {}, 'Aksesuar'),
      pick(PET_ACC.map(([value, need]) => ({ value, label: ACC[value], locked: lv < need ? need : 0 })), p.acc, (v) => update(live.ref('pet'), { acc: v }), (it) => h('button', {}, t(it.label) + (it.locked ? ' 🔒' : ''))),
      h('p', { class: 'small' }, 'Değerler zamanla azalır. İkiniz de bakabilirsiniz; acıkınca, sıkılınca ya da kirlenince başının üstünde balon çıkar. Geceleri kıvrılıp uyur.'),
    );
  }
  function openPet() {
    petBody = openSheet({ title: 'Evcil dostumuz', iconName: 'paw', onClose: () => (petBody = null) });
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

  return { openPet, openFlower, openBadges, care, visit, petNow, unlockedBadges: () => BADGES.filter((b) => unlocked(stats).has(b.id)) };
}
