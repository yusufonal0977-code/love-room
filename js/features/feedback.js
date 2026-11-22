// Uygulama içi görüş formu (K39). Yazılanlar yalnızca adminlerin okuduğu feedback/{uid}/{id} altına gider
// (yonetim.html'de listelenir); hesap silinince feedback/{uid} de silinir.
import { h, openSheet, closeSheet, toast } from '../ui.js';
import { db, push, ref, serverTimestamp } from '../fb.js';
import { t, lang } from '../i18n.js';
import { track } from './metrics.js';

const KINDS = [['like', 'Sevdiğim bir şey'], ['bug', 'Bir sorun var'], ['idea', 'Bir fikrim var']];

export function createFeedback(ctx) {
  function open() {
    const b = openSheet({ title: 'Görüş bildir', iconName: 'chat' });
    let kind = 'idea';
    const chips = KINDS.map(([k, label]) => h('button', { class: k === kind ? 'fbk sel' : 'fbk', type: 'button', 'aria-pressed': String(k === kind), onclick: () => { kind = k; chips.forEach((c, i) => { const on = KINDS[i][0] === k; c.classList.toggle('sel', on); c.setAttribute('aria-pressed', String(on)); }); } }, label));
    const ta = h('textarea', { rows: 5, maxLength: 1500, placeholder: 'Ne düşünüyorsun? Kısa da olsa çok işimize yarar.', 'aria-label': t('Görüşün') });
    const send = h('button', { class: 'primary' }, 'Gönder');
    send.onclick = async () => {
      const text = ta.value.trim();
      if (text.length < 3) return ta.focus();
      send.disabled = true;
      try {
        await push(ref(db, `feedback/${ctx.uid}`), { kind, text, at: serverTimestamp(), lang, app: !!window.LoveRoomApp });
        track('feedback');
        closeSheet();
        toast(t('Teşekkürler, ekibimiz okuyacak.'), 3500);
      } catch (e) { console.warn('görüş', e); toast(t('Gönderilemedi. İnternet bağlantını kontrol et.')); send.disabled = false; }
    };
    b.append(
      h('p', { class: 'small' }, t('Yazdıkların yalnızca Get Love Room ekibine gider; partnerin görmez.')),
      h('div', { class: 'fbkinds', role: 'group', 'aria-label': t('Görüş türü') }, ...chips),
      ta, send,
    );
    setTimeout(() => ta.focus(), 50);
  }
  return { open };
}
