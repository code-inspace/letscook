// Service Worker for Let's Cook PWA
const CACHE_NAME = "letscook-cache-v3";
const STATIC_ASSETS = [
  "/",
  "/groceries",
  "/calendar",
  "/favorites",
  "/search",
  "/profile",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
  "/icon.svg",
];

// Install Event: pre-cache critical app shell routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(STATIC_ASSETS);
      } catch (err) {
        console.warn("SW pre-cache warning:", err);
      }
    })
  );
  self.skipWaiting();
});

// Activate Event: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch Event: handle navigation, assets, and images
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests or chrome-extension URLs
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  const isSameOrigin = url.origin === self.location.origin;
  const isImage =
    request.destination === "image" || /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(url.pathname);

  // Never intercept cross-origin data requests (Supabase REST/Auth, AI APIs…):
  // serving them from cache returned stale recipes, plans and shopping lists.
  if (!isSameOrigin && !isImage) {
    return;
  }

  // Skip Next.js hot reload / dev server websockets & API requests
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/_next/webpack-hmr")) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network-first, fallback to cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match("/");
          return fallback || new Response("Hors connexion", { status: 503, headers: { "Content-Type": "text/plain" } });
        })
    );
    return;
  }

  // 2. Images (recipe photos, ingredient icons): Cache-first, fallback to network
  if (isImage) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Revalidate in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408 });
          });
      })
    );
    return;
  }

  // 3. Static Next.js assets (_next/static, css, js, fonts): Stale-while-revalidate
  if (url.pathname.startsWith("/_next/static/") || url.pathname.match(/\.(js|css|woff2|woff|ttf)$/i)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default: Network with Cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
