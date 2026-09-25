// Täglicher Wetterlauf (Schicht-3-Rohdaten) für den Regionen-Überblick.
// Aufruf:  cd werkzeuge && node wetter.js [zieldatei]        (Standard: ../daten/wetter.json)
// Holt für das Grundstock-Gebiet:
//  - Open-Meteo auf einem 0,2°-Raster: 35 Tage zurück + Vorhersage (Regen, ET0, Tmin, Tmax, Bodenfeuchte),
//    ohne Höhenparameter – die App rechnet die Temperatur selbst auf die Zellhöhe um (wie am Pin).
//  - DWD-Stationen über Bright Sky (Suchfelder alle 30 km, je die 14 nächsten mit Daten – wie die App) und
//    interpoliert den Tagesregen auf ein 0,05°-Raster (Gewicht 1/(d²+2), Reichweite 30 km, ≥ 12 Stundenwerte).
// Schreibt nur Rohreihen, keine Faktoren: Modelländerungen wirken damit sofort in der App.
// Exitcode 0 = geschrieben, 3 = Open-Meteo-Limit erschöpft (alte Datei bleibt), 1 = sonstiger Fehler.
"use strict";
const fs = require("fs");
const path = require("path");

const META = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "daten", "grundstock", "meta.json"), "utf8"));
const R = META.raster,
  ZIEL = process.argv[2] || path.join(__dirname, "..", "daten", "wetter.json"),
  OM_SCHRITT = 0.2,
  REGEN_SCHRITT = 0.05,
  REICHWEITE_KM = 30;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const r1 = (x) => (x === null || x === undefined ? null : Math.round(x * 10) / 10);
let omAbrufe = 0,
  bsAbrufe = 0;

// Raster, das das Gebiet vollständig abdeckt (Punkte auf Vielfachen der Schrittweite)
function gitter(schritt, rand) {
  const lat0 = Math.floor((R.latS - rand) / schritt) * schritt,
    lat1 = Math.ceil((R.latN + rand) / schritt) * schritt,
    lng0 = Math.floor((R.lngW - rand) / schritt) * schritt,
    lng1 = Math.ceil((R.lngE + rand) / schritt) * schritt;
  const NY = Math.round((lat1 - lat0) / schritt) + 1,
    NX = Math.round((lng1 - lng0) / schritt) + 1;
  return { latN: +lat1.toFixed(4), lngW: +lng0.toFixed(4), schritt, NY, NX };
}
const kmSchnell = (a, b, c, d) => {
  const x = (d - b) * Math.cos(((a + c) * Math.PI) / 360) * 111.32,
    y = (c - a) * 111.32;
  return Math.sqrt(x * x + y * y);
};
async function pool(aufgaben, breite) {
  let i = 0;
  const erg = new Array(aufgaben.length);
  await Promise.all(
    Array.from({ length: breite }, async () => {
      while (i < aufgaben.length) {
        const k = i++;
        try {
          erg[k] = await aufgaben[k]();
        } catch (e) {
          erg[k] = null;
        }
      }
    }),
  );
  return erg;
}
const isoTag = (d) => d.toISOString().slice(0, 10);

// ---------------- Open-Meteo ----------------
class Limit extends Error {}
async function omAnfrage(punkte) {
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=" +
    punkte.map((p) => p[0].toFixed(2)).join(",") +
    "&longitude=" +
    punkte.map((p) => p[1].toFixed(2)).join(",") +
    "&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration," +
    "precipitation_probability_max&hourly=soil_moisture_0_to_7cm&past_days=35&forecast_days=8" +
    "&timezone=Europe%2FBerlin";
  for (let versuch = 0; versuch < 2; versuch++) {
    const r = await fetch(url);
    const j = await r.json().catch(() => null);
    if (r.ok && j) {
      omAbrufe += punkte.length * (43 / 14); // Zählregel: je Ort, Zeitraum/14 Tage
      return Array.isArray(j) ? j : [j];
    }
    const grund = (j && j.reason) || "HTTP " + r.status;
    if (r.status !== 429 && r.status < 500) throw new Error(grund);
    if (versuch === 0) {
      log(`  Open-Meteo: ${grund} – neuer Versuch in 5 Minuten (geteilte GitHub-Adressen)`);
      await pause(5 * 60 * 1000);
    } else throw new Limit(grund);
  }
}
function omAuswerten(j, jetztStunde) {
  const d = j.daily,
    z = (a) => (a || []).map((x) => (x === null ? 0 : r1(x))),
    P = 36;
  const alle = {
    tw: z(d.precipitation_sum),
    tmax: z(d.temperature_2m_max),
    tmin: z(d.temperature_2m_min),
    et0: z(d.et0_fao_evapotranspiration),
    pp: z(d.precipitation_probability_max),
  };
  let bf = null;
  const hm = j.hourly && j.hourly.soil_moisture_0_to_7cm;
  if (hm) {
    const v = [],
      jetzt = 35 * 24 + jetztStunde;
    for (let q = Math.max(0, jetzt - 24); q <= jetzt && q < hm.length; q++) if (hm[q] !== null) v.push(hm[q]);
    if (v.length) bf = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000;
  }
  return {
    e: typeof j.elevation === "number" ? Math.round(j.elevation) : null,
    tw: alle.tw.slice(0, P),
    et0: alle.et0.slice(0, P),
    tmin: alle.tmin.slice(0, P),
    tmax: alle.tmax.slice(0, P),
    f: { tw: alle.tw.slice(P), et0: alle.et0.slice(P), tmin: alle.tmin.slice(P), tmax: alle.tmax.slice(P), pp: alle.pp.slice(P) },
    bf,
  };
}

// ---------------- Bright Sky: Stationsnetz wie in der App ----------------
const stationsCache = {},
  ohneDaten = {};
async function stationsNetz(lat, lng, radiusKm) {
  bsAbrufe++;
  const r = await fetch(
    `https://api.brightsky.dev/sources?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&max_dist=${Math.round((radiusKm + 20) * 1000)}`,
  );
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.sources) throw new Error("Stationsliste " + r.status);
  const maxSt = Math.max(14, Math.min(60, Math.round(radiusKm / 4)));
  const st = j.sources
    .filter((x) => x.observation_type === "historical" && x.lat && x.lon && !ohneDaten[x.id])
    .sort((a, b) => (a.distance || 0) - (b.distance || 0))
    .slice(0, maxSt * 2);
  const von = new Date(Date.now() - 36 * 864e5);
  const erg = await pool(
    st.map((x) => async () => {
      if (!stationsCache[x.id]) {
        bsAbrufe++;
        const rr = await fetch(
          `https://api.brightsky.dev/weather?source_id=${x.id}&date=${isoTag(von)}&last_date=${isoTag(new Date())}&tz=Europe/Berlin&units=dwd`,
        );
        if (rr.status === 404) {
          ohneDaten[x.id] = true;
          return null;
        }
        const d = await rr.json().catch(() => ({}));
        if (!rr.ok || !d.weather) return null;
        const tage = {};
        d.weather.forEach((h) => {
          const k = h.timestamp.slice(0, 10);
          tage[k] = tage[k] || { p: 0, n: 0 };
          if (h.precipitation !== null) {
            tage[k].p += h.precipitation;
            tage[k].n++;
          }
        });
        stationsCache[x.id] = { id: x.id, name: x.station_name, lat: x.lat, lon: x.lon, tage };
      }
      return stationsCache[x.id];
    }),
    4,
  );
  return erg.filter(Boolean).slice(0, maxSt);
}

(async () => {
  const jetzt = new Date(),
    berlinStunde = +new Intl.DateTimeFormat("de-DE", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }).format(jetzt);

  // 1. Open-Meteo 0,2°
  const OM = gitter(OM_SCHRITT, 0.1),
    omPunkte = [];
  for (let i = 0; i < OM.NY; i++)
    for (let k = 0; k < OM.NX; k++) omPunkte.push([OM.latN - i * OM_SCHRITT, OM.lngW + k * OM_SCHRITT]);
  log(`Open-Meteo: ${omPunkte.length} Punkte (${OM.NY}×${OM.NX}, 0,2°)`);
  const om = [];
  try {
    for (let i = 0; i < omPunkte.length; i += 50) {
      (await omAnfrage(omPunkte.slice(i, i + 50))).forEach((j) => om.push(omAuswerten(j, berlinStunde)));
      if (i + 50 < omPunkte.length) await pause(1500);
    }
  } catch (e) {
    if (e instanceof Limit) {
      log(`Open-Meteo-Limit erschöpft (${e.message}) – letzter Stand bleibt, nichts geschrieben.`);
      log(`Open-Meteo-Abrufe dieses Laufs (geschätzt): ${Math.round(omAbrufe)}`);
      process.exit(3);
    }
    throw e;
  }
  log(`  Open-Meteo-Abrufe (geschätzt nach Zählregel): ${Math.round(omAbrufe)}`);

  // 2. Stationsnetz: Suchfelder alle 30 km über Gebiet + Reichweite
  const rand = REICHWEITE_KM / 111.32,
    dLat = 30 / 111.32,
    dLng = 30 / (111.32 * Math.cos(((R.latS + R.latN) / 2) * (Math.PI / 180))),
    felder = [];
  for (let la = R.latS - rand + dLat / 2; la < R.latN + rand; la += dLat)
    for (let lo = R.lngW - rand * 1.5 + dLng / 2; lo < R.lngE + rand * 1.5; lo += dLng) felder.push([la, lo]);
  log(`Bright Sky: ${felder.length} Suchfelder …`);
  const netz = [],
    ids = {};
  for (const [la, lo] of felder) {
    try {
      (await stationsNetz(la, lo, 20)).forEach((x) => {
        const k = x.lat + "," + x.lon;
        if (!ids[k]) {
          ids[k] = true;
          netz.push(x);
        }
      });
    } catch (e) {
      log("  Suchfeld", la.toFixed(2), lo.toFixed(2), e.message);
    }
  }
  log(`  ${netz.length} Stationen mit Daten, ${Object.keys(ohneDaten).length} ohne Daten übersprungen`);

  // 3. Stationsregen auf 0,05° interpolieren (Tage 1–35 zurück; heute bleibt Modell wie in der App)
  const RG = gitter(REGEN_SCHRITT, 0),
    h0 = new Date(jetzt);
  h0.setHours(12, 0, 0, 0);
  const tage = [];
  for (let t = 1; t <= 35; t++) tage.push(isoTag(new Date(h0.getTime() - t * 864e5)));
  const regen = [];
  let mitWert = 0;
  for (let i = 0; i < RG.NY; i++)
    for (let k = 0; k < RG.NX; k++) {
      const lat = RG.latN - i * REGEN_SCHRITT,
        lng = RG.lngW + k * REGEN_SCHRITT,
        gew = [];
      netz.forEach((x, q) => {
        const d = kmSchnell(lat, lng, x.lat, x.lon);
        if (d <= REICHWEITE_KM) gew.push([q, 1 / (d * d + 2)]);
      });
      regen.push(
        tage.map((datum) => {
          let sw = 0,
            sv = 0;
          for (const [q, w] of gew) {
            const t = netz[q].tage[datum];
            if (!t || t.n < 12) continue;
            sw += w;
            sv += w * t.p;
          }
          if (!sw) return -1; // keine Station in Reichweite → App nimmt Modellregen
          mitWert++;
          return Math.round((sv / sw) * 10); // Zehntel mm
        }),
      );
    }
  log(`Stationsregen: ${RG.NY}×${RG.NX} Punkte à 0,05°, ${((100 * mitWert) / (regen.length * tage.length)).toFixed(1)} % mit Messwert`);

  const aus = {
    version: 1,
    stand: jetzt.toISOString(),
    gebiet: { latN: R.latN, latS: R.latS, lngW: R.lngW, lngE: R.lngE },
    om: { ...OM, hinweis: "je Punkt: e Modellhöhe, tw/et0/tmin/tmax 36 Tage (letzter = heute), f Vorhersage, bf Bodenfeuchte" },
    regen: { ...RG, tage, einheit: "0,1 mm, -1 = keine Station in 30 km", reichweite_km: REICHWEITE_KM },
    omDaten: om,
    regenDaten: regen,
    stationen: netz.length,
    abrufe: { openMeteo: Math.round(omAbrufe), brightSky: bsAbrufe },
    quellen: "Open-Meteo (CC BY 4.0), Deutscher Wetterdienst über Bright Sky",
  };
  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, JSON.stringify(aus));
  log(`geschrieben: ${ZIEL} (${(fs.statSync(ZIEL).size / 1024).toFixed(0)} kB) · Open-Meteo ≈ ${Math.round(omAbrufe)}, Bright Sky ${bsAbrufe}`);
})().catch((e) => {
  console.error("FEHLER:", e.message);
  process.exit(1);
});
