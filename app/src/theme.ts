import { Platform, type ViewStyle } from 'react-native';
import type { RoomStyle, WallId } from '@loveroom/shared';

/** Sadece web'de desteklenen CSS (ör. backdrop-filter) — mobilde yok sayılır. */
export const webStyle = (style: Record<string, string>): ViewStyle =>
  Platform.OS === 'web' ? (style as unknown as ViewStyle) : {};

/**
 * Sıcak ev paleti: espresso koyusu arayüz, krem duvarlar, bal rengi ahşap, terrakota vurgu,
 * adaçayı yeşili ve lamba ışığı altını. (Eski isimler korunur: rose = ana vurgu rengi.)
 */
export const colors = {
  night: '#1c1410',
  plum: '#2b1f18',
  plumSoft: '#3b2a20',
  rose: '#d9785a',
  roseDeep: '#b75a3f',
  blush: '#f3c9b0',
  cream: '#fbf3e6',
  gold: '#f2b85e',
  goldDeep: '#c98a34',
  sage: '#8fa382',
  text: '#fbf3e8',
  textDim: '#cdb8a4',
  glass: 'rgba(255, 244, 230, 0.08)',
  glassStrong: 'rgba(33, 23, 17, 0.86)',
  sheet: '#2a1e17',
  line: 'rgba(255, 232, 205, 0.16)',
  online: '#7ed49a',
} as const;

export const fonts = {
  display: 'PlayfairDisplay_700Bold_Italic',
  displayLight: 'PlayfairDisplay_400Regular_Italic',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_800ExtraBold',
} as const;

/**
 * Duvarların gündüz renkleri. Akşam/gece tonları `lighting.ts`'teki ışık katmanlarıyla oluşur;
 * duvarların kendisi her zaman "gerçek" rengindedir.
 */
export const wallThemes = {
  front: { top: '#efe4d2', bottom: '#e4d3bb', wainscot: '#9fae95', trim: '#f7f0e4', label: 'Sinema köşesi' },
  right: { top: '#ede3d4', bottom: '#e2d2bd', wainscot: '#c9a27c', trim: '#f7f0e4', label: 'Pencere kenarı' },
  back: { top: '#f0e2cf', bottom: '#e6d0b6', wainscot: '#b98a62', trim: '#f7efe2', label: 'Kanepemiz' },
  left: { top: '#ecdccb', bottom: '#dfc9b1', wainscot: '#a7b49c', trim: '#f7efe2', label: 'Şömine başı' },
} as const;

type WallColors = { top: string; bottom: string; wainscot: string; trim: string };

/** Oda stilleri: krem dışındakiler dört duvara aynı paleti uygular. */
export const roomStyles: Record<RoomStyle, { label: string; swatch: [string, string]; walls?: WallColors }> = {
  cream: { label: 'Krem & adaçayı', swatch: ['#efe4d2', '#9fae95'] },
  terracotta: {
    label: 'Terrakota',
    swatch: ['#ecc9b0', '#b9654a'],
    walls: { top: '#efd2bd', bottom: '#e4bb9e', wainscot: '#b9654a', trim: '#f7ece0' },
  },
  forest: {
    label: 'Orman',
    swatch: ['#dfe5d6', '#4f6b4f'],
    walls: { top: '#e3e8da', bottom: '#d2dac6', wainscot: '#4f6b4f', trim: '#f4f0e6' },
  },
  blush: {
    label: 'Pudra',
    swatch: ['#f3dcd6', '#c98f8f'],
    walls: { top: '#f5e2dc', bottom: '#ecd2ca', wainscot: '#c98f8f', trim: '#fbf3ef' },
  },
  midnight: {
    label: 'Gece mavisi',
    swatch: ['#3b4566', '#d9cdb8'],
    walls: { top: '#46507a', bottom: '#384166', wainscot: '#272e4a', trim: '#d9cdb8' },
  },
};

export function wallColors(style: RoomStyle, wall: WallId): WallColors {
  return roomStyles[style]?.walls ?? wallThemes[wall];
}
