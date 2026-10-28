// Soru kavanozu ("Ask Me More"). Kimlikler kalıcıdır; yeni soru eklerken yeni id verin.

export const QUESTION_CATEGORIES = {
  fun: 'Eğlenceli',
  deep: 'Derin',
  memories: 'Anılar',
  future: 'Gelecek',
} as const;
export type QuestionCategory = keyof typeof QUESTION_CATEGORIES;

export interface Question {
  id: string;
  category: QuestionCategory;
  text: string;
}

const q = (category: QuestionCategory, texts: string[]): Question[] =>
  texts.map((text, i) => ({ id: `${category}-${i + 1}`, category, text }));

export const QUESTIONS: Question[] = [
  ...q('fun', [
    'Birlikte bir film çekseydik türü ne olurdu?',
    'Bana bir hayvan olarak bakınca hangisini görüyorsun?',
    'Bir gün yer değiştirsek ilk ne yapardın?',
    'Bizim ilişkimizin bir şarkısı olsa hangisi olurdu?',
    'En sevdiğin ortak iç şakamız hangisi?',
    'Benimle ıssız bir adaya düşsen yanına alacağın 3 şey?',
    'Birlikte açacağımız bir kafenin adı ne olurdu?',
    'Bende en komik bulduğun alışkanlık ne?',
    'Sence hangi süper güç bize en çok yakışırdı?',
    'Bir gün boyunca bana istediğin her şeyi yaptırabilsen ne yaptırırdın?',
  ]),
  ...q('deep', [
    'Kendini en çok ne zaman sevilmiş hissediyorsun?',
    'Aramızdaki mesafe sana en çok ne zaman ağır geliyor?',
    'Benden duymaya en çok ihtiyaç duyduğun cümle ne?',
    'Bana hiç söylemediğin ama hep düşündüğün bir şey?',
    'İlişkimizde en gurur duyduğun an hangisi?',
    'Zor bir günde senden ne yapmamı istersin?',
    'Bende ilk fark ettiğin ve hâlâ sevdiğin şey ne?',
    'Sence birbirimizden ne öğrendik?',
    'Kendinde değiştirmek istediğin bir şey var mı?',
    'Bana olan güvenini ne büyütüyor?',
  ]),
  ...q('memories', [
    'Beni ilk gördüğünde aklından ne geçti?',
    'Birlikte en çok güldüğümüz an hangisiydi?',
    'Bana âşık olduğunu ilk ne zaman fark ettin?',
    'Sakladığın, bana ait bir eşya ya da mesaj var mı?',
    'En sevdiğin ortak fotoğrafımız hangisi ve neden?',
    'Birlikte yediğimiz en güzel yemek neydi?',
    'Unutamadığın ilk buluşmamızdan bir detay?',
    'Uzaktayken yaşadığımız en tatlı sürpriz neydi?',
    'Bir anımızı yeniden yaşayabilsen hangisi olurdu?',
    'Seni benim için en çok ağlatan ya da güldüren mesajım hangisiydi?',
  ]),
  ...q('future', [
    'Aynı şehre taşındığımız ilk gün ne yapalım?',
    'Hayalindeki ortak evimizde olmazsa olmaz bir şey?',
    'Birlikte gitmek istediğin ilk yer neresi?',
    '10 yıl sonra bir pazar sabahımız nasıl geçer?',
    'Birlikte öğrenmek istediğin bir şey var mı?',
    'Bir gün bir evcil hayvanımız olsa adını ne koyarız?',
    'Yıl dönümümüzü nasıl kutlamak isterdin?',
    'Birlikte başlatmak istediğin küçük bir gelenek?',
    'Yaşlandığımızda nasıl bir çift olmak istersin?',
    'Önümüzdeki bir yıl için ortak bir hedefimiz ne olsun?',
  ]),
];

export const questionById = (id: string) => QUESTIONS.find((x) => x.id === id) ?? null;
