// Ortak hayat: günlük (kitaplıkta), ilişki saati (şöminenin yanındaki saat), soru kavanozu (kanepenin yanında).
//
// live/{rid}/diary/{id} = { by, name, side, text, at, openAt? }   openAt: gelecek mektubu, o gün açılır
// live/{rid}/rel        = { since: 'YYYY-MM-DD', meet: 'YYYY-MM-DD', meetNote }
// live/{rid}/jar        = { q, answers: {uid: metin}, at }   live/{rid}/jarUsed/{q}=true   live/{rid}/jarLog/{id}
import { h, icon, openSheet, closeSheet, toast, fmtDate, fmtTime, esc } from '../ui.js';
import { limitToLast, onValue, push, query, remove, serverTimestamp, set, update, now } from '../fb.js';
import { t, locale } from '../i18n.js';

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
  // K37 (v0.61): 140 yeni soru. Sıra önemli: kavanoz kullanılan soruları sırasıyla (jarUsed/{index}) hatırlar, yeniler hep sona eklenir.
  'Bugün seni gülümseten küçük bir an oldu mu?',
  'Bir gün tamamen ikimize ait olsa, telefonlar kapalı, nasıl geçirirdik?',
  'Çocukluğundan aklında kalan en net koku hangisi?',
  'Bir şehri sadece yemeği için ziyaret edecek olsan hangisi olurdu?',
  'Seni en iyi anlatan şarkı sözü ne?',
  'Bir sonraki buluşmamızda bana göstermek istediğin bir yer var mı?',
  'Bende sana ilk “bu kişi farklı” dedirten şey neydi?',
  'En sevdiğin hava durumu ve o havada ne yapmayı seversin?',
  'Bir gün evimiz olsa hangi odası senin favorin olurdu?',
  'Hayatında seni en çok etkileyen öğretmen kimdi?',
  'Kendini en çok hangi mevsime benzetiyorsun?',
  'Uzakken bana en çok neyi anlatmak istiyorsun ama unutuyorsun?',
  'En sevdiğin çizgi film karakteri kimdi ve neden?',
  'Bir haftalığına başka bir mesleği deneyebilsen hangisini seçerdin?',
  'Bize ait küçük bir gelenek başlatsak ne olurdu?',
  'Bugünü tek kelimeyle anlatsan?',
  'Seni şaşırtan en güzel hediye neydi?',
  'Sessizliği sever misin, yoksa hep bir ses mi olsun istersin?',
  'Çok sevdiğin ama herkesin tuhaf bulduğu bir yemek var mı?',
  'Bir sabah benden ne duymak seni mutlu ederdi?',
  'Kendinde en çok neyi geliştirmek istiyorsun?',
  'Bir gün birlikte bir hayvan sahiplensek, adını ne koyardık?',
  'Hayalindeki tatil: deniz mi, dağ mı, şehir mi?',
  'Bir kere olsun yaşamak istediğin çılgınca bir deneyim?',
  'Hangi uygulamada en çok vakit geçiriyorsun ve neden?',
  'Bu ay öğrendiğin ilginç bir bilgi?',
  'Kötü bir günde sana en iyi gelen şey ne?',
  'Bir filmi defalarca izleyebilsen hangisi olurdu?',
  'Hayatında dönüm noktası olan bir karar?',
  'Ailenden hangi özelliği aldığını düşünüyorsun?',
  'En son ne zaman çok güldün, ne olmuştu?',
  'Bana bir mektup yazsan ilk cümlesi ne olurdu?',
  'Rüyanda en çok hangi yeri görürsün?',
  'Bir süper kahraman olsan adın ve gücün ne olurdu?',
  'En çok hangi yaşını sevdin?',
  'Bir kitabın karakteri olsan hangi kitapta yaşamak isterdin?',
  'Birlikte bir yarışmaya katılsak hangisinde kazanırdık?',
  'Sabah insanı mısın, gece insanı mı, neden?',
  'Uzaklığın sana kazandırdığı bir güzellik var mı?',
  'Hiç unutmadığın bir iltifat?',
  'Hangi konuda bana akıl danışmayı seversin?',
  'Seni rahatlatan bir mekân tarif et.',
  'Zaman makinen olsa geçmişe mi giderdin, geleceğe mi?',
  'Bugün yediğin en güzel şey neydi?',
  'En sevdiğin el yazısı notu kimden almıştın?',
  'Bir günlüğüne görünmez olsan ne yapardın?',
  'Bende hâlâ keşfetmediğini düşündüğün bir şey?',
  'Hayatında “iyi ki yapmışım” dediğin bir şey?',
  'Hangi sesi duyunca huzur bulursun?',
  'Birlikte yazacağımız bir şarkının adı ne olurdu?',
  'Tatlı mı tuzlu mu, ve ikisi arasında kalsan hangisi?',
  'Seni en çok ne motive eder?',
  'Kendini sevdiğin bir fotoğrafını düşün: o gün ne oldu?',
  'Bir yeteneğimi alabilsen hangisini alırdın?',
  'En sevdiğin bayram ya da kutlama anısı?',
  'Bir gün kendi kafeni açsan adı ne olurdu?',
  'Bana ilk mesajını atarken ne düşünüyordun?',
  'Ölmeden önce mutlaka görmek istediğin bir manzara?',
  'Bir arkadaşının seni anlatırken kullanacağı üç kelime?',
  'En son ne zaman kendinle gurur duydun?',
  'Şu an hayatında en çok minnettar olduğun şey?',
  'Yağmurlu bir günde ideal planın ne?',
  'İnsanlarda en çok saygı duyduğun özellik?',
  'Hangi küçük alışkanlığını değiştirmek istersin?',
  'Birlikte bir yemek tarifi icat etsek ne olurdu?',
  'Seni en çok şaşırtan kendi tepkin neydi?',
  'Bir oyunun içinde yaşayabilsen hangisi?',
  'Hayalindeki sabah kahvaltısı nasıl olurdu?',
  'Bir sonraki yaş gününde ne yapmak istersin?',
  'Bana hangi konuda sürpriz yapmak isterdin?',
  'Uzaktayken seni bana en çok ne yaklaştırıyor?',
  'Kendi başına yaptığın en cesur şey?',
  'Telefonundaki son fotoğraf ne ve neden çektin?',
  'Seni en çok heyecanlandıran gelecek planı?',
  'Hangi tarihi dönemde yaşamak isterdin?',
  'Kendini bir renkle anlatsan hangisi olurdu?',
  'Bir günü birlikte planlasak sabahtan akşama ne yapardık?',
  'Hangi şarkı seni hemen dans ettirir?',
  'Çocukken en sevdiğin oyuncak neydi?',
  'Bir mektubu 10 yıl sonra açılmak üzere saklasak içine ne koyardık?',
  'En sevdiğin kelime hangisi?',
  'Kendine en son ne zaman hediye aldın?',
  'İnsanların seni yanlış anladığı bir konu var mı?',
  'Bir hobini bana öğretecek olsan ilk ders ne olurdu?',
  'Birlikte izlediğimiz en iyi şey hangisiydi?',
  'Seni sakinleştiren bir cümle var mı?',
  'Hangi masalın içinde olmak isterdin?',
  'Bir rüyanı gerçek yapabilsen hangisini seçerdin?',
  'Bugün sana iyi gelen biri oldu mu?',
  'Bizim ilişkimizi bir yemeğe benzetsen hangisi olurdu?',
  'Tek başına geçirdiğin en güzel gün?',
  'Hangi konuda daha sabırlı olmak isterdin?',
  'Kalabalık mı seversin, birkaç yakın kişiyle olmayı mı?',
  'Bir kafede siparişin genelde ne olur?',
  'Hayatında seni en çok güldüren kişi kim?',
  'Gelecekte bir evimiz olsa duvarına ne asardık?',
  'Seni en çok ne zaman özlediğimi düşünüyorsun?',
  'Kendi kendine söylediğin bir motivasyon cümlesi var mı?',
  'Bana bir şehir gezdirecek olsan rotan nasıl olurdu?',
  'Hangi hayvanın bir günlüğüne yerinde olmak isterdin?',
  'Hiç kimseye söylemediğin küçük bir hayalin?',
  'Bu yıl kendine verdiğin bir söz var mı?',
  'En sevdiğin ses: yağmur, dalga, şömine çıtırtısı?',
  'Birlikte yeni bir dil öğrensek hangisini seçerdin?',
  'Seni en çok rahatsız eden küçük şey ne?',
  'Bir yeri ilk kez ziyaret ettiğinde ilk ne yaparsın?',
  'Çocukluk evinden en çok neyi özlüyorsun?',
  'Birinin seni sevdiğini nasıl anlarsın?',
  'Bugün kendine iyi davrandın mı? Nasıl?',
  'Bir gün kitap yazsak ikimiz hakkında, ilk bölümün adı ne olurdu?',
  'En sevdiğin atıştırmalık?',
  'Hangi filmin sonunu değiştirmek isterdin?',
  'Seni en çok ne zaman cesur hissettiğini hatırlıyor musun?',
  'Birlikte geçireceğimiz bir yılbaşı nasıl olsun?',
  'Hayatında bir şarkının hep bir anıyı hatırlattığı oldu mu?',
  'Bir günü yeniden yaşasan kime daha çok zaman ayırırdın?',
  'Gelecekteki sen, bugünkü sana ne söylerdi?',
  'Bir arkadaşlık sırrın var mı, onu nasıl korudun?',
  'En sevdiğin el işi ya da kendin yaptığın bir şey?',
  'Hangi küçük jest seni günlerce mutlu eder?',
  'Biz bir dizi olsak bu bölümün adı ne olurdu?',
  'Bende en sevdiğin ses tonu hangisi: güldüğüm, kızdığım, uykulu?',
  'Sence iyi bir sevgilinin en önemli özelliği ne?',
  'Birlikte öğrendiğimiz en güzel şey ne oldu?',
  'Hangi mevsimde buluşmak isterdin?',
  'Seni en çok ne zaman anlaşılmış hissettin?',
  'Bir sabah uyandın ve her dili konuşabiliyorsun: ilk nereye gidersin?',
  'Uzak mesafe ilişkisi hakkında herkese söylemek istediğin bir şey?',
  'Bir hafta boyunca tek bir şarkı dinleyecek olsak hangisi?',
  'Hayatında bir kere yaşadığın tuhaf bir tesadüf?',
  'Kendine koyduğun ve hiç bozmadığın bir kural var mı?',
  'Bir gün birlikte bir yere gönüllü gitsek nereye giderdik?',
  'Seni en çok ne zaman yanlış anladığımı düşünüyorsun? Konuşalım.',
  'Bugün yapamadığın ama yarın yapmak istediğin bir şey?',
  'Gece uyumadan önce en çok neyi düşünürsün?',
  'Bizi en iyi anlatan film sahnesi hangisi?',
  'Hangi kokuyu bana benzetiyorsun?',
  'Bir ödül alsan teşekkür konuşmanda kimin adını ilk söylerdin?',
  'Bu hafta birbirimiz için yapabileceğimiz küçük bir şey ne olsun?',
  'İkimizin şarkısı hangisi olmalı, ve neden o?',
];

const DAY = 86_400_000;
const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2024, i, 1).toLocaleDateString(locale, { month: 'long' }));

/** Gün / ay / yıl seçicisi: telefonlarda tarih kutusu açılmadığı için açılır listeler. .value → 'YYYY-MM-DD' ya da ''. */
export function datePicker(value, { from, to }) {
  const [y0, m0, d0] = (value || '').split('-').map(Number);
  const sel = (items, cur, ph) => h('select', {}, h('option', { value: '' }, ph), ...items.map(([v, t]) => h('option', { value: v, selected: v === cur }, t)));
  const d = sel(Array.from({ length: 31 }, (_, i) => [i + 1, String(i + 1)]), d0, 'Gün');
  const m = sel(MONTHS.map((t, i) => [i + 1, t]), m0, 'Ay');
  const years = [];
  for (let y = to; y >= from; y--) years.push([y, String(y)]);
  const y = sel(years, y0, 'Yıl');
  const box = h('div', { class: 'datepick' }, d, m, y);
  Object.defineProperty(box, 'value', {
    get() {
      if (!d.value || !m.value || !y.value) return '';
      const dd = Math.min(+d.value, new Date(+y.value, +m.value, 0).getDate()); // 31 Şubat → 28/29
      return `${y.value}-${String(m.value).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    },
  });
  return box;
}
export const parseDay = (s) => (s ? new Date(s + 'T00:00:00').getTime() : null);
const daysBetween = (a, b) => Math.floor((b - a) / DAY);

export function createLife(ctx) {
  const { live, uid } = ctx;
  let rel = {}, jar, jarUsed = {}, jarBody = null;

  // ---------- İlişki saati ----------
  live.on('rel', (v) => { rel = v || {}; ctx.onRel?.(chip()); });
  function chip() {
    const parts = [];
    const since = parseDay(rel.since);
    if (since) parts.push(t('{n}. gün', { n: daysBetween(since, now()) + 1 }));
    const meet = parseDay(rel.meet);
    if (meet) { const d = Math.ceil((meet - now()) / DAY); if (d >= 0) parts.push(d === 0 ? t('Bugün buluşuyorsunuz!') : t('buluşmaya {n} gün', { n: d })); }
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
    const fmt = (z) => new Date(now()).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: z });
    body.append(
      s ? h('div', { class: 'bigclock' },
        h('div', {}, h('b', {}, s.y), h('small', {}, 'yıl')), h('div', {}, h('b', {}, s.m), h('small', {}, t('ay'))), h('div', {}, h('b', {}, s.d), h('small', {}, 'gün')))
        : h('p', {}, 'Birlikte olduğunuz günü girin; saat ondan sonrasını saysın.'),
      s ? h('p', { class: 'center' }, t('Toplam {n} gün.', { n: s.total.toLocaleString(locale) }) + ' ' + (s.toAnniv === 0 ? t('Bugün {n}. yıl dönümünüz!', { n: s.annivN }) : t('{n}. yıl dönümüne {d} gün.', { n: s.annivN, d: s.toAnniv }))) : null,
      meetLeft != null && meetLeft >= 0 ? h('div', { class: 'meet' }, h('b', {}, meetLeft === 0 ? t('Bugün buluşuyorsunuz') : t('{n} gün sonra buluşuyorsunuz', { n: meetLeft })), rel.meetNote ? h('small', {}, rel.meetNote) : null) : null,
      ctx.partnerTz() && ctx.partnerTz() !== tz ? h('p', { class: 'center small' }, t('Sende saat {mine} · {name} tarafında {theirs}', { mine: fmt(tz), name: ctx.partnerName(), theirs: fmt(ctx.partnerTz()) })) : null,
    );
    const year = new Date(now()).getFullYear();
    const sinceIn = datePicker(rel.since, { from: year - 60, to: year });
    const meetIn = datePicker(rel.meet, { from: year, to: year + 3 });
    const noteIn = h('input', { placeholder: 'Nerede? (ör. İstanbul, Kadıköy iskele)', value: rel.meetNote || '', maxLength: 60 });
    body.append(
      h('div', { class: 'field' }, h('b', {}, 'Sevgili olduğumuz gün'), h('small', {}, 'İlişkinizin başladığı tarih. Gün sayacı ve yıl dönümü buna göre hesaplanır.'), sinceIn),
      h('div', { class: 'field' }, h('b', {}, 'Bir sonraki buluşmamız'), h('small', {}, 'Yüz yüze görüşeceğiniz gün; geri sayım üst çubukta görünür.'), meetIn),
      noteIn,
      h('button', { class: 'primary', onclick: async () => { await update(live.ref('rel'), { since: sinceIn.value || null, meet: meetIn.value || null, meetNote: noteIn.value.trim() || null }); toast('Kaydedildi'); openClock(); } }, 'Kaydet'),
    );
  }

  // ---------- Günlük ----------
  function openDiary(tab = 'diary') {
    const body = openSheet({ title: 'Günlüğümüz', iconName: 'book', wide: true, onClose: () => stop?.() });
    let stop = null;
    const tabs = h('div', { class: 'tabs' },
      h('button', { class: tab === 'diary' ? 'sel' : '', onclick: () => openDiary('diary') }, 'Günlük'),
      h('button', { class: tab === 'letter' ? 'sel' : '', onclick: () => openDiary('letter') }, 'Geleceğe mektup'),
      h('button', { class: tab === 'surprise' ? 'sel' : '', onclick: () => openDiary('surprise') }, 'Sürpriz mektup'),
    );
    if (tab === 'surprise') { body.append(tabs); ctx.surprise?.editor(body); return; }
    const text = h('textarea', { rows: 4, maxLength: 2000, placeholder: tab === 'diary' ? 'Bugün aklında kalan bir şey… (ikiniz de okuyabilirsiniz)' : 'Gelecekteki ikinize bir mektup. Seçtiğin gün açılacak.' });
    const yr = new Date(now()).getFullYear();
    const date = datePicker('', { from: yr, to: yr + 10 });
    const list = h('div', { class: 'diary' }, h('p', { class: 'small' }, 'Yükleniyor…'));
    body.append(tabs, text, tab === 'letter' ? h('div', { class: 'field' }, h('b', {}, 'Mektup hangi gün açılsın?'), date) : null,
      h('button', { class: 'primary', html: `${icon('send')} ${tab === 'diary' ? 'Yaz' : 'Mektubu mühürle'}`, onclick: async () => {
        const body_ = text.value.trim();
        if (!body_) return text.focus();
        if (tab === 'letter' && !date.value) return toast('Açılış gününü seç');
        if (tab === 'letter' && parseDay(date.value) <= now()) return toast('Açılış günü ileri bir tarih olmalı');
        await push(live.ref('diary'), { by: uid, name: ctx.myName(), side: ctx.mySide(), text: body_, at: serverTimestamp(), ...(tab === 'letter' ? { openAt: parseDay(date.value) } : {}) });
        live.stat('diary');
        text.value = '';
        toast(tab === 'diary' ? 'Günlüğe yazıldı' : 'Mektup mühürlendi');
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
          h('header', {}, h('b', {}, `${x.name || ''}`), h('small', {}, x.openAt ? (locked ? t('{date} günü açılacak', { date: fmtDate(x.openAt) }) : t('{date} yazıldı', { date: fmtDate(x.at || now()) })) : fmtTime(x.at || now()))),
          locked ? h('p', { class: 'locked', html: `${icon('lock')} Mühürlü mektup` }) : h('p', {}, x.text),
          x.by === uid ? h('button', { class: 'link', onclick: () => confirm(t('Silinsin mi?')) && remove(live.ref(`diary/${x.key}`)) }, 'sil') : null,
        ));
      });
    });
  }

  // ---------- Soru kavanozu ----------
  live.on('jar', (v) => {
    const prev = jar;
    jar = v;
    if (v && prev && v.q === prev.q && v.answers && ctx.partnerUid() && v.answers[ctx.partnerUid()] && !prev.answers?.[ctx.partnerUid()]) toast(t('{name} kavanoz sorusunu cevapladı', { name: ctx.partnerName() }));
    if (v && prev !== undefined && prev?.q !== v.q && v.by !== uid) toast(t('{name} kavanozdan bir soru çekti', { name: ctx.partnerName() }));
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
      b.append(h('p', {}, t('Kavanozda {n} soru var. Biriniz çeksin, ikiniz de cevaplayın: cevaplar ikiniz de yazınca aynı anda açılır.', { n: QUESTIONS.length })), h('button', { class: 'primary', onclick: draw }, 'Kavanozdan soru çek'));
      return;
    }
    const pu = ctx.partnerUid();
    const mine = jar.answers?.[uid], theirs = pu && jar.answers?.[pu];
    b.append(h('blockquote', { class: 'question' }, QUESTIONS[jar.q]));
    if (!mine) {
      const ta = h('textarea', { rows: 3, maxLength: 600, placeholder: 'Cevabın (partnerin de cevaplayınca görünür)' });
      b.append(ta, h('button', { class: 'primary', onclick: async () => { if (!ta.value.trim()) return ta.focus(); await set(live.ref(`jar/answers/${uid}`), ta.value.trim()); live.stat('answers'); if (!jar?.answers?.[ctx.partnerUid()]) ctx.push?.notify('jar'); } }, 'Cevabı gönder'));
    } else if (!theirs) {
      b.append(h('p', { class: 'locked', html: `${icon('lock')} ` + esc(t('Cevabın kilitli. {name} cevaplayınca ikisi birden açılacak.', { name: ctx.partnerName() })) }));
    } else {
      b.append(
        h('div', { class: 'answers' },
          h('article', {}, h('b', {}, `${ctx.myName()}`), h('p', {}, mine)),
          h('article', {}, h('b', {}, `${ctx.partnerName()}`), h('p', {}, theirs))),
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

  return { openClock, openDiary, openJar, chip, since, jarNow: () => (jar?.answers && ctx.partnerUid() && jar.answers[uid] && jar.answers[ctx.partnerUid()] ? { q: QUESTIONS[jar.q], mine: jar.answers[uid], theirs: jar.answers[ctx.partnerUid()] } : null) };
}
