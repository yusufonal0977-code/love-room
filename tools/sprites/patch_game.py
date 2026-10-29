"""game.js: yeni (daha uzun) karakterler için oturma payı, yürüme zıplaması ve sarılma kolu yüksekliği."""
import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'game.js')
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a
    s = s.replace(a, b)
rep("  function headY(p) { return p.y - personImg(p).height + (p.seat >= 0 ? 4 : 1); }",
    "  // Oturan karakterin kesilmiş alt kenarı koltuğa oturur: önden oturuşta 2, arkadan (kanepe) -1 piksel pay\n"
    "  const seatPad = (p) => { const s = seatOf(p); return s ? (s.pose === 'back' ? -1 : 2) : 1; };\n"
    "  // Yürürken her ikinci karede 1 piksel yukarı (tasarımda ayrı yürüme karesi yok)\n"
    "  const bob = (p) => (p.moving && p.seat < 0 && (p.t * 6 | 0) % 2 ? 1 : 0);\n"
    "  function headY(p) { return p.y - personImg(p).height + seatPad(p); }")
rep("const x = Math.round(px - img.width / 2), y = Math.round(py - img.height + (p.seat >= 0 ? 4 : 1) - (at?.lift || 0));",
    "const x = Math.round(px - img.width / 2), y = Math.round(py - img.height + seatPad(p) - (at?.lift || 0) - (at ? 0 : bob(p)));")
rep("const top = Math.round(at.y - (at.lift || 0)) - 9; // omuz hizası", "const top = Math.round(at.y - (at.lift || 0)) - 12; // omuz hizası")
rep("const yy = Math.round(x.y - img.height + (x.pose ? 4 : 1));", "const yy = Math.round(x.y - img.height + (x.pose === 'back' ? -1 : x.pose ? 2 : 1));")
open(p, 'w', encoding='utf8').write(s)

# Karakter düzenleyici: yeni saç adları, önizleme tuvali büyüdü
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'main.js')
s = open(p, encoding='utf8').read()
rep("{ short: 'Kısa', long: 'Uzun', bob: 'Küt', bun: 'Topuz', none: 'Saçsız' }[x]",
    "{ short: 'Kısa', spiky: 'Kirpi', long: 'Uzun', bob: 'Küt', bowl: 'Kâse', round: 'Kabarık', none: 'Saçsız' }[x]")
rep("      pc.clearRect(0, 0, 40, 40);", "      pc.clearRect(0, 0, 48, 48);")
rep("      pc.drawImage(img, 20 - img.width / 2, 38 - img.height);\n      pc.drawImage(b, 20 - b.width / 2, 38 - img.height - b.height - 1);",
    "      pc.drawImage(img, Math.round(24 - img.width / 2), 47 - img.height);\n      pc.drawImage(b, Math.round(24 - b.width / 2), 47 - img.height - b.height - 1);")
open(p, 'w', encoding='utf8').write(s)

p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'index.html')
s = open(p, encoding='utf8').read()
rep('<canvas id="preview" width="40" height="40"></canvas>', '<canvas id="preview" width="48" height="48"></canvas>')
open(p, 'w', encoding='utf8').write(s)
print('ok')
