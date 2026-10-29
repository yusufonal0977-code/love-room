"""Titreme düzeltmesi: kamera yürürken karakterin tam piksel konumuna kilitlenir, karakter de aynı yuvarlamayla çizilir.
Eskiden kamera yumuşak (kesirli) kayarken karakter tam piksel atlıyordu; ekranda ileri geri titriyordu.
Ayrıca adım kareleri belirginleşir: kalkan ayak 2 satır yukarı alınır."""
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
def patch(rel, pairs):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (rel, a)
        s = s.replace(a, b)
    open(p, 'w', encoding='utf8').write(s)

patch('js/game.js', [
    ("    const focusX = cine ? TV[0] + TV[2] / 2 : me.x;", "    const focusX = cine ? TV[0] + TV[2] / 2 : Math.round(me.x);"),
    ("seatOf(me)?.pose === 'back' ? 64 : me.y - 24;", "seatOf(me)?.pose === 'back' ? 64 : Math.round(me.y) - 24;"),
    ("    const k = cam.snap ? 1 : Math.min(1, dt * 4);",
     "    // Yürürken kamera karaktere kilitli (aynı tam piksel adımlarıyla kayar); durunca/geçişlerde yumuşak\n"
     "    const k = cam.snap || (me.moving && !cine && scale === targetScale) ? 1 : Math.min(1, dt * 4);"),
    ("    const x = Math.round(px - img.width / 2), y = Math.round(py - img.height + seatPad(p) - (at?.lift || 0));",
     "    // Önce konumu yuvarla, sonra yarım genişliği çıkar: tek genişlikli karede yuvarlama sağa-sola oynamasın\n"
     "    const x = Math.round(px) - (img.width >> 1), y = Math.round(py) - img.height + seatPad(p) - Math.round(at?.lift || 0);"),
])

patch('js/art.js', [
    ("      out[h - 2][x] = g[h - 1][x];\n      out[h - 1][x] = '.';",
     "      out[h - 3][x] = g[h - 1][x]; // ayak iki satır yukarıda: adım belirgin olsun\n      out[h - 2][x] = '.';\n      out[h - 1][x] = '.';"),
])
print('ok')
