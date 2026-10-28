import { createHmac, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import type { NextFunction, Request, Response } from 'express';
import { AUTH_SECRET, GOOGLE_AUDIENCES } from './env';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Basit imzalı oturum token'ı: base64url(payload).hmac — JWT kütüphanesine gerek yok. */
export function signToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof uid === 'string' && typeof exp === 'number' && exp > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

function sign(payload: string) {
  return createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
}

const google = new OAuth2Client();

/** Google ID token'ını Google'ın açık anahtarlarıyla doğrular; client id'lerimizden birine ait olmalı. */
export async function verifyGoogleIdToken(idToken: string) {
  const ticket = await google.verifyIdToken({ idToken, audience: GOOGLE_AUDIENCES });
  const p = ticket.getPayload();
  if (!p?.sub || p.email_verified === false) return null;
  return { sub: p.sub, email: p.email ?? null, name: p.given_name ?? p.name ?? 'Sevgili', picture: p.picture ?? null };
}

export interface AuthedRequest extends Request {
  userId: string;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const userId = verifyToken(header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!userId) return void res.status(401).json({ error: 'UNAUTHORIZED' });
  (req as AuthedRequest).userId = userId;
  next();
}
