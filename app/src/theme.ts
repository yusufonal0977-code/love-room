import { Platform, type ViewStyle } from 'react-native';

/** Sadece web'de desteklenen CSS (ör. backdrop-filter) — mobilde yok sayılır. */
export const webStyle = (style: Record<string, string>): ViewStyle =>
  Platform.OS === 'web' ? (style as unknown as ViewStyle) : {};

// Romantik akşam paleti: koyu erik gece, gül pembesi vurgular, mum ışığı altını.
export const colors = {
  night: '#170c1f',
  plum: '#2a1533',
  plumSoft: '#3d2148',
  rose: '#ec7a96',
  roseDeep: '#c9506f',
  blush: '#f8c9d4',
  cream: '#fff4ea',
  gold: '#f7c873',
  goldDeep: '#d89a3c',
  text: '#fdeff3',
  textDim: '#cfb1c0',
  glass: 'rgba(255, 240, 245, 0.08)',
  glassStrong: 'rgba(30, 14, 38, 0.82)',
  line: 'rgba(255, 220, 230, 0.16)',
  online: '#7ee0a1',
} as const;

export const fonts = {
  display: 'PlayfairDisplay_700Bold_Italic',
  displayLight: 'PlayfairDisplay_400Regular_Italic',
  body: 'Nunito_400Regular',
  bodySemi: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_800ExtraBold',
} as const;

/** Her duvarın ışık/renk teması: akşam lambası ışığında sıcak tonlar. */
export const wallThemes = {
  front: { top: '#4a2a4f', bottom: '#6e3e5c', wainscot: '#5a3352', glow: 'rgba(120, 160, 255, 0.18)', label: 'Sinema köşesi' },
  right: { top: '#3e2a52', bottom: '#5d3f66', wainscot: '#4c3359', glow: 'rgba(190, 210, 255, 0.16)', label: 'Pencere kenarı' },
  back: { top: '#52293f', bottom: '#784055', wainscot: '#62324a', glow: 'rgba(255, 196, 120, 0.22)', label: 'Kanepemiz' },
  left: { top: '#55283a', bottom: '#7e3f4c', wainscot: '#66313f', glow: 'rgba(255, 150, 80, 0.28)', label: 'Şömine başı' },
} as const;
