// Uçtan uca test: iki geliştirme kullanıcısı → oda + davet → soket senkronu → 3. kişi reddi.
// Kullanım: sunucu açıkken `npm run test:sync`.
import { io, type Socket } from 'socket.io-client';
import type { AuthResponse, ClientToServerEvents, RoomState, RoomSummary, ServerToClientEvents } from '@loveroom/shared';

const URL = process.env.SERVER_URL ?? 'http://localhost:4000';
const suffix = Date.now().toString(36);
type S = Socket<ServerToClientEvents, ClientToServerEvents>;

async function call<T>(path: string, body: unknown, token?: string): Promise<{ status: number; data: T }> {
  const res = await fetch(`${URL}/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: (await res.json()) as T };
}

const login = async (name: string) => (await call<AuthResponse>('/auth/dev', { name })).data;

function connect(token: string): Promise<{ socket: S; state: RoomState }> {
  const socket: S = io(URL, { transports: ['websocket'], auth: { token, timezone: 'Europe/Istanbul' } });
  return new Promise((resolve, reject) => {
    socket.once('room:state', (state) => resolve({ socket, state }));
    socket.once('connect_error', (e) => reject(e.message));
  });
}

const ayse = await login(`ayse-${suffix}`);
const mehmet = await login(`mehmet-${suffix}`);
const ucuncu = await login(`ucuncu-${suffix}`);

const room = (await call<RoomSummary>('/rooms', { name: 'Test Evi', anniversary: '2023-02-14' }, ayse.token)).data;
console.log('Oda:', room.name, 'davet kodu:', room.inviteCode);

const accept = await call<RoomSummary>(`/invites/${room.inviteCode}/accept`, {}, mehmet.token);
console.log('Mehmet daveti kabul etti:', accept.status, 'üye sayısı:', accept.data.memberCount);

const a = await connect(ayse.token);
const b = await connect(mehmet.token);

const bSawFocus = new Promise<RoomState>((resolve) =>
  b.socket.on('room:state', (s) => s.focus?.objectId === 'tv' && resolve(s)),
);
a.socket.emit('room:action', { type: 'tv/power' });
const s = await bSawFocus;
console.log('Mehmet odak:', s.focus?.objectId, '| TV açık:', s.tv.on, '| üyeler:', s.members.map((m) => m.name).join(', '));

const bSawHug = new Promise<string>((resolve) => b.socket.on('room:reaction', (r) => resolve(r.kind)));
a.socket.emit('room:react', 'hug');
console.log('Mehmet tepki aldı:', await bSawHug);

const bSawRing = new Promise<string>((resolve) => b.socket.on('call:signal', (sig, from) => resolve(`${sig.type} ← ${from}`)));
a.socket.emit('call:signal', { type: 'ring', kind: 'video' });
console.log('Mehmet arama sinyali aldı:', await bSawRing);

const bSawQuestion = new Promise<RoomState>((resolve) =>
  b.socket.on('room:state', (st) => st.question?.answers[ayse.user.id] && resolve(st)),
);
a.socket.emit('room:action', { type: 'question/draw', questionId: 'deep-1' });
a.socket.emit('room:action', { type: 'question/answer', text: 'Sabah mesajlarında' });
const qs = await bSawQuestion;
console.log('Soru:', qs.question?.text, '| Ayşe cevapladı:', !!qs.question?.answers[ayse.user.id]);

// Günlük: yazı eklenince partner "room:feed" alır
const bSawFeed = new Promise<string>((resolve) => b.socket.on('room:feed', resolve));
await call('/diary', { text: 'İlk sayfa 💞', mood: '🥰' }, ayse.token);
console.log('Mehmet günlük bildirimi aldı:', await bSawFeed);

// Çiçek: ikisi de sulayınca birlikte bonusu (1 + 2 = 3 puan)
const flowerGrown = new Promise<RoomState>((resolve) => b.socket.on('room:state', (st) => st.flower.growth >= 3 && resolve(st)));
a.socket.emit('room:action', { type: 'flower/water' });
await new Promise((r) => setTimeout(r, 200));
b.socket.emit('room:action', { type: 'flower/water' });
console.log('Çiçek büyüme puanı:', (await flowerGrown).flower.growth);

// XOX: Ayşe sol sütunu doldurup kazanır
const xoxDone = new Promise<RoomState>((resolve) =>
  b.socket.on('room:state', (st) => st.game?.kind === 'xox' && st.game.winner && resolve(st)),
);
a.socket.emit('room:action', { type: 'game/start', game: 'xox', seed: 1 });
const moves: [S, number][] = [[a.socket, 0], [b.socket, 1], [a.socket, 3], [b.socket, 4], [a.socket, 6]];
for (const [sock, index] of moves) {
  await new Promise((r) => setTimeout(r, 150));
  sock.emit('room:action', { type: 'game/move', index });
}
const xox = await xoxDone;
console.log('XOX kazanan Ayşe mi:', xox.game?.kind === 'xox' && xox.game.winner === ayse.user.id);

const third = await call(`/invites/${room.inviteCode}/accept`, {}, ucuncu.token);
console.log('3. kişi:', third.status, third.data);

a.socket.disconnect();
b.socket.disconnect();
const ok = accept.status === 200 && s.tv.on && s.members.length === 2 && third.status === 409;
console.log(ok ? '✅ Tüm kontroller geçti' : '❌ Bir kontrol başarısız');
process.exit(ok ? 0 : 1);
