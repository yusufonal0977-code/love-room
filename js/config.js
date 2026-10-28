// Firebase ayarları (love-room-aaf7e). Bu değerler gizli değildir; güvenliği database.rules.json sağlar.
export const firebaseConfig = {
  apiKey: 'AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU',
  authDomain: 'love-room-aaf7e.firebaseapp.com',
  databaseURL: 'https://love-room-aaf7e-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'love-room-aaf7e',
  storageBucket: 'love-room-aaf7e.firebasestorage.app',
  messagingSenderId: '659700018210',
  appId: '1:659700018210:web:1e79b8013356889665ee7b',
};

/** Davet linklerinin kökü: sayfanın kendi adresi (GitHub Pages ya da yerel). */
export const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');

/** Sesli/görüntülü sohbet için bağlantı sunucuları (STUN + ücretsiz açık TURN yedeği). */
export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443', 'turn:openrelay.metered.ca:443?transport=tcp'], username: 'openrelayproject', credential: 'openrelayproject' },
];
