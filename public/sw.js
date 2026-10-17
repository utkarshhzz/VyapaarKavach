// Vyapaar Kavach — Service Worker v3
// Network-first for JS/CSS/HTML so new Vite builds always load fresh.

const CACHE_NAME = "vyapaar-kavach-v3";
const HERO_CACHE = "vyapaar-hero-frames-v1";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== HERO_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Hero frame images: cache-first for smooth scroll animation
  if (url.pathname.startsWith("/hero/") && url.pathname.endsWith(".jpg")) {
    event.respondWith(
      caches.open(HERO_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((res) => { if (res.ok) cache.put(event.request, res.clone()); return res; });
        })
      )
    );
    return;
  }

  // API calls: network-first with offline stub
  if (url.pathname.startsWith("/api/v1/vyapaar/")) {
    event.respondWith(
      fetch(event.request).then((res) => {
        if (event.request.method === "GET" && res.ok) caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
        return res;
      }).catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return new Response(JSON.stringify({ success: false, offline: true, error: "Offline" }), { status: 503, headers: { "Content-Type": "application/json" } });
      }))
    );
    return;
  }

  // JS / CSS / HTML: ALWAYS network-first so new builds load immediately
  if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname === "/" || url.pathname.endsWith(".html")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(event.request).then((res) => {
      if (res.ok && event.request.method === "GET") caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone()));
      return res;
    }).catch(() => caches.match(event.request))
  );
});

const SYNC_TAG = "vyapaar-dispute-sync";
self.addEventListener("sync", (event) => { if (event.tag === SYNC_TAG) event.waitUntil(syncQueuedIntents()); });

async function syncQueuedIntents() {
  const queue = JSON.parse(localStorage?.getItem("vyapaar_offline_queue") || "[]");
  for (const intent of queue) {
    try { await fetch("/api/v1/vyapaar/disputes/refunds/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(intent) }); }
    catch (e) { console.warn("[VK SW] Sync failed:", intent.idempotency_key); }
  }
}

self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
