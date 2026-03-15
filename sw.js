const VERSION = "moss-offline-v1";
const CORE_CACHE = `moss-core-${VERSION}`;
const RUNTIME_CACHE = `moss-runtime-${VERSION}`;

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/atlas.js",
  "/collect.html",
  "/collect.css",
  "/collect.js",
  "/kid-collect.html",
  "/kid-collect.css",
  "/kid-collect.js",
  "/content/bernal-heights-atlas.json",
  "/register-offline.js",
];

const RUNTIME_ASSETS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![CORE_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "warm-cache") {
    const additionalUrls = Array.isArray(event.data.additionalUrls) ? event.data.additionalUrls : [];
    event.waitUntil(warmCache(additionalUrls));
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (url.origin === self.location.origin || isRuntimeOrigin(url)) {
    event.respondWith(cacheFirst(event.request));
  }
});

async function handleNavigation(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CORE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    return (await caches.match("/collect.html")) || (await caches.match("/index.html"));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      const cache = await caches.open(selectCache(request.url));
      cache.put(request, response.clone());
    }
    return response;
  } catch (_error) {
    return cached || Response.error();
  }
}

function selectCache(url) {
  return url.startsWith(self.location.origin) ? CORE_CACHE : RUNTIME_CACHE;
}

function isRuntimeOrigin(url) {
  return [
    "unpkg.com",
    "tile.openstreetmap.org",
    "static.inaturalist.org",
    "inaturalist-open-data.s3.amazonaws.com",
  ].includes(url.hostname);
}

async function warmCache(additionalUrls) {
  const atlasPhotoUrls = await loadAtlasPhotoUrls();
  const targets = [...RUNTIME_ASSETS, ...atlasPhotoUrls, ...additionalUrls];
  const cache = await caches.open(RUNTIME_CACHE);

  await Promise.all(targets.map((url) => fetchAndCache(cache, url)));
  await notifyClients({
    type: "offline-ready",
    cached: targets.length,
  });
}

async function loadAtlasPhotoUrls() {
  try {
    const response = await fetch("/content/bernal-heights-atlas.json");
    if (!response.ok) {
      return [];
    }
    const atlas = await response.json();
    return (atlas.stops || [])
      .flatMap((stop) => stop.inat_recent_photos || [])
      .map((photo) => photo.photo_url)
      .filter(Boolean);
  } catch (_error) {
    return [];
  }
}

async function fetchAndCache(cache, url) {
  try {
    const target = new URL(url, self.location.origin);
    const request =
      target.origin === self.location.origin
        ? new Request(target.href)
        : new Request(target.href, { mode: "no-cors", credentials: "omit" });

    const response = await fetch(request);
    if (!response || (!response.ok && response.type !== "opaque")) {
      return;
    }
    await cache.put(request, response.clone());
  } catch (_error) {
    // Best effort. Offline prep should not fail hard on one missing asset.
  }
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of clients) {
    client.postMessage(message);
  }
}
