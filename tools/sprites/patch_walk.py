"""Yürüme: titreme gibi görünen 1 px zıplama yerine adım kareleri (önce sol ayak, sonra sağ ayak kalkar).
Duran kare çizimle birebir kalır; yalnızca yürüme karelerinde bacak pikselleri değişir."""
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
def patch(rel, pairs):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (rel, a)
        s = s.replace(a, b)
    open(p, 'w', encoding='utf8').write(s)

patch('js/art.js', [
    ("const cache = new Map();\n/** Görünüme göre tüm yön karelerini üretir (önbellekli). Yürürken kare değişmez, karakter 1 px zıplar. */",
     "/** Yürüme karesi: bir bacağın ayak çizgisi bir satır yukarı alınır (o ayak kalkmış gibi).\n"
     " *  Bacaklar son satırın üstündeki satırdaki iç çizgiden ikiye ayrılır; side = 'L' sol, 'R' sağ bacak. */\n"
     "function step(side) {\n"
     "  return (g) => {\n"
     "    const out = g.map((r) => r.slice()), h = g.length;\n"
     "    const lines = g[h - 2].map((c, x) => (c === '#' ? x : -1)).filter((x) => x >= 0);\n"
     "    if (lines.length < 3) return out;\n"
     "    const split = lines.length >= 4 ? (lines[1] + lines[lines.length - 2]) / 2 : lines[1];\n"
     "    for (let x = 0; x < out[0].length; x++) {\n"
     "      if (side === 'L' ? x >= split : x <= split) continue;\n"
     "      out[h - 2][x] = g[h - 1][x];\n"
     "      out[h - 1][x] = '.';\n"
     "    }\n"
     "    return out;\n"
     "  };\n"
     "}\n\n"
     "const cache = new Map();\n/** Görünüme göre tüm yön karelerini üretir (önbellekli). Duran kare çizimin aynısı; yürürken ayaklar sırayla kalkar. */"),
    ("  set.down = set.down2 = paint(F, look);\n  set.up = set.up2 = paint(B, look);\n  set.side = set.side2 = paint(S, look);\n  set.sideL = set.side2L = mirror(set.side);",
     "  set.down = paint(F, look); set.down2 = paint(F, look, step('L')); set.down3 = paint(F, look, step('R'));\n"
     "  set.up = paint(B, look); set.up2 = paint(B, look, step('L')); set.up3 = paint(B, look, step('R'));\n"
     "  set.side = paint(S, look); set.side2 = paint(S, look, step('L')); set.side3 = paint(S, look, step('R'));\n"
     "  set.sideL = mirror(set.side); set.side2L = mirror(set.side2); set.side3L = mirror(set.side3);"),
])

patch('js/game.js', [
    ("    const f = (p.t * 6 | 0) % 2;", "    // Adım döngüsü: dur, sol ayak, dur, sağ ayak\n    const ph = (p.t * 8 | 0) % 4, f = ph === 1 ? '2' : ph === 3 ? '3' : '';"),
    ("    if (dir === 'up') return mv && f ? sp.up2 : sp.up;\n    if (dir === 'down') return mv && f ? sp.down2 : sp.down;\n    if (dir === 'right') return mv && f ? sp.side2 : sp.side;\n    return mv && f ? sp.side2L : sp.sideL;",
     "    const k = mv ? f : '';\n    if (dir === 'up') return sp['up' + k];\n    if (dir === 'down') return sp['down' + k];\n    if (dir === 'right') return sp['side' + k];\n    return sp['side' + k + 'L'];"),
    ("  // Yürürken her ikinci karede 1 piksel yukarı (tasarımda ayrı yürüme karesi yok)\n  const bob = (p) => (p.moving && p.seat < 0 && (p.t * 6 | 0) % 2 ? 1 : 0);\n", ""),
    (" - (at?.lift || 0) - (at ? 0 : bob(p)));", " - (at?.lift || 0));"),
])
print('ok')
