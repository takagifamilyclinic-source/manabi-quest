// キャッシュファーストのService Worker。更新時は CACHE のバージョンを上げる
const CACHE = "manabi-quest-v1.7.1";
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
  "./js/kanji-quiz.js",
  "./js/quiz-util.js",
  "./js/english-quiz.js",
  "./js/session.js",
  "./js/weakness.js",
  "./js/progress-calc.js",
  "./js/badges.js",
  "./data/monsters.js",
  "./data/kanji/g1.js",
  "./data/kanji/g2.js",
  "./data/kanji/g3.js",
  "./data/kanji/g4.js",
  "./data/english/g1.js",
  "./data/english/g2.js",
  "./data/english/g3.js",
  "./data/english/g4.js",
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
  "./assets/evo-akitan.png",
  "./assets/evo-bondenkun.png",
  "./assets/evo-chochinmaru.png",
  "./assets/evo-chokaigan.png",
  "./assets/evo-fubukimaru.png",
  "./assets/evo-hatahatan.png",
  "./assets/evo-iburin.png",
  "./assets/evo-inaniwan.png",
  "./assets/evo-kiritanpon.png",
  "./assets/evo-kokeshimaru.png",
  "./assets/evo-namahagen.png",
  "./assets/evo-nebutaro.png",
  "./assets/evo-ringoro.png",
  "./assets/evo-sakuranbou.png",
  "./assets/evo-shirakamin.png",
  "./assets/evo-tazukohime.png",
  "./assets/evo-yakisoban.png",
  "./assets/evo-yukibo.png",
  "./assets/evo-yukiusa.png",
  "./assets/evo-zundamaru.png",
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
