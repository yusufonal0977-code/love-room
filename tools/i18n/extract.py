"""Koddaki çevrilecek metinleri toplar → keys_now.json (build.py --missing bunu kullanır).
JS'teki Türkçe metin literal'leri, ikonlu düğme yazıları ve index.html'deki data-t/data-tp/data-tt içerikleri."""
import os, re, json, html as H, glob

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(os.path.dirname(os.path.dirname(HERE)))
files = ['js/main.js', 'js/game.js', 'js/call.js', 'js/scenes.js', 'js/decor.js', 'js/viewer.js', 'js/art.js'] + sorted(glob.glob('js/features/*.js'))
TR = re.compile(r'[ÇĞİÖŞÜçğıöşü]')
SKIP = re.compile(r'^(#|https?:|/|\.|[a-z]+[A-Z]\w*$|[a-z_\-]+$|[\w\-]+\.(js|png|jpg|webp|html)$|rgba?\(|\d)')
keys, seen = [], set()

def add(k):
    k = k.strip()
    if k and k not in seen:
        seen.add(k)
        keys.append(k)

lit = re.compile(r"'((?:[^'\\\n]|\\.)*)'")
for f in files:
    if not os.path.exists(f):
        continue
    src = open(f, encoding='utf8').read()
    for line in src.splitlines():
        st = line.strip()
        if st.startswith(('//', '*', 'import ')) or 'console.' in line:
            continue
        for m in lit.finditer(line):
            v = m.group(1).replace("\\'", "'")
            if len(v) < 2 or SKIP.match(v):
                continue
            if TR.search(v) or (' ' in v and re.search(r'[A-Za-z]', v)) or re.match(r'^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+$', v):
                add(v)
    for m in re.finditer(r"\$\{icon\('[A-Za-z]+'\)\} ([^`$]+)`", src):
        add(m.group(1))
s = open('index.html', encoding='utf8').read()
for m in re.finditer(r'<(\w+)\b[^>]*\bdata-t\b[^>]*>(.*?)</\1>', s, re.S):
    add(m.group(2).strip())
for m in re.finditer(r'data-tp[^>]*placeholder="([^"]+)"', s):
    add(m.group(1))
for m in re.finditer(r'data-tt title="([^"]+)"', s):
    add(H.unescape(m.group(1)))
json.dump(keys, open(os.path.join(HERE, 'keys_now.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=0)
