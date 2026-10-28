import { Platform, type ViewStyle } from 'react-native';

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
