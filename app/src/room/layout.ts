import type { ObjectId } from '@loveroom/shared';

/** Duvar içi normalize konum (0–1). Ekran boyutundan bağımsız; zoom hesabı da bunu kullanır. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Duvar ile zeminin birleştiği yükseklik (0–1). */
export const FLOOR_Y = 0.7;

/**
 * Proje taslağındaki yerleşim. Sol/sağ duvarlara karşıdan bakıldığında:
 * Sol: Tablo 1 · Şömine · Tablo 2   |   Sağ: Foto · Pencere · Foto
 */
export const LAYOUT: Record<ObjectId, Rect> = {
  // Ön duvar — sinema köşesi (TV odanın en büyük objesi)
  tv: { x: 0.08, y: 0.1, w: 0.84, h: 0.42 },
  pet: { x: 0.1, y: 0.64, w: 0.24, h: 0.2 },
  // Arka duvar — kanepe ve ilişki saati
  clock: { x: 0.41, y: 0.08, w: 0.18, h: 0.18 },
  sofa: { x: 0.12, y: 0.36, w: 0.68, h: 0.44 },
  // Sol duvar — şömine başı
  'frame-left-1': { x: 0.05, y: 0.16, w: 0.22, h: 0.28 },
  fireplace: { x: 0.31, y: 0.2, w: 0.38, h: 0.6 },
  'frame-left-2': { x: 0.73, y: 0.1, w: 0.22, h: 0.28 },
  // Sağ duvar — pencere kenarı; pencerenin altındaki dolapta pikap ve soru kavanozu
  'photo-right-1': { x: 0.05, y: 0.14, w: 0.19, h: 0.24 },
  window: { x: 0.3, y: 0.06, w: 0.4, h: 0.44 },
  'photo-right-2': { x: 0.76, y: 0.2, w: 0.19, h: 0.24 },
  record: { x: 0.29, y: 0.505, w: 0.24, h: 0.1 },
  jar: { x: 0.56, y: 0.475, w: 0.12, h: 0.13 },
  album: { x: 0.02, y: 0.42, w: 0.2, h: 0.42 },
  flower: { x: 0.75, y: 0.48, w: 0.17, h: 0.38 },
  // Ön duvar: günlük TV ünitesinin üstünde (tıklama alanı ünitenin içinde), oyun konsolu TV'nin önünde
  diary: { x: 0.5, y: 0.48, w: 0.36, h: 0.2 },
  console: { x: 0.43, y: 0.74, w: 0.17, h: 0.08 },
};

/** Dekoratif (odaklanamayan) parçaların konumları. */
export const DECOR = {
  // Ön
  console: { x: 0.12, y: 0.52, w: 0.76, h: 0.18 },
  frontRug: { x: 0.02, y: 0.71, w: 0.96, h: 0.28 },
  frontPlantL: { x: -0.01, y: 0.36, w: 0.12, h: 0.42 },
  frontPlantR: { x: 0.89, y: 0.36, w: 0.12, h: 0.42 },
  gameConsole: { x: 0.43, y: 0.74, w: 0.17, h: 0.08 },
  pouf: { x: 0.68, y: 0.74, w: 0.24, h: 0.14 },
  // Arka
  backRug: { x: 0.04, y: 0.74, w: 0.92, h: 0.22 },
  gallery1: { x: 0.14, y: 0.11, w: 0.11, h: 0.15 },
  gallery2: { x: 0.68, y: 0.12, w: 0.1, h: 0.14 },
  lamp: { x: 0.81, y: 0.12, w: 0.15, h: 0.68 },
  backPlant: { x: -0.01, y: 0.38, w: 0.13, h: 0.44 },
  coffeeTable: { x: 0.24, y: 0.8, w: 0.46, h: 0.16 },
  // Sol
  armchair: { x: 0.71, y: 0.46, w: 0.27, h: 0.36 },
  logBasket: { x: 0.16, y: 0.64, w: 0.13, h: 0.13 },
  sheepskin: { x: 0.26, y: 0.8, w: 0.48, h: 0.14 },
  // Sağ
  cabinet: { x: 0.26, y: 0.6, w: 0.46, h: 0.14 },
  bookshelf: { x: 0.02, y: 0.42, w: 0.2, h: 0.42 },
  rightPlant: { x: 0.76, y: 0.52, w: 0.15, h: 0.34 },
} satisfies Record<string, Rect>;

/** Bir objeyi ekranı ~%85 dolduracak şekilde ortalamak için gereken transform. */
export function zoomFor(rect: Rect, width: number, height: number, bottomInset: number) {
  // Alt panel ekranın bir kısmını kapladığı için hedef alan yukarı kaydırılır.
  const usableH = height - bottomInset;
  const scale = Math.min((0.92 * width) / (rect.w * width), (0.85 * usableH) / (rect.h * height), 2.6);
  const cx = (rect.x + rect.w / 2) * width - width / 2;
  const cy = (rect.y + rect.h / 2) * height - height / 2;
  const targetCy = usableH / 2 - height / 2;
  // transform: [translate, scale] → p' = scale·p + t
  return { scale, tx: -scale * cx, ty: targetCy - scale * cy };
}
