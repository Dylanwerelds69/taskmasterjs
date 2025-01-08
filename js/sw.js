const CACHE_NAME = 'taskmaster-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/components/home.css',
    '/css/components/login.css',
    '/css/components/tasks.css',
    '/js/app.js',
    '/js/api.js',
    '/js/db.js',
    '/js/router.js',
    '/js/components/home.js',
    '/js/components/login.js',
    '/js/components/tasks.js'
];

self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching app shell...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME)
                        .map(cacheName => caches.delete(cacheName))
                );
            })
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // Clone the response as it can only be consumed once
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return a custom offline page or message
                        return new Response('You are offline. Please check your connection.');
                    });
            })
    );
});

// Handle background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-tasks') {
        event.waitUntil(syncTasks());
    }
});

async function syncTasks() {
    try {
        const db = await DB.init();
        const unsynedTasks = await DB.getUnsynedTasks();
        
        for (const task of unsynedTasks) {
            try {
                const response = task.id ? 
                    await fetch(`/api/tasks/${task.id}`, {
                        method: 'PUT',
                        body: JSON.stringify(task)
                    }) :
                    await fetch('/api/tasks', {
                        method: 'POST',
                        body: JSON.stringify(task)
                    });

                if (response.ok) {
                    await DB.markTaskSynced(task.id);
                }
            } catch (error) {
                console.error(`Failed to sync task ${task.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to sync tasks:', error);
    }
}
    