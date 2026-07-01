// service-worker.js
// Простой service worker — кеширует приложение для офлайн-работы

const CACHE_NAME = 'magnit-salary-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Установка — кешируем основные файлы
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Активация — чистим старые версии кеша
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Запросы — сначала кеш, потом сеть (для офлайн-работы)
self.addEventListener('fetch', (event) => {
    // Не кешируем внешние CDN-скрипты по сложной логике —
    // просто пробуем сеть, при неудаче берём из кеша
    event.respondWith(
        caches.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Кешируем успешные ответы того же origin
                if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
