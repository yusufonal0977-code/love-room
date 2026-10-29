"""game.js: öne bakarak oturan karakter koltuğun önünde çizilsin (eskiden berjerenin arkasında kalıyordu)."""
import os
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'js', 'game.js')
s = open(p, encoding='utf8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a
    s = s.replace(a, b)
rep("      ents.push({ y: me.seat >= 0 ? me.y - 6 : me.y, d: () => drawPerson(me, atMe) });\n"
    "      if (pHere) ents.push({ y: (partner.seat >= 0 ? partner.y - 6 : partner.y) + (atP ? 0.1 : 0), d: () => drawPerson(partner, atP) });",
    "      ents.push({ y: sortY(me), d: () => drawPerson(me, atMe) });\n"
    "      if (pHere) ents.push({ y: sortY(partner) + (atP ? 0.1 : 0), d: () => drawPerson(partner, atP) });")
rep("      ents.push({ y: x.y - 6, d: () => {", "      ents.push({ y: x.pose === 'sit' ? x.y + 12 : x.y - 6, d: () => {")
rep("  function headY(p) {",
    "  // Çizim sırası: kanepede sırtı dönük oturan koltuğun arkasında, öne bakarak oturan koltuğun önünde kalır\n"
    "  const sortY = (p) => { const s = seatOf(p); return !s ? p.y : s.pose === 'back' ? p.y - 6 : p.y + 12; };\n"
    "  function headY(p) {")
open(p, 'w', encoding='utf8').write(s)
print('ok')
