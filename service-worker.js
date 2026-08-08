// 4D'S World - Service Worker for PWA & Push Notifications
// IMPORTANT: HTML documents (login page, admin page) are NEVER cached.
// Only static assets (CSS/JS) are cached for offline support.

const CACHE_NAME = '4ds-world-static-v3';
const OFFLINE_PAGE = '/index.html';

// Only static assets are pre-cached. The login/admin HTML pages are intentionally
// excluded so they always load the latest version from the server.
const urlsToCache = [
    '/css/style.css',
    '/css/responsive.css',
    '/js/app.js',
    '/js/products.js',
    '/js/admin.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(urlsToCache).catch(err => {
                console.log('Some assets could not be cached:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API calls: always network, NEVER cached
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => response)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'Offline - API unavailable' }),
                        { status: 503, headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }

    // HTML documents (login page, admin page, all pages):
    // network-first, NEVER cached. This ensures the login page always loads fresh
    // so the "Access Dashboard" button always works with the latest code.
    if (request.destination === 'document' || request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => response)
                .catch(() => {
                    // Login/admin requires internet. Fall back to offline page for other pages.
                    if (url.pathname.includes('admin')) {
                        return new Response(
                            'Admin dashboard is unavailable offline. Please connect to the internet to log in.',
                            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                        );
                    }
                    return caches.match(OFFLINE_PAGE);
                })
        );
        return;
    }

    // Static assets (CSS, JS, images): network-first with cache fallback
    event.respondWith(
        fetch(request)
            .then(response => {
                // Don't cache non-successful responses
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Cache a clone of the successful asset
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then(cache => cache.put(request, responseToCache))
                    .catch(err => console.log('Cache error:', err));

                return response;
            })
            .catch(() => {
                // If offline, serve from cache
                return caches.match(request).then(cached => {
                    return cached || new Response('Offline', { status: 503 });
                });
            })
    );
});

// Push notification event - handle incoming push from backend
self.addEventListener('push', event => {
    console.log('Push notification received:', event);

    let title = '4D\'S World Admin';
    let options = {
        body: 'New notification',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23d4a853" width="192" height="192"/><text x="96" y="132" font-size="90" font-weight="bold" text-anchor="middle" fill="%230a0a0a" font-family="Arial">4D</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23d4a853" width="96" height="96"/><text x="48" y="66" font-size="45" font-weight="bold" text-anchor="middle" fill="%230a0a0a" font-family="Arial">4D</text></svg>',
        tag: 'admin-notification',
        requireInteraction: true,
        vibrate: [100, 50, 100],
        actions: [
            {
                action: 'open',
                title: 'Open Dashboard'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    if (event.data) {
        try {
            const data = event.data.json();
            title = data.title || title;
            options.body = data.body || options.body;
            options.tag = data.tag || options.tag;
            if (data.image) {
                options.image = data.image;
            }
        } catch (err) {
            options.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event);
    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if admin dashboard is already open
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url.includes('/admin') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise, open admin dashboard
                if (clients.openWindow) {
                    return clients.openWindow('/admin-portal');
                }
            })
    );
});

// Notification close event (optional)
self.addEventListener('notificationclose', event => {
    console.log('Notification closed:', event);
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Handle messages from clients
self.addEventListener('message', event => {
    console.log('Message received in SW:', event.data);

    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('Service Worker loaded (pages never cached; static assets cached for offline)');
</content>

