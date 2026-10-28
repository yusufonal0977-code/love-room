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
  // Ön duvar — sinema köşesi
  tv: { x: 0.12, y: 0.13, w: 0.76, h: 0.33 },
  pet: { x: 0.37, y: 0.66, w: 0.26, h: 0.2 },
  // Arka duvar — kanepe ve ilişki saati
  clock: { x: 0.4, y: 0.08, w: 0.2, h: 0.2 },
  sofa: { x: 0.08, y: 0.4, w: 0.72, h: 0.42 },
  // Sol duvar — şömine başı
  'frame-left-1': { x: 0.05, y: 0.2, w: 0.24, h: 0.26 },
  fireplace: { x: 0.32, y: 0.28, w: 0.36, h: 0.5 },
  'frame-left-2': { x: 0.71, y: 0.1, w: 0.24, h: 0.26 },
  // Sağ duvar — pencere kenarı; pencerenin altındaki dolapta pikap ve soru kavanozu
  'photo-right-1': { x: 0.05, y: 0.14, w: 0.21, h: 0.27 },
  window: { x: 0.3, y: 0.06, w: 0.4, h: 0.44 },
  'photo-right-2': { x: 0.74, y: 0.24, w: 0.21, h: 0.27 },
  record: { x: 0.29, y: 0.505, w: 0.24, h: 0.1 },
  jar: { x: 0.56, y: 0.475, w: 0.12, h: 0.13 },
};

/** Dekoratif (odaklanamayan) parçaların konumları. */
export const DECOR = {
  console: { x: 0.18, y: 0.5, w: 0.64, h: 0.2 },
  rug: { x: 0.06, y: 0.76, w: 0.88, h: 0.2 },
  lamp: { x: 0.81, y: 0.18, w: 0.15, h: 0.62 },
  plantBack: { x: 0.0, y: 0.5, w: 0.1, h: 0.3 },
  plantRight: { x: 0.72, y: 0.6, w: 0.12, h: 0.24 },
  cabinet: { x: 0.26, y: 0.6, w: 0.46, h: 0.14 },
} satisfies Record<string, Rect>;

/** Bir objeyi ekranı ~%85 dolduracak şekilde ortalamak için gereken transform. */
export function zoomFor(rect: Rect, width: number, height: number, bottomInset: number) {
  // Alt panel ekranın bir kısmını kapladığı için hedef alan yukarı kaydırılır.
  const usableH = height - bottomInset;
  const scale = Math.min((0.85 * width) / (rect.w * width), (0.8 * usableH) / (rect.h * height), 2.6);
  const cx = (rect.x + rect.w / 2) * width - width / 2;
  const cy = (rect.y + rect.h / 2) * height - height / 2;
  const targetCy = usableH / 2 - height / 2;
  // transform: [translate, scale] → p' = scale·p + t
  return { scale, tx: -scale * cx, ty: targetCy - scale * cy };
}
