// Service Worker der Schwammerl-Karte: App offline verfügbar.
// - App (index.html): Netz zuerst (neue Version kommt sofort an), ohne Netz aus dem Speicher.
// - Leaflet (cdnjs): Speicher zuerst.
// - Kartenkacheln (OpenStreetMap/OpenTopoMap): angesehene Kacheln aus dem Speicher, höchstens KACHEL_MAX.
// - Grundstock und wetter.json verwaltet die App selbst (Cache API „schwammerl-daten-v1“) – hier nicht angefasst.
var APP = "schwammerl-app-v1",
  KACHELN = "schwammerl-kacheln-v1",
  KACHEL_MAX = 3000,
  LEAFLET = [
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css",
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js",
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  ];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches
      .open(APP)
      .then(function (c) {
        return c.addAll(["./"].concat(LEAFLET));
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (ks) {
        return Promise.all(
          ks
            .filter(function (k) {
              return /^schwammerl-(app|kacheln)-/.test(k) && k !== APP && k !== KACHELN;
            })
            .map(function (k) {
              return caches.delete(k);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

function netzZuerst(req, schluessel) {
  return fetch(req)
    .then(function (r) {
      if (r.ok) {
        var k = r.clone();
        caches.open(APP).then(function (c) {
          c.put(schluessel, k);
        });
      }
      return r;
    })
    .catch(function () {
      return caches.match(schluessel, { ignoreSearch: true }).then(function (t) {
        return t || Response.error();
      });
    });
}

var neu = 0; // neue Kacheln seit Start; aufgeräumt wird nur alle 100
function speicherZuerst(req, name, max) {
  return caches.open(name).then(function (c) {
    return c.match(req).then(function (t) {
      if (t) return t;
      return fetch(req).then(function (r) {
        if (r.ok || r.type === "opaque") {
          c.put(req, r.clone());
          if (max && ++neu % 100 === 0)
            c.keys().then(function (ks) {
              // älteste Kacheln zuerst entfernen
              for (var i = 0; i < ks.length - max; i++) c.delete(ks[i]);
            });
        }
        return r;
      });
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var u = new URL(req.url);
  if (u.origin === self.location.origin) {
    // App-Seite (auch mit ?…): Netz zuerst; Grundstock-Dateien regelt die App selbst
    if (req.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname))
      e.respondWith(netzZuerst(req, new URL("./", self.location).href));
    return;
  }
  if (u.hostname === "cdnjs.cloudflare.com" && u.pathname.indexOf("/leaflet/") >= 0) {
    e.respondWith(speicherZuerst(req, APP, 0));
    return;
  }
  if (/(^|\.)tile\.(openstreetmap|opentopomap)\.org$/.test(u.hostname)) {
    e.respondWith(speicherZuerst(req, KACHELN, KACHEL_MAX));
  }
});
