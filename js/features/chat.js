// Oda sohbeti: yazılı mesajlar. Panel açıkken de evde dolaşabilirsiniz; aynı odadaysanız mesaj
// karakterin başının üstünde konuşma balonu olarak da görünür.
//
// live/{rid}/chat/{id} = { by, name, side, text, at }   (son 80 mesaj gösterilir)
import { h, icon, toast, $, fmtTime } from '../ui.js';
import { limitToLast, onChildAdded, push, query, serverTimestamp, now } from '../fb.js';
import { t } from '../i18n.js';

const QUICK = ['❤️', '😂', '🥺', '😘', '🫶', '😴'];

export function createChat(ctx) {
  const { live, uid, game } = ctx;
  let open = false, unread = 0;
  const joinedAt = now();

  const list = h('div', { class: 'chatlist' });
  const input = h('input', { placeholder: 'Mesaj yaz…', maxLength: 300, autocomplete: 'off', enterKeyHint: 'send' });
  const panel = h('div', { id: 'chatPanel', class: 'chatpanel', hidden: true },
    h('div', { class: 'chathead' }, h('b', {}, t('Oda sohbeti')), h('button', { class: 'x', title: 'Kapat', html: icon('close'), onclick: () => toggle(false) })),
    list,
    h('div', { class: 'quick' }, ...QUICK.map((e) => h('button', { onclick: () => send(e) }, e))),
    h('form', { class: 'chatform', onsubmit: (e) => { e.preventDefault(); send(input.value); } }, input, h('button', { class: 'primary', title: 'Gönder', html: icon('send') })),
  );
  document.body.append(panel);
  const btn = $('chatBtn');
  btn.innerHTML = icon('chat') + '<i class="dot" hidden></i>';
  btn.onclick = () => toggle(!open);

  function toggle(on) {
    open = on;
    panel.hidden = !on;
    btn.classList.toggle('on', on);
    if (on) { unread = 0; badge(); setTimeout(() => { list.scrollTop = list.scrollHeight; if (matchMedia('(pointer:fine)').matches) input.focus(); }, 30); }
  }
  const badge = () => { btn.querySelector('.dot').hidden = !unread; };

  async function send(text) {
    text = String(text || '').trim().slice(0, 300);
    if (!text) return;
    input.value = '';
    await push(live.ref('chat'), { by: uid, name: ctx.myName(), side: ctx.mySide(), text, at: serverTimestamp() });
  }

  onChildAdded(query(live.ref('chat'), limitToLast(80)), (s) => {
    const m = s.val();
    if (!m?.text) return;
    const mine = m.by === uid;
    list.append(h('div', { class: 'msg ' + (mine ? 'me' : 'them') },
      h('p', { dir: 'auto' }, document.createTextNode(m.text)), // kullanıcı metni çevrilmez
      h('small', {}, `${m.side === 'moon' ? '🌙' : '☀️'} ${m.name || ''} · ${fmtTime(m.at || now())}`)));
    if (open) list.scrollTop = list.scrollHeight;
    // Yeni mesaj (sayfa açıldıktan sonra gelenler): başın üstünde balon, kapalıysa bildirim
    if ((m.at || 0) < joinedAt - 2000) return;
    game.say(mine ? 'me' : 'partner', m.text);
    if (!mine && !open) {
      unread++; badge();
      if (!game.sameRoom()) toast(`${m.name}: ${m.text.slice(0, 60)}`, 3500);
    }
  });

  return { toggle, send };
}
