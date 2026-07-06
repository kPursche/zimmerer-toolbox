// Service Worker der Zimmerer-Toolbox (PROJ-7)
// Strategie:
//   * Rechner-Seiten werden beim Install vorgecacht → funktionieren offline
//   * Navigation: Netz zuerst, bei Ausfall Cache (Baustelle ohne Empfang)
//   * Gehashte Next-Assets (/_next/static): Cache zuerst (immutable)
//   * /api/ wird NIE gecacht (KI, Community, Feedback brauchen Netz)
// Bei Änderungen an der Cache-Logik VERSION hochzählen — alte Caches
// werden beim Activate aufgeräumt.

const VERSION = "v1";
const CACHE = `zimmerer-toolbox-${VERSION}`;

// Implementierte Tools (Slugs aus src/lib/tools.ts) + Dashboard
const PRECACHE = [
  "/",
  "/tools/gauenwangen",
  "/tools/latteneinteilung",
  "/tools/boden-deckelschalung",
  "/tools/dachausmittlung",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Antwort cachen (nur vollständige 200er — keine Fehlerseiten einfrieren)
function putInCache(request, response) {
  if (response && response.status === 200 && response.type === "basic") {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // nie cachen

  // Seiten-Navigation: Netz zuerst, sonst Cache, sonst Dashboard
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => putInCache(req, res))
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match("/"))
        )
    );
    return;
  }

  // Gehashte Assets + Bilder/Fonts/PDFs: Cache zuerst
  if (
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|woff2?|pdf)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) => hit || fetch(req).then((res) => putInCache(req, res))
      )
    );
    return;
  }

  // Rest (z. B. RSC-Payloads): stale-while-revalidate
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => putInCache(req, res))
        .catch(() => hit);
      return hit || net;
    })
  );
});
