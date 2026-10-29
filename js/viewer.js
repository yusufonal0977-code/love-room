// Vitrin görüntüleyici: ?ev=<id> linkiyle açılır. Giriş gerekmez; ziyaretçi evi misafir olarak gezer.
// Ev sahipleri salondaki kanepede oturur; evcil dostları dolaşır. Hiçbir şey veritabanına yazılmaz.
import { db, get, ref } from './fb.js';
import { createGame } from './game.js';
import { DECOR, DEFAULT_STATE, SCENES, repaint } from './scenes.js';
import { DEFAULT_LOOK } from './art.js';
import { $, toast, icon } from './ui.js';
import { t } from './i18n.js';
import { APP_URL } from './config.js';

export async function runViewer(id) {
  const snap = (await get(ref(db, `showcase/${id}`)).catch(() => null))?.val();
  if (!snap) return false;
  document.body.classList.add('viewer');
  ['gate', 'consent', 'setup', 'invite'].forEach((s) => ($(s).hidden = true));
  $('world').hidden = false;
  $('langCorner').hidden = false;

  // Evin görünümü
  const d = snap.decor || {};
  DECOR.paint = d.paint || {}; DECOR.moved = d.moved || {}; DECOR.items = d.items || {};
  Object.assign(DECOR.pet, snap.pet || {}, { food: 90, love: 90, play: 90, clean: 90 });
  DECOR.flower.stage = snap.flower?.stage ?? 0;
  repaint();
  const shared = { ...DEFAULT_STATE, ...(snap.state || {}), tv: false };
  const owners = snap.owners || [];
  const names = owners.map((o) => `${o.side === 'moon' ? '🌙' : '☀️'} ${o.name}`).join(' & ');

  // Üst çubuk: kimin evi + kendi evini kur
  $('roomName').textContent = t('{names} · evi', { names });
  $('status').textContent = t('Misafir olarak geziyorsun');
  $('connDot').hidden = true;
  const cta = $('inviteChip');
  cta.hidden = false;
  cta.textContent = t('Kendi evini kur ✨');
  cta.onclick = () => (location.href = APP_URL);
  $('bar').hidden = true;

  const seats = [{ x: 84, y: 116 }, { x: 108, y: 116 }];
  const sorted = [...owners].sort((a, b) => (a.side === 'moon') - (b.side === 'moon'));
  const game = createGame({
    canvas: $('c'), overlay: $('ov'), stage: $('stage'),
    look: DEFAULT_LOOK, side: 'sun', name: t('Misafir'),
    getShared: () => shared,
    getPartner: () => null,
    getHours: () => { const n = new Date(); return { hour: n.getHours() + n.getMinutes() / 60, partnerHour: null }; },
    isHost: () => true,
    getCat: () => null,
    getExtras: () => sorted.slice(0, 2).map((o, i) => ({ scene: 'salon', ...seats[i], look: o.look || DEFAULT_LOOK, side: o.side, pose: 'back' })),
    isTalking: () => false,
    micOff: () => false,
    onSpot(id) {
      if (id === 'lamp' || id === 'fire' || id === 'lights' || id === 'desk') { shared[id] = !shared[id]; return; }
      toast(t('Bu bir vitrin evi. Kendi evini kurunca hepsi senin olur ✨'), 3500);
    },
    onSceneChange: (s) => toast(t(SCENES[s].name), 1400),
    onToast: toast,
    blockInput: () => !!document.querySelector('.modal:not([hidden])'),
  });
  // Tablolar (ev sahipleri fotoğrafları da paylaştıysa)
  for (const sc of Object.values(SCENES)) for (const f of sc.frames || []) {
    const img = snap.frames?.[f.id];
    if (img) { DECOR.frames[f.id] = true; game.setPicture('frame:' + f.id, sc.id, [f.x, f.y, f.w, f.h], img); }
  }
  toast(t('{names} seni evlerine davet etti 💞 Gezmek için dokun ya da yürü.', { names }), 5000);
  window.__lr = { game, snap };
  return true;
}
