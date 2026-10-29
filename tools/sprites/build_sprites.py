"""Tasarımcının çizimlerinden (grids/*.json) uygulamanın karakter katmanlarını üretir → js/char-data.js

Katmanlar
- Kıyafet (gövde + kel kafa + yüz): kıyafet çiziminin kendisi, piksel piksel. Beyaz hücreler bölgeye göre
  S (ten) ya da P (pantolon) olur; çizimdeki renkler aynen kalır. "basic" = mavi kazağın kesimi, tek renk (C).
- Saç: saç çiziminden. 16. satırın üstü (kafa + yüz + kâkül) olduğu gibi alınır; altında yalnızca saç
  (uzun saçın omuzdan sarkan kısmı) eklenir. Konum ayaklara göre hizalanır (ax = son satırdaki ilk siyah).

Kodlar: '.' boş/değiştirme, '_' saydam (yalnız saç katmanı, kafa bölgesinde), '#' siyah, S ten, P pantolon,
C gömlek rengi, H saç (iç), h saç (kenar: altındaki kıyafet çizgisini ezmez), küçük harfler = sabit renk (pal).
"""
import json, os
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
G = lambda n: json.load(open(os.path.join(HERE, 'grids', n + '.json')))
OUT = os.path.join(HERE, '..', '..', 'js', 'char-data.js')
HEAD_ROWS = 16  # bu satırın üstü kafa bölgesi

base, hl, hs = G('base_and_round_hair'), G('hair_long_bob'), G('hair_short')
o1, o2 = G('outfits_blue_grey_black'), G('outfits_pink_green_beige')

def fig(src, i):
    return src['figures'][i]['rows'], src['palette']

# Görünümler: front (aşağı bakan), back (arka), side (sağa bakan)
BALD = {'back': fig(base, 3), 'side': fig(base, 4), 'front': fig(base, 5)}
HAIRS = {
    'short': {'side': fig(hs, 3), 'back': fig(hs, 4), 'front': fig(hs, 5)},
    'spiky': {'back': fig(hs, 0), 'front': fig(hs, 1), 'side': fig(hs, 2)},
    'long': {'side': fig(hl, 0), 'back': fig(hl, 1), 'front': fig(hl, 2)},
    'bob': {'back': fig(hl, 3), 'side': fig(hl, 4), 'front': fig(hl, 5)},
    'bowl': {'side': fig(hl, 6), 'back': fig(hl, 7), 'front': fig(hl, 8)},
    'round': {'back': fig(base, 6), 'side': fig(base, 7), 'front': fig(base, 8)},
}
OUTFITS = {
    'nordic': {'back': fig(o1, 0), 'side': fig(o1, 1), 'front': fig(o1, 2)},
    'cardigan': {'side': fig(o1, 3), 'back': fig(o1, 4), 'front': fig(o1, 5)},
    'sweater': {'side': fig(o1, 6), 'back': fig(o1, 7), 'front': fig(o1, 8)},
    'nordicPink': {'side': fig(o2, 0), 'back': fig(o2, 1), 'front': fig(o2, 2)},
    'tee': {'side': fig(o2, 3), 'back': fig(o2, 4), 'front': fig(o2, 5)},
    'cardiganBeige': {'back': fig(o2, 6), 'side': fig(o2, 7), 'front': fig(o2, 8)},
}

def anchor(rows):
    return rows[-1].index('#')

def outside(rows):
    """Figürün dışındaki beyaz hücreler (kenardan taşma ile)."""
    h, w = len(rows), len(rows[0])
    out = [[False] * w for _ in range(h)]
    q = deque((y, x) for y in range(h) for x in range(w) if (y in (0, h - 1) or x in (0, w - 1)) and rows[y][x] == '.')
    for y, x in q: out[y][x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and not out[yy][xx] and rows[yy][xx] == '.':
                out[yy][xx] = True; q.append((yy, xx))
    return out

def components(rows, out):
    """İç beyaz bölgeler (4-komşu, siyah ve renkli hücreler duvar)."""
    h, w = len(rows), len(rows[0])
    lab = [[0] * w for _ in range(h)]; comps = []
    for y in range(h):
        for x in range(w):
            if rows[y][x] == '.' and not out[y][x] and not lab[y][x]:
                comps.append([]); n = len(comps); lab[y][x] = n; q = deque([(y, x)])
                while q:
                    cy, cx = q.popleft(); comps[-1].append((cy, cx))
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        yy, xx = cy + dy, cx + dx
                        if 0 <= yy < h and 0 <= xx < w and rows[yy][xx] == '.' and not out[yy][xx] and not lab[yy][xx]:
                            lab[yy][xx] = n; q.append((yy, xx))
    return comps

def build_outfit(rows, pal, basic=False):
    """Kıyafet katmanı: renkler sabit (basic'te tek renk C), beyazlar S/P."""
    out = outside(rows)
    colored = [y for y, r in enumerate(rows) if any(c not in '.#' for c in r) and y >= HEAD_ROWS]
    pants_top = max(colored) + 1
    letters, lp = {}, {}
    res = []
    for y, r in enumerate(rows):
        s = ''
        for x, c in enumerate(r):
            if c == '#': s += '#'
            elif c == '.': s += '.' if out[y][x] else ('P' if y >= pants_top else 'S')
            elif y < HEAD_ROWS: # yüzdeki yanak
                if c not in letters: letters[c] = 'abcdefghij'[len(letters)]; lp[letters[c]] = pal[c]
                s += letters[c]
            elif basic: s += 'C'
            else:
                if c not in letters: letters[c] = 'abcdefghij'[len(letters)]; lp[letters[c]] = pal[c]
                s += letters[c]
        res.append(s)
    return {'rows': res, 'ax': anchor(rows)}, lp

# Kapalı küçük cepler (ne ana saça ne yüze bağlı): çizimde kâkül çizgisinin altında kalanlar yüzdür.
# Tasarımla tek tek karşılaştırıldı (tools/sprites/pockets.py): bu görünümlerdeki cepler ten, diğerleri saç.
SKIN_POCKETS = {('spiky', 'front'), ('round', 'front'), ('bob', 'side'), ('round', 'side')}

def build_hair(rows, pal, view, hid=''):
    bald = BALD[view][0]
    off = anchor(rows) - anchor(bald)  # saç figürü sütunu = kel sütun + off
    bout = outside(bald)
    out = outside(rows)
    def bald_outside(y, x):
        bx = x - off
        return not (0 <= y < len(bald) and 0 <= bx < len(bald[0])) or bout[y][bx]
    hair = set()
    for comp in components(rows, out):
        head_part = [(y, x) for y, x in comp if y < 13]  # boyun üstü: kafa silüeti karşılaştırması
        reaches_body = any(y > HEAD_ROWS for y, _ in comp)
        if any(bald_outside(y, x) for y, x in head_part):
            hair.update(comp)
        elif not reaches_body and (hid, view) not in SKIN_POCKETS:
            hair.update(comp)
    h, w = len(rows), len(rows[0])
    isin = lambda y, x: 0 <= y < h and 0 <= x < w
    res = []
    for y in range(h):
        s = ''
        for x in range(w):
            c = rows[y][x]
            if y < HEAD_ROWS:
                if (y, x) in hair: s += 'H'
                elif c == '#': s += '#'
                elif c == '.': s += '_' if out[y][x] else 'S'
                else: s += 'a'  # yanak
                continue
            if (y, x) in hair:
                deep = all(isin(y + dy, x + dx) and (y + dy, x + dx) in hair for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                s += 'H' if deep else 'h'
            elif c == '#':
                n4 = [(y + dy, x + dx) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if isin(y + dy, x + dx)]
                touches_hair = any(p in hair for p in n4)
                touches_body = any(rows[p[0]][p[1]] == '.' and not out[p[0]][p[1]] and p not in hair for p in n4)
                s += '#' if touches_hair and not touches_body else '.'
            else: s += '.'
        res.append(s)
    blush = next((pal[k] for k in pal), '#ef9090')
    return {'rows': res, 'ax': anchor(rows)}, blush

data = {'outfits': {}, 'hairs': {}, 'headRows': HEAD_ROWS}
for oid, views in OUTFITS.items():
    entry, pal = {}, {}
    for v, (rows, p) in views.items():
        entry[v], lp = build_outfit(rows, p)
        pal.update({f'{v}:{k}': c for k, c in lp.items()})
    data['outfits'][oid] = {'views': entry, 'pal': pal}
# Sade: mavi kazağın kesimi, desen yok, seçilen renk
entry, pal = {}, {}
for v, (rows, p) in OUTFITS['nordic'].items():
    entry[v], lp = build_outfit(rows, p, basic=True)
    pal.update({f'{v}:{k}': c for k, c in lp.items()})
data['outfits'] = {'basic': {'views': entry, 'pal': pal}, **data['outfits']}
for hid, views in HAIRS.items():
    entry, blush = {}, None
    for v, (rows, p) in views.items():
        entry[v], blush = build_hair(rows, p, v, hid)
    data['hairs'][hid] = {'views': entry, 'blush': blush}

js = '// Otomatik üretildi: tools/sprites/build_sprites.py (tasarımcı çizimlerinden). Elle düzenlemeyin.\n'
js += 'export const CHAR_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w', encoding='utf8').write(js)
print('yazıldı', OUT, len(js), 'bayt')
for hid, h in data['hairs'].items():
    print('\n== saç', hid, 'front')
    print('\n'.join(h['views']['front']['rows']))
