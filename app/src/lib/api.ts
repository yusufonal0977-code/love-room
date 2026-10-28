import type { ApiErrorCode } from '@loveroom/shared';
import { SERVER_URL } from '../config';

export class ApiError extends Error {
  constructor(public code: ApiErrorCode | 'NETWORK', public status: number) {
    super(code);
  }
}

interface Options {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
  /** Ham gövde (dosya yükleme). */
  blob?: Blob;
  contentType?: string;
}

export async function api<T>(path: string, { method = 'GET', body, token, blob, contentType }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (blob) headers['content-type'] = contentType ?? blob.type;

  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api${path}`, {
      method: blob || body !== undefined ? 'POST' : method,
      headers,
      body: blob ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('NETWORK', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? 'BAD_REQUEST', res.status);
  return data as T;
}

/** Kullanıcıya gösterilecek Türkçe hata mesajları. */
export function errorText(e: unknown): string {
  const code = e instanceof ApiError ? e.code : 'NETWORK';
  switch (code) {
    case 'NETWORK':
      return 'Sunucuya ulaşılamadı. Sunucu açık mı?';
    case 'ROOM_FULL':
      return 'Bu odada zaten iki kişi var.';
    case 'ALREADY_IN_ROOM':
      return 'Zaten partnerinle bir odadasın.';
    case 'NOT_FOUND':
      return 'Davet linki geçersiz ya da süresi dolmuş.';
    case 'GOOGLE_INVALID':
      return 'Google girişi doğrulanamadı, tekrar dene.';
    case 'UNAUTHORIZED':
      return 'Oturumun sona erdi, tekrar giriş yap.';
    default:
      return 'Bir şeyler ters gitti, tekrar dene.';
  }
}
