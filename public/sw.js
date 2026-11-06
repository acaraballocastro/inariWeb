// Service worker of the installed app: shows the push notifications of the
// API, opens the right screen when one is tapped and, without connection,
// shows an offline page instead of the browser's error. The data always
// comes from the API: nothing else is cached.

const offlineCache = "inari-offline-v1";
const offlinePage = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(offlineCache).then((cache) => cache.addAll([offlinePage, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== offlineCache).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Pages are always loaded from the network; only when it fails, the offline page.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(offlinePage)));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "INARI", body: event.data.text() };
  }
  event.waitUntil(Promise.all([
    self.registration.showNotification(data.title || "INARI", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.id, // the same notification is never shown twice
      data: { url: data.url || "/notifications" },
    }),
    // The open pages refresh their unread count (bell, tab bar, app badge).
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => windows.forEach((client) => client.postMessage({ type: "push", id: data.id }))),
  ]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
