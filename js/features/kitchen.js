// Mutfak: açlık ve birlikte yemek yapma.
//
// live/{rid}/hunger/{uid} = tokluk (0-100). Evde geçen her dakika azalır (yaklaşık 4 saatte biter).
// live/{rid}/cook = { r, s, A, B, pts, max, prog, at, done, stars }
//   Tarif aşamalarla ilerler. A (hazırlık: doğrama, malzemeleri doğru sırayla koyma) yemeği başlatan,
//   B (ocak: karıştırma, pişirme süresini tutturma) partner; partner yoksa hepsini başlatan yapar.
//   Tezgah yukarıdan (kuşbakışı) çizilir: odanın içinden farklı bir bakış.
import { h, openSheet, toast } from '../ui.js';
import { onValue, set, update, now } from '../fb.js';
import { t } from '../i18n.js';
import { DECOR } from '../scenes.js';

export const RECIPES = {
  corba: { name: 'Mercimek çorbası', icon: '🍲', col: '#e0a040', stages: [
    { k: 'chop', who: 'A', items: ['🧅 Soğan', '🥕 Havuç'], taps: 6 },
    { k: 'order', who: 'A', items: ['🫒 Yağ', '🧅 Soğan', '🥕 Havuç', '🫘 Mercimek', '💧 Su'] },
    { k: 'stir', who: 'B', turns: 5 },
    { k: 'time', who: 'B', label: 'Kaynat', zone: [6, 8] },
  ] },
  kek: { name: 'Çikolatalı kek', icon: '🍰', col: '#7a4a2a', stages: [
    { k: 'order', who: 'A', items: ['🥚 Yumurta', '🍬 Şeker', '🥛 Süt', '🌾 Un', '🍫 Kakao'] },
    { k: 'stir', who: 'B', turns: 6 },
    { k: 'time', who: 'B', label: 'Fırında pişir', zone: [7, 9] },
  ] },
  menemen: { name: 'Menemen', icon: '🍳', col: '#e0473f', stages: [
    { k: 'chop', who: 'A', items: ['🫑 Biber', '🍅 Domates'], taps: 5 },
    { k: 'order', who: 'A', items: ['🫒 Yağ', '🫑 Biber', '🍅 Domates', '🥚 Yumurta'] },
    { k: 'stir', who: 'B', turns: 3 },
    { k: 'time', who: 'B', label: 'Pişir', zone: [4, 6] },
  ] },
  makarna: { name: 'Domatesli makarna', icon: '🍝', col: '#ffc93c', stages: [
    { k: 'order', who: 'A', items: ['💧 Su', '🧂 Tuz', '🍝 Makarna'] },
    { k: 'time', who: 'B', label: 'Haşla', zone: [5, 7] },
    { k: 'chop', who: 'A', items: ['🍅 Domates', '🧄 Sarımsak'], taps: 5 },
    { k: 'stir', who: 'B', turns: 4 },
  ] },
};
const TIME_MAX = 10; // pişirme çubuğu 10 sn'de dolar; sonrası yanık
const STAGE_NAME = { chop: 'Doğra', order: 'Sırayla koy', stir: 'Karıştır', time: 'Süreyi tuttur' };

export function createKitchen(ctx) {
  const { live, uid } = ctx;
  let hunger = {}, cook = null, body = null, stop = null, raf = 0, lastMeal = 0;
  const myHunger = () => hunger[uid] ?? 100;
  const chip = h('span', { class: 'chip hunger', title: t('Tokluk') });
  document.querySelector('#top .chips')?.prepend(chip);
  const showChip = () => { const v = Math.round(myHunger()); chip.textContent = `🍽️ ${v}%`; chip.classList.toggle('warn', v < 25); };

  live.on('hunger', (v) => { hunger = v || {}; showChip(); });
  // Evde geçen her dakika acıkırsın (sekme açıkken)
  let warned = false;
  const tick = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const v = Math.max(0, myHunger() - 0.4);
    set(live.ref(`hunger/${uid}`), Math.round(v * 10) / 10);
    if (v < 25 && !warned) { warned = true; toast(t('Acıktın 🍽️ Mutfakta birlikte bir şeyler pişirin!'), 5000); }
    if (v >= 25) warned = false;
  }, 60_000);

  // ---------- Yemek ----------
  live.on('cook', (v) => {
    const was = cook;
    cook = v;
    DECOR.cooking = !!(cook && !cook.done); // ocakta tencere buharı
    // Yemek bitti: iki taraf da kendi tokluğunu doldurur (her yemek bir kez)
    if (cook?.done && cook.at !== lastMeal && (!was || !was.done || was.at !== cook.at)) {
      lastMeal = cook.at;
      const gain = 40 + (cook.stars || 1) * 15;
      set(live.ref(`hunger/${uid}`), Math.min(100, myHunger() + gain));
      if (cook.A === uid) live.stat('meals');
      toast(t('Afiyet olsun! {icon} {stars}', { icon: RECIPES[cook.r]?.icon || '🍽️', stars: '⭐'.repeat(cook.stars || 1) }), 4500);
    }
    // Yalnızca ilerleme değiştiyse ekranı baştan kurma (oynayanın mini oyunu sıfırlanmasın), çubuğu güncelle
    const key = cook ? `${cook.at}|${cook.s}|${cook.done}` : '';
    if (key === shownKey) { const m = body?.querySelector('.watch i'); if (m) m.style.width = (cook?.prog || 0) * 100 + '%'; return; }
    render();
  });
  let shownKey = null;

  function start(r) {
    const duo = ctx.partnerOnline() && ctx.partnerUid();
    const max = RECIPES[r].stages.length * 2;
    set(live.ref('cook'), { r, s: 0, A: uid, B: duo ? ctx.partnerUid() : uid, pts: 0, max, prog: 0, at: now(), done: false, stars: 0 });
  }
  function finishStage(pts) {
    const c = cook, rec = RECIPES[c.r];
    const s = c.s + 1, total = (c.pts || 0) + pts;
    if (s >= rec.stages.length) {
      const ratio = total / c.max;
      update(live.ref('cook'), { s, pts: total, prog: 0, done: true, stars: ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1 });
    } else update(live.ref('cook'), { s, pts: total, prog: 0 });
  }
  let lastProg = 0;
  const sendProg = (p) => { const n = performance.now(); if (n - lastProg > 150 || p >= 1) { lastProg = n; update(live.ref('cook'), { prog: Math.round(p * 100) / 100 }); } };

  function open() {
    body = openSheet({ title: 'Mutfak', iconName: 'heart', wide: true, onClose: () => { body = null; stop?.(); stop = null; cancelAnimationFrame(raf); } });
    render();
  }

  // Tezgah: yukarıdan bakış. Solda kesme tahtası, sağda ocakta tencere; ortada malzemeler.
  function drawCounter(g, c, stirAngle = 0) {
    const W = 400, H = 200;
    g.fillStyle = '#d9c3a0'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 40) { g.fillStyle = x % 80 ? '#cfb791' : '#d4bd98'; g.fillRect(x, 0, 40, H); }
    g.fillStyle = '#b07a48'; g.fillRect(30, 40, 120, 120); g.fillStyle = '#c48b55'; g.fillRect(36, 46, 108, 108); // kesme tahtası
    g.fillStyle = '#2e2e3a'; g.fillRect(240, 30, 140, 140); // ocak
    g.fillStyle = '#4a4752'; [[275, 65], [345, 65], [275, 135], [345, 135]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill(); });
    const rec = c && RECIPES[c.r];
    // Tencere (sağ üst ocak) ve içindeki yemek
    g.fillStyle = '#9aa3ad'; g.beginPath(); g.arc(310, 100, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6d7680'; g.fillRect(358, 94, 30, 12); g.fillRect(212, 94, 30, 12);
    const fill = c ? Math.min(1, (c.s + (c.prog || 0)) / rec.stages.length) : 0;
    g.fillStyle = '#3a3f46'; g.beginPath(); g.arc(310, 100, 44, 0, Math.PI * 2); g.fill();
    if (fill > 0) { g.fillStyle = rec.col; g.globalAlpha = 0.35 + fill * 0.65; g.beginPath(); g.arc(310, 100, 42, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    // Kaşık (karıştırırken döner)
    g.strokeStyle = '#8a5a36'; g.lineWidth = 5; g.beginPath(); g.moveTo(310 + Math.cos(stirAngle) * 10, 100 + Math.sin(stirAngle) * 10); g.lineTo(310 + Math.cos(stirAngle) * 46, 100 + Math.sin(stirAngle) * 46); g.stroke(); g.lineWidth = 1;
    // Buhar
    if (c && !c.done && fill > 0.3) { g.fillStyle = 'rgba(255,255,255,0.5)'; const k = performance.now() / 400; for (let i = 0; i < 3; i++) g.fillRect(290 + i * 18, 40 - ((k + i) % 2) * 12, 6, 10); }
    if (c?.done) { g.font = '64px serif'; g.textAlign = 'center'; g.fillText(rec.icon, 310, 122); }
    g.font = '28px serif'; g.textAlign = 'center';
    if (c && !c.done) { const st = rec.stages[c.s]; (st.items || []).slice(0, 3).forEach((it, i) => g.fillText(it.split(' ')[0], 90, 82 + i * 34)); }
  }

  function render() {
    if (!body || !document.body.contains(body)) return;
    stop?.(); stop = null; cancelAnimationFrame(raf);
    body.innerHTML = '';
    shownKey = cook ? `${cook.at}|${cook.s}|${cook.done}` : '';
    const hungerTxt = h('p', { class: 'small center' }, t('Tokluğun: {v}% · {name}: {p}%', { v: Math.round(myHunger()), name: ctx.partnerName(), p: Math.round(hunger[ctx.partnerUid()] ?? 100) }));
    const canvas = h('canvas', { width: 400, height: 200, class: 'foos counter' });
    const g = canvas.getContext('2d');
    body.append(hungerTxt, canvas);
    const c = cook;
    if (!c || c.done) {
      drawCounter(g, c);
      if (c?.done) body.append(h('p', { class: 'center' }, t('{dish} hazır! {stars}', { dish: t(RECIPES[c.r].name), stars: '⭐'.repeat(c.stars || 1) })));
      body.append(h('p', { class: 'small center' }, t('Bir tarif seçin. Biriniz hazırlar (doğrar, malzemeleri sırayla koyar), diğeriniz ocağa bakar (karıştırır, pişirme süresini tutturur). Ne kadar iyi yaparsanız o kadar doyarsınız.')),
        h('div', { class: 'opts recipes' }, ...Object.entries(RECIPES).map(([id, r]) => h('button', { class: 'tile', onclick: () => start(id) }, h('b', {}, `${r.icon} ${t(r.name)}`), h('small', {}, r.stages.map((s) => t(STAGE_NAME[s.k])).join(' → '))))));
      return;
    }
    const rec = RECIPES[c.r], st = rec.stages[c.s];
    const who = st.who === 'A' ? c.A : c.B, mine = who === uid;
    body.append(h('p', { class: 'center' }, `${rec.icon} ${t(rec.name)} · ${c.s + 1}/${rec.stages.length} · ${t(STAGE_NAME[st.k])}`));
    const area = h('div', { class: 'cookarea' });
    body.append(area, h('button', { class: 'link', onclick: () => set(live.ref('cook'), null) }, 'Yemeği bırak'));
    let stirA = 0;
    const loop = () => { raf = requestAnimationFrame(loop); drawCounter(g, cook || c, stirA); };
    loop();
    if (!mine) {
      area.append(h('p', { class: 'center small' }, t('{name} şu an: {stage}', { name: ctx.partnerName(), stage: t(STAGE_NAME[st.k]) })),
        h('div', { class: 'meter big watch' }, h('i', { style: { width: (c.prog || 0) * 100 + '%', background: rec.col } })));
      return;
    }
    const t0 = performance.now();
    if (st.k === 'chop') { // her malzemeye N kez dokun
      let i = 0, n = 0;
      const btn = h('button', { class: 'primary big' });
      const show = () => { btn.textContent = `🔪 ${t(st.items[i])} (${n}/${st.taps})`; };
      btn.onclick = () => {
        n++; if (n >= st.taps) { i++; n = 0; }
        sendProg((i * st.taps + n) / (st.items.length * st.taps));
        if (i >= st.items.length) { btn.disabled = true; finishStage(1 + ((performance.now() - t0) / 1000 < 4 + st.items.length * 2 ? 1 : 0)); return; }
        show();
      };
      show();
      area.append(h('p', { class: 'small center' }, t('Hızlıca dokunarak doğra!')), btn);
    } else if (st.k === 'order') { // doğru sırayla tencereye koy
      let next = 0, mistakes = 0;
      const shuffled = [...st.items].sort(() => Math.random() - 0.5);
      const row = h('div', { class: 'row wrap center' });
      shuffled.forEach((it) => {
        const b = h('button', {}, t(it));
        b.onclick = () => {
          if (it === st.items[next]) { b.disabled = true; b.classList.add('sel'); next++; sendProg(next / st.items.length); if (next === st.items.length) finishStage(Math.max(0, 2 - mistakes)); }
          else { mistakes++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); toast(t('Sıra yanlış 🙈 Tarifi hatırla!'), 1500); }
        };
        row.append(b);
      });
      area.append(h('p', { class: 'small center' }, t('Malzemeleri tarifteki sırayla tencereye koy: {list}', { list: st.items.map((x) => t(x)).join(' → ') })), row);
    } else if (st.k === 'stir') { // tencerenin etrafında daire çiz
      let acc = 0, prev = null;
      area.append(h('p', { class: 'small center' }, t('Parmağınla/farenle tencerenin içinde daireler çiz: {n} tur', { n: st.turns })));
      const ang = (e) => { const r = canvas.getBoundingClientRect(); return Math.atan2(((e.clientY - r.top) / r.height) * 200 - 100, ((e.clientX - r.left) / r.width) * 400 - 310); };
      canvas.style.touchAction = 'none';
      canvas.onpointerdown = (e) => { prev = ang(e); try { canvas.setPointerCapture(e.pointerId); } catch { /* sentetik olay */ } };
      canvas.onpointermove = (e) => {
        if (prev === null) return;
        const a = ang(e); let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
        prev = a; acc += Math.abs(d); stirA = a;
        const p = Math.min(1, acc / (st.turns * 2 * Math.PI)); sendProg(p);
        if (p >= 1) { prev = null; canvas.onpointermove = null; finishStage(1 + ((performance.now() - t0) / 1000 < st.turns * 1.6 ? 1 : 0)); }
      };
      canvas.onpointerup = () => { prev = null; };
    } else if (st.k === 'time') { // yeşil bölgede ocaktan al
      const bar = h('div', { class: 'cookbar' }, h('span', { class: 'zone', style: { left: (st.zone[0] / TIME_MAX) * 100 + '%', width: ((st.zone[1] - st.zone[0]) / TIME_MAX) * 100 + '%' } }), h('i'));
      const btn = h('button', { class: 'primary big' }, t('{label}: ocaktan al!', { label: t(st.label) }));
      let done = false;
      const step = () => {
        if (done) return;
        const s = (performance.now() - t0) / 1000;
        bar.querySelector('i').style.width = Math.min(100, (s / TIME_MAX) * 100) + '%';
        sendProg(Math.min(1, s / TIME_MAX));
        if (s >= TIME_MAX) { done = true; toast(t('Yandı! 🔥 Bir dahakine daha erken al.'), 2500); finishStage(0); return; }
        setTimeout(step, 50);
      };
      btn.onclick = () => {
        if (done) return; done = true;
        const s = (performance.now() - t0) / 1000, [lo, hi] = st.zone;
        const pts = s >= lo && s <= hi ? 2 : s >= lo - 1 && s <= hi + 1 ? 1 : 0;
        toast(pts === 2 ? t('Tam kıvamında! 👌') : pts === 1 ? t('Fena değil 🙂') : s < lo ? t('Biraz çiğ kaldı 😬') : t('Biraz fazla pişti 😬'), 2000);
        finishStage(pts);
      };
      area.append(h('p', { class: 'small center' }, t('Çubuk yeşil bölgedeyken bas.')), bar, btn);
      step();
    }
  }

  return { open, hunger: (who) => (who === 'me' ? myHunger() : hunger[ctx.partnerUid()] ?? 100), stop: () => clearInterval(tick) };
}
