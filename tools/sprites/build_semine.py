"""Şömine odasının yeniden çizilen şöminesi: tasarımcının 1600x1600 çizimini (25x büyütülmüş 64x64 piksel) okuyup
js/semine-art.js üretir. Kullanım: python tools/sprites/build_semine.py
Çizimde hafif gürültü var: hücrenin en sık rengi alınır, birbirine çok yakın renkler birleştirilir.
Alev bölgesi (ateş kutusu) ayrı tutulur; oyunda alev bu bölgenin satır satır esnetilmesiyle canlandırılır."""
import json, os
from collections import Counter
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'designer', 'semine-varsayilan.png')
OUT = os.path.join(HERE, '..', '..', 'js', 'semine-art.js')

im = Image.open(SRC).convert('RGB')
S = im.width // 64
grid = Image.new('RGB', (64, 64))
for y in range(64):
    for x in range(64):
        cell = im.crop((x * S, y * S, x * S + S, y * S + S))
        grid.putpixel((x, y), Counter(cell.getdata()).most_common(1)[0][0])

def dist(a, b): return sum((p - q) ** 2 for p, q in zip(a, b)) ** 0.5
anchors, amap = [], {}
for c, _ in Counter(grid.getdata()).most_common():
    best = min(anchors, key=lambda a: dist(a, c), default=None)
    if best is not None and dist(best, c) <= 7: amap[c] = best
    else: anchors.append(c); amap[c] = c
px = grid.load()
q = {(x, y): amap[px[x, y]] for y in range(64) for x in range(64)}

WHITE = (255, 255, 255)
xs = [x for (x, y), c in q.items() if c != WHITE]; ys = [y for (x, y), c in q.items() if c != WHITE]
x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
pal = {}
for a in anchors:
    if a != WHITE: pal[a] = CH[len(pal)]
rows = [''.join('.' if q[(x, y)] == WHITE else pal[q[(x, y)]] for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]

# Ateş kutusu: kahverengi kasa (#472607) çizgilerinin arasındaki koyu/alev pikselleri
WOOD = (0x47, 0x26, 0x07)
fire = []
fy0 = None
for y in range(y0, y1 + 1):
    xsw = [x for x in range(18, 48) if q[(x, y)] == WOOD]
    if len(xsw) < 2 or y < 40 or y > 61: continue
    lo, hi = min(xsw), max(xsw)
    inner = [x for x in range(lo + 1, hi) if q[(x, y)] != WOOD]
    if not inner: continue
    if fy0 is None: fy0 = y
    fire.append([min(inner) - x0, max(inner) - x0])
# Raf süsleri: sade şömineye göre farklı olan pikseller (designer/semine-raf/<ad>.png, 64x64'e indirilmiş çizimler)
MANTEL = ['gemi', 'tablo', 'isik', 'dantel', 'susler']
mantel = {}
for name in MANTEL:
    v = Image.open(os.path.join(HERE, 'designer', 'semine-raf', name + '.png')).convert('RGB'); vp = v.load()
    diff = [(x, y) for y in range(64) for x in range(64) if dist(vp[x, y], q[(x, y)]) > 34]
    ox0, oy0 = min(p[0] for p in diff), min(p[1] for p in diff)
    ox1, oy1 = max(p[0] for p in diff), max(p[1] for p in diff)
    cols = {}
    grid_rows = []
    for y in range(oy0, oy1 + 1):
        row = ''
        for x in range(ox0, ox1 + 1):
            if (x, y) not in set(diff): row += '.'; continue
            c = vp[x, y]
            if c not in cols: cols[c] = CH[len(cols)]
            row += cols[c]
        grid_rows.append(row)
    mantel[name] = {'x': ox0 - x0, 'y': oy0 - y0, 'rows': grid_rows, 'pal': {ch: '#%02x%02x%02x' % c for c, ch in cols.items()}}
js = '// Otomatik üretildi: tools/sprites/build_semine.py (tasarımcı çizimi: tools/sprites/designer/semine-varsayilan.png). Elle düzenlemeyin.\n'
js += 'export const SEMINE = ' + json.dumps({
    'pal': {ch: '#%02x%02x%02x' % c for c, ch in pal.items()},
    'rows': rows,
    'fireY': fy0 - y0,
    'fire': fire,
    'mantel': mantel,
}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w', encoding='utf-8', newline='').write(js)
print('sprite', len(rows[0]), 'x', len(rows), 'palet', len(pal), 'ateş satırı', len(fire), 'y0', fy0 - y0, fire[:3], fire[-2:])
