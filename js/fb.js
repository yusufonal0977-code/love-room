// Firebase: giriş (Google / isimle misafir) ve gerçek zamanlı veritabanı.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  get,
  getDatabase,
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from './config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export { get, onChildAdded, onDisconnect, onValue, push, ref, remove, serverTimestamp, set, update };

/** Sunucu saati farkı: iki cihazda ortak zaman (film/müzik senkronu, gün sayacı). */
let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), (s) => (offset = s.val() || 0));
export const now = () => Date.now() + offset;

export const loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const loginGuest = () => signInAnonymously(auth);
export const logout = () => signOut(auth);

/** İlk oturum durumunu bekler (oturum tarayıcıda hatırlanır). */
export function firstUser() {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (u) => {
      stop();
      resolve(u);
    });
  });
}
