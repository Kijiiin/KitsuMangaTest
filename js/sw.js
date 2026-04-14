const CACHE_NAME = "kitsu-cache-v1";

const urlsToCache = [
  "./",
  "./index.html",
  '/pages/manga-detail.html',
  '/pages/external-reader.html',
  '/data/manga.json',
  '/data/external.json'
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
    .then(cache => {
      // Usa cache.addAll() solo se tutti i file esistono
        return cache.addAll(urlsToCache).catch(err => {
          console.log('Cache addAll failed:', err);
          // Prova a fare cache uno per uno
          return Promise.allSettled(
            urlsToCache.map(url => cache.add(url).catch(e => console.log('Failed:', url)))
          );
          });
        })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});