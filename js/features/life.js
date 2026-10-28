// Ortak hayat: günlük (kitaplıkta), ilişki saati (şöminenin yanındaki saat), soru kavanozu (kanepenin yanında).
//
// live/{rid}/diary/{id} = { by, name, side, text, at, openAt? }   openAt: gelecek mektubu, o gün açılır
// live/{rid}/rel        = { since: 'YYYY-MM-DD', meet: 'YYYY-MM-DD', meetNote }
// live/{rid}/jar        = { q, answers: {uid: metin}, at }   live/{rid}/jarUsed/{q}=true   live/{rid}/jarLog/{id}
import { h, icon, openSheet, closeSheet, toast, fmtDate, fmtTime } from '../ui.js';
import { limitToLast, onValue, push, query, remove, serverTimestamp, set, update, now } from '../fb.js';

// Kavanozdaki sorular: ne klişe ne de utandırıcı; cevabı merak edilen, sohbet açan sorular.
export const QUESTIONS = [
  'Çocukken en çok neyden korkardın, şimdi düşününce komik geliyor mu?',
  'Hiç kimseye söylemediğin küçük bir zevkin ne?',
  'Bir gün boyunca başka bir şehirde yaşasak, hangi şehir ve sabah ilk ne yapardık?',
  'Benim hangi alışkanlığımı ilk fark ettin?',
  'Bir süper gücün olsa ama sadece ev işlerinde kullanabilsen, ne olurdu?',
  'Hayatında “o gün her şey değişti” dediğin bir gün var mı?',
  'En sevdiğin koku hangi anıyı hatırlatıyor?',
  'Bir film olsaydık türü ne olurdu, ve hangi sahnede şu an olurduk?',
  '10 yaşındaki sen, bugünkü seni görse neye en çok şaşırırdı?',
  'Birlikte açacağımız küçük bir dükkân olsa ne satardık?',
  'Bana bir şarkı ithaf etsen hangisi olurdu ve neden?',
  'Son zamanlarda seni en çok güldüren şey ne?',
  'Hangi konuda fikrini değiştirdin ve seni ne ikna etti?',
  'İkimiz için ideal bir pazar sabahı nasıl geçer, dakika dakika anlat.',
  'Seni sakinleştiren üç şey say.',
  'Bir hayvana dönüşsen hangisi olurdun ve bende hangi hayvanı görüyorsun?',
  'İlk konuşmamızda aklından geçen ama söylemediğin bir şey var mı?',
  'Hayatında “keşke daha önce bilseydim” dediğin bir şey?',
  'En kötü yemek denemen neydi?',
  'Hangi küçük şey sana sevildiğini hissettirir?',
  'Bir mektup yazacak olsan, 5 yıl sonraki bize ne yazardın?',
  'Hiç gitmediğin ama nedense özlediğin bir yer var mı?',
  'Bende en çok neyi merak ediyorsun ama sormadın?',
  'Bir günlüğüne yer değiştirsek ilk ne yapardın?',
  'En sevdiğin çocukluk oyunu neydi, kuralları neydi?',
  'Bu hafta seni zorlayan bir an oldu mu?',
  'Bir yetenek bir gecede öğrenilebilse hangisini seçerdin?',
  'Mutfakta birlikte yapacağımız ilk yemek ne olsun?',
  'Hangi anımızı tekrar yaşamak isterdin?',
  'Kendinde değiştirmeyi bıraktığın, artık sevdiğin bir yanın?',
  'Bir sabah uyandık ve internet yok: gün nasıl geçer?',
  'Beni üç emojiyle anlat.',
  'Hiç kimsenin bilmediği bir yeteneğin var mı?',
  'Aileden aldığın, ileride sürdürmek istediğin bir gelenek?',
  'En son ne zaman bir şeyi ilk kez yaptın?',
  'Uzak olmanın sana öğrettiği bir şey?',
  'Seni en çok ne zaman özlüyorum sence?',
  'Bir şarkının içinde yaşayabilsen hangisi olurdu?',
  'En garip rüyan neydi?',
  'Bir yıl boyunca tek bir mevsim yaşayacak olsak hangisi?',
  'Kendine verdiğin en iyi tavsiye ne oldu?',
  'Bizim evin kapısına bir kural asacak olsak ne yazardı?',
  'Hangi konuda inatçı olduğunu kabul ediyorsun?',
  'Bir yolculukta yanına alacağın 3 eşya?',
  'Hayatının fragmanı olsa hangi sahneyle açılırdı?',
  'Senin için “ev” kelimesi neyin kokusu, sesi ya da görüntüsü?',
  'Çocukken büyüyünce ne olmak istiyordun?',
  'Bende en çok güvendiğin özellik hangisi?',
  'Birlikte öğrenmek istediğin bir şey?',
  'Bir günü tekrar yaşama hakkın olsa ama hiçbir şeyi değiştiremesen, hangi gün?',
  'Yalnız kaldığında yaptığın tuhaf bir şey?',
  'Ömür boyu tek bir tatlı yiyebilsen?',
  'Bir sonraki buluşmamızda mutlaka yapmamız gereken şey?',
  'Seni tanımayan birine kendini tek cümleyle nasıl anlatırsın?',
  'Hangi küçük şey gününü bir anda güzelleştirir?',
  'İkimizin ortak noktası olduğunu düşünmediğin ama aslında olan bir şey?',
  'Şu an pencereden ne görüyorsun? Sadece anlat.',
  'Bir gün bir kitap yazsan adı ne olurdu?',
  'Kendinle gurur duyduğun ama pek anlatmadığın bir an?',
  'Yaşlandığımızda nasıl bir çift olacağız sence?',
];

const DAY = 86_400_000;
const parseDay = (s) => (s ? new Date(s + 'T00:00:00').getTime() : null);
const daysBetween = (a, b) => Math.floor((b - a) / DAY);

export function createLife(ctx) {
  const { live, uid } = ctx;
  let rel = {}, jar, jarUsed = {}, jarBody = null;

  // ---------- İlişki saati ----------
  live.on('rel', (v) => { rel = v || {}; ctx.onRel?.(chip()); });
  function chip() {
    const parts = [];
    const since = parseDay(rel.since);
    if (since) parts.push(`${daysBetween(since, now()) + 1}. gün`);
    const meet = parseDay(rel.meet);
    if (meet) { const d = Math.ceil((meet - now()) / DAY); if (d >= 0) parts.push(d === 0 ? 'Bugün buluşuyorsunuz!' : `buluşmaya ${d} gün`); }
    return parts.join(' · ');
  }
  function since() {
    const s = parseDay(rel.since);
    if (!s) return null;
    const a = new Date(s), b = new Date(now());
    let y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    const next = new Date(a); next.setFullYear(b.getFullYear()); if (next < b) next.setFullYear(b.getFullYear() + 1);
    return { y, m, d, total: daysBetween(s, now()) + 1, toAnniv: Math.ceil((next - b) / DAY), annivN: next.getFullYear() - a.getFullYear() };
  }
  function openClock() {
    const body = openSheet({ title: 'İlişki saatimiz', iconName: 'clock' });
    const s = since();
    const meet = parseDay(rel.meet);
    const meetLeft = meet ? Math.ceil((meet - now()) / DAY) : null;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fmt = (z) => new Date(now()).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: z });
    body.append(
      s ? h('div', { class: 'bigclock' },
        h('div', {}, h('b', {}, s.y), h('small', {}, 'yıl')), h('div', {}, h('b', {}, s.m), h('small', {}, 'ay')), h('div', {}, h('b', {}, s.d), h('small', {}, 'gün')))
        : h('p', {}, 'Birlikte olduğunuz günü girin; saat ondan sonrasını saysın.'),
      s ? h('p', { class: 'center' }, `Toplam ${s.total.toLocaleString('tr-TR')} gün. ${s.toAnniv === 0 ? `Bugün ${s.annivN}. yıl dönümünüz! 🎉` : `${s.annivN}. yıl dönümüne ${s.toAnniv} gün.`}`) : null,
      meetLeft != null && meetLeft >= 0 ? h('div', { class: 'meet' }, h('b', {}, meetLeft === 0 ? 'Bugün buluşuyorsunuz 💞' : `${meetLeft} gün sonra buluşuyorsunuz ✈️`), rel.meetNote ? h('small', {}, rel.meetNote) : null) : null,
      ctx.partnerTz() && ctx.partnerTz() !== tz ? h('p', { class: 'center small' }, `Sende saat ${fmt(tz)} · ${ctx.partnerName()}'de ${fmt(ctx.partnerTz())}`) : null,
    );
    const sinceIn = h('input', { type: 'date', value: rel.since || '' });
    const meetIn = h('input', { type: 'date', value: rel.meet || '' });
    const noteIn = h('input', { placeholder: 'Nerede? (ör. İstanbul, Kadıköy iskele)', value: rel.meetNote || '', maxLength: 60 });
    body.append(
      h('label', {}, 'Birlikte olduğumuz gün', sinceIn),
      h('label', {}, 'Bir sonraki buluşma', meetIn),
      noteIn,
      h('button', { class: 'primary', onclick: async () => { await update(live.ref('rel'), { since: sinceIn.value || null, meet: meetIn.value || null, meetNote: noteIn.value.trim() || null }); toast('Kaydedildi ⏳'); openClock(); } }, 'Kaydet'),
    );
  }

  // ---------- Günlük ----------
  function openDiary(tab = 'diary') {
    const body = openSheet({ title: 'Günlüğümüz', iconName: 'book', wide: true, onClose: () => stop?.() });
    let stop = null;
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: tab === 'diary' ? 'sel' : '', onclick: () => openDiary('diary') }, 'Günlük'),
      h('button', { class: tab === 'letter' ? 'sel' : '', onclick: () => openDiary('letter') }, 'Geleceğe mektup'),
    );
    const text = h('textarea', { rows: 4, maxLength: 2000, placeholder: tab === 'diary' ? 'Bugün aklında kalan bir şey… (ikiniz de okuyabilirsiniz)' : 'Gelecekteki ikinize bir mektup. Seçtiğin gün açılacak.' });
    const date = h('input', { type: 'date', min: new Date(now() + DAY).toISOString().slice(0, 10) });
    const list = h('div', { class: 'diary' }, h('p', { class: 'small' }, 'Yükleniyor…'));
    body.append(tabs, text, tab === 'letter' ? h('label', {}, 'Açılış günü', date) : null,
      h('button', { class: 'primary', html: `${icon('send')} ${tab === 'diary' ? 'Yaz' : 'Mektubu mühürle'}`, onclick: async () => {
        const t = text.value.trim();
        if (!t) return text.focus();
        if (tab === 'letter' && !date.value) return toast('Açılış gününü seç');
        await push(live.ref('diary'), { by: uid, name: ctx.myName(), side: ctx.mySide(), text: t, at: serverTimestamp(), ...(tab === 'letter' ? { openAt: parseDay(date.value) } : {}) });
        live.stat('diary');
        text.value = '';
        toast(tab === 'diary' ? 'Günlüğe yazıldı ✍️' : 'Mektup mühürlendi 💌');
      } }),
      list);
    stop = onValue(query(live.ref('diary'), limitToLast(150)), (snap) => {
      const items = [];
      snap.forEach((c) => { items.unshift({ key: c.key, ...c.val() }); });
      const shown = items.filter((x) => (tab === 'letter') === !!x.openAt);
      list.innerHTML = '';
      if (!shown.length) list.append(h('p', { class: 'small' }, tab === 'diary' ? 'İlk sayfayı siz yazın.' : 'Henüz mektup yok.'));
      shown.forEach((x) => {
        const locked = x.openAt && x.openAt > now();
        list.append(h('article', { class: x.side === 'moon' ? 'moon' : 'sun' },
          h('header', {}, h('b', {}, `${x.side === 'moon' ? '🌙' : '☀️'} ${x.name || ''}`), h('small', {}, x.openAt ? (locked ? `${fmtDate(x.openAt)} günü açılacak` : `${fmtDate(x.at || now())} yazıldı`) : fmtTime(x.at || now()))),
          locked ? h('p', { class: 'locked', html: `${icon('lock')} Mühürlü mektup` }) : h('p', {}, x.text),
          x.by === uid ? h('button', { class: 'link', onclick: () => confirm('Silinsin mi?') && remove(live.ref(`diary/${x.key}`)) }, 'sil') : null,
        ));
      });
    });
  }

  // ---------- Soru kavanozu ----------
  live.on('jar', (v) => {
    const prev = jar;
    jar = v;
    if (v && prev && v.q === prev.q && v.answers && ctx.partnerUid() && v.answers[ctx.partnerUid()] && !prev.answers?.[ctx.partnerUid()]) toast(`${ctx.partnerName()} kavanoz sorusunu cevapladı 🫙`);
    if (v && prev !== undefined && prev?.q !== v.q && v.by !== uid) toast(`${ctx.partnerName()} kavanozdan bir soru çekti 🫙`);
    renderJar();
  });
  live.on('jarUsed', (v) => (jarUsed = v || {}));

  async function draw() {
    if (jar?.answers && Object.keys(jar.answers).length) await push(live.ref('jarLog'), { ...jar, at: serverTimestamp() });
    let pool = QUESTIONS.map((_, i) => i).filter((i) => !jarUsed[i]);
    if (!pool.length) { await remove(live.ref('jarUsed')); pool = QUESTIONS.map((_, i) => i); }
    const q = pool[Math.floor(Math.random() * pool.length)];
    await set(live.ref('jar'), { q, by: uid, at: serverTimestamp() });
    await set(live.ref(`jarUsed/${q}`), true);
  }
  function renderJar() {
    if (!jarBody || !document.body.contains(jarBody)) return;
    const b = jarBody;
    b.innerHTML = '';
    if (!jar) {
      b.append(h('p', {}, 'Kavanozda ' + QUESTIONS.length + ' soru var. Biriniz çeksin, ikiniz de cevaplayın: cevaplar ikiniz de yazınca aynı anda açılır.'), h('button', { class: 'primary', onclick: draw }, 'Kavanozdan soru çek'));
      return;
    }
    const pu = ctx.partnerUid();
    const mine = jar.answers?.[uid], theirs = pu && jar.answers?.[pu];
    b.append(h('blockquote', { class: 'question' }, QUESTIONS[jar.q]));
    if (!mine) {
      const t = h('textarea', { rows: 3, maxLength: 600, placeholder: 'Cevabın (partnerin de cevaplayınca görünür)' });
      b.append(t, h('button', { class: 'primary', onclick: async () => { if (!t.value.trim()) return t.focus(); await set(live.ref(`jar/answers/${uid}`), t.value.trim()); live.stat('answers'); } }, 'Cevabı gönder'));
    } else if (!theirs) {
      b.append(h('p', { class: 'locked', html: `${icon('lock')} Cevabın kilitli. ${ctx.partnerName()} cevaplayınca ikisi birden açılacak.` }));
    } else {
      b.append(
        h('div', { class: 'answers' },
          h('article', {}, h('b', {}, `${ctx.mySide() === 'moon' ? '🌙' : '☀️'} ${ctx.myName()}`), h('p', {}, mine)),
          h('article', {}, h('b', {}, `${ctx.mySide() === 'moon' ? '☀️' : '🌙'} ${ctx.partnerName()}`), h('p', {}, theirs))),
      );
    }
    b.append(h('div', { class: 'row' }, h('button', { onclick: draw }, mine && theirs ? 'Yeni soru' : 'Başka soru'), h('button', { class: 'link', onclick: openLog }, 'Eski cevaplarımız')));
  }
  function openJar() {
    jarBody = openSheet({ title: 'Soru kavanozu', iconName: 'jar', onClose: () => (jarBody = null) });
    renderJar();
  }
  function openLog() {
    const body = openSheet({ title: 'Eski cevaplarımız', iconName: 'jar', wide: true, onClose: () => stop() });
    const pu = ctx.partnerUid();
    const stop = onValue(query(live.ref('jarLog'), limitToLast(60)), (snap) => {
      body.innerHTML = '';
      const items = [];
      snap.forEach((c) => { items.unshift(c.val()); });
      if (!items.length) body.append(h('p', { class: 'small' }, 'Henüz yok.'));
      items.forEach((x) => body.append(h('article', { class: 'logq' }, h('b', {}, QUESTIONS[x.q] || ''), h('p', {}, `${ctx.myName()}: ${x.answers?.[uid] || '—'}`), h('p', {}, `${ctx.partnerName()}: ${x.answers?.[pu] || '—'}`))));
      body.append(h('button', { onclick: openJar }, 'Kavanoza dön'));
    });
  }

  return { openClock, openDiary, openJar, chip };
}
