// Firebase: giriş (Google / isimle misafir) ve gerçek zamanlı veritabanı.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  get,
  getDatabase,
  increment,
  limitToLast,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  runTransaction,
  update,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { firebaseConfig } from './config.js';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export { get, increment, limitToLast, onChildAdded, onChildChanged, onChildRemoved, onDisconnect, onValue, push, query, ref, remove, runTransaction, serverTimestamp, set, update };

/** Sunucu saati farkı: iki cihazda ortak zaman (film/müzik senkronu, gün sayacı). */
let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), (s) => (offset = s.val() || 0));
export const now = () => Date.now() + offset;

// Android uygulamasında Google kendi giriş penceresini uygulama içinde açtırmaz: giriş telefonun tarayıcısında yapılır
// (app-login.html), Google'ın kimlik belgesi uygulamaya döner ve burada aynı hesapla oturum açılır.
function viaApp(link) {
  return new Promise((resolve, reject) => {
    window.__lrGoogle = async (idToken) => {
      window.__lrGoogle = null;
      if (!idToken) return reject(Object.assign(new Error('iptal'), { code: 'auth/popup-closed-by-user' }));
      const cred = GoogleAuthProvider.credential(idToken);
      try { resolve(link ? await linkWithCredential(auth.currentUser, cred) : await signInWithCredential(auth, cred)); } catch (e) { reject(e); }
    };
    window.LoveRoomApp.googleLogin();
  });
}
const inApp = () => !!window.LoveRoomApp?.googleLogin;
export const loginGoogle = () => (inApp() ? viaApp(false) : signInWithPopup(auth, new GoogleAuthProvider()));
export const loginGuest = () => signInAnonymously(auth);
/** İsimle açılmış hesabı Google'a bağlar: kullanıcı kimliği aynı kalır, ev ve tüm veriler yerinde durur. */
export const linkGoogle = () => (inApp() ? viaApp(true) : linkWithPopup(auth.currentUser, new GoogleAuthProvider()));
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
