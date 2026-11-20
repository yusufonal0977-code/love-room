"""Şömine odasının yeniden çizilen şömineleri: tasarımcının çizimlerinden js/semine-art.js üretir.
Kullanım: python tools/sprites/build_semine.py

İki model var:
  ahsap  koyu ahşap: designer/semine-varsayilan.png (1600x1600, 25x büyütülmüş 64x64) + raf süsleri designer/semine-raf/<ad>.png
  tugla  tuğla (fenerli, maşalı): designer/semine-tugla/sade.png + süsler vazo, tablo, kitap (64x64'e indirilmiş çizimler)
Raf süsleri: sade şömineye göre farklı olan pikseller. Alev bölgesi (ateş kutusu) ayrı tutulur; oyunda alev bu bölgenin
satır satır esnetilmesiyle canlandırılır. Çizimde hafif gürültü var: hücrenin en sık rengi alınır, çok yakın renkler birleştirilir."""
import json, os
from collections import Counter
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DES = os.path.join(HERE, 'designer')
OUT = os.path.join(HERE, '..', '..', 'js', 'semine-art.js')
CH = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
WHITE = (255, 255, 255)

def dist(a, b): return sum((p - q) ** 2 for p, q in zip(a, b)) ** 0.5

def grid_from_big(path):
    im = Image.open(path).convert('RGB'); S = im.width // 64
    g = Image.new('RGB', (64, 64))
    for y in range(64):
        for x in range(64):
            cell = im.crop((x * S, y * S, x * S + S, y * S + S))
            g.putpixel((x, y), Counter(cell.getdata()).most_common(1)[0][0])
    return g

def quantize(grid, thr=7):
    anchors, amap = [], {}
    for c, _ in Counter(grid.getdata()).most_common():
        best = min(anchors, key=lambda a: dist(a, c), default=None)
        if best is not None and dist(best, c) <= thr: amap[c] = best
        else: anchors.append(c); amap[c] = c
    px = grid.load()
    return {(x, y): amap[px[x, y]] for y in range(64) for x in range(64)}

def build_model(q, frame, y_lo, y_hi, bg, mantel_dir, names):
    xs = [x for (x, y), c in q.items() if c != WHITE]; ys = [y for (x, y), c in q.items() if c != WHITE]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    pal = {}
    for c in dict.fromkeys(q.values()):
        if c != WHITE: pal[c] = CH[len(pal)]
    rows = [''.join('.' if q[(x, y)] == WHITE else pal[q[(x, y)]] for x in range(x0, x1 + 1)) for y in range(y0, y1 + 1)]
    # Ateş kutusu: çerçeve renginin (soldaki ve sağdaki) arasında kalan pikseller
    fire, fy0 = [], None
    for y in range(max(y0, y_lo), min(y1, y_hi) + 1):
        xsw = [x for x in range(18, 48) if q[(x, y)] == frame]
        if len(xsw) < 2: continue
        lo, hi = min(xsw), max(xsw)
        inner = [x for x in range(lo + 1, hi) if q[(x, y)] != frame]
        if not inner: continue
        if fy0 is None: fy0 = y
        fire.append([min(inner) - x0, max(inner) - x0])
    mantel = {}
    for name in names:
        v = Image.open(os.path.join(mantel_dir, name + '.png')).convert('RGB'); vp = v.load()
        diff = set((x, y) for y in range(64) for x in range(64) if dist(vp[x, y], q[(x, y)]) > 34)
        ox0, oy0 = min(p[0] for p in diff), min(p[1] for p in diff)
        ox1, oy1 = max(p[0] for p in diff), max(p[1] for p in diff)
        cols, grid_rows = {}, []
        for y in range(oy0, oy1 + 1):
            row = ''
            for x in range(ox0, ox1 + 1):
                if (x, y) not in diff: row += '.'; continue
                c = vp[x, y]
                if c not in cols: cols[c] = CH[len(cols)]
                row += cols[c]
            grid_rows.append(row)
        mantel[name] = {'x': ox0 - x0, 'y': oy0 - y0, 'rows': grid_rows, 'pal': {ch: '#%02x%02x%02x' % c for c, ch in cols.items()}}
    return {'pal': {ch: '#%02x%02x%02x' % c for c, ch in pal.items()}, 'rows': rows, 'fireY': fy0 - y0, 'fire': fire, 'bg': bg, 'mantel': mantel}

ahsap = build_model(quantize(grid_from_big(os.path.join(DES, 'semine-varsayilan.png'))), (0x47, 0x26, 0x07), 40, 61, '#000000',
                    os.path.join(DES, 'semine-raf'), ['gemi', 'tablo', 'isik', 'dantel', 'susler'])
tugla = build_model(quantize(Image.open(os.path.join(DES, 'semine-tugla', 'sade.png')).convert('RGB'), 0), (0x62, 0x0e, 0x0e), 41, 59, '#3d0a09',
                    os.path.join(DES, 'semine-tugla'), ['vazo', 'tablo', 'kitap'])
js = '// Otomatik üretildi: tools/sprites/build_semine.py (tasarımcı çizimleri: tools/sprites/designer). Elle düzenlemeyin.\n'
js += 'export const SEMINE = ' + json.dumps({'ahsap': ahsap, 'tugla': tugla}, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w', encoding='utf-8', newline='').write(js)
for n, m in (('ahsap', ahsap), ('tugla', tugla)):
    print(n, len(m['rows'][0]), 'x', len(m['rows']), 'palet', len(m['pal']), 'ates', len(m['fire']), 'y0', m['fireY'], m['fire'][:1], 'sus', list(m['mantel']))
