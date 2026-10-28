import { Platform } from 'react-native';

// Android emülatörde localhost yerine http://10.0.2.2:4000, fiziksel cihazda bilgisayarın LAN IP'si.
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:4000';

/** Davet linklerinin açılacağı web adresi. Web'de sayfanın kendi adresi kullanılır. */
export const APP_URL =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081';

/** Sunucuya yüklenen dosyalar "/uploads/..." olarak saklanır; tam adrese çevirir. */
export const mediaUrl = (url: string) => (url.startsWith('/') ? `${SERVER_URL}${url}` : url);
