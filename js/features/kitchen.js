// Mutfak: açlık ve birlikte yemek yapma.
//
// live/{rid}/hunger/{uid} = tokluk (0-100). Evde geçen her dakika azalır (yaklaşık 4 saatte biter).
// live/{rid}/cook = { r, s, A, B, pts, max, prog, at, done, stars }
// live/{rid}/fridge/{at} = { r, stars, n, at }  pişen yemek buzdolabına girer (n porsiyon); acıkınca biriniz yer
//   Tarif aşamalarla ilerler. A (hazırlık: doğrama, malzemeleri doğru sırayla koyma) yemeği başlatan,
//   B (ocak: karıştırma, pişirme süresini tutturma) partner; partner yoksa hepsini başlatan yapar.
//   Tezgah yukarıdan (kuşbakışı) çizilir: odanın içinden farklı bir bakış.
import { h, openSheet, toast } from '../ui.js';
import { onValue, set, update, now, runTransaction } from '../fb.js';
import { t } from '../i18n.js';
import { DECOR } from '../scenes.js';

export const RECIPES = {
  corba: { name: 'Mercimek çorbası', col: '#e0a040', stages: [
    { k: 'chop', who: 'A', items: ['Soğan', 'Havuç'], taps: 6 },
    { k: 'order', who: 'A', items: ['Yağ', 'Soğan', 'Havuç', 'Mercimek', 'Su'] },
    { k: 'stir', who: 'B', turns: 5 },
    { k: 'time', who: 'B', label: 'Kaynat', zone: [6, 8] },
  ] },
  kek: { name: 'Çikolatalı kek', col: '#7a4a2a', stages: [
    { k: 'order', who: 'A', items: ['Yumurta', 'Şeker', 'Süt', 'Un', 'Kakao'] },
    { k: 'stir', who: 'B', turns: 6 },
    { k: 'time', who: 'B', label: 'Fırında pişir', zone: [7, 9] },
  ] },
  menemen: { name: 'Menemen', col: '#e0473f', stages: [
    { k: 'chop', who: 'A', items: ['Biber', 'Domates'], taps: 5 },
    { k: 'order', who: 'A', items: ['Yağ', 'Biber', 'Domates', 'Yumurta'] },
    { k: 'stir', who: 'B', turns: 3 },
    { k: 'time', who: 'B', label: 'Pişir', zone: [4, 6] },
  ] },
  makarna: { name: 'Domatesli makarna', col: '#ffc93c', stages: [
    { k: 'order', who: 'A', items: ['Su', 'Tuz', 'Makarna'] },
    { k: 'time', who: 'B', label: 'Haşla', zone: [5, 7] },
    { k: 'chop', who: 'A', items: ['Domates', 'Sarımsak'], taps: 5 },
    { k: 'stir', who: 'B', turns: 4 },
  ] },
  pizza: { name: 'Pizza', col: '#e05a3a', stages: [
    { k: 'knead', who: 'A', taps: 10 },
    { k: 'chop', who: 'A', items: ['Domates', 'Mantar'], taps: 4 },
    { k: 'season', who: 'B', item: 'Kekik', n: 3 },
    { k: 'time', who: 'B', label: 'Fırında pişir', zone: [6, 8] },
    { k: 'plate', who: 'A', items: ['Zeytin', 'Fesleğen'], n: 6 },
  ] },
  krep: { name: 'Krep', col: '#f2c27a', stages: [
    { k: 'order', who: 'A', items: ['Yumurta', 'Süt', 'Un', 'Şeker'] },
    { k: 'stir', who: 'B', turns: 4 },
    { k: 'flip', who: 'B', n: 3 },
    { k: 'plate', who: 'A', items: ['Çilek', 'Bal'], n: 5 },
  ] },
  kofte: { name: 'Köfte', col: '#8a4a2a', stages: [
    { k: 'knead', who: 'A', taps: 8 },
    { k: 'season', who: 'A', item: 'Tuz', n: 2 },
    { k: 'flip', who: 'B', n: 4 },
  ] },
  salata: { name: 'Çoban salatası', col: '#5bbf5a', stages: [
    { k: 'chop', who: 'A', items: ['Domates', 'Salatalık', 'Soğan'], taps: 4 },
    { k: 'season', who: 'B', item: 'Tuz', n: 2 },
    { k: 'plate', who: 'B', items: ['Maydanoz', 'Limon'], n: 5 },
  ] },
};
const FRIDGE_MAX = 8;
const TIME_MAX = 10; // pişirme çubuğu 10 sn'de dolar; sonrası yanık
const STAGE_NAME = { chop: 'Doğra', order: 'Sırayla koy', stir: 'Karıştır', time: 'Süreyi tuttur', knead: 'Yoğur', season: 'Baharatla', flip: 'Çevir', plate: 'Süsle' };

export function createKitchen(ctx) {
  const { live, uid } = ctx;
  let hunger = {}, cook = null, body = null, stop = null, raf = 0, lastMeal = 0, fridge = {}, targets = [];
  const myHunger = () => hunger[uid] ?? 100;
  const chip = h('span', { class: 'chip hunger', title: t('Tokluk') });
  document.querySelector('#top .chips')?.prepend(chip);
  const showChip = () => { const v = Math.round(myHunger()); chip.textContent = `${t('Tokluk')} ${v}%`; chip.classList.toggle('warn', v < 25); };

  live.on('hunger', (v) => { hunger = v || {}; showChip(); });
  // Evde geçen her dakika acıkırsın (sekme açıkken)
  let warned = false;
  const tick = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const v = Math.max(0, myHunger() - 0.4);
    set(live.ref(`hunger/${uid}`), Math.round(v * 10) / 10);
    if (v < 25 && !warned) { warned = true; toast(t('Acıktın. Mutfakta birlikte bir şeyler pişirin!'), 5000); }
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
      if (cook.A === uid) { // yemeği başlatan kaydeder (anahtar başlama zamanı: aynı yemek iki kez girmez)
        live.stat('meals');
        set(live.ref(`fridge/${cook.at}`), { r: cook.r, stars: cook.stars || 1, n: 2, at: cook.at });
        const old = Object.values(fridge).sort((a, b) => a.at - b.at);
        while (old.length >= FRIDGE_MAX) set(live.ref(`fridge/${old.shift().at}`), null); // en eskiler yer açar
      }
      toast(t('{dish} hazır! {n}/3 yıldız. Buzdolabına kondu.', { dish: t(RECIPES[cook.r].name), n: cook.stars || 1 }), 4500);
    }
    // Yalnızca ilerleme değiştiyse ekranı baştan kurma (oynayanın mini oyunu sıfırlanmasın), çubuğu güncelle
    const key = cook ? `${cook.at}|${cook.s}|${cook.done}` : '';
    if (key === shownKey) { const m = body?.querySelector('.watch i'); if (m) m.style.width = (cook?.prog || 0) * 100 + '%'; return; }
    render();
  });
  let shownKey = null;
  live.on('fridge', (v) => {
    fridge = v || {};
    DECOR.fridgeFood = Object.values(fridge).sort((a, b) => a.at - b.at).slice(-5).map((x) => RECIPES[x.r]?.col || '#ccc');
    if (body && (!cook || cook.done)) render();
  });
  /** Buzdolabından bir porsiyon ye: tokluk dolar (yıldız arttıkça daha çok). */
  function eat(id) {
    const f = fridge[id];
    if (!f) return;
    if (myHunger() >= 95) return toast(t('Şu an tokum, sonra yerim.'));
    runTransaction(live.ref(`fridge/${id}`), (x) => (!x ? x : x.n > 1 ? { ...x, n: x.n - 1 } : null)).then(({ committed }) => {
      if (!committed) return;
      set(live.ref(`hunger/${uid}`), Math.min(100, myHunger() + 40 + (f.stars || 1) * 15));
      toast(t('Afiyet olsun! {n}/3 yıldız', { n: f.stars || 1 }), 3500);
    }).catch(() => {});
  }
  function fridgeBox() {
    const items = Object.entries(fridge).sort((a, b) => b[1].at - a[1].at);
    return h('div', { class: 'fridge' }, h('b', {}, t('Buzdolabı')),
      items.length ? h('div', { class: 'fridgelist' }, ...items.map(([id, f]) => h('div', { class: 'fitem' },
        h('i', { style: { background: RECIPES[f.r]?.col } }),
        h('span', {}, `${t(RECIPES[f.r]?.name || '')} · ${'\u2605'.repeat(f.stars || 1)} · ${t('{n} porsiyon', { n: f.n })}`),
        h('button', { onclick: () => eat(id) }, 'Ye'))))
        : h('p', { class: 'small' }, t('Buzdolabı boş. Pişirdiğiniz yemekler buraya girer; acıkınca yersiniz.')));
  }

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
    g.textAlign = 'center'; g.font = '600 16px "Pixelify Sans", monospace';
    if (c?.done) { g.fillStyle = '#fff6e8'; g.fillText(t(rec.name), 310, 104); }
    // Kesme tahtasında bu aşamanın malzemeleri (yazıyla)
    if (c && !c.done) { const st = rec.stages[c.s]; g.fillStyle = '#3a2418'; (st.items || []).slice(0, 5).forEach((it, i) => g.fillText(t(it), 90, 70 + i * 20)); }
    // Süsleme: tabakta beliren noktalar (dokununca kaybolur)
    for (const tg of targets) {
      const k = Math.min(1, (performance.now() - tg.born) / 200);
      g.fillStyle = tg.col; g.beginPath(); g.arc(tg.x, tg.y, 12 * k, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fff6e8'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1;
    }
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
      if (c?.done) body.append(h('p', { class: 'center' }, t('{dish} hazır! {n}/3 yıldız', { dish: t(RECIPES[c.r].name), n: c.stars || 1 })),
        fridge[c.at] ? h('div', { class: 'row center' }, h('button', { class: 'primary', onclick: () => eat(String(c.at)) }, 'Şimdi ye'), h('button', { onclick: () => set(live.ref('cook'), null) }, 'Buzdolabında kalsın')) : null);
      body.append(fridgeBox());
      body.append(h('p', { class: 'small center' }, t('Bir tarif seçin. Biriniz hazırlar (doğrar, malzemeleri sırayla koyar), diğeriniz ocağa bakar (karıştırır, pişirme süresini tutturur). Ne kadar iyi yaparsanız o kadar doyarsınız.')),
        h('div', { class: 'opts recipes' }, ...Object.entries(RECIPES).map(([id, r]) => h('button', { class: 'tile', onclick: () => start(id) }, h('b', {}, t(r.name)), h('small', {}, r.stages.map((s) => t(STAGE_NAME[s.k])).join(' → '))))));
      return;
    }
    const rec = RECIPES[c.r], st = rec.stages[c.s];
    const who = st.who === 'A' ? c.A : c.B, mine = who === uid;
    body.append(h('p', { class: 'center' }, `${t(rec.name)} · ${c.s + 1}/${rec.stages.length} · ${t(STAGE_NAME[st.k])}`));
    const area = h('div', { class: 'cookarea' });
    body.append(area, h('button', { class: 'link', onclick: () => set(live.ref('cook'), null) }, 'Yemeği bırak'));
    let stirA = 0;
    targets = [];
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
      const show = () => { btn.textContent = `${t(st.items[i])} (${n}/${st.taps})`; };
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
          else { mistakes++; b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); toast(t('Sıra yanlış. Tarifi hatırla!'), 1500); }
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
        if (s >= TIME_MAX) { done = true; toast(t('Yandı! Bir dahakine daha erken al.'), 2500); finishStage(0); return; }
        setTimeout(step, 50);
      };
      btn.onclick = () => {
        if (done) return; done = true;
        const s = (performance.now() - t0) / 1000, [lo, hi] = st.zone;
        const pts = s >= lo && s <= hi ? 2 : s >= lo - 1 && s <= hi + 1 ? 1 : 0;
        toast(pts === 2 ? t('Tam kıvamında!') : pts === 1 ? t('Fena değil') : s < lo ? t('Biraz çiğ kaldı') : t('Biraz fazla pişti'), 2000);
        finishStage(pts);
      };
      area.append(h('p', { class: 'small center' }, t('Çubuk yeşil bölgedeyken bas.')), bar, btn);
      step();
    } else if (st.k === 'knead') { // hamuru iki elle sırayla yoğur
      let n = 0, miss = 0, want = 0;
      const L = h('button', { class: 'big' }, 'Sol el'), Rb = h('button', { class: 'big' }, 'Sağ el');
      const show = () => { L.classList.toggle('primary', want === 0); Rb.classList.toggle('primary', want === 1); };
      const press = (side) => {
        if (n >= st.taps) return;
        if (side !== want) { miss++; return; }
        n++; want = 1 - want; sendProg(n / st.taps); show();
        if (n >= st.taps) finishStage(Math.max(0, 2 - Math.floor(miss / 2)));
      };
      L.onclick = () => press(0); Rb.onclick = () => press(1);
      show();
      area.append(h('p', { class: 'small center' }, t('Hamuru yoğur: parlayan ele sırayla dokun ({n} kez).', { n: st.taps })), h('div', { class: 'row center' }, L, Rb));
    } else if (st.k === 'season') { // tarifteki kadar tutam at; fazlası da azı da tadı bozar
      let n = 0;
      const cnt = h('b', {}, '0');
      const shake = h('button', { class: 'primary big' }, t('{item} at', { item: t(st.item) }));
      const ok = h('button', {}, 'Tamam, tadı yerinde');
      shake.onclick = () => { n++; cnt.textContent = String(n); sendProg(Math.min(1, n / st.n)); };
      ok.onclick = () => {
        shake.disabled = ok.disabled = true;
        const d = Math.abs(n - st.n);
        toast(d === 0 ? t('Tam kıvamında!') : n > st.n ? t('Biraz tuzlu oldu') : t('Biraz tatsız oldu'), 2000);
        finishStage(d === 0 ? 2 : d === 1 ? 1 : 0);
      };
      area.append(h('p', { class: 'small center' }, t('Tarif: {n} tutam {item}. Fazlası da azı da tadı bozar.', { n: st.n, item: t(st.item) })), h('p', { class: 'center' }, cnt), h('div', { class: 'row center' }, shake, ok));
    } else if (st.k === 'flip') { // ileri geri giden ibre yeşildeyken çevir; her seferinde hızlanır
      let hits = 0, tries = 0, speed = 0.9, done = false;
      const zone = [0.4, 0.6];
      const bar = h('div', { class: 'cookbar' }, h('span', { class: 'zone', style: { left: zone[0] * 100 + '%', width: (zone[1] - zone[0]) * 100 + '%' } }), h('b', { class: 'needle' }));
      const btn = h('button', { class: 'primary big' }, 'Çevir!');
      const tf = performance.now();
      const pos = () => { const ph = (((performance.now() - tf) / 1000) * speed) % 2; return ph < 1 ? ph : 2 - ph; };
      const step = () => { if (done || !document.body.contains(bar)) return; bar.querySelector('.needle').style.left = pos() * 100 + '%'; requestAnimationFrame(step); };
      btn.onclick = () => {
        if (done) return;
        const ps = pos(), hit = ps >= zone[0] && ps <= zone[1];
        tries++; if (hit) hits++; speed += 0.25;
        toast(hit ? t('Tam zamanında çevrildi!') : t('Biraz kaçtı'), 1200);
        sendProg(tries / st.n);
        if (tries >= st.n) { done = true; finishStage(hits === st.n ? 2 : hits >= st.n / 2 ? 1 : 0); }
      };
      area.append(h('p', { class: 'small center' }, t('İbre yeşil bölgedeyken çevir ({n} kez). Her seferinde hızlanır.', { n: st.n })), bar, btn);
      requestAnimationFrame(step);
    } else if (st.k === 'plate') { // tabakta beliren süslere zamanında dokun
      let got = 0, shown = 0, ended = false;
      const cols = ['#4fbf6a', '#ff4f7b', '#ffc93c', '#3a2a1a'];
      const end = () => { if (ended) return; ended = true; targets = []; finishStage(got >= st.n ? 2 : got >= st.n / 2 ? 1 : 0); };
      const spawn = () => {
        if (ended || !document.body.contains(canvas)) return;
        if (shown >= st.n) { if (!targets.length) end(); else setTimeout(spawn, 300); return; }
        shown++;
        const tg = { x: 50 + Math.random() * 300, y: 30 + Math.random() * 140, col: cols[shown % cols.length], born: performance.now() };
        targets.push(tg);
        setTimeout(() => { const i = targets.indexOf(tg); if (i >= 0) targets.splice(i, 1); }, 1500);
        setTimeout(spawn, 900);
      };
      canvas.style.touchAction = 'none';
      canvas.onpointerdown = (e) => {
        const b = canvas.getBoundingClientRect(), x = ((e.clientX - b.left) / b.width) * 400, y = ((e.clientY - b.top) / b.height) * 200;
        const i = targets.findIndex((tg) => Math.hypot(tg.x - x, tg.y - y) < 20);
        if (i >= 0) { targets.splice(i, 1); got++; sendProg(got / st.n); }
      };
      area.append(h('p', { class: 'small center' }, t('Yemeği süsle: tabakta beliren {list} noktalarına çabucak dokun.', { list: st.items.map((x) => t(x)).join(', ') })));
      setTimeout(spawn, 600);
    }
  }

  return { open, hunger: (who) => (who === 'me' ? myHunger() : hunger[ctx.partnerUid()] ?? 100), stop: () => clearInterval(tick) };
}
