"""Her saç çiziminde boynun en dar satırını ve omuzların başladığı satırı bulur; kel tabanla karşılaştırır.
Omuzlar tabandan farklı satırda başlıyorsa saç katmanının kafa sınırı o çizim için ayarlanmalı."""
import build_sprites as B

def neck(rows):
    """12. satırdan sonra figür genişliği en dar olan satır (boyun) ve ardından genişlemeye başladığı satır."""
    widths = []
    for y in range(12, 20):
        r = rows[y]
        xs = [x for x, c in enumerate(r) if c != '.']
        widths.append((xs[-1] - xs[0] + 1) if xs else 99)
    m = min(range(len(widths)), key=lambda i: (widths[i], -i))
    return 12 + m

for hid, views in B.HAIRS.items():
    for view, (rows, _) in views.items():
        print(f'{hid:6} {view:5} boyun satırı {neck(rows):2}   taban {neck(B.BALD[view][0]):2}')
