// Vyapaar Kavach — Service Worker (Offline-First PWA)
// Caches core assets and queues failed dispute intents for sync

const CACHE_NAME = "vyapaar-kavach-v1";
const STATIC_ASSETS = [
  "/",
  "/vyapaar/dashboard",
  "/vyapaar/disputes",
  "/vyapaar/claim-parser",
  "/vyapaar/outbox",
  "/vyapaar/zk-fraud",
  "/vyapaar/audit",
];

// Background sync queue for offline dispute intents
const SYNC_TAG = "vyapaar-dispute-sync";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Vyapaar Kavach SW] Pre-caching core routes");
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignore individual failures in dev mode
        console.log("[Vyapaar Kavach SW] Some assets not pre-cacheable (dev mode)");
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => {
          console.log(`[Vyapaar Kavach SW] Clearing old cache: ${k}`);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// Network-first for API calls, Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: Network-first, fallback to cached response if available
  if (url.pathname.startsWith("/api/v1/vyapaar/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses
          if (event.request.method === "GET" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: return cached version if available
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Return offline stub for dashboard stats
            if (url.pathname.includes("/dashboard")) {
              return new Response(
                JSON.stringify({
                  success: true,
                  offline: true,
                  stats: {
                    total_transactions: 0,
                    disputed_count: 0,
                    pending_refunds: 0,
                    total_refunded_paise: 0,
                    conflicted_intents: 0,
                    zk_proofs_generated: 0,
                    risk_score: 0,
                  },
                }),
                { headers: { "Content-Type": "application/json" } }
              );
            }
            return new Response(
              JSON.stringify({ success: false, offline: true, error: "Offline — data not cached" }),
              { status: 503, headers: { "Content-Type": "application/json" } }
            );
          });
        })
    );
    return;
  }

  // Static assets: Cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Background sync for queued dispute intents
self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncQueuedIntents());
  }
});

async function syncQueuedIntents() {
  const queue = JSON.parse(localStorage?.getItem("vyapaar_offline_queue") || "[]");
  console.log(`[Vyapaar Kavach SW] Syncing ${queue.length} queued dispute intents`);

  for (const intent of queue) {
    try {
      await fetch("/api/v1/vyapaar/disputes/refunds/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent),
      });
    } catch (e) {
      console.warn("[Vyapaar Kavach SW] Sync failed for intent:", intent.idempotency_key);
    }
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
