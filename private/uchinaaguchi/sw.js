/* うちなーぐち辞書：電波が無くても引けるようにする。
   台帳（dict.js）は 3.7MB あるので、初回に取り込んで以後は端末の中から読む。 */
const CACHE = "uchinaaguchi-v1";
const FILES = ["./", "./index.html", "./dict.js", "./mine.json",
               "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) {
        /* 端末の中の写しを先に返し、裏で新しいものを取りに行く */
        fetch(e.request).then(r => {
          if (r && r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(e.request).then(r => {
        if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); }
        return r;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
