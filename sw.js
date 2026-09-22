/* Kona 64 kWh – Service Worker
   Strategie: App-Shell im Cache (offline nutzbar), Navigation "network-first"
   damit Updates ankommen, statische Dateien "cache-first".
   Cross-Origin (z. B. api.anthropic.com) und Nicht-GET werden nie angefasst. */
const CACHE = "kona64-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       // POST etc. durchlassen
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // fremde Hosts (API) nicht cachen

  if (req.mode === "navigate") {                           // Seiten: erst Netz, dann Cache
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(                                           // statische Dateien: erst Cache
    caches.match(req).then((cached) =>
      cached ||
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
