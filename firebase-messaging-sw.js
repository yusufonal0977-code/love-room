// Web bildirimleri için service worker (K24). Bildirimi Firebase Cloud Messaging getirir; sunucu bildirimin başlığını ve
// metnini "webpush.notification" ile gönderdiği için kütüphane kendisi gösterir. Dokununca site açılır.
// Yalnızca bildirimleri açan kullanıcıda kaydedilir; sitenin önbelleğine ya da isteklerine karışmaz.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: 'AIzaSyCrFiwx-bcYCBKXWHYoK0EQvnmxr3teUdU',
  authDomain: 'love-room-aaf7e.firebaseapp.com',
  projectId: 'love-room-aaf7e',
  messagingSenderId: '659700018210',
  appId: '1:659700018210:web:1e79b8013356889665ee7b',
});
firebase.messaging();
