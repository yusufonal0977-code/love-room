import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createRoom, migrateRoom, type Member, type PublicUser, type RoomState, type RoomSummary } from '@loveroom/shared';
import { DATA_DIR } from './env';

/**
 * Kalıcılık: Node'un yerleşik SQLite'ı (ek paket yok). Oda durumu JSON olarak saklanır.
 * Ölçek büyüyünce aynı fonksiyonlar Postgres'e taşınabilir.
 */
const db = new DatabaseSync(join(DATA_DIR, 'loveroom.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    google_sub TEXT UNIQUE,
    email TEXT,
    name TEXT NOT NULL,
    avatar_url TEXT,
    timezone TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    invite_code TEXT UNIQUE NOT NULL,
    state TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS memberships (
    user_id TEXT PRIMARY KEY REFERENCES users(id),
    room_id TEXT NOT NULL REFERENCES rooms(id),
    joined_at INTEGER NOT NULL
  );
`);

interface UserRow {
  id: string;
  email: string | null;
  name: string;
  avatar_url: string | null;
  timezone: string | null;
}

const toPublicUser = (r: UserRow): PublicUser => ({ id: r.id, name: r.name, email: r.email, avatarUrl: r.avatar_url });

export function upsertGoogleUser(p: { sub: string; email: string | null; name: string; picture: string | null }): PublicUser {
  const existing = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(p.sub) as UserRow | undefined;
  if (existing) {
    db.prepare('UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE id = ?').run(p.email, p.name, p.picture, existing.id);
    return { id: existing.id, name: p.name, email: p.email, avatarUrl: p.picture };
  }
  const id = randomUUID();
  db.prepare('INSERT INTO users (id, google_sub, email, name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, p.sub, p.email, p.name, p.picture, Date.now(),
  );
  return { id, name: p.name, email: p.email, avatarUrl: p.picture };
}

/** Geliştirme kullanıcısı: aynı isim → aynı hesap (tekrar girişte odası korunur). */
export function upsertDevUser(name: string): PublicUser {
  const id = `dev-${name.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/gi, '-')}`;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (existing) return toPublicUser(existing);
  db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, NULL, ?, ?)').run(id, name, Date.now());
  return { id, name, email: null, avatarUrl: null };
}

/** Herkese açık linkte hızlı giriş: her seferinde yeni, tahmin edilemez bir misafir hesabı. */
export function createGuestUser(name: string): PublicUser {
  const id = `guest-${randomUUID()}`;
  db.prepare('INSERT INTO users (id, email, name, created_at) VALUES (?, NULL, ?, ?)').run(id, name, Date.now());
  return { id, name, email: null, avatarUrl: null };
}

export function getUser(id: string): PublicUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toPublicUser(row) : null;
}

export function setTimezone(userId: string, timezone: string) {
  db.prepare('UPDATE users SET timezone = ? WHERE id = ?').run(timezone, userId);
}

export function roomIdOf(userId: string): string | null {
  const row = db.prepare('SELECT room_id FROM memberships WHERE user_id = ?').get(userId) as { room_id: string } | undefined;
  return row?.room_id ?? null;
}

export function roomMembers(roomId: string): Member[] {
  const rows = db
    .prepare(
      'SELECT u.* FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.room_id = ? ORDER BY m.joined_at',
    )
    .all(roomId) as unknown as UserRow[];
  return rows.map((r) => ({ id: r.id, name: r.name, avatarUrl: r.avatar_url, timezone: r.timezone }));
}

interface RoomRow {
  id: string;
  invite_code: string;
  state: string;
}

export function loadRoomState(roomId: string): RoomState | null {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as RoomRow | undefined;
  if (!row) return null;
  return { ...migrateRoom(JSON.parse(row.state)), members: roomMembers(roomId) };
}

export function saveRoomState(state: RoomState) {
  // Üyeler ve çevrimiçi listesi türetilmiş veridir; JSON'a yazılmaz.
  const { members: _m, online: _o, ...persisted } = state;
  db.prepare('UPDATE rooms SET state = ? WHERE id = ?').run(JSON.stringify(persisted), state.roomId);
}

const newInviteCode = () => randomBytes(6).toString('base64url');

export function createRoomFor(userId: string, name: string, anniversary: string | null): RoomSummary {
  const id = randomUUID();
  const inviteCode = newInviteCode();
  const state = createRoom(id, name, anniversary);
  db.prepare('INSERT INTO rooms (id, invite_code, state, created_by, created_at) VALUES (?, ?, ?, ?, ?)').run(
    id, inviteCode, JSON.stringify(state), userId, Date.now(),
  );
  db.prepare('INSERT INTO memberships (user_id, room_id, joined_at) VALUES (?, ?, ?)').run(userId, id, Date.now());
  return { id, name, anniversary, inviteCode, memberCount: 1 };
}

export function roomSummary(roomId: string): RoomSummary | null {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as RoomRow | undefined;
  if (!row) return null;
  const state = migrateRoom(JSON.parse(row.state));
  return {
    id: row.id,
    name: state.name,
    anniversary: state.anniversary,
    inviteCode: row.invite_code,
    memberCount: roomMembers(row.id).length,
  };
}

export function roomIdByInvite(code: string): string | null {
  const row = db.prepare('SELECT id FROM rooms WHERE invite_code = ?').get(code) as { id: string } | undefined;
  return row?.id ?? null;
}

export function roomCreator(roomId: string): PublicUser | null {
  const row = db.prepare('SELECT created_by FROM rooms WHERE id = ?').get(roomId) as { created_by: string } | undefined;
  return row ? getUser(row.created_by) : null;
}

export function addMember(roomId: string, userId: string) {
  db.prepare('INSERT INTO memberships (user_id, room_id, joined_at) VALUES (?, ?, ?)').run(userId, roomId, Date.now());
}

/** Kullanıcıyı tek başına olduğu odadan çıkarır ve boş kalan odayı siler. */
export function leaveSoloRoom(userId: string, roomId: string) {
  db.prepare('DELETE FROM memberships WHERE user_id = ?').run(userId);
  if (roomMembers(roomId).length === 0) db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
}
