// Oyun motoru: sahne çizimi, yürüme + yol bulma, kapılar, oturma, etkileşim, ışık, partner gösterimi,
// tam ekran kamera, sarılma/öpücük animasyonları ve eşya taşıma (dekor) modu.
import { R, characterSprites, petSprites, drawPetAcc, SUN_BADGE, MOON_BADGE, HEART, HEART_BIG, SPARK } from './art.js';
import { t } from './i18n.js';
import { DECOR, SCENES, W, H, WALL, bump, layout, lightsOf } from './scenes.js';

const CELL = 4, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
const SPEED = 46; // piksel/sn
const EMO_DUR = 3.2; // sarılma/öpücük süresi (sn)

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
  const cat = { x: 120, y: 120, dir: 1, t: 0, target: null, wait: 2, sit: false };
  let fade = 0, fadeTo = null;

  const me = {
    // Güneş solda, ay sağda doğar: ikisi üst üste binmesin
    scene: 'salon', x: opts.side === 'moon' ? 112 : 80, y: 136, dir: 'up', moving: false, t: 0, seat: -1, path: [], target: null, onArrive: null,
    look: opts.look, side: opts.side, name: opts.name,
  };
  const partner = { shown: false, scene: null, x: 0, y: 0, dir: 'down', moving: false, t: 0, seat: -1, look: null, side: 'moon', name: '' };

  // ---------- Yerleşim: tam ekran + takip eden kamera ----------
  let scale = 4, targetScale = 4, cine = false, zoom = localStorage.getItem('lr.zoom') || 'cover';
  const TV = [73, 13, 46, 26]; // salondaki TV ekranı: sinema modunda kamera buraya yaklaşır
  const cam = { x: 0, y: 0, snap: true };
  const setSize = () => { stage.style.width = W * scale + 'px'; stage.style.height = H * scale + 'px'; };
  function fit() {
    const vw = innerWidth, vh = innerHeight;
    if (cine) { targetScale = Math.min((vw * 0.74) / TV[2], ((vh - 170) * 0.58) / TV[3]); return; } // TV yakın, oda da görünür
    const contain = Math.min(vw / W, vh / H), cover = Math.max(vw / W, vh / H);
    // Yatay ekranda oda neredeyse tamamen görünür (az kırpma); dikey telefonda oda ekranı doldurur, kamera seni takip eder.
    targetScale = zoom === 'contain' ? Math.min(vw / W, (vh - 120) / H) : vw >= vh ? Math.min(cover, contain * 1.12) : Math.min(cover, vw / (W * 0.56));
    if (cam.snap) { scale = targetScale; setSize(); }
  }
  addEventListener('resize', () => { cam.snap = true; fit(); }); fit();
  function camera(dt) {
    // Yakınlaştırma yumuşak geçsin (sinema moduna girip çıkarken)
    if (scale !== targetScale) {
      const prev = scale;
      scale = cam.snap || Math.abs(targetScale - scale) < 0.02 ? targetScale : scale + (targetScale - scale) * Math.min(1, dt * 5);
      // ekranın ortası aynı noktada kalsın
      cam.x = innerWidth / 2 - ((innerWidth / 2 - cam.x) / prev) * scale; cam.y = innerHeight / 2 - ((innerHeight / 2 - cam.y) / prev) * scale;
      setSize();
    }
    const vw = innerWidth, vh = innerHeight, sw = W * scale, sh = H * scale;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const focusX = cine ? TV[0] + TV[2] / 2 : me.x;
    const tx = sw <= vw ? (vw - sw) / 2 : clamp(vw / 2 - focusX * scale, vw - sw, 0);
    // Kanepede TV'ye dönük oturunca kamera TV'yi de gösterecek şekilde yukarı kayar
    const focusY = cine ? TV[1] + TV[3] / 2 : seatOf(me)?.pose === 'back' ? 64 : me.y - 24;
    const ty = sh <= vh ? (vh - sh) / 2 : clamp((cine ? (vh - 80) / 2 : vh / 2) - focusY * scale, vh - sh, 0);
    const k = cam.snap ? 1 : Math.min(1, dt * 4);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.snap = false;
    stage.style.transform = `translate(${Math.round(cam.x)}px, ${Math.round(cam.y)}px)`;
  }

  // ---------- Çarpışma ve yol ----------
  const scene = () => SCENES[me.scene];
  const lay = () => layout(scene());
  const blockedIn = (sc, x, y) =>
    x < 4 || x > W - 4 || y > H - 2 ||
    layout(sc).blocks.some(([bx, by, bw, bh]) => x + 4 > bx + 0.5 && x - 4 < bx + bw - 0.5 && y > by + 0.5 && y - 2 < by + bh - 0.5);
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
  function walkTo(x, y, onArrive = null, door = null) {
    standUp();
    me.doorIntent = door; // yalnızca kapıya dokununca oda değişir; yürürken kapının önünden geçmek değiştirmez
    me.path = findPath(me.x, me.y, x, y) || [];
    me.target = me.path.shift() || null;
    me.onArrive = onArrive;
    if (!me.target && onArrive) onArrive();
  }

  // ---------- Etkileşim ----------
  const spotPos = (s) => (s.id === 'cat' ? { x: cat.x - 10, y: cat.y + 2 } : { x: s.x, y: s.y });
  function spotsHere() {
    return lay().spots.filter((s) => s.id !== 'cat' || scene().hasCat);
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
    if (s.id === 'sit') return sitDown(s.group);
    if (s.id === 'cat') { fx('💗', cat.x, cat.y - 10); cat.sit = true; cat.wait = 3; }
    opts.onSpot?.(s.id, s);
  }
  function interact() {
    if (opts.blockInput?.()) return;
    if (me.seat >= 0) return standUp();
    const s = nearestSpot();
    if (s) doSpot(s);
  }
  function sitDown(group) {
    const seats = lay().seats;
    const taken = partner.shown && partner.scene === me.scene ? partner.seat : -1;
    const free = seats.findIndex((s, i) => s.group === group && i !== taken);
    if (free < 0) return opts.onToast?.(t('Burada yer yok 🙂'));
    const s = seats[free];
    me.seat = free; me.x = s.x; me.y = s.y; me.dir = s.pose === 'back' ? 'up' : 'down'; me.target = null; me.path = [];
    changed();
    if (taken >= 0 && seats[taken]?.group === group) opts.onTogether?.();
  }
  function standUp() {
    if (me.seat < 0) return;
    const group = lay().seats[me.seat]?.group;
    const sp = lay().spots.find((s) => s.id === 'sit' && s.group === group);
    me.seat = -1;
    if (sp) { me.x = sp.x; me.y = sp.y; }
    changed();
  }

  // ---------- Dekor modu (eşya taşıma) ----------
  let edit = null; // { sel, drag }
  function pickDecor(x, y) {
    const l = lay();
    const inR = (r) => r && x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
    for (const it of [...l.items].reverse()) if (inR([it.x - it.c.w / 2, it.y - it.c.h, it.c.w, it.c.h])) return { kind: 'item', key: it.key, it };
    for (const p of [...l.props].sort((a, b) => b.sortY - a.sortY)) if (p.movable && inR(p.hit)) return { kind: 'prop', id: p.id, p };
    return null;
  }
  function editDown(x, y) {
    const pick = pickDecor(x, y);
    edit.sel = pick;
    opts.onDecorSelect?.(pick);
    if (!pick) return;
    const base = pick.kind === 'item' ? { x: pick.it.x, y: pick.it.y } : { ...(DECOR.moved[me.scene]?.[pick.id] || { dx: 0, dy: 0 }) };
    edit.drag = { sx: x, sy: y, base, moved: false };
  }
  function editMove(x, y) {
    const d = edit?.drag;
    if (!d) return;
    const ddx = Math.round(x - d.sx), ddy = Math.round(y - d.sy);
    if (Math.abs(ddx) + Math.abs(ddy) > 1) d.moved = true;
    const sel = edit.sel;
    if (sel.kind === 'item') {
      const it = DECOR.items[me.scene][sel.key];
      it.x = Math.max(8, Math.min(W - 8, d.base.x + ddx));
      it.y = sel.it.c.wall ? Math.max(sel.it.c.h + 2, Math.min(WALL - 4, d.base.y + ddy)) : Math.max(WALL + 8, Math.min(H - 2, d.base.y + ddy));
    } else {
      (DECOR.moved[me.scene] ??= {})[sel.id] = { dx: Math.max(-160, Math.min(160, d.base.dx + ddx)), dy: Math.max(-60, Math.min(60, d.base.dy + ddy)) };
    }
    bump();
  }
  function editUp() {
    const d = edit?.drag;
    if (!d) return;
    edit.drag = null;
    if (!d.moved) return;
    const sel = edit.sel;
    if (sel.kind === 'item') { const it = DECOR.items[me.scene][sel.key]; opts.onDecorMove?.({ kind: 'item', scene: me.scene, key: sel.key, x: it.x, y: it.y }); }
    else opts.onDecorMove?.({ kind: 'prop', scene: me.scene, id: sel.id, ...DECOR.moved[me.scene][sel.id] });
  }

  // ---------- Girdi ----------
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || opts.blockInput?.()) return;
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'e' || e.key === ' ') { e.preventDefault(); interact(); }
  });
  addEventListener('keyup', (e) => (keys[e.key.toLowerCase()] = false));
  addEventListener('blur', () => Object.keys(keys).forEach((k) => (keys[k] = false)));
  const toWorld = (e) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = toWorld(e);
    if (edit) { try { canvas.setPointerCapture(e.pointerId); } catch { /* sentetik olay */ } return editDown(x, y); }
    if (me.seat >= 0) return standUp();
    const sc = scene(), l = lay();
    const catHit = sc.hasCat && Math.abs(x - cat.x) < 10 && Math.abs(y - cat.y + 4) < 9;
    const inHit = (s) => s.hit && x >= s.hit[0] && x <= s.hit[0] + s.hit[2] && y >= s.hit[1] && y <= s.hit[1] + s.hit[3];
    const spot = catHit ? l.spots.find((s) => s.id === 'cat') : l.spots.filter(inHit).sort((a, b) => a.hit[2] * a.hit[3] - b.hit[2] * b.hit[3])[0];
    const door = sc.doors.find((d) => x >= d.x - 4 && x <= d.x + d.w + 4 && y >= d.y - 4 && y <= d.y + d.h + 4);
    if (spot) { const p = spotPos(spot); walkTo(p.x, p.y, () => doSpot(spot)); }
    else if (door) walkTo(door.x + door.w / 2, door.y + door.h / 2, null, door);
    else walkTo(x, y);
  });
  canvas.addEventListener('pointermove', (e) => edit && editMove(...toWorld(e)));
  canvas.addEventListener('pointerup', () => edit && editUp());
  canvas.addEventListener('pointercancel', () => edit && editUp());

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
    if (!edit) {
      if (keys.arrowleft || keys.a) vx -= 1;
      if (keys.arrowright || keys.d) vx += 1;
      if (keys.arrowup || keys.w) vy -= 1;
      if (keys.arrowdown || keys.s) vy += 1;
    }
    const byKeys = !!(vx || vy);
    if (byKeys) { me.target = null; me.path = []; me.doorIntent = null; if (me.seat >= 0) standUp(); }
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
    if (door && !fadeTo && (byKeys || me.doorIntent === door)) { fadeTo = door; fade = 0; me.doorIntent = null; }
  }

  function stepFade(dt) {
    if (!fadeTo) { fade = Math.max(0, fade - dt * 3); return; }
    fade += dt * 4;
    if (fade >= 1) {
      me.scene = fadeTo.to; me.x = fadeTo.spawn.x; me.y = fadeTo.spawn.y; me.dir = fadeTo.spawn.dir;
      me.target = null; me.path = []; me.seat = -1; fadeTo = null; fade = 1; cam.snap = true;
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
    const area = SCENES.salon.catArea;
    if (cat.sit) { cat.wait -= dt; if (cat.wait < 0) cat.sit = false; }
    else if (!cat.target) { cat.wait -= dt; if (cat.wait < 0) cat.target = { x: area[0] + Math.random() * area[2], y: area[1] + Math.random() * area[3] }; }
    else {
      const dx = cat.target.x - cat.x, dy = cat.target.y - cat.y, d = Math.hypot(dx, dy);
      if (d < 1) { cat.target = null; cat.wait = 2 + Math.random() * 4; if (Math.random() < 0.4 || lastNight > 0.4) { cat.sit = true; cat.wait = lastNight > 0.4 ? 20 : 4; } }
      else {
        const nx = cat.x + (dx / d) * 22 * dt, ny = cat.y + (dy / d) * 22 * dt;
        if (blockedIn(SCENES.salon, nx, ny)) { cat.target = null; cat.wait = 1; } else { cat.x = nx; cat.y = ny; cat.dir = dx > 0 ? 1 : -1; }
      }
    }
    opts.onCat?.({ x: Math.round(cat.x), y: Math.round(cat.y), sit: cat.sit });
  }

  // ---------- Sarılma / öpücük ----------
  let emo = null; // { kind, t0 }
  let lastNight = 0;
  const parts = [];
  function burst(x, y, n, big) {
    for (let i = 0; i < n; i++) parts.push({ img: big && i === 0 ? HEART_BIG : i % 4 === 3 ? SPARK : HEART, x: x + (Math.random() * 14 - 7), y: y - Math.random() * 4, vx: Math.random() * 10 - 5, vy: -14 - Math.random() * 16, life: 1.4 + Math.random() * 0.8, t: 0 });
  }
  const together = () => partner.shown && partner.scene === me.scene && Math.hypot(partner.x - me.x, partner.y - me.y) < 30;
  function emote(kind) {
    if (!together()) return false;
    emo = { kind, t0: performance.now() / 1000 };
    return true;
  }
  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 6 * dt; p.vx *= 0.98;
      if (p.t > p.life) parts.splice(i, 1);
    }
  }

  // ---------- Çizim ----------
  const seatOf = (p) => (p.seat >= 0 ? layout(SCENES[p.scene] || scene()).seats[p.seat] : null);
  function personImg(p, face, pose) {
    const sp = characterSprites(p.look);
    const f = (p.t * 6 | 0) % 2;
    const seat = seatOf(p);
    if (seat) return seat.pose === 'back' ? sp.sitBack : sp.sit;
    if (pose === 'kiss') return face === 'right' ? sp.kissR : sp.kissL;
    if (pose === 'hug') return face === 'right' ? sp.hugR : sp.hugL;
    const dir = face || p.dir, mv = !face && p.moving;
    if (dir === 'up') return mv && f ? sp.up2 : sp.up;
    if (dir === 'down') return mv && f ? sp.down2 : sp.down;
    if (dir === 'right') return mv && f ? sp.side2 : sp.side;
    return mv && f ? sp.side2L : sp.sideL;
  }
  function headY(p) { return p.y - personImg(p).height + (p.seat >= 0 ? 4 : 1); }
  function drawPerson(p, at) {
    const img = personImg(p, at?.face, at?.pose);
    const px = at ? at.x + (at.lean ? (at.face === 'right' ? at.lean : -at.lean) : 0) : p.x, py = at ? at.y : p.y;
    const x = Math.round(px - img.width / 2), y = Math.round(py - img.height + (p.seat >= 0 ? 4 : 1) - (at?.lift || 0));
    if (p.seat < 0) R(ctx, px - 5, py - 1, 10, 2, 'rgba(30,15,5,0.3)');
    ctx.drawImage(img, x, y);
    if (!at?.pose) {
      const badge = p.side === 'moon' ? MOON_BADGE : SUN_BADGE;
      ctx.drawImage(badge, Math.round(px - badge.width / 2), y - badge.height - 1);
    }
  }
  /** Sarılma kolu: omuzdan partnerin sırtına uzanan kıyafet renginde kol, ucunda el. */
  function drawArm(p, at) {
    const sp = characterSprites(p.look).down.getContext('2d');
    const shirt = sp.getImageData(4, 11, 1, 1).data, skin = sp.getImageData(1, 11, 1, 1).data;
    const img = personImg(p, at.face, 'hug');
    const top = Math.round(at.y - img.height + 1) + 11;
    const x0 = Math.round(at.x), x1 = Math.round(at.armTo);
    const lo = Math.min(x0, x1), w = Math.abs(x1 - x0);
    const row = at.face === 'right' ? 0 : 2; // iki kol üst üste binmesin
    R(ctx, lo, top + row, w, 2, `rgb(${shirt[0]},${shirt[1]},${shirt[2]})`);
    R(ctx, x1 - (x1 > x0 ? 1 : 0), top + row, 2, 2, `rgb(${skin[0]},${skin[1]},${skin[2]})`);
  }
  function drawCat() {
    const pet = DECOR.pet;
    const sp = petSprites(pet.species, pet.color);
    // Gece ve boşta: kıvrılıp uyur
    const sleeping = !cat.target && lastNight > 0.4 && cat.sit;
    const img = cat.sit ? sp.sit : (cat.dir > 0 ? sp.right : sp.left)[cat.target ? (cat.t * 6 | 0) % 2 : 0];
    const x0 = Math.round(cat.x - img.width / 2), y0 = Math.round(cat.y - img.height + 1);
    R(ctx, cat.x - 5, cat.y - 1, 10, 2, 'rgba(30,15,5,0.3)');
    ctx.drawImage(img, x0, y0);
    if (pet.acc && pet.acc !== 'none') {
      const [hx, hy] = cat.sit ? sp.head[1] : sp.head[0];
      drawPetAcc(ctx, pet.acc, x0 + (cat.sit || cat.dir > 0 ? hx : img.width - 1 - hx), y0 + hy);
    }
    if (sleeping) { // Zz
      const k = (performance.now() / 600) % 3 | 0;
      for (let i = 0; i <= k; i++) { const zx = x0 + img.width + i * 3, zy = y0 - 2 - i * 3; R(ctx, zx, zy, 3, 1, '#fff6e8'); R(ctx, zx + 1, zy + 1, 1, 1, '#fff6e8'); R(ctx, zx, zy + 2, 3, 1, '#fff6e8'); }
      return;
    }
    const need = pet.food < 25 ? 'food' : pet.love < 25 ? 'love' : pet.play < 25 ? 'play' : pet.clean < 25 ? 'clean' : null;
    if (need) { // küçük düşünce balonu
      const bx = Math.round(cat.x + 3), by = Math.round(cat.y - 18 + Math.sin(performance.now() / 300));
      R(ctx, bx, by, 9, 7, '#fff6e8'); R(ctx, bx + 1, by + 7, 2, 1, '#fff6e8');
      if (need === 'food') { R(ctx, bx + 2, by + 3, 4, 2, '#ff7a59'); R(ctx, bx + 6, by + 2, 1, 4, '#ff7a59'); }
      if (need === 'love') ctx.drawImage(HEART, bx + 1, by);
      if (need === 'play') { R(ctx, bx + 3, by + 2, 3, 3, '#5b8def'); R(ctx, bx + 2, by + 3, 5, 1, '#5b8def'); }
      if (need === 'clean') { R(ctx, bx + 2, by + 2, 2, 2, '#8fd0ff'); R(ctx, bx + 5, by + 3, 2, 2, '#8fd0ff'); R(ctx, bx + 4, by + 1, 1, 1, '#8fd0ff'); }
    }
  }
  function drawLighting(sc, info) {
    const night = info.night;
    const lights = lightsOf(sc, info);
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
  const speech = { me: { el: el('speech'), until: 0 }, partner: { el: el('speech'), until: 0 } };
  const place = (node, x, y) => { node.style.left = (x / W) * 100 + '%'; node.style.top = (y / H) * 100 + '%'; };
  const voice = '<span class="voice"><i></i><i></i><i></i></span>';
  function updateOverlay() {
    place(tagMe, me.x, headY(me) - 9);
    tagMe.innerHTML = `${esc(me.name)}${opts.isTalking?.('me') ? voice : ''}${opts.micOff?.() ? ' <span class="muted">●</span>' : ''}`;
    const pShown = partner.shown && partner.scene === me.scene;
    tagP.style.display = pShown ? '' : 'none';
    if (pShown) {
      place(tagP, partner.x, headY(partner) - 9);
      tagP.innerHTML = `${esc(partner.name)}${opts.isTalking?.('partner') ? voice : ''}`;
    }
    // Sohbet balonları (6 sn)
    for (const who of ['me', 'partner']) {
      const sp = speech[who], p = who === 'me' ? me : partner;
      const vis = performance.now() < sp.until && (who === 'me' || pShown);
      sp.el.style.display = vis ? '' : 'none';
      if (vis) place(sp.el, p.x, headY(p) - 12);
    }
    opts.placeVideo?.('me', me.x, headY(me) - 12, true);
    opts.placeVideo?.('partner', partner.x, pShown ? headY(partner) - 12 : 0, pShown);
    const s = !edit && me.seat < 0 && !me.target && !fadeTo ? nearestSpot() : null;
    prompt.style.display = !edit && (s || me.seat >= 0) ? '' : 'none';
    if (me.seat >= 0) { place(prompt, me.x, headY(me) - 20); prompt.textContent = 'E · ' + t('Kalk'); }
    else if (s) { const p = spotPos(s); place(prompt, p.x, Math.max(14, p.y - 26)); prompt.textContent = 'E · ' + t(s.label(opts.getShared())); }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Tablolardaki fotoğraflar ve şövaledeki resim piksel değil, olduğu gibi görünsün: sahnenin üstünde gerçek <img>.
  const pictures = new Map(); // anahtar → { el, scene, rect }
  function setPicture(key, scene, rect, src) {
    let p = pictures.get(key);
    if (!src) { p?.el.remove(); pictures.delete(key); return; }
    if (!p) { p = { el: document.createElement('img') }; p.el.className = 'pic'; p.el.alt = ''; overlay.prepend(p.el); pictures.set(key, p); }
    Object.assign(p, { scene, rect });
    if (p.el.getAttribute('src') !== src) p.el.src = src;
    const [x, y, w, hh] = rect;
    Object.assign(p.el.style, { left: (x / W) * 100 + '%', top: (y / H) * 100 + '%', width: (w / W) * 100 + '%', height: (hh / H) * 100 + '%' });
  }
  function updatePictures(night) {
    const f = `brightness(${(1 - night * 0.45).toFixed(2)})`;
    pictures.forEach((p) => { p.el.style.display = p.scene === me.scene && !fadeTo ? '' : 'none'; p.el.style.filter = f; });
  }

  function fx(emoji, x, y) {
    const d = document.createElement('div');
    d.className = 'fx'; d.textContent = emoji;
    place(d, x + (Math.random() * 8 - 4), y);
    overlay.appendChild(d); setTimeout(() => d.remove(), 1600);
  }

  // ---------- Döngü ----------
  let last = performance.now(), running = true, gen = 0;
  let raf = (f) => requestAnimationFrame(f);
  // Döngü kuşağı: kare kaynağı değişince (küçük pencere) eski döngü kendiliğinden biter.
  const loop = (g) => () => {
    if (!running || g !== gen) return;
    raf(loop(g)); // tek karelik bir hata döngüyü durdurmasın
    try { render(performance.now()); } catch (e) { console.error(e); }
  };
  function render(nowMs) {
    const dt = Math.min(0.05, Math.max(0, (nowMs - last) / 1000)), t = nowMs / 1000;
    last = nowMs;
    step(dt); stepFade(dt); stepPartner(dt); stepCat(dt); stepParts(dt); report(nowMs);
    const sc = scene(), l = lay();
    const hours = opts.getHours();
    const info = { st: opts.getShared(), t, ...hours, night: nightLevel(hours.hour) * (sc.outdoor ? 0.85 : 1) };
    lastNight = info.night;
    ctx.drawImage(sc.bg, 0, 0);
    sc.dyn?.(ctx, info);
    // Duvar dekorları ve yer halıları karakterlerin arkasında
    l.items.forEach((it) => (it.c.wall || it.c.flat) && it.c.draw(ctx, it.x, it.y, info));
    const ents = l.props.map((p) => ({ y: p.sortY, d: () => { ctx.save(); ctx.translate(p.dx, p.dy); p.draw(ctx, info); ctx.restore(); } }));
    l.items.forEach((it) => !(it.c.wall || it.c.flat) && ents.push({ y: it.y, d: () => it.c.draw(ctx, it.x, it.y, info) }));
    const pHere = partner.shown && partner.scene === me.scene;
    // Sarılma/öpücük: ikisi birbirine yaklaşır, döner, gözlerini kapatır; öpücükte dudaklar birleşir, sarılmada kollar sırta dolanır.
    let atMe = null, atP = null;
    const e = emo && performance.now() / 1000 - emo.t0;
    if (emo && e > EMO_DUR) emo = null;
    if (emo && pHere) {
      const k = e < 0.45 ? e / 0.45 : e > EMO_DUR - 0.45 ? (EMO_DUR - e) / 0.45 : 1; // yaklaş · kal · ayrıl
      const ease = k * k * (3 - 2 * k);
      const meLeft = me.x <= partner.x;
      const L = meLeft ? me : partner, Rp = meLeft ? partner : me;
      const sway = ease > 0.95 ? Math.round(Math.sin(e * 3)) * 0.5 : 0;
      if (me.seat < 0 && partner.seat < 0) {
        const mx = (me.x + partner.x) / 2 + sway, my = Math.max(me.y, partner.y);
        const gap = emo.kind === 'kiss' ? 4.5 : 3; // öpücükte yüzler, sarılmada bedenler değer
        const lx = L.x + (mx - gap - L.x) * ease, rx = Rp.x + (mx + gap - Rp.x) * ease;
        const ly = L.y + (my - L.y) * ease, ry = Rp.y + (my - Rp.y) * ease;
        const pose = ease > 0.9 ? emo.kind : null;
        const aL = { x: lx, y: ly, face: 'right', pose, lean: pose === 'kiss' ? 1 : 0 };
        const aR = { x: rx, y: ry, face: 'left', pose, lean: pose === 'kiss' ? 1 : 0 };
        if (pose === 'hug') { aL.armTo = rx + 4; aR.armTo = lx - 4; }
        atMe = meLeft ? aL : aR; atP = meLeft ? aR : aL;
        if (e > 0.9 && !emo.burst) { emo.burst = true; burst(mx, my - 22, emo.kind === 'kiss' ? 5 : 8, true); }
      } else if (me.seat >= 0 && partner.seat >= 0) {
        // Kanepede: başlar birbirine yaslanır
        const mx = (me.x + partner.x) / 2, pull = Math.max(0, (Rp.x - L.x) / 2 - 5) * ease;
        const aL = { x: L.x + pull, y: L.y, lift: 0 }, aR = { x: Rp.x - pull, y: Rp.y, lift: 0 };
        atMe = meLeft ? aL : aR; atP = meLeft ? aR : aL;
        if (e > 0.9 && !emo.burst) { emo.burst = true; burst(mx, Math.min(headY(me), headY(partner)) - 2, 6, true); }
      } else if (e > 0.3 && !emo.burst) { emo.burst = true; burst((me.x + partner.x) / 2, Math.min(headY(me), headY(partner)) - 2, 6, true); }
    }
    if (atMe?.armTo != null && atP) {
      // Sarılırken ikisi tek parça çizilir: önce gövdeler, sonra kollar karşı tarafın sırtına
      ents.push({ y: Math.max(me.y, partner.y), d: () => { drawPerson(partner, atP); drawPerson(me, atMe); drawArm(me, atMe); drawArm(partner, atP); } });
    } else {
      ents.push({ y: me.seat >= 0 ? me.y - 6 : me.y, d: () => drawPerson(me, atMe) });
      if (pHere) ents.push({ y: (partner.seat >= 0 ? partner.y - 6 : partner.y) + (atP ? 0.1 : 0), d: () => drawPerson(partner, atP) });
    }
    // Ek karakterler (vitrin evinde ev sahipleri kanepede oturur)
    for (const x of opts.getExtras?.() || []) {
      if (x.scene !== me.scene) continue;
      ents.push({ y: x.y - 6, d: () => {
        const sp = characterSprites(x.look);
        const img = x.pose === 'back' ? sp.sitBack : x.pose === 'sit' ? sp.sit : sp.down;
        const yy = Math.round(x.y - img.height + (x.pose ? 4 : 1));
        ctx.drawImage(img, Math.round(x.x - img.width / 2), yy);
        const b = x.side === 'moon' ? MOON_BADGE : SUN_BADGE;
        ctx.drawImage(b, Math.round(x.x - b.width / 2), yy - b.height - 1);
      } });
    }
    if (sc.hasCat) ents.push({ y: cat.y, d: drawCat });
    ents.sort((a, b) => a.y - b.y).forEach((x) => x.d());
    drawLighting(sc, info);
    parts.forEach((p) => { ctx.globalAlpha = Math.max(0, Math.min(1, (p.life - p.t) * 2)); ctx.drawImage(p.img, Math.round(p.x - p.img.width / 2), Math.round(p.y)); });
    ctx.globalAlpha = 1;
    if (edit) drawEdit(l);
    if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fade)})`; ctx.fillRect(0, 0, W, H); }
    camera(dt);
    updateOverlay();
    updatePictures(info.night);
    opts.onFrame?.(t);
  }
  function drawEdit(l) {
    ctx.fillStyle = 'rgba(252,223,75,0.10)';
    ctx.fillRect(0, 0, W, H);
    const box = (r, col) => { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.strokeRect(r[0] + 0.5, r[1] + 0.5, r[2], r[3]); ctx.setLineDash([]); };
    l.props.forEach((p) => p.movable && box(p.hit, 'rgba(255,255,255,0.55)'));
    l.items.forEach((it) => box([it.x - it.c.w / 2, it.y - it.c.h, it.c.w, it.c.h], 'rgba(255,255,255,0.55)'));
    const s = edit.sel;
    if (s?.kind === 'prop') { const p = l.props.find((q) => q.id === s.id); p && box(p.hit, '#fcdf4b'); }
    if (s?.kind === 'item') { const it = l.items.find((q) => q.key === s.key); it && box([it.x - it.c.w / 2, it.y - it.c.h, it.c.w, it.c.h], '#fcdf4b'); }
  }
  raf(loop(gen));

  return {
    me,
    partner,
    fx,
    canvas,
    setPicture,
    fxOn(who, emoji) {
      const p = who === 'me' ? me : partner;
      if (who === 'partner' && !(partner.shown && partner.scene === me.scene)) return false;
      fx(emoji, p.x, headY(p) - 4);
      return true;
    },
    emote,
    hearts(who) { const p = who === 'me' ? me : partner; if (who === 'partner' && !(partner.shown && partner.scene === me.scene)) return; burst(p.x, headY(p) - 2, 4, false); },
    setLook(look, side, name) { me.look = look; me.side = side; if (name) me.name = name; changed(); },
    near() { return together(); },
    /** Sohbet mesajını karakterin başının üstünde gösterir. */
    /** Evcil hayvanı bir noktaya çağırır (simülasyonu yöneten cihazda). */
    petCome(x, y) { cat.sit = false; cat.target = { x, y: Math.max(64, y + 6) }; cat.wait = 4; },
    say(who, text) { const sp = speech[who]; sp.el.textContent = text.length > 80 ? text.slice(0, 78) + '…' : text; sp.until = performance.now() + 6000; },
    sameRoom() { return partner.shown && partner.scene === me.scene; },
    /** Partnerin yanına yürü, varınca cb. */
    approach(cb) {
      const side = me.x < partner.x ? -1 : 1;
      const tx = partner.x + side * 12, ty = partner.y;
      walkTo(blocked(tx, ty) ? partner.x - side * 12 : tx, ty, () => (together() ? cb() : opts.onToast?.(t('Yanına ulaşamadım 🙂'))));
    },
    /** Belirli bir sahneye/noktaya ışınla (aktivite menüsünden). */
    goto(sceneId, x, y) { if (me.scene !== sceneId) { me.scene = sceneId; opts.onSceneChange?.(sceneId); } me.seat = -1; me.x = x; me.y = y; me.target = null; me.path = []; cam.snap = true; changed(); },
    setEdit(on) { edit = on ? { sel: null, drag: null } : null; opts.onDecorSelect?.(null); },
    get editing() { return !!edit; },
    get zoom() { return zoom; },
    setZoom(z) { zoom = z; localStorage.setItem('lr.zoom', z); fit(); },
    /** Sinema modu: kamera odadaki TV'ye yakınlaşır, oda görünmeye devam eder. */
    setCinema(on) { cine = !!on; fit(); },
    get cinema() { return cine; },
    sit: (group) => sitDown(group),
    /** Küçük pencere modunda döngüyü o pencerenin karesine bağlar (ana sekme arka planda kalsa da çizsin). */
    setRaf(fn) { raf = fn || ((f) => requestAnimationFrame(f)); gen++; raf(loop(gen)); },
    stop() { running = false; },
  };
}
