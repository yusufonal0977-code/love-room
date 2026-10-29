// Get Love Room ayarları. Buradaki değerler tarayıcıda çalıştığı için gizli değildir:
// Firebase'in güvenliği database.rules.json'da; TURN ve Spotify bilgileri istemci kullanımı için tasarlanmıştır.
export const firebaseConfig = {
  apiKey: 'AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU',
  authDomain: 'love-room-aaf7e.firebaseapp.com',
  databaseURL: 'https://love-room-aaf7e-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'love-room-aaf7e',
  storageBucket: 'love-room-aaf7e.firebasestorage.app',
  messagingSenderId: '659700018210',
  appId: '1:659700018210:web:1e79b8013356889665ee7b',
};

/** Davet linklerinin ve Spotify dönüşünün kökü: sayfanın kendi adresi. */
export const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');

/**
 * Sesli/görüntülü sohbet bağlantı sunucuları. STUN çoğu ağda yeter; mobil veri ve bazı modemlerde
 * bağlantı TURN (Metered) aracılığıyla kurulur. Kimlik kötüye kullanılırsa Metered panelinden yenileyin.
 */
const TURN_USER = '4b5cf311071b31223d690a59';
const TURN_PASS = 'OuOrxAMoHHCvKFeT';
export const ICE_SERVERS = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun.relay.metered.ca:80'] },
  {
    urls: [
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:80?transport=tcp',
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443?transport=tcp',
    ],
    username: TURN_USER,
    credential: TURN_PASS,
  },
];

/** Spotify geliştirici uygulaması (PKCE, gizli anahtar gerekmez). */
export const SPOTIFY_CLIENT_ID = '925064e861c146678848c22db62e859a';
