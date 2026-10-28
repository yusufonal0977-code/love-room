// Oyun motoru: sahne çizimi, yürüme + yol bulma, kapılar, oturma, etkileşim, ışık, partner gösterimi.
import { R, characterSprites, catSprites, SUN_BADGE, MOON_BADGE } from './art.js';
import { SCENES, W, H } from './scenes.js';

const CELL = 4, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
const SPEED = 46; // piksel/sn

/** Saate göre gece karanlığı (0–0.62). */
export function nightLevel(h) {
  const pts = [[0, 0.62], [5, 0.62], [6.5, 0.35], [8, 0], [17, 0], [18.5, 0.2], [20, 0.45], [21.5, 0.6], [24, 0.62]];
  for (let i = 1; i < pts.length; i++) if (h <= pts[i][0]) {
    const [h0, v0] = pts[i - 1], [h1, v1] = pts[i];
    return v0 + ((v1 - v0) * (h - h0)) / (h1 - h0);
  }
  return 0.62;
}

export function createGame(opts) {
  const { canvas, overlay, stage } = opts;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const light = document.createElement('canvas');
  light.width = W; light.height = H;
  const keys = {};
  const cat = { sprites: catSprites('#f0a050'), x: 120, y: 120, dir: 1, t: 0, target: null, wait: 2, sit: false };
  let fade = 0, fadeTo = null;

  const me = {
    // Güneş solda, ay sağda doğar: ikisi üst üste binmesin
    scene: 'salon', x: opts.side === 'moon' ? 112 : 80, y: 118, dir: 'down', moving: false, t: 0, seat: -1, path: [], target: null, onArrive: null,
    look: opts.look, side: opts.side, name: opts.name,
  };
  const partner = { shown: false, scene: null, x: 0, y: 0, dir: 'down', moving: false, t: 0, seat: -1, look: null, side: 'moon', name: '' };

  // ---------- Yerleşim ----------
  function fit() {
    const avail = { w: innerWidth, h: innerHeight - (innerWidth < 700 ? 150 : 110) };
    const s = Math.min(avail.w / W, avail.h / H);
    stage.style.width = W * s + 'px';
    stage.style.height = H * s + 'px';
  }
  addEventListener('resize', fit); fit();

  // ---------- Çarpışma ve yol ----------
  const scene = () => SCENES[me.scene];
  const blockedIn = (sc, x, y) =>
    x < 4 || x > W - 4 || y > H - 2 ||
    sc.blocks.some(([bx, by, bw, bh]) => x + 4 > bx + 0.5 && x - 4 < bx + bw - 0.5 && y > by + 0.5 && y - 2 < by + bh - 0.5);
  const blocked = (x, y) => blockedIn(scene(), x, y);

  function findPath(sx, sy, tx, ty) {
    const key = (x, y) => y * GW + x;
    const cl = (v, m) => Math.max(0, Math.min(m - 1, Math.round(v / CELL)));
    const start = [cl(sx, GW), cl(sy, GH)];
    let goal = [cl(tx, GW), cl(ty, GH)];
    const free = (x, y) => !blocked(x * CELL, y * CELL);
    if (!free(...goal)) {
      let best = null, bd = 1e9;
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (free(x, y)) {
        const d = (x - goal[0]) ** 2 + (y - goal[1]) ** 2;
        if (d < bd) { bd = d; best = [x, y]; }
      }
      if (!best) return null;
      goal = best;
    }
    const prev = new Map([[key(...start), null]]), q = [start];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === goal[0] && y === goal[1]) break;
      for (const [dx, dy] of dirs) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || prev.has(k) || !free(nx, ny)) continue;
        if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
        prev.set(k, [x, y]); q.push([nx, ny]);
      }
    }
    if (!prev.has(key(...goal))) return null;
    const path = [];
    for (let c = goal; c; c = prev.get(key(...c))) path.unshift({ x: c[0] * CELL, y: c[1] * CELL });
    path.shift();
    if (path.length && !blocked(tx, ty)) path[path.length - 1] = { x: tx, y: ty };
    return path;
  }
  function walkTo(x, y, onArrive = null) {
    standUp();
    me.path = findPath(me.x, me.y, x, y) || [];
    me.target = me.path.shift() || null;
    me.onArrive = onArrive;
    if (!me.target && onArrive) onArrive();
  }

  // ---------- Etkileşim ----------
  const spotPos = (s) => (s.id === 'cat' ? { x: cat.x - 10, y: cat.y + 2 } : { x: s.x, y: s.y });
  function spotsHere() {
    return scene().spots.filter((s) => s.id !== 'cat' || scene().hasCat);
  }
  function nearestSpot() {
    let best = null, bd = 16;
    for (const s of spotsHere()) {
      const p = spotPos(s), d = Math.hypot(p.x - me.x, p.y - me.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
  function doSpot(s) {
    if (s.id === 'sofa' || s.id === 'bench' || s.id === 'armchair') return sitDown();
    if (s.id === 'cat') { fx('💗', cat.x, cat.y - 10); cat.sit = true; cat.wait = 3; opts.onCatPet?.(); return; }
    opts.onSpot?.(s.id, me.scene);
  }
  function interact() {
    if (me.seat >= 0) return standUp();
    const s = nearestSpot();
    if (s) doSpot(s);
  }
  function sitDown() {
    const seats = scene().seats;
    const taken = partner.shown && partner.scene === me.scene ? partner.seat : -1;
    const free = seats.findIndex((_, i) => i !== taken);
    if (free < 0) return opts.onToast?.('Burada yer yok 🙂');
    me.seat = free; me.x = seats[free].x; me.y = seats[free].y; me.dir = 'down'; me.target = null; me.path = [];
    changed();
    if (taken >= 0) opts.onTogether?.();
  }
  function standUp() {
    if (me.seat < 0) return;
    const sp = scene().spots.find((s) => s.id === 'sofa' || s.id === 'bench' || s.id === 'armchair');
    me.seat = -1;
    if (sp) { me.x = sp.x; me.y = sp.y; }
    changed();
  }

  // ---------- Girdi ----------
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e' || e.key === ' ') { e.preventDefault(); interact(); }
  });
  addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    if (me.seat >= 0) return standUp();
    const sc = scene();
    const catHit = sc.hasCat && Math.abs(x - cat.x) < 10 && Math.abs(y - cat.y + 4) < 9;
    const spot = catHit ? sc.spots.find((s) => s.id === 'cat') : sc.spots.find((s) => s.hit && x >= s.hit[0] && x <= s.hit[0] + s.hit[2] && y >= s.hit[1] && y <= s.hit[1] + s.hit[3]);
    const door = sc.doors.find((d) => x >= d.x - 8 && x <= d.x + d.w + 8 && y >= d.y - 8 && y <= d.y + d.h + 8);
    if (spot) { const p = spotPos(spot); walkTo(p.x, p.y, () => doSpot(spot)); }
    else if (door) walkTo(door.x + door.w / 2, door.y + door.h / 2);
    else walkTo(x, y);
  });

  // ---------- Güncelleme ----------
  let lastSent = 0, dirty = true;
  function changed() { dirty = true; }
  function report(now) {
    if (!dirty && now - lastSent < 2000) return;
    if (now - lastSent < 90) return;
    lastSent = now; dirty = false;
    opts.onPresence?.({ scene: me.scene, x: Math.round(me.x), y: Math.round(me.y), dir: me.dir, moving: me.moving, seat: me.seat });
  }

  function step(dt) {
    let vx = 0, vy = 0;
    if (keys.arrowleft || keys.a) vx -= 1;
    if (keys.arrowright || keys.d) vx += 1;
    if (keys.arrowup || keys.w) vy -= 1;
    if (keys.arrowdown || keys.s) vy += 1;
    if (vx || vy) { me.target = null; me.path = []; if (me.seat >= 0) standUp(); }
    if (!vx && !vy && me.target) {
      const dx = me.target.x - me.x, dy = me.target.y - me.y, d = Math.hypot(dx, dy);
      if (d < 1.5) {
        if (!blocked(me.target.x, me.target.y)) { me.x = me.target.x; me.y = me.target.y; }
        me.target = me.path.shift() || null;
        if (!me.target) { const cb = me.onArrive; me.onArrive = null; cb?.(); }
      } else { vx = dx / d; vy = dy / d; }
    }
    const wasMoving = me.moving;
    me.moving = !!(vx || vy) && me.seat < 0;
    if (wasMoving !== me.moving) changed();
    if (!me.moving) return;
    const len = Math.hypot(vx, vy), sp = SPEED * dt;
    const nx = me.x + (vx / len) * sp, ny = me.y + (vy / len) * sp;
    let okX = !blocked(nx, me.y), okY = !blocked(me.x, ny);
    if (me.target && !okX && !okY && !blocked(nx, ny)) okX = okY = true;
    if (okX) me.x = nx;
    if (okY) me.y = ny;
    if (!okX && !okY && me.target) { me.target = null; me.path = []; me.onArrive = null; }
    const nd = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
    if (nd !== me.dir) me.dir = nd;
    me.t += dt;
    changed();
    // Kapı
    const door = scene().doors.find((d) => me.x >= d.x && me.x <= d.x + d.w && me.y >= d.y && me.y <= d.y + d.h);
    if (door && !fadeTo) { fadeTo = door; fade = 0; }
  }

  function stepFade(dt) {
    if (!fadeTo) { fade = Math.max(0, fade - dt * 3); return; }
    fade += dt * 4;
    if (fade >= 1) {
      me.scene = fadeTo.to; me.x = fadeTo.spawn.x; me.y = fadeTo.spawn.y; me.dir = fadeTo.spawn.dir;
      me.target = null; me.path = []; me.seat = -1; fadeTo = null; fade = 1;
      changed();
      opts.onSceneChange?.(me.scene);
    }
  }

  function stepPartner(dt) {
    const p = opts.getPartner?.();
    partner.shown = !!p;
    if (!p) return;
    partner.look = p.look; partner.side = p.side; partner.name = p.name;
    if (partner.scene !== p.scene) { partner.scene = p.scene; partner.x = p.x; partner.y = p.y; }
    partner.seat = p.seat ?? -1; partner.dir = p.dir || 'down'; partner.moving = !!p.moving;
    const dx = p.x - partner.x, dy = p.y - partner.y, d = Math.hypot(dx, dy);
    if (d > 60 || partner.seat >= 0) { partner.x = p.x; partner.y = p.y; }
    else if (d > 0.5) { const s = Math.min(d, SPEED * 1.15 * dt); partner.x += (dx / d) * s; partner.y += (dy / d) * s; }
    if (partner.moving || d > 1) partner.t += dt;
  }

  function stepCat(dt) {
    if (!opts.isHost?.()) {
      const c = opts.getCat?.();
      if (c) { const d = Math.hypot(c.x - cat.x, c.y - cat.y); cat.dir = c.x > cat.x ? 1 : c.x < cat.x ? -1 : cat.dir; if (d > 40) { cat.x = c.x; cat.y = c.y; } else if (d > 0.3) { cat.x += (c.x - cat.x) * Math.min(1, dt * 4); cat.y += (c.y - cat.y) * Math.min(1, dt * 4); cat.t += dt; } cat.sit = !!c.sit; cat.target = d > 0.3 ? c : null; }
      return;
    }
    cat.t += dt;
    if (cat.sit) { cat.wait -= dt; if (cat.wait < 0) cat.sit = false; }
    else if (!cat.target) { cat.wait -= dt; if (cat.wait < 0) cat.target = { x: 20 + Math.random() * 150, y: 76 + Math.random() * 56 }; }
    else {
      const dx = cat.target.x - cat.x, dy = cat.target.y - cat.y, d = Math.hypot(dx, dy);
      if (d < 1) { cat.target = null; cat.wait = 2 + Math.random() * 4; if (Math.random() < 0.4) { cat.sit = true; cat.wait = 4; } }
      else {
        const nx = cat.x + (dx / d) * 22 * dt, ny = cat.y + (dy / d) * 22 * dt;
        if (blockedIn(SCENES.salon, nx, ny)) { cat.target = null; cat.wait = 1; } else { cat.x = nx; cat.y = ny; cat.dir = dx > 0 ? 1 : -1; }
      }
    }
    opts.onCat?.({ x: Math.round(cat.x), y: Math.round(cat.y), sit: cat.sit });
  }

  // ---------- Çizim ----------
  function personImg(p) {
    const sp = characterSprites(p.look);
    const f = (p.t * 6 | 0) % 2;
    if (p.seat >= 0) return sp.sit;
    if (p.dir === 'up') return p.moving && f ? sp.up2 : sp.up;
    if (p.dir === 'down') return p.moving && f ? sp.down2 : sp.down;
    if (p.dir === 'right') return p.moving && f ? sp.side2 : sp.side;
    return p.moving && f ? sp.side2L : sp.sideL;
  }
  function headY(p) { return p.y - personImg(p).height + (p.seat >= 0 ? 4 : 1); }
  function drawPerson(p) {
    const img = personImg(p);
    const x = Math.round(p.x - img.width / 2), y = Math.round(headY(p));
    if (p.seat < 0) R(ctx, p.x - 5, p.y - 1, 10, 2, 'rgba(30,15,5,0.3)');
    ctx.drawImage(img, x, y);
    const badge = p.side === 'moon' ? MOON_BADGE : SUN_BADGE;
    ctx.drawImage(badge, Math.round(p.x - badge.width / 2), y - badge.height - 1);
  }
  function drawCat() {
    const img = cat.sit ? cat.sprites.sit : (cat.dir > 0 ? cat.sprites.right : cat.sprites.left)[cat.target ? (cat.t * 6 | 0) % 2 : 0];
    R(ctx, cat.x - 5, cat.y - 1, 10, 2, 'rgba(30,15,5,0.3)');
    ctx.drawImage(img, Math.round(cat.x - img.width / 2), Math.round(cat.y - img.height + 1));
  }
  function drawLighting(sc, info) {
    const night = nightLevel(info.hour) * (sc.outdoor ? 0.85 : 1);
    const lights = sc.lights(info).filter(Boolean);
    const g = light.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    if (night > 0.02) {
      g.fillStyle = `rgba(16,12,46,${night})`; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'destination-out';
      for (const l of lights) {
        const grd = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
        grd.addColorStop(0, `rgba(0,0,0,${l.a})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(l.x, l.y, l.r, 0, Math.PI * 2); g.fill();
      }
      ctx.drawImage(light, 0, 0);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      const grd = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.85);
      grd.addColorStop(0, `rgba(${l.color},${0.1 + 0.16 * night})`); grd.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------- HTML katmanı ----------
  const el = (cls) => { const d = document.createElement('div'); d.className = cls; overlay.appendChild(d); return d; };
  const tagMe = el('tag'), tagP = el('tag'), prompt = el('prompt');
  const place = (node, x, y) => { node.style.left = (x / W) * 100 + '%'; node.style.top = (y / H) * 100 + '%'; };
  const voice = '<span class="voice"><i></i><i></i><i></i></span>';
  function updateOverlay(t) {
    place(tagMe, me.x, headY(me) - 9);
    tagMe.innerHTML = `${esc(me.name)}${opts.isTalking?.('me') ? voice : ''}${opts.micOff?.() ? ' 🔇' : ''}`;
    const pShown = partner.shown && partner.scene === me.scene;
    tagP.style.display = pShown ? '' : 'none';
    if (pShown) {
      place(tagP, partner.x, headY(partner) - 9);
      tagP.innerHTML = `${esc(partner.name)}${opts.isTalking?.('partner') ? voice : ''}`;
    }
    opts.placeVideo?.('me', me.x, headY(me) - 12, true);
    opts.placeVideo?.('partner', partner.x, pShown ? headY(partner) - 12 : 0, pShown);
    const s = me.seat < 0 && !me.target && !fadeTo ? nearestSpot() : null;
    prompt.style.display = s || me.seat >= 0 ? '' : 'none';
    if (me.seat >= 0) { place(prompt, me.x, headY(me) - 20); prompt.textContent = 'E · Kalk'; }
    else if (s) { const p = spotPos(s); place(prompt, p.x, p.y - 26); prompt.textContent = 'E · ' + s.label(opts.getShared()); }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  function fx(emoji, x, y) {
    const d = document.createElement('div');
    d.className = 'fx'; d.textContent = emoji;
    place(d, x + (Math.random() * 8 - 4), y);
    overlay.appendChild(d); setTimeout(() => d.remove(), 1600);
  }

  // ---------- Döngü ----------
  let last = performance.now(), running = true;
  function frame(nowMs) {
    if (!running) return;
    requestAnimationFrame(frame); // tek karelik bir hata döngüyü durdurmasın
    try { render(nowMs); } catch (e) { console.error(e); }
  }
  function render(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000), t = nowMs / 1000;
    last = nowMs;
    step(dt); stepFade(dt); stepPartner(dt); stepCat(dt); report(nowMs);
    const sc = scene();
    const info = { st: opts.getShared(), t, ...opts.getHours() };
    ctx.drawImage(sc.bg, 0, 0);
    sc.dyn?.(ctx, info);
    const ents = sc.props.map((p) => ({ y: p.y, d: () => p.draw(ctx, info) }));
    ents.push({ y: me.seat >= 0 ? me.y - 6 : me.y, d: () => drawPerson(me) });
    if (partner.shown && partner.scene === me.scene) ents.push({ y: partner.seat >= 0 ? partner.y - 6 : partner.y, d: () => drawPerson(partner) });
    if (sc.hasCat) ents.push({ y: cat.y, d: drawCat });
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
    drawLighting(sc, info);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
    updateOverlay(t);
  }
  requestAnimationFrame(frame);

  return {
    me,
    partner,
    fx,
    fxOn(who, emoji) {
      const p = who === 'me' ? me : partner;
      if (who === 'partner' && !(partner.shown && partner.scene === me.scene)) return false;
      fx(emoji, p.x, headY(p) - 4);
      return true;
    },
    setLook(look, side, name) { me.look = look; me.side = side; if (name) me.name = name; changed(); },
    near() { return partner.shown && partner.scene === me.scene && Math.hypot(partner.x - me.x, partner.y - me.y) < 26; },
    stop() { running = false; },
  };
}
