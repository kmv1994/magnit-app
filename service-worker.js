// service-worker.js
// Версия кеша — меняется при каждом обновлении файлов
// ВАЖНО: при обновлении index.html нужно изменить эту строку
const CACHE_VERSION = 'magnit-salary-74d14829';
const CACHE_NAME = CACHE_VERSION;

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
    // Сразу активируем новый SW без ожидания закрытия вкладок
    self.skipWaiting();
});

// Активация — чистим ВСЕ старые версии кеша
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('Удаляю старый кеш:', key);
                        return caches.delete(key);
                    })
            );
        }).then(() => {
            // Берём контроль над всеми открытыми вкладками сразу
            return self.clients.claim();
        })
    );
});

// Запросы — сначала сеть, при ошибке берём из кеша (network-first)
// Это гарантирует что всегда загружается свежая версия если есть интернет
self.addEventListener('fetch', (event) => {
    // Пропускаем не-GET запросы и внешние URL
    if (event.request.method !== 'GET') return;
    
    const url = new URL(event.request.url);
    const isLocal = url.origin === self.location.origin;
    
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Кешируем только успешные ответы с нашего сайта
                if (isLocal && networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Нет интернета — берём из кеша
                return caches.match(event.request);
            })
    );
});
