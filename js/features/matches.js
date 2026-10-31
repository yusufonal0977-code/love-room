// Admin odasındaki bilgisayar: günün futbol maçları ve bahis oranları (1 / X / 2), gün gün kaydırılır.
//
// Kaynak: The Odds API (ücretsiz planı ayda 500 kredi; tarayıcıdan çağrılabilir). Anahtarı bir admin bir kez girer:
//   admin/config/oddsKey = anahtar          yalnızca adminler okur
//   admin/matches        = { at, events }    ortak önbellek; en fazla 12 saatte bir yenilenir (7 lig = 7 kredi)
// Oranlar Avrupa bahis şirketlerinin ortalamasıdır, İddaa oranı değildir; bilgi amaçlıdır.
import { h, openSheet, toast } from '../ui.js';
import { db, ref, get, set } from '../fb.js';
import { t, locale } from '../i18n.js';

const LEAGUES = {
  soccer_turkey_super_league: 'Süper Lig', soccer_epl: 'Premier League', soccer_spain_la_liga: 'La Liga', soccer_italy_serie_a: 'Serie A',
  soccer_germany_bundesliga: 'Bundesliga', soccer_france_ligue_one: 'Ligue 1', soccer_uefa_champs_league: 'Şampiyonlar Ligi',
};
const FRESH = 12 * 3_600_000, MIN_GAP = 30 * 60_000;
const API = 'https://api.the-odds-api.com/v4/sports';
const dayKey = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };

export function createMatches() {
  let body = null, day = dayKey(Date.now()), cache = null, key = null, busy = false;

  /** Bir ligin yaklaşan maçları; her maç için bahis şirketlerinin 1/X/2 ortalaması. */
  async function fetchLeague(sport, apiKey) {
    const r = await fetch(`${API}/${sport}/odds/?apiKey=${encodeURIComponent(apiKey)}&regions=eu&markets=h2h&oddsFormat=decimal&dateFormat=iso`);
    if (r.status === 401) throw new Error('key');
    if (!r.ok) return [];
    const list = await r.json();
    return list.map((e) => {
      const sum = { h: [], d: [], a: [] };
      for (const b of e.bookmakers || []) for (const m of b.markets || []) if (m.key === 'h2h') for (const o of m.outcomes) {
        (o.name === e.home_team ? sum.h : o.name === e.away_team ? sum.a : sum.d).push(o.price);
      }
      const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 100) / 100 : null);
      return { id: e.id, league: LEAGUES[sport] || e.sport_title, home: e.home_team, away: e.away_team, at: Date.parse(e.commence_time), h: avg(sum.h), d: avg(sum.d), a: avg(sum.a) };
    });
  }
  async function refresh(force = false) {
    if (busy || !key) return;
    if (cache && Date.now() - cache.at < (force ? MIN_GAP : FRESH)) { if (force) toast(t('Liste zaten güncel.')); return; }
    busy = true; render();
    try {
      const all = (await Promise.all(Object.keys(LEAGUES).map((s) => fetchLeague(s, key).catch((e) => { if (e.message === 'key') throw e; return []; })))).flat();
      cache = { at: Date.now(), events: all.sort((x, y) => x.at - y.at) };
      await set(ref(db, 'admin/matches'), cache).catch(() => {});
    } catch (e) {
      toast(e.message === 'key' ? t('Anahtar geçersiz. Bilgisayarda yeniden gir.') : t('Maçlar alınamadı.'), 4000);
      if (e.message === 'key') { key = null; await set(ref(db, 'admin/config/oddsKey'), null).catch(() => {}); }
    }
    busy = false; render();
  }

  function render() {
    if (!body || !document.body.contains(body)) return;
    body.innerHTML = '';
    if (!key) {
      const inp = h('input', { placeholder: t('API anahtarı'), autocomplete: 'off' });
      body.append(h('div', { class: 'pc' },
        h('p', {}, t('Maç ve oran listesi için bir kez ücretsiz bir anahtar gerekiyor.')),
        h('ol', {}, h('li', {}, t('the-odds-api.com adresinde ücretsiz planı seç; anahtar e-postana gelir.')), h('li', {}, t('Anahtarı aşağıya yapıştır. Bütün adminler için bir kez yeterli.'))),
        h('div', { class: 'row' }, inp, h('button', { class: 'primary', onclick: async () => {
          const v = inp.value.trim(); if (!v) return;
          await set(ref(db, 'admin/config/oddsKey'), v).catch(() => toast(t('Kaydedilemedi. Kurallar güncel mi?')));
          key = v; refresh(true);
        } }, 'Kaydet'))));
      return;
    }
    // Gün şeridi: dünden itibaren 8 gün, yatay kaydırılır
    const days = [...Array(8)].map((_, i) => dayKey(Date.now()) + (i - 1) * 86_400_000);
    const strip = h('div', { class: 'pcdays' }, ...days.map((d) => h('button', { class: d === day ? 'sel' : '', onclick: () => { day = d; render(); } },
      d === dayKey(Date.now()) ? t('Bugün') : new Date(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }))));
    const list = (cache?.events || []).filter((e) => dayKey(e.at) === day);
    const groups = {};
    list.forEach((e) => (groups[e.league] ||= []).push(e));
    const odd = (v) => h('span', { class: 'odd' }, v ? v.toFixed(2) : '-');
    body.append(h('div', { class: 'pc' },
      h('div', { class: 'pchead' }, h('span', {}, 'GLR-PC // ' + t('maçlar ve oranlar')), h('button', { class: 'link', onclick: () => refresh(true) }, busy ? t('Yükleniyor…') : 'Yenile')),
      strip,
      list.length ? null : h('p', { class: 'small' }, busy ? t('Yükleniyor…') : t('Bu gün için maç yok.')),
      ...Object.entries(groups).map(([lg, es]) => h('section', {}, h('b', {}, lg),
        h('div', { class: 'pcrow pchd' }, h('span', {}, ''), h('span', {}, ''), h('span', { class: 'odd' }, '1'), h('span', { class: 'odd' }, 'X'), h('span', { class: 'odd' }, '2')),
        ...es.map((e) => h('div', { class: 'pcrow' }, h('span', { class: 'tm' }, new Date(e.at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })), h('span', {}, `${e.home} - ${e.away}`), odd(e.h), odd(e.d), odd(e.a))))),
      h('small', {}, t('Oranlar Avrupa bahis şirketlerinin ortalamasıdır, İddaa oranı değildir. Son güncelleme: {at}', { at: cache ? new Date(cache.at).toLocaleString(locale) : '-' })),
    ));
    body.querySelector('.pcdays .sel')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  async function open() {
    body = openSheet({ title: 'Bilgisayar', iconName: 'screen', wide: true, onClose: () => (body = null) });
    body.classList.add('pcsheet');
    body.append(h('p', { class: 'small' }, t('Yükleniyor…')));
    const [k, m] = await Promise.all([get(ref(db, 'admin/config/oddsKey')), get(ref(db, 'admin/matches'))].map((p) => p.then((s) => s.val()).catch(() => null)));
    key = k; cache = m;
    render();
    refresh();
  }
  return { open };
}
