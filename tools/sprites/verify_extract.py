"""Çıkarılan ızgarayı orijinal görselle karşılaştırır: her hücrenin ortası dışında, hücre içindeki piksellerin
çoğunluk rengi de ızgaradaki renkle aynı mı? Kayma varsa (ölçek hatası) sağ/alt kenarlarda hatalı hücreler çıkar."""
import json, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
for name in sorted(os.listdir(os.path.join(HERE, 'designer'))):
    if not name.endswith('.png'): continue
    a = np.asarray(Image.open(os.path.join(HERE, 'designer', name)).convert('RGB')).astype(int)
    d = json.load(open(os.path.join(HERE, 'grids', name[:-4] + '.json')))
    sx, sy, ox, oy = d['sx'], d['sy'], d['ox'], d['oy']
    bad = []
    for k, f in enumerate(d['figures']):
        y0, y1, x0, x1 = f['box']
        for r, row in enumerate(f['rows']):
            for c, ch in enumerate(row):
                gy, gx = y0 + r, x0 + c
                # hücrenin iç bölgesi (kenarlardan %25 içeride)
                ya, yb = int(oy + (gy + 0.25) * sy), int(oy + (gy + 0.75) * sy)
                xa, xb = int(ox + (gx + 0.25) * sx), int(ox + (gx + 0.75) * sx)
                cell = a[ya:yb, xa:xb].reshape(-1, 3)
                dark = (cell.max(axis=1) < 22).mean()
                white = (cell.min(axis=1) > 235).mean()
                exp_dark, exp_white = ch == '#', ch == '.'
                if (exp_dark and dark < 0.6) or (exp_white and white < 0.6) or (not exp_dark and not exp_white and (dark > 0.4 or white > 0.4)):
                    bad.append((k, r, c, ch, round(dark, 2), round(white, 2)))
    print(name, 'şüpheli hücre:', len(bad))
    for b in bad[:12]: print('   fig', b[0], 'satır', b[1], 'sütun', b[2], 'beklenen', repr(b[3]), 'koyu', b[4], 'beyaz', b[5])
