import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'loveroom.token';

/**
 * Oturum token'ı saklama.
 * Web'de geliştirme girişleri sekmeye özel (sessionStorage) tutulur: böylece aynı tarayıcıda
 * iki sekmede iki farklı kullanıcıyla test edilebilir. Google girişi kalıcıdır (localStorage).
 */
export async function saveToken(token: string, perTab: boolean) {
  if (Platform.OS === 'web') {
    clearWeb();
    (perTab ? sessionStorage : localStorage).setItem(KEY, token);
  } else {
    await AsyncStorage.setItem(KEY, token);
  }
}

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return AsyncStorage.getItem(KEY);
}

export async function clearToken() {
  if (Platform.OS === 'web') clearWeb();
  else await AsyncStorage.removeItem(KEY);
}

function clearWeb() {
  try {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  } catch {
    // gizli pencere vb. — yok say
  }
}
