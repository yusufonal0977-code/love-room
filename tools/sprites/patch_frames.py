"""Tablolar dekor modunda taşınabilir olsun; şöminedeki kitaplığın üstündeki tablo başta biraz sağda dursun."""
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
def patch(rel, pairs):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (rel, a)
        s = s.replace(a, b)
    open(p, 'w', encoding='utf8').write(s)

patch('js/scenes.js', [
    # Tablolar artık arka plana gömülü değil: taşınabilir duvar eşyası olarak her karede çizilir
    ("    def.draw(g, { ...def.colors, ...DECOR.paint[def.id] });\n    (def.frames || []).forEach((f) => frame(g, ...f.outer, (x, y, w, h) => def.frameArt[f.id](g, x, y, w, h)));\n",
     "    def.draw(g, { ...def.colors, ...DECOR.paint[def.id] });\n"),
    # Kitaplığın (x 2–32) üstüne binmesin: şömineyle kitaplık arasına
    ("    { id: 'somine1', x: 23, y: 15, w: 20, h: 14, outer: [20, 12, 26, 20] },",
     "    { id: 'somine1', x: 41, y: 15, w: 20, h: 14, outer: [38, 12, 26, 20] },"),
    ("  (sc.frames || []).forEach((f) => spots.push({ id: 'frame', frame: f.id, x: f.x + f.w / 2, y: 60, hit: f.outer, label: () => (DECOR.frames[f.id] ? 'Fotoğrafa bak' : 'Fotoğraf koy') }));",
     "  (sc.frames || []).forEach((f) => {\n"
     "    const o = off(f.id);\n"
     "    // Duvar eşyası: en arkada çizilir, dekor modunda duvar üzerinde sürüklenir\n"
     "    props.push({ id: f.id, movable: true, wall: true, frame: f, dx: o.dx, dy: o.dy, sortY: -1000, hit: shift(f.outer, o.dx, o.dy),\n"
     "      draw: (g) => frame(g, ...f.outer, (x, y, w, h) => sc.frameArt[f.id](g, x, y, w, h)) });\n"
     "    spots.push({ id: 'frame', frame: f.id, x: f.x + f.w / 2 + o.dx, y: 60, hit: shift(f.outer, o.dx, o.dy), label: () => (DECOR.frames[f.id] ? 'Fotoğrafa bak' : 'Fotoğraf koy') });\n"
     "  });"),
])

patch('js/game.js', [
    ("      (DECOR.moved[me.scene] ??= {})[sel.id] = { dx: Math.max(-160, Math.min(160, d.base.dx + ddx)), dy: Math.max(-60, Math.min(60, d.base.dy + ddy)) };",
     "      const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));\n"
     "      const o = sel.p.frame?.outer; // tablo duvardan çıkmasın\n"
     "      (DECOR.moved[me.scene] ??= {})[sel.id] = o\n"
     "        ? { dx: cl(d.base.dx + ddx, 2 - o[0], W - 2 - o[2] - o[0]), dy: cl(d.base.dy + ddy, 2 - o[1], WALL - 2 - o[3] - o[1]) }\n"
     "        : { dx: cl(d.base.dx + ddx, -160, 160), dy: cl(d.base.dy + ddy, -60, 60) };"),
    # Tablodaki fotoğraf, taşınan tabloyla birlikte gider
    ("    Object.assign(p, { scene, rect });\n    if (p.el.getAttribute('src') !== src) p.el.src = src;\n    const [x, y, w, hh] = rect;\n    Object.assign(p.el.style, { left: (x / W) * 100 + '%', top: (y / H) * 100 + '%', width: (w / W) * 100 + '%', height: (hh / H) * 100 + '%' });\n  }",
     "    Object.assign(p, { scene, rect, key, at: '' });\n    if (p.el.getAttribute('src') !== src) p.el.src = src;\n    placePicture(p);\n  }\n"
     "  function placePicture(p) {\n"
     "    const o = p.key.startsWith('frame:') ? DECOR.moved[p.scene]?.[p.key.slice(6)] : null;\n"
     "    const [x, y, w, hh] = p.rect, X = x + (o?.dx || 0), Y = y + (o?.dy || 0), at = X + ',' + Y;\n"
     "    if (p.at === at) return;\n"
     "    p.at = at;\n"
     "    Object.assign(p.el.style, { left: (X / W) * 100 + '%', top: (Y / H) * 100 + '%', width: (w / W) * 100 + '%', height: (hh / H) * 100 + '%' });\n"
     "  }"),
    ("    pictures.forEach((p) => { p.el.style.display = p.scene === me.scene && !fadeTo ? '' : 'none'; p.el.style.filter = f; });",
     "    pictures.forEach((p) => { p.el.style.display = p.scene === me.scene && !fadeTo ? '' : 'none'; p.el.style.filter = f; placePicture(p); });"),
])
print('ok')
