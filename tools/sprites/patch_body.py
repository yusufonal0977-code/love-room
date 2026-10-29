"""Kız/erkek beden: tasarımda yanağı pembe olan modeller kız. Kız 29, erkek 31 piksel boyunda; yanak kızda var, erkekte yok."""
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
def patch(rel, pairs):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (rel, a)
        s = s.replace(a, b)
    open(p, 'w', encoding='utf8').write(s)

patch('js/art.js', [
    ("const LEGACY_HAIR = { bun: 'short' };",
     "const LEGACY_HAIR = { bun: 'short' };\n"
     "// Beden: tasarımda yanağı pembe çizilen modeller kız. Kız erkekten 2 piksel kısa (tasarımcının kız tabanı 29 satır).\n"
     "const HEIGHT = { f: 29, m: 31 };\n"
     "const BLUSH_AT = { front: [[12, 4], [12, 13]], side: [[12, 10]], back: [] }; // kel kafa koordinatı (satır, sütun)\n"
     "const BLUSH = '#ef9090';\n"
     "/** Kayıtlı bedeni yoksa eski profiller için tahmin: kız saçı ya da kız kıyafeti → kız. */\n"
     "export function bodyOf(look) {\n"
     "  if (look?.body === 'f' || look?.body === 'm') return look.body;\n"
     "  return ['long', 'bob', 'bowl', 'round'].includes(look?.hair) || ['nordicPink', 'tee', 'cardiganBeige'].includes(look?.outfit) ? 'f' : 'm';\n"
     "}\n"
     "/** Boyu bacaklardan ayarlar: aynı olan ardışık satırlardan (düz pantolon, bacak arası) biri silinir ya da çoğaltılır;\n"
     " *  böylece çizimdeki şekil bozulmaz, yalnızca bacak kısalır/uzar. Önce düz pantolon satırları, sonra bacak arası. */\n"
     "function fitHeight(L, target) {\n"
     "  const key = (y) => L.g[y].join('');\n"
     "  const runs = () => {\n"
     "    const out = [];\n"
     "    for (let y = 22; y < L.g.length - 1; y++) {\n"
     "      let e = y;\n"
     "      while (e + 1 < L.g.length - 1 && key(e + 1) === key(y)) e++;\n"
     "      if (L.g[y].includes('P')) out.push([y, e - y + 1]);\n"
     "      y = e;\n"
     "    }\n"
     "    return out;\n"
     "  };\n"
     "  let guard = 8;\n"
     "  while (L.g.length !== target && guard--) {\n"
     "    const r = runs();\n"
     "    if (!r.length) break;\n"
     "    if (L.g.length > target) {\n"
     "      const pick = r.find(([, n]) => n >= 2) || null; // en üstteki tekrar eden satır grubu\n"
     "      if (!pick) break;\n"
     "      L.g.splice(pick[0], 1); L.src.splice(pick[0], 1);\n"
     "    } else {\n"
     "      const [y] = r[0];\n"
     "      L.g.splice(y, 0, L.g[y].slice()); L.src.splice(y, 0, L.src[y].slice());\n"
     "    }\n"
     "  }\n"
     "}"),
    ("  return { g, src, outfit, hair, view };\n}",
     "  const body = bodyOf(look);\n"
     "  for (const [y, x] of BLUSH_AT[view]) {\n"
     "    const X = x + ox, c = g[y]?.[X];\n"
     "    if (c === undefined || c === '#' || c === 'H') continue;\n"
     "    g[y][X] = body === 'f' ? 'B' : 'S'; src[y][X] = '';\n"
     "  }\n"
     "  const L = { g, src, outfit, hair, view };\n"
     "  fitHeight(L, HEIGHT[body]);\n"
     "  return L;\n}"),
    ("'#': LINE, S: skin, P: PANTS[look.pants] ?? PANTS[0],", "'#': LINE, B: BLUSH, S: skin, P: PANTS[look.pants] ?? PANTS[0],"),
])

patch('js/main.js', [
    ("import { DEFAULT_LOOK, HAIR, HAIR_STYLES, OUTFIT_IDS,", "import { DEFAULT_LOOK, HAIR, HAIR_STYLES, OUTFIT_IDS, bodyOf,"),
    ("    opts('edHair', 'Saç',",
     "    look.body = bodyOf(look);\n"
     "    opts('edBody', 'Beden', [{ label: 'Kız', value: 'f' }, { label: 'Erkek', value: 'm' }], () => look.body, (v) => (look.body = v));\n"
     "    opts('edHair', 'Saç',"),
])

patch('index.html', [
    ('    <div class="opts" id="edHair"></div>', '    <div class="opts" id="edBody"></div>\n    <div class="opts" id="edHair"></div>'),
])
print('ok')
