// Evi düzenleme: dekor dolabı (eşya ekle), oda boyası (renk + desen) ve eşya taşıma modu.
//
// live/{rid}/decor/{sahne} = { paint: {wall, accent, floor, motif}, moved: {eşya: {dx, dy}}, items: {id: {type, x, y}} }
import { h, icon, openSheet, closeSheet, toast, $ } from '../ui.js';
import { push, remove, set } from '../fb.js';
import { DECOR, SCENES, WALL, H, bump, repaint } from '../scenes.js';
import { CATALOG, THEMES, MOTIFS } from '../decor.js';

export function createDecorUI(ctx) {
  const { live, game } = ctx;
  let sel = null;

  live.on('decor', (v) => {
    const before = JSON.stringify(DECOR.paint);
    DECOR.paint = {}; DECOR.moved = {}; DECOR.items = {};
    for (const [sc, d] of Object.entries(v || {})) {
      if (d.paint) DECOR.paint[sc] = d.paint;
      if (d.moved) DECOR.moved[sc] = d.moved;
      if (d.items) DECOR.items[sc] = d.items;
    }
    if (JSON.stringify(DECOR.paint) !== before) repaint(); else bump();
  });

  let room = null; // düzenlenen oda (varsayılan: bulunduğun oda)
  const scene = () => room || game.me.scene;

  // ---------- Dolap ----------
  function preview(type) {
    const c = h('canvas', { width: 44, height: 44, class: 'itemprev' });
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const it = CATALOG[type];
    it.draw(g, 22, it.wall ? 38 : 40, { t: 0, night: 0 });
    return c;
  }
  async function place(type) {
    const it = CATALOG[type];
    const count = Object.keys(DECOR.items[scene()] || {}).length;
    if (count >= 24) return toast('Bu oda yeterince dolu 🙂 Önce bir şey kaldır.');
    const here = scene() === game.me.scene;
    const wall = it.wall && !SCENES[scene()].outdoor; // balkonda duvar yok: yere konur
    const x = Math.round(here ? Math.max(14, Math.min(178, game.me.x + (Math.random() * 20 - 10))) : 60 + Math.random() * 72);
    const y = wall ? 30 : Math.round(here ? Math.max(WALL + 14, Math.min(H - 4, game.me.y + 12)) : 100 + Math.random() * 20);
    await push(live.ref(`decor/${scene()}/items`), { type, x, y });
    live.stat('decor');
    closeSheet();
    toast(`${it.name} ${SCENES[scene()].name.toLowerCase()} içine yerleşti. Yerini değiştirmek için "Eşyaları taşı".`, 3500);
  }

  function open(tab = 'shop', roomId = null) {
    const r = roomId || room || game.me.scene;
    const body = openSheet({ title: 'Evi düzenle', iconName: 'paint', wide: true, onClose: () => (room = null) });
    room = r; // önceki pencerenin kapanışı odayı sıfırlar; o yüzden açtıktan sonra
    body.append(h('div', { class: 'rooms' }, ...Object.values(SCENES).map((sc) => h('button', { class: sc.id === scene() ? 'sel' : '', onclick: () => open(tab, sc.id) }, sc.name))));
    body.append(h('div', { class: 'tabs' },
      h('button', { class: tab === 'shop' ? 'sel' : '', onclick: () => open('shop') }, 'Dekor dolabı'),
      h('button', { class: tab === 'paint' ? 'sel' : '', onclick: () => open('paint') }, 'Boya'),
      h('button', { onclick: () => { const r = scene(); closeSheet(); if (r !== game.me.scene) game.goto(r, 96, 110); startEdit(); }, html: `${icon('move')} Eşyaları taşı` }),
    ));
    if (tab === 'shop') {
      body.append(h('p', { class: 'small' }, 'Yukarıdan odayı seç; eşya o odaya konur (bulunduğun odadaysa yanına). Duvar eşyaları duvara asılır.'),
        h('div', { class: 'shop' }, ...Object.entries(CATALOG).map(([type, it]) => h('button', { class: 'shopitem', onclick: () => place(type) }, preview(type), h('span', {}, it.name)))));
    } else paintTab(body);
  }

  function paintTab(body) {
    const sc = SCENES[scene()];
    const cur = { ...sc.colors, ...DECOR.paint[sc.id] };
    const outdoor = !!sc.outdoor;
    const save = (patch) => { set(live.ref(`decor/${sc.id}/paint`), { ...cur, ...patch }); live.stat('decor'); Object.assign(cur, patch); };
    if (!outdoor) body.append(h('small', {}, 'Hazır temalar'), h('div', { class: 'themes' }, ...THEMES.map((t) => h('button', { class: 'theme', onclick: () => save({ wall: t.wall, accent: t.accent, floor: t.floor }) },
      h('i', { style: { background: `linear-gradient(${t.wall} 0 60%, ${t.floor} 60%)` } }), h('span', {}, t.name)))));
    const pick = (label, key) => { const i = h('input', { type: 'color', value: cur[key] }); i.oninput = () => save({ [key]: i.value }); return h('label', {}, label, i); };
    body.append(h('div', { class: 'row wrap' },
      outdoor ? null : pick('Duvar', 'wall'),
      outdoor ? null : pick('Desen', 'accent'),
      pick(outdoor ? 'Karo' : 'Zemin', 'floor'),
      outdoor ? pick('Karo 2', 'accent') : null,
    ));
    if (!outdoor) body.append(h('small', {}, 'Duvar kâğıdı deseni'), h('div', { class: 'row wrap' }, ...MOTIFS.map(([m, name]) => h('button', { class: cur.motif === m ? 'sel' : '', onclick: () => { save({ motif: m }); open('paint'); } }, name))));
    body.append(h('button', { class: 'link', onclick: () => { if (confirm('Bu odanın boyası, eşya yerleri ve eklenen dekorlar sıfırlansın mı?')) { remove(live.ref(`decor/${sc.id}`)); closeSheet(); } } }, 'Bu odayı ilk haline döndür'));
  }

  // ---------- Taşıma modu ----------
  const bar = $('editBar');
  function startEdit() {
    game.setEdit(true);
    bar.hidden = false;
    document.body.classList.add('editing');
    updateBar();
  }
  function stopEdit() {
    game.setEdit(false);
    bar.hidden = true;
    document.body.classList.remove('editing');
  }
  function updateBar() {
    $('editHint').textContent = sel ? (sel.kind === 'item' ? `${sel.it.c.name} seçili · sürükle` : 'Sürükleyerek taşı') : 'Bir eşyaya dokun ve sürükle';
    $('editRemove').hidden = !sel;
    $('editRemove').textContent = sel?.kind === 'item' ? 'Kaldır' : 'Yerine koy';
  }
  $('editDone').onclick = stopEdit;
  $('editAdd').onclick = () => { stopEdit(); open('shop'); };
  $('editRemove').onclick = () => {
    if (!sel) return;
    if (sel.kind === 'item') remove(live.ref(`decor/${scene()}/items/${sel.key}`));
    else remove(live.ref(`decor/${scene()}/moved/${sel.id}`));
    sel = null; game.setEdit(true); updateBar();
  };

  return {
    open,
    startEdit,
    onSelect(s) { sel = s; if (game.editing) updateBar(); },
    onMove(m) {
      if (m.kind === 'item') set(live.ref(`decor/${m.scene}/items/${m.key}`), { type: DECOR.items[m.scene][m.key].type, x: m.x, y: m.y });
      else set(live.ref(`decor/${m.scene}/moved/${m.id}`), { dx: m.dx, dy: m.dy });
      live.stat('decor');
    },
  };
}
