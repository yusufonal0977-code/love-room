import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { APP_URL } from '../config';

export const buildInviteLink = (code: string) => `${APP_URL}/?invite=${encodeURIComponent(code)}`;

/** Yapıştırılan link ya da çıplak koddan davet kodunu çıkarır. */
export function parseInvite(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const fromUrl = text.match(/[?&]invite=([\w-]+)/);
  if (fromUrl) return fromUrl[1];
  return /^[\w-]{6,16}$/.test(text) ? text : null;
}

/** Uygulama bir davet linkiyle açıldıysa kodu döndürür (web: ?invite=, mobil: derin link). */
export async function readLaunchInvite(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const code = new URLSearchParams(window.location.search).get('invite');
    if (code) {
      // Adres çubuğunu temizle ama Google giriş dönüşünü bozmamak için sadece invite'ı kaldır.
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState(null, '', url.toString());
    }
    return code;
  }
  const url = await Linking.getInitialURL();
  return url ? parseInvite(url) : null;
}
