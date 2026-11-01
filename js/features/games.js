// Mini oyunlar: XOX, Hafıza (kart eşleştirme) ve balkondaki langırt.
//
// live/{rid}/games/xox  = { b: '.........', x: uid (X olan), turn: uid, win: 'x'|'o'|'draw'|null, line }
// live/{rid}/games/mem  = { deck: [16], open: [i], done: {i: uid}, turn, score: {uid: n} }
// live/{rid}/games/foos = { ball: {x,y,vx,vy,t}, rods: {uid: y}, score: {uid: n}, run, host }
import { h, icon, openSheet, toast } from '../ui.js';
import { db, ref as dbRef, onValue, set, update, now } from '../fb.js';
import { t } from '../i18n.js';

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const CARD_ICONS = ['heart', 'music', 'flower', 'paw', 'tv', 'book', 'jar', 'booth'];
const CARD_COLS = ['#ff4f7b', '#1db954', '#4fbf6a', '#ffc93c', '#5b8def', '#c8874f', '#8fd0ff', '#ff7a59'];

export function createGames(ctx) {
  const { live, uid } = ctx;
  let body = null, stopSub = null, foosLoop = null;
  const pu = () => ctx.partnerUid() || 'bot';
  const close = () => { stopSub?.(); stopSub = null; cancelAnimationFrame(foosLoop); foosLoop = null; body = null; };

  function openHub() {
    const b = openSheet({ title: 'Oyun masası', iconName: 'game', onClose: close });
    b.append(
      h('button', { class: 'tile', onclick: openXox }, h('b', {}, 'XOX'), h('small', {}, 'Klasik üçlü; sıra sizde.')),
      h('button', { class: 'tile', onclick: openMem }, h('b', {}, 'Hafıza'), h('small', {}, 'Kartları eşleştir, en çok çifti bulan kazanır.')),
      h('button', { class: 'tile', onclick: openFoos }, h('b', {}, 'Langırt'), h('small', {}, 'Balkondaki masada gerçek zamanlı maç (5 golde biter).')),
      h('button', { class: 'tile', onclick: openPool }, h('b', {}, 'Bilardo'), h('small', {}, 'Klasik 8 top: biri düzleri, biri çizgilileri sokar; 8 en son. Partnerinle ya da botla.')),
    );
  }

  // ---------- XOX ----------
  function openXox() {
    body = openSheet({ title: 'XOX', iconName: 'game', onClose: close });
    const ref = live.ref('games/xox');
    stopSub = onValue(ref, (s) => {
      const g = s.val();
      body.innerHTML = '';
      if (!g) { body.append(h('button', { class: 'primary', onclick: () => newXox() }, 'Oyunu başlat')); return; }
      const mark = (u) => (u === g.x ? 'X' : 'O');
      const myTurn = g.turn === uid && !g.win;
      body.append(h('p', { class: 'center' }, g.win ? (g.win === 'draw' ? t('Berabere') : (g.win === 'x') === (g.x === uid) ? t('Kazandın') : t('{name} kazandı', { name: ctx.partnerName() })) : myTurn ? t('Sıra sende ({mark})', { mark: mark(uid) }) : t('{name} düşünüyor…', { name: ctx.partnerName() })));
      const grid = h('div', { class: 'xox' });
      [...g.b].forEach((c, i) => grid.append(h('button', {
        class: (c === 'x' ? 'x' : c === 'o' ? 'o' : '') + (g.line?.includes?.(i) ? ' win' : ''),
        disabled: !myTurn || c !== '.',
        onclick: () => playXox(g, i),
      }, c === '.' ? '' : c.toUpperCase())));
      body.append(grid, h('button', { onclick: () => newXox(g) }, 'Yeni oyun'));
    });
  }
  function newXox(prev) {
    const starter = prev?.turn === uid ? pu() : uid;
    set(live.ref('games/xox'), { b: '.........', x: starter, turn: starter, win: null });
  }
  function playXox(g, i) {
    const b = [...g.b];
    b[i] = g.x === uid ? 'x' : 'o';
    const s = b.join('');
    const line = LINES.find((l) => l.every((k) => s[k] === b[i]));
    const win = line ? b[i] : !s.includes('.') ? 'draw' : null;
    update(live.ref('games/xox'), { b: s, turn: pu(), win, line: line || null });
    if (win && win !== 'draw') live.stat('wins');
  }

  // ---------- Hafıza ----------
  function openMem() {
    body = openSheet({ title: 'Hafıza', iconName: 'game', wide: true, onClose: close });
    const ref = live.ref('games/mem');
    stopSub = onValue(ref, (s) => {
      const g = s.val();
      body.innerHTML = '';
      if (!g) { body.append(h('button', { class: 'primary', onclick: newMem }, 'Kartları dağıt')); return; }
      const done = g.done || {}, open = g.open || [];
      const finished = Object.keys(done).length === 16;
      const sc = g.score || {};
      body.append(h('p', { class: 'center' }, finished
        ? ((sc[uid] || 0) === (sc[pu()] || 0) ? t('Berabere') : (sc[uid] || 0) > (sc[pu()] || 0) ? t('Kazandın') : t('{name} kazandı', { name: ctx.partnerName() }))
        : g.turn === uid ? t('Sıra sende: iki kart aç') : t('{name} oynuyor…', { name: ctx.partnerName() })),
      h('p', { class: 'center small' }, `${ctx.myName()} ${sc[uid] || 0} · ${sc[pu()] || 0} ${ctx.partnerName()}`));
      const grid = h('div', { class: 'mem' });
      g.deck.forEach((c, i) => {
        const up = done[i] || open.includes(i);
        grid.append(h('button', {
          class: up ? 'up' : '', style: up ? { background: CARD_COLS[c] } : {},
          html: up ? icon(CARD_ICONS[c]) : '',
          disabled: up || g.turn !== uid || open.length >= 2 || finished,
          onclick: () => flip(g, i),
        }));
      });
      body.append(grid, h('button', { onclick: newMem }, 'Yeniden dağıt'));
    });
  }
  function newMem() {
    const deck = [...Array(8).keys(), ...Array(8).keys()].sort(() => Math.random() - 0.5);
    set(live.ref('games/mem'), { deck, open: null, done: null, turn: uid, score: null });
  }
  function flip(g, i) {
    const open = [...(g.open || []), i];
    update(live.ref('games/mem'), { open });
    if (open.length < 2) return;
    setTimeout(() => {
      const [a, b] = open;
      if (g.deck[a] === g.deck[b]) {
        const done = { ...(g.done || {}), [a]: uid, [b]: uid };
        const score = { ...(g.score || {}), [uid]: (g.score?.[uid] || 0) + 1 };
        update(live.ref('games/mem'), { open: null, done, score });
        if (Object.keys(done).length === 16 && score[uid] > (score[pu()] || 0)) live.stat('wins');
      } else update(live.ref('games/mem'), { open: null, turn: pu() });
    }, 900);
  }

  // ---------- Langırt ----------
  // Saha 400×240. İki oyuncu da masadaysa oda kurucusu solda oynar ve topu o simüle eder;
  // partner masada değilse bu cihaz topu yönetir ve sağda bot oynar.
  // live/{rid}/games/foos/here/{uid} = son görülme (masada mı?), kick/{uid} = son vuruş zamanı
  const FW = 400, FH = 240, GOAL = [80, 160], BR = 6, KICK_MS = 260, WIN = 5;
  // Çubuk: x, adam sayısı, adam aralığı, merkez y aralığı, sahibi ('L' | 'R'), vuruş yönü
  const RODS = [[36, 1, 0, [70, 170], 'L', 1], [130, 3, 62, [72, 168], 'R', -1], [270, 3, 62, [72, 168], 'L', 1], [364, 1, 0, [70, 170], 'R', -1]];
  function openFoos() {
    body = openSheet({ title: 'Langırt', iconName: 'game', wide: true, onClose: close });
    const canvas = h('canvas', { width: FW, height: FH, class: 'foos' });
    const info = h('p', { class: 'center foos-score' });
    const kickBtn = h('button', { class: 'primary foos-kick', onpointerdown: (e) => { e.preventDefault(); kick(); } }, 'Vur!');
    const hint = h('p', { class: 'small center' });
    body.append(info, canvas, h('div', { class: 'row' }, kickBtn, h('button', { onclick: () => newMatch() }, 'Yeni maç')), hint);
    const g = canvas.getContext('2d');
    let st = null, myY = FH / 2, sentY = -1, lastSend = 0, lastBall = 0, lastHere = 0, myKick = 0, botY = FH / 2, botKick = 0, flash = null, mode = '';
    let ball = { x: 200, y: 120, vx: 0, vy: 0, go: 0 };
    const partnerHere = () => { const p = ctx.partnerUid(); return !!(ctx.partnerOnline() && p && st?.here?.[p] && now() - st.here[p] < 3500); };
    const roles = () => {
      const duo = partnerHere();
      const meLeft = duo ? ctx.isHost() : true;
      const opp = duo ? ctx.partnerUid() : 'bot';
      return { duo, auth: meLeft, L: meLeft ? uid : opp, R: meLeft ? opp : uid, opp, meLeft };
    };
    const goals = (x) => Object.values(x?.score || {}).reduce((a, v) => a + v, 0);
    stopSub = onValue(live.ref('games/foos'), (s) => {
      const prev = st;
      st = s.val();
      if (!roles().auth && st?.ball) {
        const b = st.ball, dt = Math.max(0, (now() - Math.max(b.t || now(), b.go || 0)) / 1000);
        ball = { x: b.x + b.vx * dt, y: b.y + b.vy * dt, vx: b.vx, vy: b.vy, go: b.go || 0 };
      }
      // Gol olunca iki ekranda da "GOL!" yazısı
      if (prev && goals(st) > goals(prev)) flash = { text: t('GOL!'), until: performance.now() + 1100 };
    });

    function sendBall() {
      lastBall = performance.now();
      set(live.ref('games/foos/ball'), { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy), go: ball.go || 0, t: now() });
    }
    function serve(dir) {
      ball = { x: 200, y: 120, vx: 190 * dir, vy: (Math.random() - 0.5) * 120, go: now() + 1300 };
      sendBall();
    }
    function newMatch() {
      update(live.ref('games/foos'), { score: null, run: true, host: uid });
      serve(Math.random() < 0.5 ? -1 : 1);
    }
    function kick() {
      myKick = performance.now();
      set(live.ref(`games/foos/kick/${uid}`), now());
    }

    // Girdi: fare/parmak saha üzerinde gezinince çubuklar takip eder; dokunmak/tıklamak vuruş yapar.
    const setY = (y) => { myY = Math.max(0, Math.min(FH, y)); };
    const yOf = (e) => { const r = canvas.getBoundingClientRect(); return ((e.clientY - r.top) / r.height) * FH; };
    canvas.onpointerdown = (e) => { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch { /* sentetik olay */ } setY(yOf(e)); kick(); };
    canvas.onpointermove = (e) => setY(yOf(e));
    const keys = {};
    const kd = (e) => {
      if (e.target.closest?.('input, textarea')) return;
      const k = e.key.toLowerCase();
      if (e.type === 'keydown' && [' ', 'd', 'arrowright', 'arrowleft'].includes(k)) { e.preventDefault(); if (!e.repeat) kick(); }
      if (['w', 's', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
      keys[k] = e.type === 'keydown';
    };
    addEventListener('keydown', kd); addEventListener('keyup', kd);
    const oldStop = stopSub;
    stopSub = () => { oldStop(); removeEventListener('keydown', kd); removeEventListener('keyup', kd); };

    // Parmağın tüm saha yüksekliği, her çubuğun kendi hareket aralığına yayılır
    const rodY = (r, v) => r[3][0] + (v / FH) * (r[3][1] - r[3][0]);
    const yFor = (side, R) => (side === (R.meLeft ? 'L' : 'R') ? myY : R.opp === 'bot' ? botY : st?.rods?.[R.opp] ?? FH / 2);
    const men = (r, R) => { const c = rodY(r, yFor(r[4], R)); return r[1] === 1 ? [c] : [c - r[2], c, c + r[2]]; };
    const kicking = (side, R) => {
      if (side === (R.meLeft ? 'L' : 'R')) return performance.now() - myKick < KICK_MS;
      if (R.opp === 'bot') return performance.now() - botKick < KICK_MS;
      const k = st?.kick?.[R.opp];
      return !!k && now() - k < KICK_MS + 120;
    };

    function physics(dt, R) {
      if (st && st.run === false) { ball.vx = ball.vy = 0; return; }
      if (ball.go && now() < ball.go) return;
      const steps = 4, hdt = dt / steps; // hızlı top adamların içinden geçmesin
      for (let i = 0; i < steps; i++) {
        ball.x += ball.vx * hdt; ball.y += ball.vy * hdt;
        if (ball.y < BR) { ball.y = BR; ball.vy = Math.abs(ball.vy); }
        if (ball.y > FH - BR) { ball.y = FH - BR; ball.vy = -Math.abs(ball.vy); }
        for (const r of RODS) for (const my of men(r, R)) {
          if (Math.abs(ball.x - r[0]) >= 7 + BR || Math.abs(ball.y - my) >= 11 + BR) continue;
          const front = Math.sign(ball.vx) !== r[5] || Math.abs(ball.vx) < 80;
          const k = kicking(r[4], R);
          if (!front && !k) continue;
          ball.vx = r[5] * (k ? 520 : Math.min(400, Math.max(210, Math.abs(ball.vx) * 1.04)));
          ball.vy = (ball.y - my) * 10 + (Math.random() - 0.5) * 50;
          ball.x = r[0] + r[5] * (8 + BR);
          if (R.auth) sendBall();
        }
        if (ball.x < BR || ball.x > FW - BR) {
          const inGoal = ball.y > GOAL[0] && ball.y < GOAL[1];
          if (inGoal) {
            if (R.auth) goal(ball.x < BR ? R.R : R.L, ball.x < BR ? -1 : 1);
            else { ball.vx = ball.vy = 0; } // skoru topu yöneten cihaz yazar
            return;
          }
          ball.vx = -ball.vx; ball.x = Math.max(BR, Math.min(FW - BR, ball.x));
          if (R.auth) sendBall();
        }
      }
      if (Math.abs(ball.vx) < 120) ball.vx = (ball.vx < 0 ? -1 : 1) * 120; // top hiç durmasın
    }
    function goal(who, dir) {
      const sc = { ...(st?.score || {}) }; sc[who] = (sc[who] || 0) + 1;
      const over = sc[who] >= WIN;
      update(live.ref('games/foos'), { score: sc, run: !over });
      if (over && who === uid) live.stat('wins');
      if (over) { ball = { x: 200, y: 120, vx: 0, vy: 0, go: 0 }; sendBall(); }
      else serve(dir); // gol yiyen taraf servis alır
    }
    function bot(dt) {
      // Topun geleceği yüksekliğe gider; top yakına gelince vurur
      const want = ball.vx > 0 ? ball.y : FH / 2 + (ball.y - FH / 2) * 0.5;
      const r = RODS[1], target = ((want - r[3][0]) / (r[3][1] - r[3][0])) * FH;
      botY += Math.sign(target - botY) * Math.min(Math.abs(target - botY), 190 * dt);
      botY = Math.max(0, Math.min(FH, botY));
      const near = RODS.some((q) => q[4] === 'R' && q[0] - ball.x > 0 && q[0] - ball.x < 26);
      if (ball.vx > 0 && near && performance.now() - botKick > 600 && Math.random() < 0.08) botKick = performance.now();
    }

    let last = performance.now();
    function tick() {
      foosLoop = requestAnimationFrame(tick);
      const tm = performance.now(), dt = Math.min(0.033, (tm - last) / 1000);
      last = tm;
      const R = roles(), m = R.duo ? 'duo' : 'bot';
      if (m !== mode) {
        hint.textContent = t(R.meLeft ? 'Fareni/parmağını sahada yukarı aşağı gezdir; dokun ya da boşluğa bas: vur! Sen soldasın (kırmızı).' : 'Fareni/parmağını sahada yukarı aşağı gezdir; dokun ya da boşluğa bas: vur! Sen sağdasın (mavi).');
        if (mode && R.auth) newMatch(); // partner masaya geldi/gitti: yeni maç
        if (m === 'bot' && mode) toast(t('Partnerin masada değil; bota karşı oynuyorsun'));
        mode = m;
      }
      if (keys.w || keys.arrowup) setY(myY - 300 * dt);
      if (keys.s || keys.arrowdown) setY(myY + 300 * dt);
      if (tm - lastHere > 1000) { lastHere = tm; set(live.ref(`games/foos/here/${uid}`), now()); }
      if (tm - lastSend > 60 && Math.abs(myY - sentY) > 0.5) { lastSend = tm; sentY = myY; set(live.ref(`games/foos/rods/${uid}`), Math.round(myY)); }
      if (R.opp === 'bot') bot(dt);
      physics(dt, R);
      if (R.auth && st?.run && tm - lastBall > 80) sendBall();
      draw(R);
    }

    function man(x, y, col, dir, k) {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x - 5, y - 9, 14, 22);
      g.fillStyle = col; g.fillRect(x - 7, y - 11, 14, 22);
      g.fillStyle = '#ffe0c7'; g.fillRect(x - 4, y - 9, 8, 7);
      g.fillStyle = '#26160f'; g.fillRect(x - 2, y - 7, 1, 2); g.fillRect(x + 1, y - 7, 1, 2);
      // Ayak: vururken öne savrulur
      if (k) g.fillRect(dir > 0 ? x + 7 : x - 15, y + 2, 8, 5); else g.fillRect(x - 3, y + 8, 6, 3);
    }
    function draw(R) {
      g.fillStyle = '#3fae5a'; g.fillRect(0, 0, FW, FH);
      g.fillStyle = '#4fbf6a'; for (let x = 0; x < FW; x += 50) g.fillRect(x, 0, 25, FH);
      g.strokeStyle = '#e8ffe8'; g.lineWidth = 2; g.strokeRect(1, 1, FW - 2, FH - 2); g.beginPath(); g.moveTo(200, 0); g.lineTo(200, FH); g.stroke();
      g.beginPath(); g.arc(200, 120, 30, 0, Math.PI * 2); g.stroke();
      g.strokeRect(1, GOAL[0] - 20, 40, GOAL[1] - GOAL[0] + 40); g.strokeRect(FW - 41, GOAL[0] - 20, 40, GOAL[1] - GOAL[0] + 40);
      g.fillStyle = '#fff3dc'; g.fillRect(0, GOAL[0], 5, GOAL[1] - GOAL[0]); g.fillRect(FW - 5, GOAL[0], 5, GOAL[1] - GOAL[0]);
      const mySide = R.meLeft ? 'L' : 'R';
      for (const r of RODS) {
        g.fillStyle = r[4] === mySide ? '#fff6d8' : '#a9aeb8'; g.fillRect(r[0] - 1, 0, 3, FH);
        const k = kicking(r[4], R);
        for (const my of men(r, R)) man(r[0], my, r[4] === 'L' ? '#e0473f' : '#5b8def', r[5], k);
      }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(ball.x + 2, ball.y + 2, BR, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#26160f'; g.lineWidth = 1; g.stroke();
      // Ortadaki yazılar: geri sayım / gol / maç sonu
      const big = (text, col = '#fff6d8') => {
        g.font = 'bold 34px Nunito, sans-serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(20,10,5,0.7)';
        g.strokeText(text, 200, 132); g.fillStyle = col; g.fillText(text, 200, 132);
      };
      const sc = st?.score || {};
      const nameOf = (u) => (u === uid ? ctx.myName() : u === 'bot' ? 'Bot' : ctx.partnerName());
      if (st && st.run === false) {
        const w = (sc[R.L] || 0) >= WIN ? R.L : R.R;
        big(w === uid ? t('Kazandın') : t('{name} kazandı', { name: nameOf(w) }), '#fcdf4b');
      } else if (flash && performance.now() < flash.until) big(flash.text, '#fcdf4b');
      else if (ball.go && now() < ball.go) big(String(Math.ceil((ball.go - now()) / 450)));
      info.textContent = `${nameOf(R.L)} ${sc[R.L] || 0} – ${sc[R.R] || 0} ${nameOf(R.R)}`;
    }
    tick();
    // Topu bu cihaz yönetiyorsa ve süren maç yoksa başlat
    setTimeout(() => {
      if (!body) return;
      const R = roles();
      if (R.opp === 'bot') toast(t('Partnerin masada değil; bota karşı oynuyorsun'));
      if (R.auth && (!st?.run || !st?.ball)) newMatch();
    }, 500);
  }

  // ---------- Bilardo (klasik 8 top) ----------
  // Kurallar: açık masada ilk sokulan top oyuncunun grubunu belirler (1-7 düz, 9-15 çizgili). Önce kendi grubuna değmek
  // gerekir; beyaz topu sokmak, hiçbir topa değmemek ya da önce rakip gruba/8'e değmek fauldür (sıra geçer, beyaz başa döner).
  // Kendi grubundan top sokan tekrar vurur. 8 en son sokulur: grubunu bitirip faulsüz sokan kazanır, erken ya da faulle sokan kaybeder.
  // Oyuncular: host (masayı açan) ve opp (partner, bot ya da katılan admin). Admin odasındaki masa ortaktır
  // (admin/config/pool): bir admin açar, diğeri "Oyuna katıl" der, odadaki herkes canlı izler.
  // Sırayla oynanır. Vuran cihaz vuruşu (açı, güç, başlangıç konumları) yazar; iki cihaz da aynı simülasyonu oynatır,
  // vuruş bitince vuran sonucu (toplar, sıra, skor) yazar. Top sokan tekrar vurur; beyaz top girerse sıra geçer.
  // Bütün renkli toplar girince en çok top sokan kazanır. Partner yoksa tek başına antrenman.
  // live/{rid}/games/pool = { balls: [[x,y,in]], turn, score: {uid: n}, shot: {a, p, by, n, from}, n }
  const PW = 400, PH = 220, PR = 8, POCKETS = [[14, 14], [200, 8], [386, 14], [14, 206], [200, 212], [386, 206]];
  // 0 beyaz, 1-7 düz, 8 siyah, 9-15 çizgili (aynı renkler)
  const BALL_COLS = ['#ffffff', '#ffc93c', '#5b8def', '#e0473f', '#9b6bff', '#ff7a59', '#3fb7a4', '#9c3d2a', '#1a1210', '#ffc93c', '#5b8def', '#e0473f', '#9b6bff', '#ff7a59', '#3fb7a4', '#9c3d2a'];
  // Standart üçgen dizilim: 5 sıra; 8 numara üçüncü sıranın ortasında, düz ve çizgili toplar karışık
  const RACK_ORDER = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  const rack = () => {
    const b = Array(16), d = PR * 2 + 0.4;
    b[0] = [100, 110, 0];
    let k = 0;
    for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) b[RACK_ORDER[k++]] = [Math.round((290 + row * d * 0.866) * 10) / 10, Math.round((110 + (i - row / 2) * d) * 10) / 10, 0];
    return b;
  };
  /** Bot: bir top ve cebi seçip "hayalet top" noktasına nişan alır; biraz şaşırır ki hep sokmasın. */
  const groupOf = (k) => (k >= 1 && k <= 7 ? 'solid' : k >= 9 ? 'stripe' : k === 8 ? 'eight' : null);
  const groupLeft = (balls, grp) => balls.filter(([, , inn], k) => !inn && groupOf(k) === grp).length;
  /** Oyuncunun şu an hedefleyebileceği toplar: grubu yoksa 8 dışı hepsi, grubu bittiyse 8, yoksa kendi grubu. */
  const targets = (balls, grp) => (k) => (!grp ? k !== 8 && k > 0 : groupLeft(balls, grp) === 0 ? k === 8 : groupOf(k) === grp);
  function botShot(balls, grp) {
    const [cx, cy] = balls[0];
    const ok = targets(balls, grp);
    let best = null;
    balls.forEach(([x, y, inn], k) => {
      if (!k || inn || !ok(k)) return;
      for (const [px, py] of POCKETS) {
        const tx = px - x, ty = py - y, tl = Math.hypot(tx, ty);
        const gx = x - (tx / tl) * PR * 2, gy = y - (ty / tl) * PR * 2; // beyaz topun değmesi gereken nokta
        const ax = gx - cx, ay = gy - cy, al = Math.hypot(ax, ay);
        const cut = Math.abs(Math.atan2(ty, tx) - Math.atan2(ay, ax)) % (2 * Math.PI);
        const cost = Math.min(cut, 2 * Math.PI - cut) * 120 + al * 0.3 + tl * 0.2;
        if (!best || cost < best.cost) best = { cost, a: Math.atan2(ay, ax), d: al + tl };
      }
    });
    if (!best) return { a: Math.random() * Math.PI * 2, p: 400 };
    return { a: best.a + (Math.random() - 0.5) * 0.09, p: Math.min(900, 260 + best.d * 1.6) };
  }
  /** Belirlenimci simülasyon: her adımda dt sabit; iki cihazda aynı sonucu verir. onStep(çizim için) isteğe bağlı. */
  function simulate(from, a, p, onFrame) {
    const balls = from.map(([x, y, inn]) => ({ x, y, vx: 0, vy: 0, in: !!inn }));
    balls[0].vx = Math.cos(a) * p; balls[0].vy = Math.sin(a) * p;
    const potted = [];
    const frames = [];
    let first = null; // beyazın ilk değdiği top
    for (let step = 0; step < 3000; step++) {
      let moving = false;
      for (const b of balls) {
        if (b.in) continue;
        b.x += b.vx / 120; b.y += b.vy / 120;
        b.vx *= 0.988; b.vy *= 0.988;
        if (Math.hypot(b.vx, b.vy) < 4) b.vx = b.vy = 0; else moving = true;
        if (b.x < 14 + PR) { b.x = 14 + PR; b.vx = Math.abs(b.vx) * 0.85; }
        if (b.x > PW - 14 - PR) { b.x = PW - 14 - PR; b.vx = -Math.abs(b.vx) * 0.85; }
        if (b.y < 14 + PR) { b.y = 14 + PR; b.vy = Math.abs(b.vy) * 0.85; }
        if (b.y > PH - 14 - PR) { b.y = PH - 14 - PR; b.vy = -Math.abs(b.vy) * 0.85; }
        if (POCKETS.some(([px, py]) => Math.hypot(b.x - px, b.y - py) < 15)) { b.in = true; b.vx = b.vy = 0; potted.push(balls.indexOf(b)); }
      }
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const A = balls[i], B = balls[j];
        if (A.in || B.in) continue;
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
        if (d >= PR * 2 || d === 0) continue;
        if (first === null && i === 0) first = j;
        const nx = dx / d, ny = dy / d, over = (PR * 2 - d) / 2;
        A.x -= nx * over; A.y -= ny * over; B.x += nx * over; B.y += ny * over;
        const rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
        if (rel <= 0) continue;
        A.vx -= rel * nx; A.vy -= rel * ny; B.vx += rel * nx; B.vy += rel * ny;
      }
      if (step % 2 === 0) frames.push(balls.map((b) => [b.x, b.y, b.in ? 1 : 0]));
      if (!moving) break;
    }
    const end = balls.map((b) => [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, b.in ? 1 : 0]);
    return { end, potted, frames, first };
  }
  function openPool(opts) {
    const admin = opts?.admin === true;
    const DENEME = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('tvdeneme');
    const poolRef = admin ? dbRef(db, DENEME ? 'admin/config/pooltest' : 'admin/config/pool') : live.ref('games/pool');
    body = openSheet({ title: 'Bilardo', iconName: 'game', wide: true, onClose: close });
    const canvas = h('canvas', { width: PW, height: PH, class: 'foos pool' });
    const info = h('p', { class: 'center foos-score' }), hint = h('p', { class: 'small center' });
    const joinBtn = h('button', { class: 'primary', hidden: true, onclick: () => update(poolRef, { opp: uid, [`names/${uid}`]: ctx.myName() }) }, 'Oyuna katıl');
    const botBtn = h('button', { hidden: true, onclick: () => update(poolRef, { opp: 'bot' }) }, 'Bota karşı');
    body.append(info, canvas, h('div', { class: 'row' }, joinBtn, botBtn, h('button', { onclick: () => {
      if (admin && st?.opp && !st.over && st.host !== uid && st.opp !== uid && !confirm(t('Masada oyun sürüyor. Sıfırlansın mı?'))) return;
      newGame();
    } }, 'Yeni oyun')), hint);
    const g = canvas.getContext('2d');
    let st = null, anim = null, aim = null, lastShot = 0, raf = 0, botTimer = null;
    // Partner çevrimiçiyse onunla, değilse bota karşı (bot hamlelerini bu cihaz yapar)
    const duo = () => !!(ctx.partnerOnline() && ctx.partnerUid());
    const opp = () => (duo() ? ctx.partnerUid() : 'bot');
    const nameOf = (u) => (u === uid ? ctx.myName() : u === 'bot' ? 'Bot' : st?.names?.[u] || (admin ? '?' : ctx.partnerName()));
    const otherOf = (u) => (u === st.host ? st.opp : st.host);
    const myTurn = () => st && !st.over && st.opp && st.turn === uid;
    function newGame() { set(poolRef, { v: 9, balls: rack(), turn: uid, host: uid, opp: admin ? null : opp(), names: { [uid]: ctx.myName() }, grp: null, win: null, shot: null, over: false, n: 0 }); }
    function shoot(by, a, p) {
      const n = (st.n || 0) + 1;
      update(poolRef, { n, shot: { a, p, by, n, from: st.balls } });
    }
    function botTurn() {
      clearTimeout(botTimer);
      if (!st || st.over || st.turn !== 'bot' || st.shot || st.host !== uid) return; // botu masayı açan cihaz oynatır
      botTimer = setTimeout(() => { if (st && st.turn === 'bot' && !st.shot) { const b = botShot(st.balls, st.grp?.bot); shoot('bot', b.a, b.p); } }, 1300);
    }
    stopSub = onValue(poolRef, (s) => {
      st = s.val();
      if (!st) return;
      // Eski kayıt ya da (çift masasında) partner geldi/gitti: yeni oyun
      const stale = st.balls?.length !== 16 || st.v !== 9;
      if (stale || (!admin && !st.shot && (st.opp === 'bot') === duo())) { newGame(); return; }
      const sh = st.shot;
      if (sh && sh.n > lastShot) {
        lastShot = sh.n;
        const r = simulate(sh.from, sh.a, sh.p);
        anim = { frames: r.frames, i: 0 };
        if (sh.by === uid || (sh.by === 'bot' && st.host === uid)) { // vuran (ya da botu yöneten bu cihaz) sonucu yazar
          const who = sh.by, other = otherOf(who);
          const grp = { ...(st.grp || {}) }, mine = grp[who];
          const pots = r.potted.filter((k) => k > 0 && k !== 8);
          const cleared = mine && groupLeft(sh.from, mine) === 0; // vuruştan önce grubu bitmiş miydi
          // Faul nedeni
          let why = r.potted.includes(0) ? t('beyaz top deliğe girdi.') : r.first === null ? t('hiçbir topa değmedi.')
            : !targets(sh.from, mine)(r.first) ? (r.first === 8 && !cleared ? t('8 numaralı top en son sokulur; önce kendi grubunu bitir.') : t('önce kendi grubuna değmeliydin.')) : null;
          // Açık masa: ilk sokulan top grubu belirler (faulsüz)
          if (!mine && !why && pots.length) { const gg = groupOf(pots[0]); grp[who] = gg; grp[other] = gg === 'solid' ? 'stripe' : 'solid'; }
          const end = r.end.map((b, k) => (k === 0 && b[2] ? [100, 110, 0] : b)); // faulde beyaz başa döner
          let win = null;
          if (r.potted.includes(8)) win = cleared && !why ? who : other; // 8: grubunu bitirip faulsüz sokan kazanır, değilse kaybeder
          const ownPot = pots.some((k) => groupOf(k) === grp[who]);
          const next = !why && ownPot ? who : other;
          setTimeout(() => update(poolRef, { balls: end, grp, turn: win ? st.turn : next, win, over: !!win, shot: null }), Math.max(300, r.frames.length * 16));
          if (win) toast(win === who ? t('8 numarayı soktu, oyunu kazandı: {name}', { name: nameOf(who) }) : t('8 numara erken girdi, oyunu kaybetti: {name}', { name: nameOf(who) }), 4000);
          else if (why) toast(t('Faul: {why} Sıra geçti, beyaz top başa döndü.', { why }), 3500);
          if (win === uid) live.stat('wins');
        }
      } else if (!sh) anim = null;
      if (!sh && (st.n || 0) > lastShot) lastShot = st.n;
      botTurn();
    });
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * PW, ((e.clientY - r.top) / r.height) * PH]; };
    canvas.onpointerdown = (e) => { if (!myTurn() || anim) return; e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch { /* sentetik olay */ } aim = pos(e); };
    canvas.onpointermove = (e) => { if (aim) aim = pos(e); };
    canvas.onpointerup = () => {
      if (!aim || !st) return;
      const cue = st.balls[0], dx = cue[0] - aim[0], dy = cue[1] - aim[1], d = Math.hypot(dx, dy);
      aim = null;
      if (d < 6) return;
      shoot(uid, Math.atan2(dy, dx), Math.min(900, d * 7));
    };
    function draw() {
      raf = requestAnimationFrame(draw);
      g.fillStyle = '#6b3e22'; g.fillRect(0, 0, PW, PH);
      g.fillStyle = '#2f8f5a'; g.fillRect(12, 12, PW - 24, PH - 24);
      g.fillStyle = '#3fa86a'; g.fillRect(16, 16, PW - 32, PH - 32);
      g.fillStyle = '#1a1210'; for (const [x, y] of POCKETS) { g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); }
      if (!st) { info.textContent = ''; return; }
      let balls = st.balls;
      if (anim) { balls = anim.frames[Math.min(anim.i, anim.frames.length - 1)]; anim.i++; }
      balls.forEach(([x, y, inn], k) => {
        if (inn) return;
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(x + 2, y + 2, PR, 0, Math.PI * 2); g.fill();
        g.fillStyle = BALL_COLS[k]; g.beginPath(); g.arc(x, y, PR, 0, Math.PI * 2); g.fill();
        if (k > 8) { g.fillStyle = '#fffaf0'; g.fillRect(x - PR + 2, y - PR + 2, PR * 2 - 4, 3); g.fillRect(x - PR + 2, y + PR - 5, PR * 2 - 4, 3); } // çizgili
        if (k === 8) { g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - 3, y - 4, 2, 2);
      });
      if (aim && !anim) { // isteka: parmağı beyaz toptan geriye çek
        const [cx, cy] = st.balls[0], dx = cx - aim[0], dy = cy - aim[1], d = Math.hypot(dx, dy) || 1;
        g.strokeStyle = 'rgba(255,255,255,0.55)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + (dx / d) * 160, cy + (dy / d) * 160); g.stroke(); g.setLineDash([]);
        g.strokeStyle = '#e0b25a'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - (dx / d) * (12 + Math.min(d, 120) * 0.4), cy - (dy / d) * (12 + Math.min(d, 120) * 0.4)); g.lineTo(cx - (dx / d) * 150, cy - (dy / d) * 150); g.stroke(); g.lineWidth = 1;
      }
      const A = st.host, o = st.opp, grp = st.grp || {};
      joinBtn.hidden = !(admin && !o && A !== uid);
      botBtn.hidden = !(admin && !o && A === uid);
      const label = (u) => (grp[u] ? `${t(grp[u] === 'solid' ? 'Düzler' : 'Çizgililer')}, ${t('kalan {n}', { n: groupLeft(st.balls, grp[u]) })}` : '');
      info.textContent = `${nameOf(A)}${grp[A] ? ' (' + label(A) + ')' : ''}  –  ${o ? nameOf(o) + (grp[o] ? ' (' + label(o) + ')' : '') : '…'}`;
      hint.textContent = !o ? t(A === uid ? 'Rakip bekleniyor: başka bir admin "Oyuna katıl" diyebilir ya da bota karşı oyna.' : '{name} masayı açtı, rakip bekliyor.', { name: nameOf(A) })
        : st.over ? (st.win === uid ? t('Kazandın') : t('{name} kazandı', { name: nameOf(st.win) }))
        : myTurn() ? (grp[uid] ? t('Sıra sende ({group}): beyaz toptan geriye çek ve bırak.', { group: t(grp[uid] === 'solid' ? 'Düzler' : 'Çizgililer') }) : t('Açık masa: ilk sokan grubunu seçer') + ' · ' + t('Sıra sende: parmağını/fareni beyaz toptan geriye çek ve bırak. Ne kadar çekersen o kadar sert.'))
        : t('{name} nişan alıyor…', { name: nameOf(st.turn) });
    }
    draw();
    const oldStop = stopSub;
    stopSub = () => { oldStop(); cancelAnimationFrame(raf); clearTimeout(botTimer); };
    setTimeout(() => { if (body && !st) newGame(); if (body && !admin && !duo()) toast(t('Partnerin çevrimiçi değil; bota karşı oynuyorsun')); }, 600);
  }

  return { openHub, openXox, openMem, openFoos, openPool };
}
