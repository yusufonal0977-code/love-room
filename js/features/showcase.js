// Vitrin: dekore ettiğiniz evi bir linkle arkadaşlarınıza gösterin. Link açan kişi giriş yapmadan
// evi misafir olarak gezer (sadece görüntü; sohbet, albüm, günlük gibi özel şeyler paylaşılmaz).
//
// showcase/{id}      = { by, rid, at, title, owners: [{name, side, look}], decor, pet, flower, state, frames? }  (herkes okuyabilir)
// live/{rid}/showcase = id   (ikiniz de aynı linki görür ve güncelleyebilir)
import { h, icon, openSheet, toast, compressImage } from '../ui.js';
import { db, push, ref, remove, set, serverTimestamp } from '../fb.js';
import { t } from '../i18n.js';
import { DECOR } from '../scenes.js';
import { APP_URL } from '../config.js';

export function createShowcase(ctx) {
  const { live, uid } = ctx;
  let id = null, body = null;
  live.on('showcase', (v) => { id = v || null; if (body && document.body.contains(body)) open(); });

  const link = () => `${APP_URL}?ev=${id}`;

  async function publish(withPhotos) {
    const newId = id || push(ref(db, 'showcase')).key;
    const frames = {};
    if (withPhotos) for (const [k, img] of Object.entries(ctx.photos.frameImages())) frames[k] = await compressImage(img, 320, 0.75);
    const pet = ctx.care.petNow();
    const snap = {
      by: uid, rid: ctx.rid, at: serverTimestamp(), title: t('Bizim Ev'),
      owners: [{ name: ctx.myName(), side: ctx.mySide(), look: ctx.myLook() }, ...(ctx.partnerProfile() ? [{ name: ctx.partnerName(), side: ctx.partnerProfile().side || 'moon', look: ctx.partnerProfile().look || null }] : [])],
      decor: { paint: DECOR.paint, moved: DECOR.moved, items: DECOR.items },
      pet: { name: pet.name, species: pet.species, color: pet.color, acc: pet.acc },
      flower: { stage: DECOR.flower.stage }, state: ctx.shared(),
      ...(withPhotos ? { frames } : {}),
    };
    try {
      await set(ref(db, `showcase/${newId}`), JSON.parse(JSON.stringify(snap, (k, v) => (v === undefined ? null : v))));
    } catch (e) {
      console.warn(e);
      return toast(t('Link oluşturulamadı. Lütfen biraz sonra tekrar dene.'), 5000);
    }
    if (!id) await set(live.ref('showcase'), newId);
    id = newId;
    await navigator.clipboard?.writeText(link()).catch(() => {});
    live.stat('showcases');
    toast(t('Vitrin linki hazır ve kopyalandı 🏠'), 3500);
    open();
  }

  function open() {
    body = openSheet({ title: 'Evimizi göster', iconName: 'eye', onClose: () => (body = null) });
    const withPhotos = h('input', { type: 'checkbox' });
    body.append(
      h('p', {}, 'Dekore ettiğiniz evi bir linkle arkadaşlarınıza gösterin. Linki açan kişi giriş yapmadan evinizi misafir olarak gezer.'),
      h('p', { class: 'small' }, 'Sadece evin görünümü paylaşılır (boya, eşyalar, evcil dostunuz, çiçeğiniz ve karakterleriniz). Sohbet, albüm, günlük ve cevaplar paylaşılmaz.'),
      h('label', { class: 'check' }, withPhotos, h('span', {}, 'Tablolardaki fotoğraflar da görünsün')),
    );
    if (id) {
      const box = h('div', { class: 'linkbox' }, link());
      body.append(box, h('div', { class: 'row wrap' },
        h('button', { class: 'primary', onclick: async () => { await navigator.clipboard?.writeText(link()); toast(t('Link kopyalandı')); } }, 'Linki kopyala'),
        h('button', { onclick: () => publish(withPhotos.checked) }, 'Evin son halini yükle'),
        h('a', { class: 'btn', href: link(), target: '_blank', rel: 'noopener' }, 'Önizle'),
        h('button', { class: 'link', onclick: async () => { await remove(ref(db, `showcase/${id}`)).catch(() => {}); await remove(live.ref('showcase')); toast(t('Vitrin linki kapatıldı')); } }, 'Linki kapat'),
      ), h('p', { class: 'small' }, 'Evi değiştirdikten sonra "Evin son halini yükle" deyin; link aynı kalır.'));
    } else {
      body.append(h('button', { class: 'primary', html: `${icon('link')} Vitrin linki oluştur`, onclick: () => publish(withPhotos.checked) }));
    }
  }

  return { open };
}
