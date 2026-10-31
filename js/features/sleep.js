// Uyku: yatak odası açıldıktan sonra devreye giren hafif bir ihtiyaç (evdeki tek iki ihtiyaç açlık ve uyku).
//
// live/{rid}/energy/{uid} = dinçlik (0-100). Evde geçen her dakika azıcık düşer (yaklaşık 6 saatte biter);
// yatakta uzanınca hızla dolar: kısa bir şekerleme (~2 dk) yeter. Sıkmasın diye yalnızca bir kez hatırlatır.
import { h, toast } from '../ui.js';
import { set } from '../fb.js';
import { t } from '../i18n.js';

export function createSleep(ctx, { enabled, lying }) {
  const { live, uid } = ctx;
  let energy = {}, warned = false, sent = null;
  const mine = () => energy[uid] ?? 100;
  const chip = h('span', { class: 'chip energy', title: t('Dinçlik'), hidden: true });
  document.querySelector('#top .chips')?.prepend(chip);
  const show = () => {
    chip.hidden = !enabled();
    const v = Math.round(mine()); chip.textContent = `😴 ${v}%`; chip.classList.toggle('warn', v < 20);
  };
  live.on('energy', (v) => { energy = v || {}; show(); });
  const save = (v) => { v = Math.round(Math.max(0, Math.min(100, v)) * 10) / 10; if (v !== sent) { sent = v; set(live.ref(`energy/${uid}`), v); } };

  // Uzanırken her 5 sn'de +4 (0'dan 100'e ~2 dk); ayaktayken dakikada -0.28
  const nap = setInterval(() => {
    show();
    if (!enabled() || !lying()) return;
    const before = mine();
    if (before >= 100) return;
    const v = Math.min(100, before + 4);
    energy[uid] = v; save(v); show();
    if (v >= 100) toast(t('Dinlendin ✨ Enerjin tamamen doldu.'), 3000);
  }, 5000);
  const drain = setInterval(() => {
    if (!enabled() || lying() || document.visibilityState !== 'visible') return;
    const v = Math.max(0, mine() - 0.28);
    energy[uid] = v; save(v); show();
    if (v < 20 && !warned) { warned = true; toast(t('Uykun geldi 😴 Yatak odasında kısa bir şekerleme yapabilirsin.'), 5000); }
    if (v >= 20) warned = false;
  }, 60_000);

  return {
    sleepy: (who) => enabled() && (who === 'me' ? mine() : energy[ctx.partnerUid()] ?? 100) < 20,
    stop: () => { clearInterval(nap); clearInterval(drain); },
  };
}
