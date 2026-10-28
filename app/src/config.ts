import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';

/** Yerelde mi (localhost/127.0.0.1) yoksa paylaşılan bir linkten mi açıldı. */
export const isLocalWeb = isWeb && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

/**
 * Sunucu adresi:
 * - Geliştirmede (Metro, :8081) ayrı çalışan sunucu → http://localhost:4000
 * - Derlenmiş web sürümü sunucunun kendisinden sunulur → sayfanın kendi adresi (tünel/hosting linki)
 * Android emülatörde http://10.0.2.2:4000, fiziksel cihazda bilgisayarın LAN IP'si: EXPO_PUBLIC_SERVER_URL.
 */
export const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? (isWeb && !__DEV__ ? window.location.origin : 'http://localhost:4000');

/** Davet linklerinin açılacağı web adresi. Web'de sayfanın kendi adresi kullanılır. */
export const APP_URL = isWeb ? window.location.origin : process.env.EXPO_PUBLIC_APP_URL ?? 'http://localhost:8081';

/** Sunucuya yüklenen dosyalar "/uploads/..." olarak saklanır; tam adrese çevirir. */
export const mediaUrl = (url: string) => (url.startsWith('/') ? `${SERVER_URL}${url}` : url);
