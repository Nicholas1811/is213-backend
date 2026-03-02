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

  const { title, body } = payload.notification || {};

  self.registration.showNotification(title || "Notification", {
    body: body || "",
    icon: "/icon.png",
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === "/" && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow("/");
        }
      })
  );
});

