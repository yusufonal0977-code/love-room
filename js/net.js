// Firebase Realtime Database üzerinden oda, davet ve canlı senkron.
//
// Veri düzeni:
//   users/{uid}               ad, görünüm (look), güneş/ay (side), saat dilimi, oda
//   rooms/{rid}               a: kurucu uid, b: partner uid, info: {name, createdAt, invite}
//   invites/{kod}             rid
//   live/{rid}/presence/{uid} sahne, konum, yön, oturma, mikrofon/kamera (bağlantı kopunca silinir)
//   live/{rid}/state          ortak eşya durumları (lamba, TV, şömine…)
//   live/{rid}/cat            kedinin konumu (oda kurucusunun cihazı yürütür)
//   live/{rid}/fx             anlık tepkiler (kalp, sarılma)
//   live/{rid}/signal/{uid}   sesli/görüntülü sohbet sinyalleri (okununca silinir)
import { db, get, now, onChildAdded, onDisconnect, onValue, push, ref, remove, serverTimestamp, set, update } from './fb.js';

export const getProfile = async (uid) => (await get(ref(db, `users/${uid}`))).val();
export const saveProfile = (uid, patch) => update(ref(db, `users/${uid}`), patch);

const code = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');

/** Yeni ev: kurucu "a" olur, bir davet kodu üretilir. */
export async function createRoom(uid) {
  const rid = push(ref(db, 'rooms')).key;
  const invite = code();
  // Kurallar alt yol bazında olduğu için tek "set" yerine çok yollu güncelleme.
  await update(ref(db), {
    [`rooms/${rid}/a`]: uid,
    [`rooms/${rid}/info`]: { name: 'Bizim Ev', createdAt: serverTimestamp(), invite },
  });
  await set(ref(db, `invites/${invite}`), rid);
  await saveProfile(uid, { roomId: rid });
  return rid;
}

export const getRoom = async (rid) => (await get(ref(db, `rooms/${rid}`))).val();

/** Davet kodunu çözer: oda, kurucunun profili ve odanın dolu olup olmadığı. */
export async function readInvite(inviteCode) {
  const rid = (await get(ref(db, `invites/${inviteCode}`))).val();
  if (!rid) return null;
  const room = await getRoom(rid).catch(() => null);
  if (!room) return { rid, full: true };
  const inviter = await getProfile(room.a);
  return { rid, room, inviter, full: !!room.b };
}

/** Daveti kabul et: "b" olarak odaya yerleş; kurucunun tersini (güneş/ay) al. */
export async function acceptInvite(uid, rid) {
  const room = await getRoom(rid);
  if (room.a === uid || room.b === uid) return;
  await set(ref(db, `rooms/${rid}/b`), uid);
  const inviter = await getProfile(room.a);
  await saveProfile(uid, { roomId: rid, side: inviter?.side === 'moon' ? 'sun' : 'moon' });
}

/**
 * Odanın canlı kanalına bağlanır. Dönen nesneyle konum/durum yazılır; değişiklikler handler'lara akar.
 */
export function joinLive(rid, uid, h) {
  const base = `live/${rid}`;
  const unsub = [];
  const meRef = ref(db, `${base}/presence/${uid}`);
  const joinedAt = now();
  let presence = {};
  // Bağlantı her (yeniden) kurulduğunda: kopunca silinme kaydını yenile ve son konumu tekrar yaz.
  unsub.push(
    onValue(ref(db, '.info/connected'), (s) => {
      if (!s.val()) return;
      onDisconnect(meRef).remove();
      if (presence.scene) set(meRef, { ...presence, ts: serverTimestamp() });
    }),
  );

  unsub.push(onValue(ref(db, `rooms/${rid}`), (s) => h.onRoom?.(s.val())));
  unsub.push(onValue(ref(db, `${base}/presence`), (s) => h.onPresence?.(s.val() || {})));
  unsub.push(onValue(ref(db, `${base}/state`), (s) => h.onState?.(s.val() || {})));
  unsub.push(onValue(ref(db, `${base}/cat`), (s) => h.onCat?.(s.val())));
  unsub.push(
    onChildAdded(ref(db, `${base}/fx`), (s) => {
      const v = s.val();
      if (v && (v.at ?? 0) > joinedAt - 3000) h.onFx?.(v);
    }),
  );
  unsub.push(
    onChildAdded(ref(db, `${base}/signal/${uid}`), (s) => {
      const v = s.val();
      remove(s.ref);
      if (v) h.onSignal?.(v);
    }),
  );

  return {
    setPresence(p) {
      presence = { ...presence, ...p, ts: serverTimestamp() };
      return set(meRef, presence);
    },
    setState: (patch) => update(ref(db, `${base}/state`), patch),
    setCat: (c) => set(ref(db, `${base}/cat`), c),
    react(kind) {
      const r = push(ref(db, `${base}/fx`), { kind, from: uid, at: serverTimestamp() });
      setTimeout(() => remove(r), 15_000);
    },
    signal: (to, msg) => push(ref(db, `${base}/signal/${to}`), { ...msg, from: uid }),
    watchProfile(otherUid, cb) {
      unsub.push(onValue(ref(db, `users/${otherUid}`), (s) => cb(s.val())));
    },
    leave() {
      unsub.forEach((u) => u());
      remove(meRef);
    },
  };
}
