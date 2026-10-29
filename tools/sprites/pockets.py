"""Her saç çiziminde, ana saç kütlesine de yüze/gövdeye de bağlı olmayan kapalı beyaz cepleri listeler."""
import build_sprites as B

for hid, views in B.HAIRS.items():
    for view, (rows, pal) in views.items():
        bald = B.BALD[view][0]
        off = B.anchor(rows) - B.anchor(bald)
        bout = B.outside(bald); out = B.outside(rows)
        def bald_out(y, x):
            bx = x - off
            return not (0 <= y < len(bald) and 0 <= bx < len(bald[0])) or bout[y][bx]
        for comp in B.components(rows, out):
            big = any(bald_out(y, x) for y, x in comp if y < 13)
            body = any(y > B.HEAD_ROWS for y, _ in comp)
            if not big and not body:
                print(hid, view, sorted(comp))
