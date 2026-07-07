// キャッシュファーストのService Worker。更新時は CACHE のバージョンを上げる
const CACHE = "manabi-quest-v1.1.0";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/math-gen.js",
  "./js/battle.js",
  "./js/capture.js",
  "./js/streak.js",
  "./js/state.js",
  "./data/monsters.js",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-180.png",
  "./assets/mon-akitan.png",
  "./assets/mon-bondenkun.png",
  "./assets/mon-chochinmaru.png",
  "./assets/mon-chokaigan.png",
  "./assets/mon-fubukimaru.png",
  "./assets/mon-hatahatan.png",
  "./assets/mon-iburin.png",
  "./assets/mon-inaniwan.png",
  "./assets/mon-kiritanpon.png",
  "./assets/mon-kokeshimaru.png",
  "./assets/mon-namahagen.png",
  "./assets/mon-nebutaro.png",
  "./assets/mon-ringoro.png",
  "./assets/mon-sakuranbou.png",
  "./assets/mon-shirakamin.png",
  "./assets/mon-tazukohime.png",
  "./assets/mon-yakisoban.png",
  "./assets/mon-yukibo.png",
  "./assets/mon-yukiusa.png",
  "./assets/mon-zundamaru.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches
      .match(e.request, { ignoreSearch: true })
      .then((hit) => hit || fetch(e.request)),
  );
});
