"""Yeni evcil hayvan: rakun (gönderilen piksel rakundan esinlenildi). Varsayılan ilk hayvan: siyah kedi Pascal.
Mevcut türlere ve renklere dokunulmaz; siyah renk ve rakun listelerin sonuna eklenir."""
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
def patch(rel, pairs):
    p = os.path.join(ROOT, rel)
    s = open(p, encoding='utf8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (rel, a)
        s = s.replace(a, b)
    open(p, 'w', encoding='utf8').write(s)

RACCOON = """  // Rakun: gri gövde, açık gri yüz, koyu göz maskesi içinde beyaz parıltı, halkalı kuyruk (t koyu halka)
  raccoon: {
    walk: [
      ['..........k...k.', '..........kkkkk.', '..t.......mmlmm.', '.tk.......emlme.', 'tk........llnll.', 'kt.kkkkkkkkkkk..', '.tkkkkkkkkkkkk..', '...kkllllllkkk..', '...kk.kk..kk.kk.', '...mm.mm..mm.mm.'],
      ['..........k...k.', '..........kkkkk.', '..t.......mmlmm.', '.tk.......emlme.', 'tk........llnll.', 'kt.kkkkkkkkkkk..', '.tkkkkkkkkkkkk..', '...kkllllllkkk..', '....kk.kk..kk.kk', '....mm.mm..mm.mm'],
    ],
    sit: ['..k...k...', '..kkkkk...', '..mmlmm...', '..emlme...', '..llnll...', '.kkkkkkk..', '.kklllkk.t', '.kklllkktk', '.kkkkkkkt.', '..mm.mm...'],
    head: [[13, 1], [5, 1]],
    pal: { e: '#ffffff', l: '#e4e7ec', m: '#3a3a40', t: '#3a3a40', n: '#2b1d16' },
  },
"""

patch('js/art.js', [
    ("    head: [[12, 1], [3, 1]],\n  },\n};\nexport const PET_SPECIES = ['cat', 'dog', 'bunny'];",
     "    head: [[12, 1], [3, 1]],\n  },\n" + RACCOON + "};\nexport const PET_SPECIES = ['cat', 'dog', 'bunny', 'raccoon'];"),
    ("export const PET_COLORS = ['#f0a050', '#3a3330', '#f4efe6', '#9a9aa6', '#c8742c', '#e8c9a0'];",
     "// Siyah (Pascal) ve rakun grisi sona eklendi; eski renklerin sırası değişmesin\n"
     "export const PET_BLACK = '#1f1c24', PET_RACCOON = '#98a2ae';\n"
     "export const PET_COLORS = ['#f0a050', '#3a3330', '#f4efe6', '#9a9aa6', '#c8742c', '#e8c9a0', PET_BLACK, PET_RACCOON];\n"
     "/** Varsayılan ilk evcil hayvan: siyah kedi Pascal. */\n"
     "export const DEFAULT_PET = { name: 'Pascal', species: 'cat', color: PET_BLACK };"),
    ("  const pal = { k: color, D: shade(color, -0.3), e: '#2b1d16', n: '#2b1d16', w: '#fff1e2' };",
     "  const pal = { k: color, D: shade(color, -0.3), e: '#2b1d16', n: '#2b1d16', w: '#fff1e2', ...(d.pal || {}) };\n"
     "  // Siyah kedide koyu göz görünmez: sarı gözler, kömür grisi göğüs\n"
     "  if (color === PET_BLACK && !d.pal) Object.assign(pal, { e: '#f2d14a', n: '#6b6470', w: '#3b3642', D: '#120f16' });"),
])

patch('js/features/care.js', [
    ("import { petSprites, drawPetAcc, PET_COLORS, PET_ACC } from '../art.js';",
     "import { petSprites, drawPetAcc, PET_COLORS, PET_ACC, PET_RACCOON, DEFAULT_PET } from '../art.js';"),
    ("    const p = { name: t('Pamuk'), species: 'cat', color: PET_COLORS[0], acc: 'none',",
     "    const p = { ...DEFAULT_PET, acc: 'none',"),
    ("  const SPECIES = { cat: 'Kedi', dog: 'Köpek', bunny: 'Tavşan' };",
     "  const SPECIES = { cat: 'Kedi', dog: 'Köpek', bunny: 'Tavşan', raccoon: 'Rakun' };"),
    ("    bunny: { food: '{name} havucu kemirdi 🥕', love: '{name} burnunu oynattı 🐰', play: '{name} zıp zıp zıpladı ✨', clean: '{name} pamuk gibi oldu 🫧' },",
     "    bunny: { food: '{name} havucu kemirdi 🥕', love: '{name} burnunu oynattı 🐰', play: '{name} zıp zıp zıpladı ✨', clean: '{name} pamuk gibi oldu 🫧' },\n"
     "    raccoon: { food: '{name} mamasını patileriyle yıkayıp yedi 🦝', love: '{name} kuyruğunu sarıp sokuldu 🦝', play: '{name} parlak bir şey buldu, saklıyor ✨', clean: '{name} maskesi bile pırıl pırıl 🫧' },"),
    ("    name.onchange = () => update(live.ref('pet'), { name: name.value.trim() || t('Pamuk') });",
     "    name.onchange = () => update(live.ref('pet'), { name: name.value.trim() || DEFAULT_PET.name });"),
    # Rakuna geçince gri olsun (kedi rengindeki rakun tuhaf durur); diğer türlerde renk aynen kalır
    ("(v) => update(live.ref('pet'), { species: v }), (it) => h('button', {}, it.label)),",
     "(v) => update(live.ref('pet'), v === 'raccoon' && p.species !== 'raccoon' ? { species: v, color: PET_RACCOON } : { species: v }), (it) => h('button', {}, it.label)),"),
])

patch('js/scenes.js', [
    ("  pet: { species: 'cat', color: '#f0a050', acc: 'none', food: 80, love: 80, play: 80, clean: 80 },",
     "  pet: { species: 'cat', color: '#1f1c24', acc: 'none', food: 80, love: 80, play: 80, clean: 80 }, // varsayılan: siyah kedi Pascal"),
])

rows = [
    ("Rakun", "Raccoon", "Mapache", "Waschbär", "Raton laveur", "Guaxinim", "راكون"),
    ("{name} mamasını patileriyle yıkayıp yedi 🦝", "{name} washed its food with its paws, then ate 🦝", "{name} lavó su comida con las patitas y comió 🦝", "{name} hat das Futter mit den Pfoten gewaschen und gefressen 🦝", "{name} a lavé sa nourriture avec ses pattes avant de manger 🦝", "{name} lavou a comida com as patinhas e comeu 🦝", "غسل {name} طعامه بكفّيه ثم أكل 🦝"),
    ("{name} kuyruğunu sarıp sokuldu 🦝", "{name} curled its tail around you and snuggled 🦝", "{name} te rodeó con la cola y se acurrucó 🦝", "{name} hat sich mit dem Schwanz an dich gekuschelt 🦝", "{name} s'est blotti contre toi en enroulant sa queue 🦝", "{name} se enrolou com o rabo e se aconchegou 🦝", "لفّ {name} ذيله حولك واقترب منك 🦝"),
    ("{name} parlak bir şey buldu, saklıyor ✨", "{name} found something shiny and is hiding it ✨", "{name} encontró algo brillante y lo esconde ✨", "{name} hat etwas Glänzendes gefunden und versteckt es ✨", "{name} a trouvé un truc brillant et le cache ✨", "{name} achou algo brilhante e está escondendo ✨", "وجد {name} شيئًا لامعًا ويخبّئه ✨"),
    ("{name} maskesi bile pırıl pırıl 🫧", "{name} is spotless, even the mask 🫧", "{name} está reluciente, ¡hasta el antifaz! 🫧", "{name} glänzt, sogar die Maske 🫧", "{name} est tout propre, même son masque 🫧", "{name} está brilhando, até a máscara 🫧", "{name} نظيف تمامًا، حتى قناعه 🫧"),
]
with open(os.path.join(ROOT, 'tools', 'i18n', 'extra2.tsv'), 'a', encoding='utf8') as f:
    f.write('# v0.16: rakun, Pascal\n')
    for r in rows: f.write('\t'.join(r) + '\n')
print('ok')
