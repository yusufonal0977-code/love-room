// Haftalık ortak hedef, rozetler ve "art arda günler" (K38). Ceza yok: kaçırılan gün ya da hafta hiçbir yerde yazmaz,
// yalnızca yapılanlar sayılır. Haftanın üç hafif hedefi: 3 gün aynı anda evde olmak, bir film, bir mektup ya da günlük.
//   live/{rid}/week/{hafta}/together/{gün} = true   ikiniz aynı anda evdeydiniz
//   live/{rid}/week/{hafta}/did/{iş}       = true   movies | diary
//   live/{rid}/badges/{hafta}              = zaman  üç hedef de tamam
//   live/{rid}/days/{gün}/{uid}            = true   o gün eve uğradı (art arda gün sayısı için)
import { h, openSheet, toast } from '../ui.js';
import { onValue, set, serverTimestamp } from '../fb.js';
import { t } from '../i18n.js';
import { track } from './metrics.js';
import { confetti, sfx } from './juice.js';

import { localDay, weekKey, streakOf } from './goal-math.js';
export { localDay, weekKey, streakOf };

export const GOALS = [
  { id: 'together', title: 'Bu hafta 3 gün aynı anda evde olun', need: 3 },
  { id: 'movies', title: 'Birlikte bir film ya da video izleyin', need: 1 },
  { id: 'diary', title: 'Birbirinize bir mektup ya da günlük notu yazın', need: 1 },
];

export function createGoals(ctx) {
  const { live, uid } = ctx;
  let week = {}, badges = {}, days = {}, body = null, wk = weekKey();
  const sub = () => onValue(live.ref(`week/${wk}`), (s) => { week = s.val() || {}; check(); render(); });
  let stopWeek = sub();
  onValue(live.ref('badges'), (s) => { badges = s.val() || {}; render(); });
  onValue(live.ref('days'), (s) => { days = s.val() || {}; render(); });

  const progress = (g) => (g.id === 'together' ? Object.keys(week.together || {}).length : week.did?.[g.id] ? 1 : 0);
  const done = (g) => progress(g) >= g.need;
  function check() {
    if (badges[wk] || !GOALS.every(done)) return;
    set(live.ref(`badges/${wk}`), serverTimestamp()).catch(() => {});
    toast(t('Bu haftanın üç hedefi de tamam. Rozetiniz rafta.'), 5000);
    confetti(); sfx.badge();
    track('weekly_badge');
  }
  function rollWeek() { const k = weekKey(); if (k !== wk) { stopWeek(); wk = k; week = {}; stopWeek = sub(); } }

  /** Eve girişte ve gün değişince: bugün uğradım. */
  function visit() { rollWeek(); set(live.ref(`days/${localDay()}/${uid}`), true).catch(() => {}); }
  /** İkiniz aynı anda evdeyken (main.js onPresence çağırır). */
  function together() {
    rollWeek();
    const day = localDay();
    if (week.together?.[day]) return;
    set(live.ref(`week/${wk}/together/${day}`), true).catch(() => {});
  }
  /** live.stat çağrılarından: haftalık hedefe sayılanlar. */
  function did(key) {
    if (key !== 'movies' && key !== 'diary') return;
    rollWeek();
    if (week.did?.[key]) return;
    set(live.ref(`week/${wk}/did/${key}`), true).catch(() => {});
    toast(t('Haftalık hedeften biri tamam'), 3000);
    sfx.done();
  }
  const streak = () => streakOf(days, uid, ctx.partnerUid());

  function render() {
    if (!body || !document.body.contains(body)) return;
    body.innerHTML = '';
    const n = streak(), total = Object.keys(badges).length;
    body.append(
      h('p', { class: 'small' }, t('Her hafta üç küçük hedef. Kaçırırsanız bir şey olmaz; pazartesi yenisi gelir.')),
      h('ul', { class: 'goals' }, ...GOALS.map((g) => {
        const p = Math.min(progress(g), g.need);
        return h('li', { class: done(g) ? 'ok' : '' }, h('span', { class: 'gmark', 'aria-hidden': 'true' }), h('span', {}, t(g.title)), done(g) ? h('span', { class: 'sr' }, t('tamam')) : null, g.need > 1 ? h('small', {}, ` ${p}/${g.need}`) : null);
      })),
      h('p', {}, badges[wk] ? t('Bu haftanın rozeti kazanıldı.') : t('Üçü de tamam olunca bu haftanın rozetini kazanırsınız.')),
      total ? h('p', { class: 'small' }, t('Toplam rozetiniz: {n}', { n: total })) : null,
      n >= 2 ? h('p', { class: 'small' }, t('{n} gündür ikiniz de evinize uğradınız.', { n })) : null,
    );
  }
  function open() { body = openSheet({ title: 'Haftalık hedef', iconName: 'badge', onClose: () => (body = null) }); render(); }

  visit();
  setInterval(() => { if (document.visibilityState === 'visible') visit(); }, 10 * 60_000);
  return { open, visit, together, did, streak };
}
