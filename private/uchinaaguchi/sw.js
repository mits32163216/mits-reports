/* うちなーぐち辞書：電波が無くても引けるようにする。
   画面（html・js）は毎回まず取りに行き、取れない時だけ端末の中の写しを出す。
   こうしないと、ホーム画面のアプリが古い画面のまま止まる（2026-09-16 iPhone で発生）。
   台帳（dict.js）は 3.7MB あるので、端末の中の写しを先に出し、裏で新しいものを取る。 */
const CACHE = "uchinaaguchi-v7";
const FILES = ["./", "./index.html", "./translate.html", "./phrases.html", "./rireki.html", "./hist.js", "./phrases.js", "./dict.js", "./mine.json",
               "./manifest.json", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f, {cache: "reload"})).then(r => { if (r.ok) return c.put(f, r); }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
const put = (req, r) => { if (r && r.ok) { const cl = r.clone(); caches.open(CACHE).then(c => c.put(req, cl)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const big = /\/dict\.js$/.test(new URL(req.url).pathname);
  if (!big) {
    /* 画面：まず取りに行く（HTTPの控えも使わない）。取れなければ写し */
    e.respondWith(
      fetch(req, {cache: "no-cache"}).then(r => put(req, r))
        .catch(() => caches.match(req, {ignoreSearch: true}).then(h => h || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(hit => {
      const net = fetch(req, {cache: "no-cache"}).then(r => put(req, r));
      if (hit) { net.catch(() => {}); return hit; }
      return net;
    })
  );
});
