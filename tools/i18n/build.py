"""Çeviri sözlüklerini üretir: js/i18n/<dil>.js

Kaynaklar (bu klasörde):
  keys_v1.json   ilk sürümün Türkçe anahtarları (sıra numarasıyla)
  base1/2.tsv    sıra no → en es de fr pt
  ar.tsv         sıra no → ar
  extra*.tsv     Türkçe anahtar → en es de fr pt ar   (yeni metinler buraya eklenir)

Kullanım:  python tools/i18n/build.py            sözlükleri üretir
           python tools/i18n/build.py --missing  koddaki çevrilmemiş metinleri listeler
"""
import json, os, re, sys, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LANGS = ['en', 'es', 'de', 'fr', 'pt', 'ar']
VAR = re.compile(r'\{\w+\}')

keys = json.load(open(os.path.join(HERE, 'keys_v1.json'), encoding='utf8'))
dicts = {l: {} for l in LANGS}

def put(lang, k, v, where):
    if set(VAR.findall(v)) != set(VAR.findall(k)):
        sys.exit(f'Değişken uyuşmazlığı ({where}, {lang}): {k!r} → {v!r}')
    dicts[lang][k] = v

def rows(fn):
    p = os.path.join(HERE, fn)
    if not os.path.exists(p):
        return
    for n, line in enumerate(open(p, encoding='utf8'), 1):
        line = line.rstrip('\n')
        if line.strip() and not line.startswith('#'):
            yield n, line.split('\t')

for fn in ('base1.tsv', 'base2.tsv'):
    for n, parts in rows(fn):
        assert len(parts) == 6, (fn, n)
        for l, v in zip(LANGS[:5], parts[1:]):
            put(l, keys[int(parts[0])], v, f'{fn}:{n}')
for n, parts in rows('ar.tsv'):
    assert len(parts) == 2, ('ar.tsv', n)
    put('ar', keys[int(parts[0])], parts[1], f'ar.tsv:{n}')
for fn in sorted(f for f in os.listdir(HERE) if f.startswith('extra') and f.endswith('.tsv')):
    for n, parts in rows(fn):
        assert len(parts) == 7, (fn, n, len(parts), parts[0][:40])
        for l, v in zip(LANGS, parts[1:]):
            put(l, parts[0], v, f'{fn}:{n}')

if '--missing' in sys.argv:
    subprocess.run([sys.executable, os.path.join(HERE, 'extract.py')], check=True)
    now = json.load(open(os.path.join(HERE, 'keys_now.json'), encoding='utf8'))
    have = set(dicts['en'])
    for k in now:
        if k not in have:
            print(k)
    sys.exit(0)

out = os.path.join(ROOT, 'js', 'i18n')
os.makedirs(out, exist_ok=True)
for l in LANGS:
    with open(os.path.join(out, f'{l}.js'), 'w', encoding='utf8', newline='\n') as f:
        f.write(f'// Get Love Room · {l} çevirisi (anahtar: Türkçe kaynak metin). tools/i18n/build.py ile üretilir, elle düzenlemeyin.\n')
        f.write('export default ' + json.dumps(dicts[l], ensure_ascii=False, indent=1) + ';\n')
print({l: len(d) for l, d in dicts.items()})
