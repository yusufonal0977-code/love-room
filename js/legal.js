// Hakkımızda, iletişim ve hukuki metinler. Uygulama içinde ve legal.html sayfasında aynı içerik gösterilir.
// Metin değişirse LEGAL_VERSION artırılır; kullanıcılar bir sonraki girişte yeniden onaylar.

export const LEGAL_VERSION = 1;
export const LEGAL_DATE = '29 Ekim 2026';
export const CONTACT = 'eclipsoftware.dev@gmail.com';
const COMPANY = 'Eclip Software &amp; Entertainment Company';
const mail = `<a href="mailto:${CONTACT}">${CONTACT}</a>`;

import { lang } from './i18n.js';
import { LEGAL_EN } from './legal-en.js';

const LEGAL_TR = [
  {
    id: 'hakkimizda',
    title: 'Hakkımızda',
    html: `
<p><b>Get Love Room</b>, aralarında kilometreler olan çiftler için küçük, piksel bir ev. Aynı odada yürüyün, kanepede yan yana oturup film izleyin, aynı şarkıyı dinleyin, balkonda iki farklı gökyüzüne birlikte bakın.</p>
<p>Get Love Room'u <b>${COMPANY}</b> yapıyor. Eclip küçük bir ekip; büyük bir şirket değil, sevdiği işi yapan bir avuç insan.</p>
<p>Küçük bir itiraf: bu evi kuran geliştirici şu an <b>bekâr</b>. Yani Get Love Room'daki her kanepe, her kupa, her ortak çiçek başkaları için kuruldu. Bir gün kendi Get Love Room'una taşınırsa kediyi ona da bakmaya ikna edeceğiz; o zamana kadar sizin eviniz bizim en sevdiğimiz ev. 🙂</p>
<p>Nasıl çalıştığımızı kısaca:</p>
<ul>
  <li>Reklam yok, verilerinizi satmıyoruz, sizi takip eden analiz araçları kullanmıyoruz.</li>
  <li>Sesli ve görüntülü sohbet doğrudan iki cihaz arasında akar; kaydetmiyoruz.</li>
  <li>Eviniz ikinize ait: fotoğraflarınızı, günlüğünüzü dilediğiniz an silebilirsiniz.</li>
</ul>
<p>Fikir, hata ya da sadece bir merhaba için: ${mail}</p>`,
  },
  {
    id: 'iletisim',
    title: 'İletişim',
    html: `
<p><b>${COMPANY}</b></p>
<p>E-posta: ${mail}</p>
<p>Kişisel verilerinizle ilgili başvurular, telif hakkı bildirimleri, güvenlik açıkları, öneri ve şikâyetler için bu adrese yazabilirsiniz. Genellikle birkaç gün içinde, yasal başvurulara en geç 30 gün içinde yanıt veriyoruz.</p>
<p>Uygulama içinden hesabınızı ve evinizi silmek için: Menü → <i>Verilerimi sil</i>.</p>`,
  },
  {
    id: 'kosullar',
    title: 'Kullanım Koşulları',
    html: `
<p class="muted">Son güncelleme: ${LEGAL_DATE}</p>
<h4>1. Taraflar ve kabul</h4>
<p>Bu koşullar, ${COMPANY} ("Eclip", "biz") tarafından sunulan Get Love Room uygulamasını ("Hizmet") kullanan kişi ("siz") ile aramızdaki kuralları belirler. Hizmeti kullanarak ve giriş sırasında onay kutusunu işaretleyerek bu koşulları kabul etmiş olursunuz.</p>
<h4>2. Kimler kullanabilir</h4>
<p>Hizmeti kullanmak için <b>18 yaşını doldurmuş</b> olmanız gerekir. Bir ev en fazla iki kişiye aittir; evi kuran kişi davet linkiyle tek bir partner davet edebilir.</p>
<h4>3. Hesabınız</h4>
<p>Google hesabınızla ya da sadece bir isimle (misafir) giriş yapabilirsiniz. Misafir hesapları o tarayıcıya bağlıdır; tarayıcı verilerini silerseniz eve yeniden giremeyebilirsiniz. Hesabınızın güvenliğinden ve davet linkinizi kiminle paylaştığınızdan siz sorumlusunuz.</p>
<h4>4. Paylaştığınız içerik</h4>
<p>Fotoğraf, çizim, günlük yazısı, mektup, cevap gibi eve eklediğiniz her şey size ve partnerinize aittir; sahipliğini almıyoruz. Yalnızca Hizmeti çalıştırmak (saklamak, partnerinize göstermek) için gereken sınırlı izni bize vermiş olursunuz.</p>
<p>Şunları yapmamayı kabul edersiniz:</p>
<ul>
  <li>Başkasına ait olup paylaşma hakkınız olmayan içerikleri (telif korumalı film, dizi, müzik vb.) yüklemek ya da yayınlamak,</li>
  <li>Hukuka aykırı, şiddet içeren, çocukların istismarına dair, nefret söylemi barındıran içerik paylaşmak,</li>
  <li>Partnerinizin rızası olmadan onun mahrem görüntülerini paylaşmak ya da kaydetmek,</li>
  <li>Hizmeti bozmaya, başkalarının evlerine erişmeye, güvenlik önlemlerini aşmaya çalışmak.</li>
</ul>
<h4>5. Birlikte izleme, müzik ve üçüncü taraf siteler</h4>
<p>TV'ye eklenen link, site ya da ekran paylaşımı iki kullanıcı arasında oynatılır; bu içerikleri biz barındırmayız, seçmeyiz ve denetlemeyiz. Açtığınız sitelerin ve paylaştığınız içeriklerin hukuka ve telif haklarına uygun olmasından <b>siz sorumlusunuz</b>. YouTube, Spotify ve diğer hizmetleri kullanırken onların kendi koşulları da geçerlidir (Spotify ile birlikte dinleme için Spotify Premium gerekebilir).</p>
<p>Hak sahibiyseniz ve Hizmet üzerinden hakkınızın ihlal edildiğini düşünüyorsanız ${mail} adresine yazın; gerekli adımları atarız.</p>
<h4>6. Hizmetin durumu</h4>
<p>Get Love Room ücretsizdir ve geliştirilmeye devam etmektedir. Hizmeti "olduğu gibi" sunuyoruz; kesintisiz ya da hatasız çalışacağını garanti etmiyoruz. Özellikleri değiştirebilir, ekleyebilir ya da kaldırabiliriz. Ses/görüntü kalitesi internet bağlantınıza bağlıdır.</p>
<h4>7. Sorumluluğun sınırı</h4>
<p>Kanunun izin verdiği ölçüde; dolaylı zararlardan, veri kaybından, üçüncü taraf hizmetlerden ve kullanıcıların paylaştığı içeriklerden sorumlu değiliz. Önemli anılarınızın bir kopyasını (Albüm → Galeriye kaydet) cihazınızda saklamanızı öneririz.</p>
<h4>8. Sona erme</h4>
<p>Dilediğiniz an Menü → <i>Verilerimi sil</i> ile hesabınızı ve evinizi silebilirsiniz. Bu koşulları ağır şekilde ihlal eden hesapları kapatabiliriz.</p>
<h4>9. Değişiklikler</h4>
<p>Koşulları güncellersek tarihi değiştirir, önemli değişikliklerde bir sonraki girişinizde yeniden onayınızı isteriz.</p>
<h4>10. Uygulanacak hukuk</h4>
<p>Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır. Tüketici olarak kanundan doğan haklarınız saklıdır; uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.</p>`,
  },
  {
    id: 'gizlilik',
    title: 'Gizlilik Politikası',
    html: `
<p class="muted">Son güncelleme: ${LEGAL_DATE}</p>
<p>Kısaca: Evinizi çalıştırmak için gereken kadar veri tutuyoruz, kimseye satmıyoruz, reklam ya da takip aracı kullanmıyoruz ve istediğiniz an siliyoruz.</p>
<h4>Topladığımız veriler</h4>
<ul>
  <li><b>Hesap:</b> Google ile girerseniz Google'ın bize ilettiği adınız ve e-posta adresiniz (Firebase Authentication'da tutulur). Misafir girişte yalnızca yazdığınız isim.</li>
  <li><b>Profil:</b> görünen adınız, karakterinizin görünümü, güneş/ay seçiminiz, saat diliminiz (iki farklı gökyüzünü göstermek için).</li>
  <li><b>Evinizin içeriği:</b> evdeki konumunuz ve o an hangi odada olduğunuz, eşya ve dekor tercihleri, tablolara astığınız ve albüme eklediğiniz fotoğraflar, fotoğraf kabini kareleri, çizimler, günlük yazıları ve mektuplar, soru kavanozu cevapları, ilişki tarihleri, oyun skorları, kedi ve çiçek durumu, rozet sayaçları, TV'de açılan linkler ve oynatma konumu, birlikte dinlenen şarkı bilgisi.</li>
  <li><b>Sesli/görüntülü sohbet ve paylaşım:</b> Mikrofon, kamera ve ekran/ video paylaşımı doğrudan iki cihaz arasında, şifreli olarak (WebRTC) akar. <b>Kaydetmiyor, saklamıyoruz.</b> Bazı ağlarda bağlantı, içeriği göremeyen bir aktarma sunucusu (Metered TURN) üzerinden geçer.</li>
  <li><b>Spotify:</b> Spotify'ı bağlarsanız erişim anahtarı yalnızca sizin cihazınızda saklanır. Partnerinizin görebilmesi için herkese açık/ortak çalma listelerinizin adı ve kapak görseli evinize yazılır.</li>
</ul>
<h4>Kullanım amaçları</h4>
<p>Verileri yalnızca Hizmeti sunmak için kullanırız: sizi ve partnerinizi aynı evde buluşturmak, paylaştıklarınızı partnerinize göstermek, film/müzik senkronu, güvenlik ve kötüye kullanımın önlenmesi. Pazarlama, profil çıkarma ya da reklam için kullanmayız.</p>
<h4>Kimlerle paylaşılır</h4>
<ul>
  <li><b>Partneriniz:</b> evinize eklediğiniz her şeyi görür. Günlük ve kavanoz cevapları ikinize ortaktır.</li>
  <li><b>Hizmet sağlayıcılar</b> (bizim adımıza işlerler): Google Firebase (kimlik doğrulama ve veritabanı; Avrupa Birliği, Belçika bölgesi), GitHub Pages (sitenin barındırılması), Metered (bağlantı aktarma).</li>
  <li><b>Sizin açtığınız hizmetler:</b> TV'de YouTube ya da başka bir site açtığınızda, Spotify'ı bağladığınızda o hizmetler kendi gizlilik politikalarına göre veri işler (ör. YouTube çerezleri).</li>
  <li>Kanunen zorunlu olduğunda yetkili makamlar.</li>
</ul>
<h4>Saklama süresi ve silme</h4>
<p>Verileriniz siz silene kadar saklanır. Bir fotoğrafı, yazıyı ya da cevabı tek tek silebilirsiniz. Menü → <i>Verilerimi sil</i> dediğinizde hesabınız, profiliniz ve <b>ortak eviniz (partnerinizin eklediği içerikler dahil)</b> veritabanından hemen silinir. Partnerinizin içeriklerini korumak istiyorsanız silmeden önce Albüm'den kaydetmesini isteyin.</p>
<h4>Güvenlik</h4>
<p>Bağlantılar HTTPS ile şifrelenir; veritabanı kuralları sayesinde bir eve yalnızca o evin iki sahibi erişebilir. Sohbet uçtan uca şifreli akar. Yine de hiçbir sistem %100 güvenli değildir; davet linkinizi sadece partnerinizle paylaşın.</p>
<h4>Çocuklar</h4>
<p>Hizmet 18 yaş altındakiler için değildir; bilerek 18 yaş altından veri toplamayız.</p>
<h4>Haklarınız ve başvuru</h4>
<p>Verilerinize erişme, düzeltme, silme ve itiraz haklarınız için ${mail} adresine yazabilirsiniz. Ayrıntılar KVKK Aydınlatma Metni'nde.</p>`,
  },
  {
    id: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    html: `
<p class="muted">6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") madde 10 uyarınca · ${LEGAL_DATE}</p>
<h4>Veri sorumlusu</h4>
<p>${COMPANY} · İletişim: ${mail}</p>
<h4>İşlenen kişisel veriler</h4>
<p>Kimlik (ad), iletişim (Google ile girişte e-posta), görsel kayıtlar (yüklediğiniz fotoğraflar, kabin kareleri), kullanıcı içerikleri (günlük, mektup, çizim, cevaplar), konum dışı kullanım verileri (evdeki oda/konum, oyun ve bakım kayıtları, saat dilimi), işlem güvenliği verileri (kullanıcı kimliği). Ses ve görüntü <b>kaydedilmez</b>; yalnızca anlık olarak iki cihaz arasında iletilir.</p>
<h4>Amaçlar ve hukuki sebepler</h4>
<ul>
  <li>Üyeliğin kurulması ve Hizmetin sunulması — <i>sözleşmenin kurulması ve ifası</i> (KVKK m. 5/2-c),</li>
  <li>Hizmet güvenliğinin sağlanması, kötüye kullanımın önlenmesi — <i>meşru menfaat</i> (m. 5/2-f),</li>
  <li>Yasal yükümlülüklerin yerine getirilmesi — <i>kanuni yükümlülük</i> (m. 5/2-ç),</li>
  <li>Verilerin yurt dışındaki sunucularda saklanması — <i>açık rızanız</i> (m. 9/1).</li>
</ul>
<h4>Toplama yöntemi</h4>
<p>Veriler, uygulamayı kullanırken sizin girdiğiniz ve paylaştığınız bilgilerden, Google ile girişte Google'dan elektronik ortamda otomatik yolla toplanır.</p>
<h4>Aktarım</h4>
<p>Veriler; barındırma ve veritabanı hizmeti için Google LLC'ye (Firebase, Avrupa Birliği - Belçika sunucuları), bağlantı aktarımı için Metered'e, sitenin yayını için GitHub'a (yurt dışı) ve kanunen yetkili kurumlara aktarılabilir. Yurt dışına aktarım, giriş sırasında verdiğiniz açık rızaya dayanır. Rızanızı dilediğiniz an geri alabilirsiniz; bu durumda Hizmet çalışamayacağı için verileriniz silinir.</p>
<h4>Haklarınız (KVKK m. 11)</h4>
<p>Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı kişileri bilme, eksik/yanlış işlenmişse düzeltilmesini, silinmesini ya da yok edilmesini isteme, bu işlemlerin aktarılan kişilere bildirilmesini isteme, otomatik analiz sonucu aleyhinize bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.</p>
<p>Başvurularınızı ${mail} adresine iletebilirsiniz; en geç 30 gün içinde ücretsiz yanıtlanır. Yanıttan memnun kalmazsanız Kişisel Verileri Koruma Kurulu'na şikâyette bulunabilirsiniz.</p>`,
  },
  {
    id: 'cerez',
    title: 'Çerezler ve Yerel Depolama',
    html: `
<p>Get Love Room reklam ya da takip çerezi kullanmaz. Tarayıcınızda yalnızca çalışmak için gereken bilgileri saklarız:</p>
<ul>
  <li><b>Oturum:</b> Firebase giriş bilgisi (tekrar giriş yapmamanız için).</li>
  <li><b>Tercihler:</b> görünüm (yakın/tüm oda), gezilen odalar, son açılan TV linkleri.</li>
  <li><b>Spotify:</b> bağlarsanız erişim anahtarı (yalnızca bu cihazda).</li>
</ul>
<p>TV'de YouTube ya da başka bir site açtığınızda, o site kendi çerezlerini kullanabilir. Yazı tipi Google Fonts'tan yüklenir. Tarayıcı ayarlarından site verilerini silerek bunları temizleyebilirsiniz (misafir girişte eve tekrar giremeyebilirsiniz).</p>`,
  },
];

// Türkçe dışındaki tüm dillerde İngilizce metin gösterilir (başına kısa bir not eklenir).
const NOTE = { es: 'Los textos legales están disponibles en inglés y turco.', de: 'Die rechtlichen Texte sind auf Englisch und Türkisch verfügbar.', fr: 'Les textes juridiques sont disponibles en anglais et en turc.', pt: 'Os textos legais estão disponíveis em inglês e turco.' };
export const LEGAL = lang === 'tr' ? LEGAL_TR : LEGAL_EN.map((d) => (NOTE[lang] ? { ...d, html: `<p class="muted">${NOTE[lang]}</p>` + d.html } : d));
export const legalById = (id) => LEGAL.find((x) => x.id === id);
