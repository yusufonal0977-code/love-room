"""char-data.js katmanlarını büyük bir önizleme görseline döker (gözle kontrol için). Çıktı: preview.png
Birleştirme kuralları js/art.js'deki layers() ile aynıdır."""
import json, os, re
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, '..', '..', 'js', 'char-data.js'), encoding='utf8').read()
D = json.loads(re.search(r'CHAR_DATA = (\{.*\});', src, re.S).group(1))
SKIN, HAIR, SHIRT, PANTS = ['#ffe0c7', '#f1c09a', '#c98a5e', '#8a5638'], ['#2b1d16', '#6b3e22', '#c8742c', '#f2c14e', '#d9475a', '#f4efe6'], '#5b8def', '#3b4a6b'

def compose(outfit, hair, view, skin, hc):
    O = D['outfits'][outfit]; o = O['views'][view]
    hv = None if hair == 'none' else D['hairs'][hair]['views'][view]
    ax = max(o['ax'], hv['ax'] if hv else 0); ox = ax - o['ax']; hx = ax - hv['ax'] if hv else 0
    w = max(ox + len(o['rows'][0]), hx + len(hv['rows'][0]) if hv else 0); h = len(o['rows'])
    g = [['.'] * w for _ in range(h)]; srcs = [[''] * w for _ in range(h)]
    for y, r in enumerate(o['rows']):
        for x, c in enumerate(r):
            if c != '.': g[y][x + ox] = c; srcs[y][x + ox] = 'o'
    if hv:
        dy = hv.get('dy', 0)
        for y in range(dy): g[y] = ['.'] * w
        for y0, r in enumerate(hv['rows']):
            y = y0 + dy
            if y >= h: continue
            for x, c in enumerate(r):
                X = x + hx
                if c == '.': continue
                if y < D['headRows']: g[y][X] = '.' if c == '_' else c; srcs[y][X] = 'h'; continue
                if c == 'h' and g[y][X] == '#': continue
                g[y][X] = 'H' if c == 'h' else c; srcs[y][X] = 'h'
    col = {'#': '#000000', 'S': skin, 'P': PANTS, 'C': SHIRT, 'H': hc}
    im = Image.new('RGBA', (w, h))
    for y in range(h):
        for x in range(w):
            c = g[y][x]
            if c == '.': continue
            f = col.get(c) or (D['hairs'][hair]['blush'] if srcs[y][x] == 'h' else O['pal'].get(f'{view}:{c}', '#ff00ff'))
            im.putpixel((x, y), tuple(int(f[i:i + 2], 16) for i in (1, 3, 5)) + (255,))
    return im

hairs = list(D['hairs']) + ['none']; outs = list(D['outfits'])
S, cw, ch = 6, 26, 34
sheet = Image.new('RGBA', (cw * 3 * len(hairs), ch * len(outs)), (233, 216, 192, 255))
for r, oid in enumerate(outs):
    for i, hid in enumerate(hairs):
        for j, view in enumerate(['front', 'back', 'side']):
            im = compose(oid, hid, view, SKIN[(i + r) % 4], HAIR[i % 6])
            sheet.alpha_composite(im, ((i * 3 + j) * cw + (cw - im.width) // 2, r * ch + ch - 1 - im.height))
sheet = sheet.resize((sheet.width * S // 2, sheet.height * S // 2), Image.NEAREST)
sheet.save(os.path.join(HERE, 'preview.png'))
print(sheet.size)
