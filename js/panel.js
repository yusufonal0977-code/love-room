// Yönetim paneli (yonetim.html, K12-C): günlük aktif kullanıcı, D1/D7 geri dönüş, olay sayaçları, huni ve görüşler.
// Veriler yalnızca adminlere açık (database.rules.json: metrics, feedback). Hiçbir yere yazmaz.
import { auth, db, get, ref, firstUser, loginGoogle } from './fb.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (d, n) => day(new Date(`${d}T00:00:00Z`).getTime() + n * 864e5);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const EVENTS = {
  home_created: 'Ev kuruldu', partner_joined: 'Partner katıldı', invite_share: 'Davet paylaşıldı', invite_copy: 'Davet kopyalandı',
  movies: 'Film/video', songs: 'Şarkı', diary: 'Mektup/günlük', answers: 'Kavanoz cevabı', photos: 'Fotoğraf', meals: 'Yemek',
  wins: 'Oyun kazanıldı', decor: 'Dekor', hugs: 'Sarılma', kisses: 'Öpücük', shares: 'Paylaşım kartı', showcases: 'Vitrin',
  weekly_badge: 'Haftalık rozet', feedback: 'Görüş', push_on: 'Bildirim açıldı',
};

async function load() {
  const [active, events, online, fb] = await Promise.all(['metrics/active', 'metrics/events', 'metrics/online', 'feedback'].map((p) => get(ref(db, p)).then((s) => s.val() || {})));
  const today = day(Date.now());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const users = (d) => Object.keys(active[d] || {});
  const uniq = (n) => new Set(Array.from({ length: n }, (_, i) => users(addDays(today, -i))).flat()).size;

  // Geri dönüş: kişinin ilk aktif günü d ise d+1 / d+7 günü de aktif miydi
  const first = {};
  for (const d of Object.keys(active).sort()) for (const u of Object.keys(active[d])) first[u] ??= d;
  const ret = (n) => {
    let base = 0, back = 0;
    for (const [u, d] of Object.entries(first)) { const t = addDays(d, n); if (t >= today) continue; base++; if (active[t]?.[u]) back++; }
    return [back, base];
  };
  const [r1, b1] = ret(1), [r7, b7] = ret(7);
  const onlineNow = Object.values(online).filter((ts) => Date.now() - ts < 3 * 60_000).length;
  const sum = (ev, n) => Array.from({ length: n }, (_, i) => events[addDays(today, -i)]?.[ev] || 0).reduce((a, b) => a + b, 0);
  const homes = sum('home_created', 30), joined = sum('partner_joined', 30);

  const evNames = [...new Set([...Object.keys(EVENTS), ...days.flatMap((d) => Object.keys(events[d] || {}))])].filter((e) => days.some((d) => events[d]?.[e]));
  const fbList = Object.entries(fb).flatMap(([uid, items]) => Object.values(items || {}).map((x) => ({ ...x, uid }))).sort((a, b) => (b.at || 0) - (a.at || 0));

  $('out').innerHTML = `
    <section><h2>Özet</h2><div class="kpis">
      <div class="kpi"><b>${onlineNow}</b><span>şu an çevrimiçi</span></div>
      <div class="kpi"><b>${users(today).length}</b><span>bugün aktif</span></div>
      <div class="kpi"><b>${uniq(7)}</b><span>son 7 gün tekil</span></div>
      <div class="kpi"><b>${uniq(30)}</b><span>son 30 gün tekil</span></div>
      <div class="kpi"><b>${pct(r1, b1)}</b><span>D1 geri dönüş (${r1}/${b1})</span></div>
      <div class="kpi"><b>${pct(r7, b7)}</b><span>D7 geri dönüş (${r7}/${b7})</span></div>
      <div class="kpi"><b>${pct(joined, homes)}</b><span>30 gün: partner gelen ev (${joined}/${homes})</span></div>
    </div></section>
    <section><h2>Son 14 gün</h2><table>
      <tr><th>Olay</th>${days.map((d) => `<th>${d.slice(5)}</th>`).join('')}</tr>
      <tr><td><b>Aktif kullanıcı</b></td>${days.map((d) => `<td><b>${users(d).length}</b></td>`).join('')}</tr>
      ${evNames.map((e) => `<tr><td>${esc(EVENTS[e] || e)}</td>${days.map((d) => `<td>${events[d]?.[e] || ''}</td>`).join('')}</tr>`).join('')}
    </table></section>
    <section><h2>Görüşler (${fbList.length})</h2>
      ${fbList.map((x) => `<div class="fb"><span class="tag">${esc({ like: 'Sevdiği', bug: 'Sorun', idea: 'Fikir' }[x.kind] || x.kind)} · ${x.at ? new Date(x.at).toLocaleString('tr-TR') : ''} · ${esc(x.lang || '')}${x.app ? ' · Android' : ''} · ${esc(x.uid.slice(0, 6))}</span><p>${esc(x.text)}</p></div>`).join('') || '<p class="dim">Henüz görüş yok.</p>'}
    </section>`;
  $('out').hidden = false;
}

async function start() {
  const u = await firstUser();
  if (!u || u.isAnonymous) return;
  $('gate').hidden = true;
  $('who').textContent = `${u.email || u.uid} olarak girildi.`;
  const isAdmin = await get(ref(db, `admins/${u.uid}`)).then((s) => s.exists()).catch(() => false);
  if (!isAdmin) { $('who').textContent += ' Bu hesap admin değil.'; return; }
  try { await load(); } catch (e) { $('who').textContent += ` Veriler okunamadı: ${e.message}`; }
}
$('login').onclick = async () => { await loginGoogle().catch((e) => alert(e.message)); start(); };
start();
