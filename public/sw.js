const SHELL = "tokioto-shell-v1";
const AUDIO = "tokioto-audio-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(["/", "/login", "/manifest.json"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== AUDIO).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/tracks/") && url.pathname.endsWith("/stream")) return;
  if (url.pathname.startsWith("/api/")) return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(resp => {
        if (resp.ok) caches.open(SHELL).then(c => c.put(event.request, resp.clone()));
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
