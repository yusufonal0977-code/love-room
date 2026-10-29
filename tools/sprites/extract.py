"""Tasarımcının büyütülmüş piksel çizimlerinden birebir piksel ızgarası çıkarır.

Her görsel için: piksel boyutu (s) ve ızgara başlangıcı (ox, oy) renk geçişlerine en iyi oturan değerlerle bulunur,
sonra her hücrenin ortası okunur. Figürler (bağlı bileşenler) ayrı ayrı kırpılıp grids/<görsel>.json'a yazılır.
Kullanım: python extract.py   (designer/*.png → grids/*.json ve grids/*.txt)
"""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'designer'), os.path.join(HERE, 'grids')
os.makedirs(OUT, exist_ok=True)

def edges(a, axis):
    d = np.abs(np.diff(a.astype(int), axis=axis)).sum(axis=2) > 60
    return np.nonzero(d.any(axis=1 - axis))[0] + 1  # geçiş olan sütun/satır konumları

def fit(pos, n):
    """Geçiş konumlarına en iyi uyan hücre boyu ve başlangıç (alt piksel hassasiyetinde)."""
    best = None
    for s in np.arange(8.0, 20.0, 0.01):
        for o in np.arange(0, s, 0.25):
            r = (pos - o) % s
            err = np.minimum(r, s - r).mean()
            if best is None or err < best[0] - 1e-9: best = (err, s, o)
    return best

def hexc(c): return '#%02x%02x%02x' % tuple(int(v) for v in c)

for name in sorted(os.listdir(SRC)):
    if not name.endswith('.png'): continue
    a = np.asarray(Image.open(os.path.join(SRC, name)).convert('RGB'))
    H, W = a.shape[:2]
    ex, ey = edges(a, 1), edges(a, 0)
    errx, sx, ox = fit(ex, W)
    erry, sy, oy = fit(ey, H)
    s = (sx + sy) / 2
    cols, rows = int((W - ox) // sx), int((H - oy) // sy)
    grid = np.zeros((rows, cols, 3), np.uint8)
    for r in range(rows):
        for c in range(cols):
            y, x = int(oy + (r + 0.5) * sy), int(ox + (c + 0.5) * sx)
            grid[r, c] = np.median(a[max(0, y - 2):y + 3, max(0, x - 2):x + 3].reshape(-1, 3), axis=0)
    # Renkleri sınıflara ayır: beyaz arka plan ".", siyah "#", diğerleri renk kodu
    white = (grid.min(axis=2) > 235)
    black = (grid.max(axis=2) < 22)
    # Figürler: beyaz olmayan hücrelerin bağlı bileşenleri (8-komşu), sonra kutular
    mask = ~white
    lab = np.zeros(mask.shape, int); n = 0
    for r in range(rows):
        for c in range(cols):
            if mask[r, c] and not lab[r, c]:
                n += 1; st = [(r, c)]; lab[r, c] = n
                while st:
                    y, x = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < rows and 0 <= xx < cols and mask[yy, xx] and not lab[yy, xx]:
                                lab[yy, xx] = n; st.append((yy, xx))
    figs = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(ys) < 30: continue  # küçük parçalar (göz, yanak) ana figüre eklenecek
        figs.append([ys.min(), ys.max(), xs.min(), xs.max()])
    # Küçük parçaları (gözler vb.) içinde bulundukları figür kutusuna dahil et: kutular zaten kapsıyor
    figs.sort(key=lambda b: (round(b[0] / 20), b[2]))
    out = {'s': round(s, 3), 'sx': round(sx, 3), 'sy': round(sy, 3), 'ox': round(ox, 2), 'oy': round(oy, 2), 'err': [round(errx, 3), round(erry, 3)], 'figures': []}
    txt = [f'{name}: s={sx:.3f}/{sy:.3f} o=({ox},{oy}) hata={errx:.2f}/{erry:.2f}']
    palette = {}
    for k, (y0, y1, x0, x1) in enumerate(figs):
        lines = []
        for r in range(y0, y1 + 1):
            row = ''
            for c in range(x0, x1 + 1):
                if white[r, c]: row += '.'
                elif black[r, c]: row += '#'
                else:
                    h = hexc(grid[r, c])
                    # yakın tonları tek renkte topla
                    key = next((p for p in palette if np.abs(np.array(grid[r, c], int) - np.array(palette[p], int)).max() < 18), None)
                    if key is None:
                        key = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'[len(palette)]
                        palette[key] = [int(v) for v in grid[r, c]]
                    row += key
            lines.append(row)
        out['figures'].append({'box': [int(y0), int(y1), int(x0), int(x1)], 'rows': lines})
        txt.append(f'\n#{k} box rows {y0}-{y1} cols {x0}-{x1} ({x1 - x0 + 1}x{y1 - y0 + 1})')
        txt += lines
    out['palette'] = {k: hexc(v) for k, v in palette.items()}
    txt.append('\npalette: ' + json.dumps(out['palette']))
    base = name[:-4]
    json.dump(out, open(os.path.join(OUT, base + '.json'), 'w'), indent=1)
    open(os.path.join(OUT, base + '.txt'), 'w').write('\n'.join(txt))
    print(txt[0], len(out['figures']), 'figür')
