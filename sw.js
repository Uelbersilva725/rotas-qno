// Service Worker do Rotas QNO — cache básico pra funcionar offline
const CACHE_NAME = 'rotas-qno-v1';
const APP_SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((e) => console.warn('[SW] Falha ao cachear app shell:', e))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Tiles do mapa (OpenStreetMap) — cache-first com atualização em segundo plano.
  // Assim, áreas do mapa já visitadas continuam aparecendo mesmo sem internet.
  if (url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const buscarEAtualizar = fetch(event.request)
            .then((resp) => { cache.put(event.request, resp.clone()); return resp; })
            .catch(() => cached);
          return cached || buscarEAtualizar;
        })
      )
    );
    return;
  }

  // Navegação principal (abrir o app) — cache-first, garante que o app abre mesmo offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Demais requisições (Firestore, OSRM, Nominatim, Cloudinary) — deixa passar direto.
  // O Firestore já tem seu próprio cache offline via enableIndexedDbPersistence.
});
