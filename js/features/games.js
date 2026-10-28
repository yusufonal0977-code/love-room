// Mini oyunlar: XOX, Hafıza (kart eşleştirme) ve balkondaki langırt.
//
// live/{rid}/games/xox  = { b: '.........', x: uid (X olan), turn: uid, win: 'x'|'o'|'draw'|null, line }
// live/{rid}/games/mem  = { deck: [16], open: [i], done: {i: uid}, turn, score: {uid: n} }
// live/{rid}/games/foos = { ball: {x,y,vx,vy,t}, rods: {uid: y}, score: {uid: n}, run, host }
import { h, icon, openSheet, toast } from '../ui.js';
import { onValue, set, update, now } from '../fb.js';

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
      body.append(h('p', { class: 'center' }, g.win ? (g.win === 'draw' ? 'Berabere 🤝' : `${(g.win === 'x') === (g.x === uid) ? 'Kazandın' : ctx.partnerName() + ' kazandı'} 🎉`) : myTurn ? `Sıra sende (${mark(uid)})` : `${ctx.partnerName()} düşünüyor…`));
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
        ? ((sc[uid] || 0) === (sc[pu()] || 0) ? 'Berabere 🤝' : (sc[uid] || 0) > (sc[pu()] || 0) ? 'Kazandın 🎉' : `${ctx.partnerName()} kazandı 🎉`)
        : g.turn === uid ? 'Sıra sende: iki kart aç' : `${ctx.partnerName()} oynuyor…`),
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
  // Saha 400×240. Odayı kuran (host) solda oynar ve topu o simüle eder; diğeri sağda.
  const FW = 400, FH = 240, GOAL = [80, 160], BR = 6;
  function openFoos() {
    body = openSheet({ title: 'Langırt', iconName: 'game', wide: true, onClose: close });
    // Partner odada değilse bota karşı oynanır ve topu bu cihaz yönetir
    const online = ctx.partnerOnline();
    const opp = online ? ctx.partnerUid() : 'bot';
    const host = ctx.isHost() || !online;
    const canvas = h('canvas', { width: FW, height: FH, class: 'foos' });
    const info = h('p', { class: 'center' });
    body.append(info, canvas, h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => reset(true) }, 'Yeni maç')), h('p', { class: 'small center' }, 'Parmağını/fareni yukarı aşağı kaydır ya da W/S tuşlarıyla çubuklarını oynat. Sen ' + (host ? 'soldasın (kırmızı).' : 'sağdasın (mavi).')));
    const g = canvas.getContext('2d');
    let st = null, myY = 120, lastSend = 0, ball = { x: 200, y: 120, vx: 0, vy: 0 }, scored = 0;
    const left = host ? uid : opp, right = host ? opp : uid;
    const rodsOf = (who) => (who === uid ? myY : st?.rods?.[who] ?? 120);
    stopSub = onValue(live.ref('games/foos'), (s) => {
      st = s.val();
      if (!host && st?.ball) { const b = st.ball, dt = Math.max(0, (now() - (b.t || now())) / 1000); ball = { x: b.x + b.vx * dt, y: b.y + b.vy * dt, vx: b.vx, vy: b.vy }; }
    });
    function reset(full) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const b = { x: 200, y: 120, vx: 170 * dir, vy: (Math.random() - 0.5) * 140, t: now() };
      ball = { ...b };
      update(live.ref('games/foos'), { ball: b, ...(full ? { score: null, run: true } : {}), host: uid });
    }
    const setY = (y) => { myY = Math.max(30, Math.min(FH - 30, y)); };
    canvas.onpointerdown = canvas.onpointermove = (e) => { if (e.buttons || e.pointerType === 'touch') { const r = canvas.getBoundingClientRect(); setY(((e.clientY - r.top) / r.height) * FH); } };
    const keys = {};
    const kd = (e) => { keys[e.key.toLowerCase()] = e.type === 'keydown'; };
    addEventListener('keydown', kd); addEventListener('keyup', kd);
    const oldStop = stopSub;
    stopSub = () => { oldStop(); removeEventListener('keydown', kd); removeEventListener('keyup', kd); };

    // Çubuklar: [x, adam sayısı, kime ait, yön]
    const rods = () => [[40, 1, left, 1], [130, 3, right, -1], [270, 3, left, 1], [360, 1, right, -1]];
    const men = (r) => { const y = rodsOf(r[2]) ?? 120; return r[1] === 1 ? [y] : [y - 62, y, y + 62]; };
    let last = performance.now();
    function tick() {
      foosLoop = requestAnimationFrame(tick);
      const t = performance.now(), dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      if (keys.w || keys.arrowup) setY(myY - 260 * dt);
      if (keys.s || keys.arrowdown) setY(myY + 260 * dt);
      if (performance.now() - lastSend > 60) { lastSend = performance.now(); set(live.ref(`games/foos/rods/${uid}`), Math.round(myY)); }
      if (opp === 'bot') { const by = st?.rods?.bot ?? 120; set(live.ref('games/foos/rods/bot'), Math.round(by + Math.sign(ball.y - by) * Math.min(Math.abs(ball.y - by), 150 * dt))); }
      // Fizik (host) / tahmin (diğeri)
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y < BR || ball.y > FH - BR) { ball.vy *= -1; ball.y = Math.max(BR, Math.min(FH - BR, ball.y)); }
      if (host && st?.run) {
        for (const r of rods()) for (const my of men(r)) {
          const hit = Math.abs(ball.x - r[0]) < 8 + BR && Math.abs(ball.y - my) < 11 + BR;
          if (hit && (Math.sign(ball.vx) !== r[3] || Math.abs(ball.vx) < 60)) {
            ball.vx = r[3] * Math.min(430, Math.max(240, Math.abs(ball.vx) * 1.08));
            ball.vy = (ball.y - my) * 9 + (Math.random() - 0.5) * 40;
            ball.x = r[0] + r[3] * (9 + BR);
            send();
          }
        }
        const inGoal = ball.y > GOAL[0] && ball.y < GOAL[1];
        if (ball.x < BR || ball.x > FW - BR) {
          if (inGoal && performance.now() - scored > 800) {
            scored = performance.now();
            const who = ball.x < BR ? right : left;
            const sc = { ...(st.score || {}) }; sc[who] = (sc[who] || 0) + 1;
            const over = sc[who] >= 5;
            update(live.ref('games/foos'), { score: sc, run: !over });
            if (over) live.stat('wins');
            reset(false);
          } else { ball.vx *= -1; ball.x = Math.max(BR, Math.min(FW - BR, ball.x)); send(); }
        }
        if (performance.now() - lastBall > 90) send();
      }
      draw();
    }
    let lastBall = 0;
    function send() { lastBall = performance.now(); set(live.ref('games/foos/ball'), { x: Math.round(ball.x), y: Math.round(ball.y), vx: Math.round(ball.vx), vy: Math.round(ball.vy), t: now() }); }
    function draw() {
      g.fillStyle = '#3fae5a'; g.fillRect(0, 0, FW, FH);
      g.fillStyle = '#4fbf6a'; for (let x = 0; x < FW; x += 50) g.fillRect(x, 0, 25, FH);
      g.strokeStyle = '#e8ffe8'; g.lineWidth = 2; g.strokeRect(1, 1, FW - 2, FH - 2); g.beginPath(); g.moveTo(200, 0); g.lineTo(200, FH); g.stroke();
      g.beginPath(); g.arc(200, 120, 30, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#fff3dc'; g.fillRect(0, GOAL[0], 4, GOAL[1] - GOAL[0]); g.fillRect(FW - 4, GOAL[0], 4, GOAL[1] - GOAL[0]);
      for (const r of rods()) {
        g.fillStyle = '#c8ccd4'; g.fillRect(r[0] - 1, 0, 3, FH);
        for (const my of men(r)) { g.fillStyle = r[2] === left ? '#e0473f' : '#5b8def'; g.fillRect(r[0] - 7, my - 11, 14, 22); g.fillStyle = '#ffe0c7'; g.fillRect(r[0] - 4, my - 9, 8, 6); }
      }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ball.x, ball.y, BR, 0, Math.PI * 2); g.fill();
      const sc = st?.score || {};
      info.textContent = `🔴 ${host ? ctx.myName() : ctx.partnerName()} ${sc[left] || 0} – ${sc[right] || 0} ${host ? (opp === 'bot' ? 'Bot' : ctx.partnerName()) : ctx.myName()} 🔵${st && st.run === false ? '  · Maç bitti!' : ''}`;
    }
    if (opp === 'bot') toast('Partnerin yokken bota karşı oynuyorsun 🤖');
    tick();
    if (host && !st?.run) setTimeout(() => !st?.run && reset(true), 400);
  }

  return { openHub, openXox, openMem, openFoos };
}
