// Haftalık hedef ve art arda gün hesapları (goals.js). Saf fonksiyonlar: tarayıcı ve node testleri (tests/) aynı kodu kullanır.
const pad = (n) => String(n).padStart(2, '0');
/** Yerel gün: YYYY-MM-DD (gece yarısı kullanıcının saatine göre). */
export const localDay = (ms = Date.now()) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
/** ISO hafta anahtarı: 2026-W47 (hafta pazartesi başlar). */
export function weekKey(ms = Date.now()) {
  const d = new Date(ms); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // haftanın perşembesi
  const y = d.getFullYear(), w1 = new Date(y, 0, 4);
  const w = 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  return `${y}-W${pad(w)}`;
}
/** Bugünden geriye, ikinizin de uğradığı art arda gün sayısı. Bugün henüz biri gelmediyse dünden sayar (gün bitmeden "kırılmaz"). */
export function streakOf(days, a, b, today = localDay()) {
  if (!a || !b) return 0;
  const both = (k) => days?.[k]?.[a] && days?.[k]?.[b];
  const d = new Date(`${today}T12:00:00`);
  if (!both(today)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (both(localDay(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
