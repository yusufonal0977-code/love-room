import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

// server/.env varsa yükle (Node 21.7+ yerleşik; ek paket gerekmez).
const envFile = join(serverRoot, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const DATA_DIR = process.env.DATA_DIR ?? join(serverRoot, 'data');
export const UPLOADS_DIR = join(DATA_DIR, 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

export const PORT = Number(process.env.PORT ?? 4000);

/** Expo web derlemesinin çıktısı; varsa sunucu web uygulamasını da sunar. */
export const WEB_DIST = process.env.WEB_DIST ?? join(serverRoot, '..', 'app', 'dist');

/**
 * Google girişine izin verilen web adresleri (Google Console'daki "Authorized JavaScript origins" ile aynı).
 * Başka bir adresten (ör. geçici tünel linki) açılınca Google butonu gizlenir, hızlı giriş kullanılır.
 */
export const GOOGLE_ORIGINS = (process.env.GOOGLE_ORIGINS ?? 'http://localhost:8081')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || null;
/** iOS/Android client id'leri: mobil girişte token'ın `aud` alanı bunlar olur. */
export const GOOGLE_AUDIENCES = [
  GOOGLE_CLIENT_ID,
  ...(process.env.GOOGLE_EXTRA_AUDIENCES ?? '').split(',').map((s) => s.trim()),
].filter((s): s is string => !!s);

/** Geliştirme girişi: Google ayarlı değilse varsayılan olarak açık. Prod'da DEV_LOGIN=0 yapın. */
export const DEV_LOGIN = process.env.DEV_LOGIN ? process.env.DEV_LOGIN === '1' : !GOOGLE_CLIENT_ID;

/** Oturum imza anahtarı: verilmezse bir kez üretilip data/ altında saklanır. */
export const AUTH_SECRET = (() => {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  const file = join(DATA_DIR, 'auth-secret');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const secret = randomBytes(32).toString('hex');
  writeFileSync(file, secret);
  return secret;
})();
