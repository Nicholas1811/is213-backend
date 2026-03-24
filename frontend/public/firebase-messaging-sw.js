importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

//Configs hardcoded in firebaseConfig, safe as this one is in public folder.
//Must be wide scoped, controls the whole site, controls index.html.
const firebaseConfig = {
  apiKey:"AIzaSyC6kLjlBmtaKcB8kTBJMIbOl7cBJsQk3U4",
  authDomain:"notification-is213.firebaseapp.com",
  projectId:"notification-is213",
  storageBucket:"notification-is213.firebasestorage.app",
  messagingSenderId:"631863150691",
  appId:"1:631863150691:web:77297afa6f49e8ca1c5056",
  measurementId: "G-YJB60YJVQY"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();


messaging.onBackgroundMessage((payload) => {
  // Do not show browser/system notifications. The app UI (navbar badge/dropdown)
  // is the single notification surface.
  self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage({ type: "FCM_BACKGROUND_MESSAGE", payload });
    }
  });
});
