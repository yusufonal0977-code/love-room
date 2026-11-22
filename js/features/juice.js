// Oyun hissi ("juice"): duygusal anlara küçük piksel patlamaları, konfeti ve yumuşak sesler.
// Menü ve pencereler sakin kalır (Emil yaklaşımı); bu dosya yalnızca kalp, sarılma, hedef ve rozet gibi anlar içindir.
// Hareketi azalt tercihi açıksa görsel patlama yok; ses ayrıca "lr.sfx" = "0" ile kapanır.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sfxOn = () => { try { return localStorage.getItem('lr.sfx') !== '0'; } catch { return true; } };

// Piksel kalp: 7x6 ızgara, canvas'tan bir kez üretilir
let HEART = null;
function heartUrl(color) {
  const rows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const c = document.createElement('canvas'); c.width = 7; c.height = 6;
  const g = c.getContext('2d'); g.fillStyle = color;
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === 'X' && g.fillRect(x, y, 1, 1)));
  return c.toDataURL();
}

/** Bir öğeden yukarı doğru piksel kalpler fışkırır (kalp, sarılma, öpücük). */
export function burst(el, color = '#ff6f8f', n = 7) {
  if (!el || reduce()) return;
  HEART ??= {};
  HEART[color] ??= heartUrl(color);
  const r = el.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const p = document.createElement('img');
    p.src = HEART[color]; p.alt = ''; p.className = 'juice';
    const size = 14 + Math.round(Math.random() * 10);
    Object.assign(p.style, { left: `${r.left + r.width / 2 - size / 2}px`, top: `${r.top + r.height / 2 - size / 2}px`, width: `${size}px` });
    document.body.append(p);
    const dx = (Math.random() - 0.5) * 120, dy = -70 - Math.random() * 90, rot = (Math.random() - 0.5) * 40;
    p.animate([
      { transform: 'translate(0, 0) scale(0.6)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.7}px) scale(1.15) rotate(${rot / 2}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.9) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 250, delay: i * 35, easing: 'cubic-bezier(0.23, 1, 0.32, 1)', fill: 'forwards' }).onfinish = () => p.remove();
  }
}

/** Ekranın üstünden yağan piksel konfeti (haftalık rozet). */
export function confetti() {
  if (reduce()) return;
  const colors = ['#fcdf4b', '#ff6f8f', '#9ee6a8', '#8fc7ff', '#fff6d8'];
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('i');
    p.className = 'juice';
    const s = 5 + Math.round(Math.random() * 4);
    Object.assign(p.style, { left: `${Math.random() * 100}vw`, top: '-12px', width: `${s}px`, height: `${s}px`, background: colors[i % colors.length] });
    document.body.append(p);
    const fall = innerHeight * (0.6 + Math.random() * 0.4), drift = (Math.random() - 0.5) * 160;
    p.animate([
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
      { transform: `translate(${drift}px, ${fall}px) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 },
    ], { duration: 1400 + Math.random() * 900, delay: Math.random() * 300, easing: 'cubic-bezier(0.33, 0, 0.67, 1)', fill: 'forwards' }).onfinish = () => p.remove();
  }
}

// Yumuşak sesler: dosya yok, Web Audio ile üretilir. Kısık ve kısa; yalnızca olumlu anlarda.
let ac = null;
function tone(freqs, { dur = 0.09, gap = 0.07, vol = 0.05, type = 'triangle' } = {}) {
  if (!sfxOn()) return;
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + i * gap;
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    });
  } catch { /* ses yoksa sessiz geç */ }
}
export const sfx = {
  pop: () => tone([660], { dur: 0.07, vol: 0.04 }),              // kalp, sarılma
  arrive: () => tone([523, 784], { dur: 0.14, gap: 0.09 }),        // partner geldi
  done: () => tone([659, 784, 988], { dur: 0.12, gap: 0.08 }),     // haftalık hedeften biri
  badge: () => tone([523, 659, 784, 1047], { dur: 0.16, gap: 0.09, vol: 0.055 }), // rozet
};
