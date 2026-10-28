import express, { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  ApiErrorCode,
  AppConfig,
  AuthResponse,
  CreateRoomBody,
  InvitePreview,
  MeResponse,
} from '@loveroom/shared';
import { MAX_MEMBERS } from '@loveroom/shared';
import { requireAuth, signToken, verifyGoogleIdToken, type AuthedRequest } from './auth';
import * as db from './db';
import { DEV_LOGIN, GOOGLE_CLIENT_ID, GOOGLE_ORIGINS, UPLOADS_DIR } from './env';
import { refreshRoomMembers } from './realtime';

const fail = (res: Response, status: number, error: ApiErrorCode) => void res.status(status).json({ error });
const ANNIVERSARY_RE = /^\d{4}-\d{2}-\d{2}$/;
const IMAGE_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export const api = Router();

/** İsteğin geldiği web adresi: geliştirmede Origin başlığı, tek adresten sunulunca (tünel) kendi adresi. */
function requestOrigin(req: Request) {
  if (req.headers.origin) return req.headers.origin;
  const proto = req.get('x-forwarded-proto') ?? req.protocol;
  return `${proto}://${req.get('x-forwarded-host') ?? req.get('host')}`;
}
const isLocalOrigin = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

api.get('/config', (req, res) => {
  const origin = requestOrigin(req);
  res.json({
    // Google sadece Google Console'da yetkilendirilmiş adreslerde çalışır; diğerlerinde butonu gizle.
    googleClientId: GOOGLE_CLIENT_ID && GOOGLE_ORIGINS.includes(origin) ? GOOGLE_CLIENT_ID : null,
    devLogin: DEV_LOGIN,
  } satisfies AppConfig);
});

// ---- Giriş ----

api.post('/auth/google', async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return fail(res, 400, 'GOOGLE_DISABLED');
  const idToken = req.body?.idToken;
  if (typeof idToken !== 'string') return fail(res, 400, 'BAD_REQUEST');
  const profile = await verifyGoogleIdToken(idToken).catch(() => null);
  if (!profile) return fail(res, 401, 'GOOGLE_INVALID');
  const user = db.upsertGoogleUser(profile);
  res.json({ token: signToken(user.id), user } satisfies AuthResponse);
});

api.post('/auth/dev', (req, res) => {
  if (!DEV_LOGIN) return fail(res, 403, 'DEV_LOGIN_DISABLED');
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 30) : '';
  if (!name) return fail(res, 400, 'BAD_REQUEST');
  // Yerelde aynı isim aynı hesaba döner (test kolaylığı). Herkese açık linkte her giriş yeni bir hesaptır;
  // yoksa biri başkasının adını yazıp onun odasına girebilirdi.
  const user = isLocalOrigin(requestOrigin(req)) ? db.upsertDevUser(name) : db.createGuestUser(name);
  res.json({ token: signToken(user.id), user } satisfies AuthResponse);
});

api.get('/me', requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const user = db.getUser(userId);
  if (!user) return fail(res, 401, 'UNAUTHORIZED');
  const roomId = db.roomIdOf(userId);
  res.json({ user, room: roomId ? db.roomSummary(roomId) : null } satisfies MeResponse);
});

// ---- Oda ve davet ----

api.post('/rooms', requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const body = req.body as Partial<CreateRoomBody>;
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 40) : '';
  const anniversary = typeof body?.anniversary === 'string' && ANNIVERSARY_RE.test(body.anniversary) ? body.anniversary : null;
  if (!name) return fail(res, 400, 'BAD_REQUEST');
  if (db.roomIdOf(userId)) return fail(res, 409, 'ALREADY_IN_ROOM');
  res.status(201).json(db.createRoomFor(userId, name, anniversary));
});

api.get('/invites/:code', (req, res) => {
  const roomId = db.roomIdByInvite(req.params.code);
  const summary = roomId && db.roomSummary(roomId);
  const inviter = roomId && db.roomCreator(roomId);
  if (!summary || !inviter) return fail(res, 404, 'NOT_FOUND');
  res.json({
    roomName: summary.name,
    inviter: { name: inviter.name, avatarUrl: inviter.avatarUrl },
    full: summary.memberCount >= MAX_MEMBERS,
  } satisfies InvitePreview);
});

api.post('/invites/:code/accept', requireAuth, (req, res) => {
  const { userId } = req as AuthedRequest;
  const roomId = db.roomIdByInvite(String(req.params.code));
  if (!roomId) return fail(res, 404, 'NOT_FOUND');

  const current = db.roomIdOf(userId);
  if (current === roomId) return void res.json(db.roomSummary(roomId));
  if (current) {
    // Kendi boş odasını açmış ama partnerinin davetine tıklamışsa: boş odayı bırakıp davete geçer.
    if (db.roomMembers(current).length > 1) return fail(res, 409, 'ALREADY_IN_ROOM');
    db.leaveSoloRoom(userId, current);
  }
  if (db.roomMembers(roomId).length >= MAX_MEMBERS) return fail(res, 409, 'ROOM_FULL');

  db.addMember(roomId, userId);
  refreshRoomMembers(roomId);
  res.json(db.roomSummary(roomId));
});

// ---- Pano fotoğrafı yükleme ----
// Dosya diske yazılır, sokete sadece URL gider. Prod'da S3/R2/Supabase Storage'a taşıyın.

api.post('/uploads', requireAuth, express.raw({ type: 'image/*', limit: '8mb' }), async (req, res) => {
  const { userId } = req as AuthedRequest;
  const ext = IMAGE_EXT[String(req.headers['content-type'])];
  if (!ext || !Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 400, 'BAD_REQUEST');
  if (!db.roomIdOf(userId)) return fail(res, 403, 'UNAUTHORIZED');
  const file = `${randomUUID()}.${ext}`;
  await writeFile(join(UPLOADS_DIR, file), req.body);
  res.status(201).json({ url: `/uploads/${file}` });
});
