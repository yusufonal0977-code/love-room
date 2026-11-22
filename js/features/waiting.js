// "Partnerin henüz gelmedi" penceresi (K26-B). Ev yeni kurulunca ve partner gelmeden her açılışta (günde bir kez) çıkar:
// davet linki en üstte, altında tek başına yapılabilecekler ve "partnerine bir not bırak" yönlendirmesi.
// Üst çubuktaki "Partnerini davet et" düğmesi de bunu açar.
import { h, icon, openSheet, closeSheet, toast } from '../ui.js';
import { t } from '../i18n.js';
import { track } from './metrics.js';

const SEEN = 'lr.waitSeen';

export function createWaiting(ctx, { inviteUrl, life, decor, care, games }) {
  function open() {
    const b = openSheet({ title: 'Partnerin gelene kadar', iconName: 'heart', wide: true });
    const url = inviteUrl();
    const shareInvite = async () => {
      const text = t('Seni ortak evimize çağırıyorum:');
      try {
        if (navigator.share) { await navigator.share({ title: 'Get Love Room', text, url }); track('invite_share'); return; }
      } catch (e) { if (e?.name === 'AbortError') return; }
      await navigator.clipboard.writeText(url).catch(() => {});
      toast(t('Davet linki kopyalandı'));
      track('invite_copy');
    };
    const step = (ic, title, sub, fn) => h('button', { class: 'hubtile', onclick: () => { closeSheet(); fn(); } }, h('span', { class: 'hi', html: icon(ic) }), h('b', {}, t(title)), h('small', {}, t(sub)));
    b.append(
      h('p', {}, t('Linki partnerine gönder; açınca aynı evde olursunuz. Bu arada evi birlikte yaşanacak hale getirebilirsin.')),
      h('div', { class: 'invrow waitinv' }, h('div', { class: 'linkbox' }, h('span', {}, url)), h('button', { class: 'primary', onclick: shareInvite }, 'Linki gönder')),
      h('div', { class: 'hubgrid' },
        step('heart', 'Partnerine not bırak', 'Geldiğinde mektubu açsın', () => life.openDiary('surprise')),
        step('jar', 'Kavanozdan soru çek', 'Cevabını şimdi yaz', () => life.openJar()),
        step('paint', 'Evi düzenle', 'Eşya ekle, odayı boya', () => decor.open('shop')),
        step('paw', 'Evcil dostunuzla tanış', 'Adını koy, besle', () => care.openPet()),
        step('game', 'Botla langırt', 'Isınma maçı', () => games.openFoos()),
      ),
    );
    try { localStorage.setItem(SEEN, new Date().toDateString()); } catch { /* gizli sekme */ }
  }
  /** Partner yoksa günde bir kez kendiliğinden açılır. */
  function maybe() {
    if (ctx.partnerUid()) return;
    let seen = null;
    try { seen = localStorage.getItem(SEEN); } catch { /* gizli sekme */ }
    if (seen !== new Date().toDateString()) open();
  }
  return { open, maybe };
}
