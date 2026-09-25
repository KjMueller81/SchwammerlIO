// Grundstock für den Regionen-Überblick: Schicht 1 (Grundlage) für München ±100 km auf einem 150-m-Raster.
// Aufruf:  cd werkzeuge && npm install && node grundstock.js
// Ergebnis: daten/grundstock/grundlage.png (R Baumart, G Boden, B Hangrichtung), hoehe.png (R Höhe in 12-m-Stufen,
//           G Kronendichte in 5-%-Stufen, B frei), meta.json (Raster, Stand, Codes, Quellen, Lizenzen, Statistik).
//           Die Stufen reichen für den Überblick (12 m ≈ 0,08 °C) und halten die Datei klein.
// Neu rechnen, wenn sich eine Quelle ändert (neue Baumartenkarte, ÜBK25-Stand, Kronendichte-Jahrgang) oder die
// Codes/Klassen im Modell sich ändern – siehe CLAUDE.md, Abschnitt „Grundstock“.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PNG } = require("pngjs");
const { ladeApp } = require("./app");

const APP = ladeApp(["BAUM_FARBEN", "naechsteFarbe", "bodenDeuten", "lageAusHoehen", "EBENEN"]);
const MITTE = [48.1372, 11.5756], // München, wie MUC in der App
  RADIUS_M = 100000,
  ZELLE_M = 150;
const dLat = ZELLE_M / 111320,
  dLng = ZELLE_M / (111320 * Math.cos((MITTE[0] * Math.PI) / 180)),
  NY = Math.round((2 * RADIUS_M) / ZELLE_M),
  NX = Math.round((2 * RADIUS_M) / ZELLE_M),
  latN = MITTE[0] + (NY / 2) * dLat,
  latS = MITTE[0] - (NY / 2) * dLat,
  lngW = MITTE[1] - (NX / 2) * dLng,
  lngE = MITTE[1] + (NX / 2) * dLng,
  N = NX * NY;
const BODEN_CODE = { sauer: 1, neutral: 2, kalk: 3, moor: 4 },
  LAGE_CODE = { eben: 0, nord: 1, sued: 2, ost: 3, west: 4 };
const ZIEL = path.join(__dirname, "..", "daten", "grundstock"),
  CACHE = path.join(__dirname, ".cache");
fs.mkdirSync(ZIEL, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

const ebene = (rolle) => APP.EBENEN.find((e) => e.rolle === rolle);
const BODEN_URL = ebene("boden").url,
  BODEN_LAYER = ebene("boden").layers,
  BAUM_URL = ebene("baum").url,
  BAUM_LAYER = "geonode:Dominant_Species_Class",
  TCD_URL = "https://image.discomap.eea.europa.eu/arcgis/rest/services/GioLandPublic/HRL_TreeCoverDensity_2018/ImageServer",
  TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/";

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Abruf mit Wiederholung und Plattencache (erneute Läufe laden nichts doppelt)
async function hole(url, { text = false } = {}) {
  const f = path.join(CACHE, crypto.createHash("sha1").update(url).digest("hex") + (text ? ".txt" : ".bin"));
  if (fs.existsSync(f)) return text ? fs.readFileSync(f, "utf8") : fs.readFileSync(f);
  for (let v = 0; v < 4; v++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(f, buf);
      return text ? buf.toString("utf8") : buf;
    } catch (e) {
      if (v === 3) throw new Error(e.message + " bei " + url.slice(0, 120));
      await pause(2000 * (v + 1));
    }
  }
}
async function pool(aufgaben, breite) {
  let i = 0;
  const erg = new Array(aufgaben.length);
  await Promise.all(
    Array.from({ length: breite }, async () => {
      while (i < aufgaben.length) {
        const k = i++;
        erg[k] = await aufgaben[k]();
      }
    }),
  );
  return erg;
}
function wms(url, layer, b, w, h) {
  return (
    url +
    "SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:4326&STYLES=&LAYERS=" +
    encodeURIComponent(layer) +
    "&WIDTH=" +
    w +
    "&HEIGHT=" +
    h +
    "&BBOX=" +
    [b.w, b.s, b.e, b.n].join(",")
  );
}
// Feinraster (Faktor f je Zelle) in Kacheln ≤ max Pixel zerlegen; ruft je Kachel verarbeite(x0, y0, w, h, bounds)
async function kacheln(f, max, verarbeite, breite = 2) {
  const W = NX * f,
    H = NY * f,
    tx = Math.ceil(W / max),
    ty = Math.ceil(H / max),
    jobs = [];
  for (let a = 0; a < ty; a++)
    for (let c = 0; c < tx; c++) {
      const x0 = Math.floor((c * W) / tx),
        x1 = Math.floor(((c + 1) * W) / tx),
        y0 = Math.floor((a * H) / ty),
        y1 = Math.floor(((a + 1) * H) / ty);
      const b = {
        w: lngW + (x0 / W) * (lngE - lngW),
        e: lngW + (x1 / W) * (lngE - lngW),
        n: latN - (y0 / H) * (latN - latS),
        s: latN - (y1 / H) * (latN - latS),
      };
      jobs.push(async () => {
        await verarbeite(x0, y0, x1 - x0, y1 - y0, b);
        log("  Kachel", jobs.length ? "" : "", `${a * tx + c + 1}/${tx * ty}`);
      });
    }
  await pool(jobs, breite);
}

(async () => {
  log(`Raster ${NX}×${NY} à ${ZELLE_M} m, ${latS.toFixed(4)}–${latN.toFixed(4)} N, ${lngW.toFixed(4)}–${lngE.toFixed(4)} E`);
  const zellLat = (i) => latN - (i + 0.5) * dLat,
    zellLng = (j) => lngW + (j + 0.5) * dLng;

  // ---- 1. Baumart: Thünen bei 50 m (3×3 je Zelle), Wald ab 4 von 9 Teilpunkten, Art = häufigste ----
  log("Baumarten (Thünen) …");
  const K = APP.BAUM_FARBEN.length,
    zaehl = new Uint8Array(N * (K + 1)),
    farbCache = new Map();
  await kacheln(3, 2000, async (x0, y0, w, h, b) => {
    const png = PNG.sync.read(await hole(wms(BAUM_URL, BAUM_LAYER, b, w, h)));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (png.data[o + 3] < 128) continue;
        const key = (png.data[o] << 16) | (png.data[o + 1] << 8) | png.data[o + 2];
        let k = farbCache.get(key);
        if (k === undefined) {
          k = APP.BAUM_FARBEN.indexOf(APP.naechsteFarbe(png.data[o], png.data[o + 1], png.data[o + 2]));
          farbCache.set(key, k);
        }
        const q = Math.floor((y0 + y) / 3) * NX + Math.floor((x0 + x) / 3);
        zaehl[q * (K + 1) + K]++;
        if (k >= 0) zaehl[q * (K + 1) + k]++;
      }
  });
  const BAUM = new Uint8Array(N);
  let wald = 0;
  for (let q = 0; q < N; q++) {
    if (zaehl[q * (K + 1) + K] < 4) continue;
    let best = -1;
    for (let k = 0; k < K; k++) if (best < 0 || zaehl[q * (K + 1) + k] > zaehl[q * (K + 1) + best]) best = k;
    BAUM[q] = best + 1;
    wald++;
  }
  log(`  Wald: ${wald} Zellen (${((100 * wald) / N).toFixed(1)} %)`);

  // ---- 2. Boden: LfU bei 30 m (5×5 je Zelle, ScaleHint!), Zellmitte, Farben über GetFeatureInfo deuten ----
  log("Boden (LfU ÜBK25) …");
  const FARBE = new Int32Array(N).fill(-1);
  await kacheln(5, 2000, async (x0, y0, w, h, b) => {
    const png = PNG.sync.read(await hole(wms(BODEN_URL, BODEN_LAYER, b, w, h)));
    // Zellmitte = Teilpixel 2 von 5; Kacheln beginnen nicht immer auf einem Vielfachen von 5
    for (let y = (((2 - y0) % 5) + 5) % 5; y < h; y += 5)
      for (let x = (((2 - x0) % 5) + 5) % 5; x < w; x += 5) {
        const gy = y0 + y,
          gx = x0 + x;
        const o = (y * w + x) * 4;
        if (png.data[o + 3] < 128) continue;
        FARBE[Math.floor(gy / 5) * NX + Math.floor(gx / 5)] = (png.data[o] << 16) | (png.data[o + 1] << 8) | png.data[o + 2];
      }
  });
  // Farben auf Waldzellen zählen, häufige an bis zu drei Stellen abfragen
  const farben = new Map();
  for (let q = 0; q < N; q++) {
    if (!BAUM[q] || FARBE[q] < 0) continue;
    const e = farben.get(FARBE[q]) || { n: 0, stellen: [] };
    e.n++;
    if (e.stellen.length < 50) e.stellen.push(q);
    farben.set(FARBE[q], e);
  }
  const haeufig = [...farben.entries()].filter(([, e]) => e.n >= 25);
  log(`  ${farben.size} Farben auf Waldzellen, ${haeufig.length} häufige werden abgefragt`);
  const legende = new Map();
  let abfragen = 0;
  await pool(
    haeufig.map(([rgb, e]) => async () => {
      const proben = [e.stellen[0], e.stellen[Math.floor(e.stellen.length / 2)], e.stellen[e.stellen.length - 1]];
      const stimmen = {};
      for (const q of proben) {
        const lat = zellLat(Math.floor(q / NX)),
          lng = zellLng(q % NX),
          d = 0.0015;
        const u =
          BODEN_URL +
          "SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&SRS=EPSG:4326&LAYERS=" +
          BODEN_LAYER +
          "&QUERY_LAYERS=" +
          BODEN_LAYER +
          "&STYLES=&BBOX=" +
          [lng - d, lat - d, lng + d, lat + d].join(",") +
          "&WIDTH=101&HEIGHT=101&X=50&Y=50&INFO_FORMAT=text/plain&FEATURE_COUNT=1";
        abfragen++;
        const bd = APP.bodenDeuten(await hole(u, { text: true }));
        if (bd) stimmen[bd.wert] = (stimmen[bd.wert] || 0) + 1;
      }
      const best = Object.keys(stimmen).sort((a, b) => stimmen[b] - stimmen[a])[0];
      if (best) legende.set(rgb, BODEN_CODE[best]);
    }),
    6,
  );
  log(`  Legende: ${legende.size} Farben gedeutet (${abfragen} Punktabfragen)`);
  const bekannt = [...legende.keys()].map((k) => [k >> 16, (k >> 8) & 255, k & 255, legende.get(k)]);
  const BODEN = new Uint8Array(N),
    naeh = new Map();
  let bodenWald = 0;
  for (let q = 0; q < N; q++) {
    const f = FARBE[q];
    if (f < 0) continue;
    let c = legende.get(f);
    if (c === undefined) {
      c = naeh.get(f);
      if (c === undefined) {
        const r = f >> 16,
          g = (f >> 8) & 255,
          bl = f & 255;
        let bd = 1e9;
        c = 0;
        for (const l of bekannt) {
          const d = Math.abs(l[0] - r) + Math.abs(l[1] - g) + Math.abs(l[2] - bl);
          if (d < bd) {
            bd = d;
            c = d < 36 ? l[3] : 0; // wie in der App: zu weit weg = unbekannt
          }
        }
        naeh.set(f, c);
      }
    }
    BODEN[q] = c;
    if (BAUM[q] && c) bodenWald++;
  }
  log(`  Boden bekannt auf ${((100 * bodenWald) / Math.max(1, wald)).toFixed(1)} % der Waldzellen`);

  // ---- 3. Höhe: AWS-Geländekacheln z11 (~51 m/px), Zellmitte ----
  log("Höhe (AWS Terrain Tiles z11) …");
  const z = 11,
    n2 = 2 ** z,
    HOEHE = new Uint16Array(N),
    kach = new Map();
  const kx = (lng) => ((lng + 180) / 360) * n2,
    ky = (lat) => {
      const r = (lat * Math.PI) / 180;
      return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n2;
    };
  const benoetigt = new Set();
  for (let x = Math.floor(kx(lngW)); x <= Math.floor(kx(lngE)); x++)
    for (let y = Math.floor(ky(latN)); y <= Math.floor(ky(latS)); y++) benoetigt.add(x + "/" + y);
  await pool(
    [...benoetigt].map((k) => async () => {
      kach.set(k, PNG.sync.read(await hole(TERRARIUM + z + "/" + k + ".png")).data);
    }),
    8,
  );
  log(`  ${benoetigt.size} Kacheln`);
  for (let i = 0; i < NY; i++)
    for (let j = 0; j < NX; j++) {
      const xf = kx(zellLng(j)),
        yf = ky(zellLat(i)),
        x = Math.floor(xf),
        y = Math.floor(yf),
        d = kach.get(x + "/" + y),
        o = (Math.min(255, Math.floor((yf - y) * 256)) * 256 + Math.min(255, Math.floor((xf - x) * 256))) * 4;
      HOEHE[i * NX + j] = Math.max(0, Math.round(d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768));
    }

  // ---- 4. Hangrichtung: lageAusHoehen der App, Nachbarn ±1 Zelle auf 200 m hochgerechnet, keine Senke ----
  log("Hangrichtung …");
  const LAGE = new Uint8Array(N),
    s = 200 / ZELLE_M,
    lz = {};
  for (let i = 0; i < NY; i++)
    for (let j = 0; j < NX; j++) {
      const h = (a, b) => HOEHE[Math.max(0, Math.min(NY - 1, a)) * NX + Math.max(0, Math.min(NX - 1, b))],
        m = h(i, j),
        l = APP.lageAusHoehen([m, m + (h(i - 1, j) - m) * s, m + (h(i + 1, j) - m) * s, m + (h(i, j + 1) - m) * s, m + (h(i, j - 1) - m) * s]);
      const wert = l.wert === "bach" ? "eben" : l.wert; // „Senke“ im Überblick nicht ableiten
      LAGE[i * NX + j] = LAGE_CODE[wert];
      if (BAUM[i * NX + j]) lz[wert] = (lz[wert] || 0) + 1;
    }
  log("  Waldzellen je Lage:", JSON.stringify(lz));

  // ---- 5. Kronendichte: Copernicus HRL 2018 roh (bsq) bei 50 m, Mittel der 3×3 Teilpunkte ----
  log("Kronendichte (Copernicus HRL 2018) …");
  const summe = new Uint16Array(N),
    anzahl = new Uint8Array(N);
  const regel = encodeURIComponent(JSON.stringify({ rasterFunction: "None" }));
  await kacheln(3, 2000, async (x0, y0, w, h, b) => {
    const q =
      "/exportImage?bbox=" +
      [b.w, b.s, b.e, b.n].join(",") +
      "&bboxSR=4326&imageSR=4326&size=" +
      w +
      "," +
      h +
      "&pixelType=U8&interpolation=RSP_NearestNeighbor&format=bsq&renderingRule=" +
      regel;
    const meta = JSON.parse(await hole(TCD_URL + q + "&f=json", { text: true }));
    // Der Dienst hält die Pixel in Grad quadratisch und dehnt dafür den Ausschnitt – deshalb jede Teilpunktmitte
    // über den tatsächlich gelieferten Ausschnitt (meta.extent) ins Rohbild abbilden, nicht über die Anfrage.
    const roh = await hole(meta.href),
      ex = meta.extent,
      rw = meta.width,
      rh = meta.height,
      Wf = NX * 3,
      Hf = NY * 3;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const lng = lngW + ((x0 + x + 0.5) / Wf) * (lngE - lngW),
          lat = latN - ((y0 + y + 0.5) / Hf) * (latN - latS),
          px = Math.floor(((lng - ex.xmin) / (ex.xmax - ex.xmin)) * rw),
          py = Math.floor(((ex.ymax - lat) / (ex.ymax - ex.ymin)) * rh);
        if (px < 0 || py < 0 || px >= rw || py >= rh) continue;
        const v = roh[py * rw + px]; // erst rw×rh Datenbytes, danach die Maske
        if (v > 100) continue;
        const qq = Math.floor((y0 + y) / 3) * NX + Math.floor((x0 + x) / 3);
        summe[qq] += v;
        anzahl[qq]++;
      }
  });
  const DICHTE = new Uint8Array(N);
  for (let q = 0; q < N; q++) DICHTE[q] = anzahl[q] ? Math.round(summe[q] / anzahl[q]) : 255;

  // ---- Schreiben: zwei RGB-PNG (verlustfrei) + meta.json ----
  function schreibe(name, r, g, b) {
    const png = new PNG({ width: NX, height: NY, colorType: 2, inputHasAlpha: true });
    for (let q = 0; q < N; q++) {
      png.data[q * 4] = r[q];
      png.data[q * 4 + 1] = g[q];
      png.data[q * 4 + 2] = b[q];
      png.data[q * 4 + 3] = 255;
    }
    const buf = PNG.sync.write(png, { colorType: 2, deflateLevel: 9 });
    fs.writeFileSync(path.join(ZIEL, name), buf);
    log(`  ${name}: ${(buf.length / 1024).toFixed(0)} kB`);
    return buf.length;
  }
  log("Schreiben …");
  const H12 = new Uint8Array(N),
    D5 = new Uint8Array(N),
    NULL = new Uint8Array(N);
  for (let q = 0; q < N; q++) {
    H12[q] = Math.min(255, Math.round(HOEHE[q] / 12));
    // Kronendichte nur im Wald (der Überblick braucht sie nur dort) – große gleichförmige Flächen packen gut
    D5[q] = !BAUM[q] || DICHTE[q] === 255 ? 255 : Math.round(DICHTE[q] / 5) * 5;
  }
  const g1 = schreibe("grundlage.png", BAUM, BODEN, LAGE),
    g2 = schreibe("hoehe.png", H12, D5, NULL);
  const meta = {
    version: 1,
    stand: new Date().toISOString().slice(0, 10),
    raster: { latN, latS, lngW, lngE, NX, NY, dLat, dLng, zelle_m: ZELLE_M, mitte: MITTE, radius_m: RADIUS_M },
    dateien: {
      "grundlage.png": { R: "Baumart-Code (0 = kein Wald)", G: "Boden-Code (0 = unbekannt)", B: "Lage-Code" },
      "hoehe.png": { R: "Höhe in m = R·12", G: "Kronendichte % in 5er-Stufen (255 = unbekannt)", B: "frei (0)" },
    },
    codes: {
      baum: APP.BAUM_FARBEN.map((f, k) => ({ code: k + 1, art: f.art, wert: f.wert })),
      boden: BODEN_CODE,
      lage: LAGE_CODE,
    },
    quellen: [
      { daten: "Baumarten", quelle: "Thünen-Institut, Dominant_Species_Class (Sentinel 2017/18)", lizenz: "CC BY 4.0" },
      { daten: "Boden", quelle: "Bayerisches Landesamt für Umwelt, ÜBK25 (Kartiereinheiten)", lizenz: "CC BY 4.0" },
      { daten: "Höhe", quelle: "AWS Terrain Tiles (Mapzen), u. a. SRTM, EU-DEM (Copernicus)", lizenz: "Namensnennung der Quellen" },
      { daten: "Kronendichte", quelle: "Copernicus HRL Tree Cover Density 2018 (EEA)", lizenz: "frei, Quellenangabe" },
    ],
    statistik: {
      waldZellen: wald,
      bodenBekanntWaldProzent: +((100 * bodenWald) / Math.max(1, wald)).toFixed(1),
      bodenFarbenGedeutet: legende.size,
      punktabfragenBoden: abfragen,
      lageWald: lz,
      bytes: { "grundlage.png": g1, "hoehe.png": g2 },
    },
  };
  fs.writeFileSync(path.join(ZIEL, "meta.json"), JSON.stringify(meta, null, 1));
  log("fertig:", ZIEL);
})().catch((e) => {
  console.error("FEHLER:", e.message);
  process.exit(1);
});
