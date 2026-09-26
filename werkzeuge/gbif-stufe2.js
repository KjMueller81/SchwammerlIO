// GBIF Stufe 2 (Probe): Trennt die Endformel der App Steinpilzmeldungen vom Hintergrund aller Pilzmeldungen?
// Aufruf:  cd werkzeuge && npm install && node gbif-stufe2.js [--offline]
//   Voraussetzung: Stufe 1 (node gbif.js) hat den GBIF-Zwischenspeicher gefüllt.
//   --offline  keine Downloads (HYRAS muss vollständig in cache/hyras/ liegen)
// Wetter: DWD HYRAS täglich 1 km (Niederschlag, Tmin, Tmax, Tmittel), einmalig nach werkzeuge/cache/hyras/ (≈ 2,5 GB,
// nicht im Repo). Gelesen mit h5wasm (NetCDF4 = HDF5), nur der Ausschnitt des Grundstock-Gebiets.
// Rechnung ausschließlich mit den Funktionen aus index.html (werkzeuge/app.js, Arbeitsregel 5), Lernen aus.
// Ergebnis: werkzeuge/berichte/gbif-stufe2.md (nur Zählungen, Anteile, AUC – keine Fundorte).
"use strict";
const fs = require("fs");
const path = require("path");
const G = require("./gbif.js");
const { ladeApp } = require("./app.js");

const OFFLINE = process.argv.includes("--offline");
const HYRAS = path.join(__dirname, "cache", "hyras");
const HYRAS_URL = "https://opendata.dwd.de/climate_environment/CDC/grids_germany/daily/hyras_de/";
const HYRAS_VAR = {
  pr: "precipitation",
  tasmin: "air_temperature_min",
  tasmax: "air_temperature_max",
  tas: "air_temperature_mean",
};
const HYRAS_FASSUNG = "v6-1";
const JAHR_AB = 2015,
  JAHR_BIS = 2025,
  DUBLETTE_KM = 0.5,
  VORLAUF = 60, // Tage bis zum Meldetag (36 für das Modell, bis 56 für die Regenfenster)
  BOOT = 1000;
const R = G.META.raster;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ---------- Modell aus der App (nichts nachgebaut)
const A = ladeApp([
  "VERSION",
  "bewerte",
  "wetterFaktorenArt",
  "standortGuete",
  "merkmalFaktor",
  "summenFaktor",
  "faktorAusWirksam",
  "wirksamerRegen",
  "lernUebernehmen",
  "SAISON",
  "W",
  "endwert",
  "deckel",
]);
A.lernUebernehmen({}, false); // nur das Grundmodell prüfen

// ---------- Datum
const iso = (d) => d.toISOString().slice(0, 10);
const datum = (r) => new Date(Date.UTC(r.j, r.m - 1, r.d));
const plusTage = (d, n) => new Date(d.getTime() + n * 864e5);
const tagImJahr = (d) => Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5); // 0 = 1. Januar

// ---------- 1. Meldungen: Filter und Dubletten
function meldungenLaden() {
  const taxa = G.lesen(path.join(G.CACHE, "taxa.json"));
  if (!taxa) throw new Error("Stufe 1 fehlt: erst node gbif.js ausführen");
  const flechten = new Set(taxa.flechten.map((m) => m.key));
  const seiten = (id) => {
    const d = path.join(G.CACHE, "seiten", id);
    if (!fs.existsSync(d)) throw new Error("Stufe 1 unvollständig: " + d);
    return fs.readdirSync(d).flatMap((f) => G.lesen(path.join(d, f)) || []);
  };
  const ziel = new Map();
  seiten("st")
    .concat(seiten("som"))
    .forEach((r) => ziel.set(r.k, Object.assign(r, { st: 1 })));
  const alle = new Map(ziel);
  seiten("fungi").forEach((r) => {
    if (!alle.has(r.k) && !flechten.has(r.c) && !flechten.has(r.o))
      alle.set(r.k, Object.assign(r, { st: 0 }));
  });
  const z = { roh: alle.size, rohSt: ziel.size, grund: {} };
  const weg = (g) => (z.grund[g] = (z.grund[g] || 0) + 1);
  G.grundstockLaden();
  const ok = [];
  for (const r of alle.values()) {
    if (!G.tagesDatum(r)) weg("ohne Tagesdatum");
    else if (r.j < JAHR_AB || r.j > JAHR_BIS) weg("außerhalb 2015–2025");
    else if (r.m < 6 || r.m > 11) weg("außerhalb Juni–November");
    else if (r.u !== null && r.u > 500) weg("Unsicherheit > 500 m");
    else {
      const g = G.grundstockAm(r.la, r.ln);
      if (!g || !g.daten) weg("außerhalb des Grundstocks");
      else if (!g.baum) weg("nicht im Wald");
      else if (!g.boden) weg("Boden unbekannt (im Überblick grau)");
      else ok.push(Object.assign(r, { g }));
    }
  }
  // Dubletten: gleicher Beobachter, gleicher Tag, < 500 m → eine Meldung; Steinpilz zuerst, damit er gewinnt
  ok.sort((a, b) => b.st - a.st);
  const gruppen = new Map(),
    aus = [];
  let dub = 0;
  for (const r of ok) {
    if (!r.b) {
      aus.push(r);
      continue;
    }
    const k = r.b + "|" + r.j + "-" + r.m + "-" + r.d;
    if (!gruppen.has(k)) gruppen.set(k, []);
    const gr = gruppen.get(k);
    if (gr.some((x) => G.kmAbstand(x, r) < DUBLETTE_KM)) dub++;
    else {
      gr.push(r);
      aus.push(r);
    }
  }
  z.dubletten = dub;
  z.nachFilter = ok.length;
  z.nachFilterSt = ok.filter((r) => r.st).length;
  return { meldungen: aus, zaehl: z };
}

// ---------- 2. HYRAS: Download, Projektion, Reihen je Meldung
function hyrasDatei(v, j) {
  return v + "_hyras_1_" + j + "_" + HYRAS_FASSUNG + "_de.nc";
}
async function hyrasLaden() {
  fs.mkdirSync(HYRAS, { recursive: true });
  for (let j = JAHR_AB; j <= JAHR_BIS; j++)
    for (const v in HYRAS_VAR) {
      const d = path.join(HYRAS, hyrasDatei(v, j));
      if (fs.existsSync(d) && fs.statSync(d).size > 0) continue;
      if (OFFLINE) throw new Error("offline: " + hyrasDatei(v, j) + " fehlt");
      log("lade", hyrasDatei(v, j));
      const r = await fetch(HYRAS_URL + HYRAS_VAR[v] + "/" + hyrasDatei(v, j));
      if (!r.ok) throw new Error("HYRAS " + r.status + " für " + hyrasDatei(v, j));
      fs.writeFileSync(d + ".part", Buffer.from(await r.arrayBuffer()));
      fs.renameSync(d + ".part", d);
    }
}
// ETRS89-LAEA (EPSG:3035), Ellipsoid GRS80 – Snyder, Map Projections (1987), Gl. 24-11 ff.
function laea(lat, lng) {
  const a = 6378137,
    f = 1 / 298.257222101,
    e2 = 2 * f - f * f,
    e = Math.sqrt(e2),
    rad = Math.PI / 180;
  const q = (p) => {
    const s = Math.sin(p);
    return (1 - e2) * (s / (1 - e2 * s * s) - (1 / (2 * e)) * Math.log((1 - e * s) / (1 + e * s)));
  };
  const p0 = 52 * rad,
    l0 = 10 * rad,
    qp = q(Math.PI / 2),
    b1 = Math.asin(q(p0) / qp),
    Rq = a * Math.sqrt(qp / 2),
    D = (a * Math.cos(p0)) / (Math.sqrt(1 - e2 * Math.sin(p0) ** 2) * Rq * Math.cos(b1));
  const b = Math.asin(q(lat * rad) / qp),
    dl = lng * rad - l0,
    B = Rq * Math.sqrt(2 / (1 + Math.sin(b1) * Math.sin(b) + Math.cos(b1) * Math.cos(b) * Math.cos(dl)));
  return {
    x: 4321000 + B * D * Math.cos(b) * Math.sin(dl),
    y: 3210000 + (B / D) * (Math.cos(b1) * Math.sin(b) - Math.sin(b1) * Math.cos(b) * Math.cos(dl)),
  };
}
async function reihenBauen(meldungen) {
  const datei = path.join(G.CACHE, "stufe2-reihen.json"),
    reihen = G.lesen(datei) || {};
  const fehlt = meldungen.filter((r) => !reihen[r.k]);
  if (!fehlt.length) return reihen;
  await hyrasLaden();
  const h5 = (await import("h5wasm/node")).default;
  await h5.ready;
  let pruefung = null;
  for (let j = JAHR_AB; j <= JAHR_BIS; j++) {
    const liste = fehlt.filter((r) => r.j === j);
    if (!liste.length) continue;
    const dateien = {},
      daten = {};
    for (const v in HYRAS_VAR) dateien[v] = new h5.File(path.join(HYRAS, hyrasDatei(v, j)), "r");
    const x = dateien.pr.get("x").value,
      y = dateien.pr.get("y").value;
    for (const v in HYRAS_VAR) {
      const xv = dateien[v].get("x").value;
      if (xv.length !== x.length || xv[0] !== x[0]) throw new Error("HYRAS-Raster weicht ab: " + v + " " + j);
    }
    // Zelle je Meldung (Zellmitten im 1-km-Abstand, y steigt nach Norden)
    liste.forEach((r) => {
      const p = laea(r.la, r.ln);
      r.hx = Math.round((p.x - x[0]) / 1000);
      r.hy = Math.round((p.y - y[0]) / 1000);
    });
    if (!pruefung) {
      // Projektion gegen die lat/lon-Felder der Datei prüfen
      const r = liste[0],
        la = dateien.pr.get("lat").slice([
          [r.hy, r.hy + 1],
          [r.hx, r.hx + 1],
        ])[0],
        lo = dateien.pr.get("lon").slice([
          [r.hy, r.hy + 1],
          [r.hx, r.hx + 1],
        ])[0];
      pruefung = G.kmAbstand({ la, ln: lo }, r);
      log("Projektion: Abstand Meldung ↔ HYRAS-Zellmitte", pruefung.toFixed(2), "km");
      if (pruefung > 0.75) throw new Error("LAEA-Projektion passt nicht zum HYRAS-Raster");
    }
    const y0 = Math.min(...liste.map((r) => r.hy)),
      y1 = Math.max(...liste.map((r) => r.hy)),
      x0 = Math.min(...liste.map((r) => r.hx)),
      x1 = Math.max(...liste.map((r) => r.hx)),
      start = (r) => {
        const d = datum(r);
        return Math.min(tagImJahr(plusTage(d, -(VORLAUF - 1))), tagImJahr(new Date(Date.UTC(j, 8, 1))));
      },
      t0 = Math.min(...liste.map(start)),
      t1 = Math.max(...liste.map((r) => tagImJahr(datum(r)))),
      NYs = y1 - y0 + 1,
      NXs = x1 - x0 + 1;
    // Temperaturen sind gepackt (Ganzzahl × scale_factor + add_offset); h5wasm wendet das nicht selbst an
    const skala = {};
    for (const v in HYRAS_VAR) {
      const at = dateien[v].get(v).attrs,
        wert = (k, std) => (at[k] ? Number(at[k].value) : std);
      skala[v] = { f: wert("scale_factor", 1), o: wert("add_offset", 0), leer: wert("_FillValue", -999) };
    }
    for (const v in HYRAS_VAR)
      daten[v] = dateien[v].get(v).slice([
        [t0, t1 + 1],
        [y0, y1 + 1],
        [x0, x1 + 1],
      ]);
    for (const v in HYRAS_VAR) dateien[v].close();
    liste.forEach((r) => {
      const s = start(r),
        e = tagImJahr(datum(r)),
        q = (r.hy - y0) * NXs + (r.hx - x0),
        reihe = { ab: iso(new Date(Date.UTC(j, 0, 1 + s))) };
      let lueckig = false;
      for (const v in HYRAS_VAR) {
        reihe[v] = [];
        for (let t = s; t <= e; t++) {
          const roh = daten[v][(t - t0) * NYs * NXs + q];
          if (roh === skala[v].leer || !Number.isFinite(roh)) lueckig = true;
          reihe[v].push(Math.round((roh * skala[v].f + skala[v].o) * 10) / 10);
        }
      }
      reihen[r.k] = lueckig ? { luecke: true } : reihe;
    });
    log("HYRAS", j + ":", liste.length, "Meldungen");
  }
  G.schreiben(datei, reihen);
  return reihen;
}

// ---------- ET0 nach Hargreaves (FAO-56, Gl. 52; Ra nach Gl. 21) – Näherung, HYRAS hat keine Verdunstung
function hargreaves(lat, tag, tmin, tmax) {
  const phi = (lat * Math.PI) / 180,
    J = tag + 1,
    dr = 1 + 0.033 * Math.cos((2 * Math.PI * J) / 365),
    de = 0.409 * Math.sin((2 * Math.PI * J) / 365 - 1.39),
    ws = Math.acos(-Math.tan(phi) * Math.tan(de)),
    Ra =
      ((24 * 60) / Math.PI) *
      0.082 *
      dr *
      (ws * Math.sin(phi) * Math.sin(de) + Math.cos(phi) * Math.cos(de) * Math.sin(ws));
  return Math.max(0, 0.0023 * ((tmin + tmax) / 2 + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)) * 0.408 * Ra);
}
// Stichprobe: Hargreaves aus Open-Meteo-Tmin/Tmax gegen Open-Meteo-ET0 (Stand des Tageslaufs, daten/wetter.json)
function et0Vergleich() {
  const w = G.lesen(path.join(__dirname, "..", "daten", "wetter.json"));
  if (!w) return null;
  const d0 = new Date(w.datum0 + "T00:00:00Z");
  let n = 0,
    sa = 0,
    sb = 0,
    so = 0;
  w.omDaten.forEach((p, k) => {
    const lat = w.om.latN - Math.floor(k / w.om.NX) * w.om.schritt;
    for (let i = 0; i < p.tw.length - 1; i++) {
      if (p.et0[i] === null || p.tmin[i] === null) continue;
      const h = hargreaves(lat, tagImJahr(plusTage(d0, i)), p.tmin[i], p.tmax[i]);
      n++;
      sa += Math.abs(h - p.et0[i]);
      sb += h - p.et0[i];
      so += p.et0[i];
    }
  });
  return { n, mae: sa / n, bias: sb / n, mittel: so / n, datum0: w.datum0, punkte: w.omDaten.length };
}

// Vergleichszahlen für Stufe 3: Steinpilz-Meldungen (Juni–Nov. 2015–2025, Unsicherheit ≤ 500 m) in Bayern,
// Deutschland und – mit denselben Filtern – im jetzigen Gebiet (Zähl-Abfragen, limit=0, zwischengespeichert)
async function vergleichZaehlen(taxa) {
  const datei = path.join(G.CACHE, "stufe2-vergleich.json"),
    alt = G.lesen(datei);
  if (alt || OFFLINE) return alt;
  const keys = taxa.arten.st.concat(taxa.arten.som).map((m) => "taxonKey=" + m.suchKey),
    basis =
      "https://api.gbif.org/v1/occurrence/search?basisOfRecord=HUMAN_OBSERVATION&hasCoordinate=true" +
      "&hasGeospatialIssue=false&year=" +
      JAHR_AB +
      "," +
      JAHR_BIS +
      "&month=6,11&coordinateUncertaintyInMeters=0,500&limit=0&" +
      keys.join("&"),
    zaehle = async (f) => {
      await new Promise((r) => setTimeout(r, 1000));
      const r = await fetch(basis + "&" + f);
      if (!r.ok) throw new Error("GBIF " + r.status);
      return (await r.json()).count;
    };
  const z = {
    bayern: await zaehle("country=DE&gadmGid=DEU.2_1"),
    deutschland: await zaehle("country=DE"),
    gebiet: await zaehle(
      "country=DE&decimalLatitude=" + R.latS + "," + R.latN + "&decimalLongitude=" + R.lngW + "," + R.lngE,
    ),
    abgerufen: new Date().toISOString().slice(0, 10),
  };
  G.schreiben(datei, z);
  return z;
}

// ---------- 3. Rechnung je Meldung (nur App-Funktionen)
// bodenFJe: optional { GBIF-Schlüssel: Modell-Bodenfeuchte 0–7 cm } (Nachschau); ohne → bodenF fehlt wie in HYRAS
function rechnen(meldungen, reihen, bodenFJe) {
  const codes = G.META.codes,
    bodenName = {},
    lageName = {};
  for (const k in codes.boden) bodenName[codes.boden[k]] = k;
  for (const k in codes.lage) lageName[codes.lage[k]] = k;
  const leer = { tw: [], et0: [], tmin: [], tmax: [], pp: [] };
  const aus = [];
  let luecken = 0;
  for (const r of meldungen) {
    const s = reihen[r.k];
    if (!s || s.luecke) {
      luecken++;
      continue;
    }
    const n = s.pr.length,
      ab = new Date(s.ab + "T00:00:00Z"),
      i0 = n - 36,
      datum0 = plusTage(ab, i0),
      sep1 = new Date(Date.UTC(r.j, 8, 1)),
      tmin = s.tasmin.slice(i0),
      tmax = s.tasmax.slice(i0);
    // Kältesumme: Tagesmittel ab 1.9. bis zum Tag vor der 36-Tage-Reihe (wie „vor“ in wetter.json)
    const iSep = Math.round((sep1 - ab) / 864e5),
      vor = datum0 > sep1 ? s.tas.slice(iSep, i0) : [];
    const w = {
      tw: s.pr.slice(i0),
      tmin,
      tmax,
      et0: tmin.map((t, i) => hargreaves(r.la, tagImJahr(plusTage(datum0, i)), t, tmax[i])),
      f: leer,
      datum0: iso(datum0),
      vorAb: iso(sep1),
      vor,
      // HYRAS hat keine Bodenfeuchte → Haltefaktor nur aus der Streubilanz (Nachschau: Open-Meteo-Archiv)
      bodenF: bodenFJe && typeof bodenFJe[r.k] === "number" ? bodenFJe[r.k] : null,
      unsicher: 0,
    };
    const g = r.g,
      bw = codes.baum[g.baum - 1].wert,
      v = {
        baum: bw === "fichte" && g.dichte !== null && g.dichte < 80 ? "fichte_licht" : bw, // wie standortFeldBauen
        alter: "mittel", // Bestand unbekannt → 15–25 m
        boden: bodenName[g.boden],
        unter: ["moos"], // Unterwuchs unbekannt → Moos
        lage: lageName[g.lage] || "eben",
        rand: "innen",
        saison: r.m >= 9 ? "herbst" : "sommer", // wie beim Lernen aus Besuchen (Monat ab September = Herbst)
      },
      hoehe = g.hoehe,
      dichte = g.dichte === null ? 85 : g.dichte; // unbekannt wie im Überblick
    const fk = A.wetterFaktorenArt("st", v, w, hoehe, dichte),
      ew = A.bewerte(v, w, hoehe, undefined, dichte).st,
      sg = A.standortGuete(v, "st"),
      summe = (k) => s.pr.slice(n - k).reduce((a, b) => a + b, 0);
    aus.push({
      st: r.st,
      j: r.j,
      m: r.m,
      woche: G.isoWoche(r).slice(-2),
      nord: r.la >= R.mitte[0],
      endwert: ew,
      sg,
      wf: Math.min(1, fk.rf) * fk.tf,
      rf: fk.rf,
      tfTemp: fk.tfTemp,
      frost: fk.frost.f,
      kaelte: fk.kaelte.f,
      ks: fk.kaelte.ks,
      summenF: A.summenFaktor("st", w.tw),
      ausloeser: A.faktorAusWirksam(A.wirksamerRegen("st", w, 0, hoehe, dichte, v.alter)),
      saisonF: A.SAISON[v.saison].st,
      f: { baum: v.baum, boden: v.boden, lage: v.lage },
      mf: {
        baum: A.merkmalFaktor(v, "baum", "st"),
        boden: A.merkmalFaktor(v, "boden", "st"),
        lage: A.merkmalFaktor(v, "lage", "st"),
      },
      hoehe,
      regen: { 7: summe(7), 14: summe(14), 26: summe(26), 42: summe(42), 56: summe(56) },
      frost14: tmin.slice(-14).filter((t) => t <= 0).length,
      // für die Nachschau (gbif-nachschau.js)
      k: r.k,
      datum: iso(datum(r)),
      v,
      tf: fk.tf,
      dichte,
      t7: s.tas.slice(-7).reduce((a, b) => a + b, 0) / 7,
      // Ausschlussregel Steinpilz (wetterFaktorenArt): 5-Tage-Mittel > 17,5 °C und < 5 mm in 5 Tagen
      aus5: (() => {
        let m5 = 0,
          r5 = 0;
        for (let i = 31; i < 36; i++) {
          m5 += (tmin[i] + tmax[i]) / 10;
          r5 += w.tw[i];
        }
        return m5 > 17.5 && r5 < 5;
      })(),
      // Kältesumme ab 1.9. mit anderer Basis (Kandidaten für die Kalibrierung; Tagesmittel HYRAS)
      ksBasis: [8, 10].map((b) => s.tas.slice(Math.max(0, iSep)).reduce((a, t) => a + Math.max(0, b - t), 0)),
    });
  }
  // Vergleichsmodell „nur Saison“: Steinpilz-Anteil je Kalenderwoche (±1) aus den anderen Jahren
  aus.forEach((x) => {
    let a = 0,
      b = 0;
    const w = +x.woche;
    aus.forEach((y) => {
      if (y.j === x.j || Math.abs(+y.woche - w) > 1) return;
      b++;
      a += y.st;
    });
    x.saison = b ? a / b : 0;
  });
  return { werte: aus, luecken };
}

// ---------- Statistik
function auc(pos, neg) {
  if (!pos.length || !neg.length) return null;
  const alle = pos.map((v) => [v, 1]).concat(neg.map((v) => [v, 0]));
  alle.sort((a, b) => a[0] - b[0]);
  let rs = 0;
  for (let i = 0; i < alle.length;) {
    let k = i;
    while (k < alle.length && alle[k][0] === alle[i][0]) k++;
    const rang = (i + k + 1) / 2; // mittlerer Rang bei Gleichstand
    for (let t = i; t < k; t++) if (alle[t][1]) rs += rang;
    i = k;
  }
  return (rs - (pos.length * (pos.length + 1)) / 2) / (pos.length * neg.length);
}
function zufall(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function aucSpanne(pos, neg) {
  const z = zufall(20260926),
    ziehe = (l) => l.map(() => l[Math.floor(z() * l.length)]),
    b = [];
  for (let i = 0; i < BOOT; i++) b.push(auc(ziehe(pos), ziehe(neg)));
  b.sort((x, y) => x - y);
  return [b[Math.floor(0.025 * BOOT)], b[Math.floor(0.975 * BOOT) - 1]];
}
const k2 = (x) => (x === null ? "–" : x.toFixed(2).replace(".", ","));
const pc = (a, b) => (b ? ((100 * a) / b).toFixed(1).replace(".", ",") + " %" : "–");
function quartile(werte) {
  const s = werte.slice().sort((a, b) => a - b);
  return [0.25, 0.5, 0.75].map((p) => s[Math.floor(p * (s.length - 1))]);
}

// ---------- 4. Bericht
function bericht(M, W, et0, VG) {
  const { werte, luecken } = W;
  let t = "";
  const L = (s) => (t += (s === undefined ? "" : s) + "\n");
  const heute = new Date().toISOString().slice(0, 10);
  const nSt = werte.filter((x) => x.st).length,
    nHg = werte.length - nSt;
  const SCORES = [
    ["Endwert (App)", (x) => x.endwert],
    ["Standortgüte allein", (x) => x.sg],
    ["Wetterfaktor allein (rf × tf)", (x) => x.wf],
    ["nur Saison (Kalenderwoche)", (x) => x.saison],
  ];
  const zeile = (liste, [name, f], spanne) => {
    const p = liste.filter((x) => x.st).map(f),
      n = liste.filter((x) => !x.st).map(f),
      a = auc(p, n),
      s = spanne ? aucSpanne(p, n) : null;
    return [
      name,
      k2(a) + (s ? " (" + k2(s[0]) + "–" + k2(s[1]) + ")" : ""),
      String(p.length),
      String(n.length),
    ];
  };

  L("# GBIF Stufe 2 – Probe Steinpilz im jetzigen Gebiet");
  L();
  L(
    "Erzeugt von `werkzeuge/gbif-stufe2.js` am " +
      heute +
      " mit den Modellfunktionen aus index.html (Version " +
      A.VERSION +
      ", Lernen aus). Nur Zählungen, Anteile und AUC – keine Fundorte. Grundlage: " +
      "[Stufe 1](gbif-stufe1.md).",
  );
  L();
  L(
    "**Frage:** Liegen die Werte der App an Ort und Tag echter Steinpilzmeldungen höher als an Ort und Tag aller " +
      "anderen Pilzmeldungen (Hintergrund = dort war jemand im Wald)? Vorbild Kinoko (modell/docs/findings-01.md).",
  );
  L();

  // --- Daten
  L("## Daten");
  L();
  const z = M.zaehl;
  L(
    "Steinpilz = *Boletus edulis* + *B. reticulatus*; Hintergrund = alle übrigen Pilzmeldungen ohne Flechten. " +
      "Filter: Tagesdatum, Juni–November, " +
      JAHR_AB +
      "–" +
      JAHR_BIS +
      ", Unsicherheit ≤ 500 m oder unbekannt (verschleierte ≈ 27-km-Meldungen fallen weg), im Wald und im " +
      "Grundstock-Gebiet, Boden bekannt. Dubletten: gleicher Beobachter (Hash), gleicher Tag, < 500 m → eine " +
      "Meldung, Steinpilz gewinnt.",
  );
  L();
  L(
    G.tabelle(
      ["Schritt", "Meldungen", "davon Steinpilz"],
      [
        ["aus Stufe 1 (Pilze ohne Flechten)", G.zahl(z.roh), G.zahl(z.rohSt)],
        ...Object.entries(z.grund).map(([g, n]) => ["– " + g, "−" + G.zahl(n), ""]),
        ["nach den Filtern", G.zahl(z.nachFilter), G.zahl(z.nachFilterSt)],
        ["– Dubletten zusammengefasst", "−" + G.zahl(z.dubletten), ""],
        ["– HYRAS-Lücke am Meldeort", "−" + G.zahl(luecken), ""],
        ["**ausgewertet**", "**" + G.zahl(werte.length) + "**", "**" + G.zahl(nSt) + "**"],
      ],
    ),
  );
  L(
    "**Standort** je Meldung aus dem Grundstock (150 m): Baumart (Fichte mit < 80 % Kronendichte = „Fichte, licht“, " +
      "wie im Überblick), Boden, Lage, Höhe, Kronendichte (unbekannt = 85 %). **Fest vorgegeben**, weil unbekannt: " +
      "Unterwuchs Moos, Bestand 15–25 m, Struktur „innen“. Saison wie beim Lernen aus Besuchen: ab September Herbst, " +
      "sonst Sommer (`SAISON.sommer.st` = 0,45 geht damit in den Endwert ein).",
  );
  L();
  L(
    "**Wetter:** DWD HYRAS täglich 1 km (" +
      HYRAS_FASSUNG +
      "): Niederschlag, Tmin, Tmax, Tmittel an der Zelle der Meldung (EPSG:3035, eigene LAEA-Umrechnung, gegen die " +
      "lat/lon-Felder der Datei geprüft). Reihe = 36 Tage bis einschließlich Meldetag, Kältesumme mit Tagesmitteln " +
      "ab 1.9. (wie `vor` in wetter.json), Vorhersage leer. HYRAS-Niederschlag gilt von 06 UTC des Tages bis 06 UTC " +
      "des Folgetags – der Meldetag enthält also auch Regen nach dem Fund. Keine Bodenfeuchte: `bodenF` fehlt, der " +
      "Haltefaktor kommt nur aus der Streubilanz (in der App 60 % Streu + 40 % Modell-Bodenfeuchte).",
  );
  L();
  L(
    "**Höhe:** `bewerte`/`wetterFaktorenArt` rechnen die Temperatur nicht selbst um – in der App macht das " +
      "`wetterFuer` vorher (Open-Meteo-Modellhöhe → Zielhöhe, 0,65 °C/100 m). HYRAS liegt schon in Geländehöhe der " +
      "1-km-Zelle, deshalb gehen Tmin/Tmax **ohne** Korrektur ins Modell. Die Höhe (Grundstock, 150 m) wirkt nur " +
      "über `hoehenDehnung` (Regenverzögerung) und die Wasserbilanz – wie am Pin.",
  );
  L();
  if (et0)
    L(
      "**ET0 (Näherung):** Hargreaves (FAO-56 Gl. 52) aus Tmin/Tmax und Breite. Stichprobe am Tageslauf-Stand " +
        "(wetter.json, " +
        et0.punkte +
        " Punkte × 35 Tage ab " +
        et0.datum0 +
        ", n = " +
        G.zahl(et0.n) +
        "): Hargreaves aus den Open-Meteo-Temperaturen gegen Open-Meteo-ET0 (FAO Penman-Monteith) – mittlere " +
        "Abweichung " +
        et0.mae.toFixed(2).replace(".", ",") +
        " mm/Tag, systematisch " +
        (et0.bias >= 0 ? "+" : "") +
        et0.bias.toFixed(2).replace(".", ",") +
        " mm/Tag bei im Mittel " +
        et0.mittel.toFixed(2).replace(".", ",") +
        " mm/Tag.",
    );
  L();

  // --- a) Trennschärfe
  L("## a) Trennschärfe (AUC)");
  L();
  L(
    "AUC = Wahrscheinlichkeit, dass eine zufällige Steinpilzmeldung einen höheren Wert hat als eine zufällige " +
      "Hintergrundmeldung (0,5 = Zufall). In Klammern die 95-%-Spanne (Bootstrap, " +
      BOOT +
      " Ziehungen, getrennt nach Steinpilz und Hintergrund).",
  );
  L();
  const aug = werte.filter((x) => x.m >= 8 && x.m <= 10);
  [
    ["(1) Juni–November", werte],
    ["(2) nur August–Oktober", aug],
  ].forEach(([titel, l]) => {
    L("### " + titel);
    L();
    L(
      G.tabelle(
        ["Wert", "AUC (95 %)", "Steinpilz", "Hintergrund"],
        SCORES.map((s) => zeile(l, s, true)),
      ),
    );
  });
  L("### Einzelfaktoren (Juni–November)");
  L();
  const EINZEL = [
    ["Regen: Auslöser (wirksamer Regen)", (x) => x.ausloeser],
    ["Regen: Summe 26 Tage (summenFaktor)", (x) => x.summenF],
    ["Regenfaktor rf (Ensemble)", (x) => x.rf],
    ["Temperatur (ohne Frost/Kälte)", (x) => x.tfTemp],
    ["Frostfaktor", (x) => x.frost],
    ["Kältefaktor", (x) => x.kaelte],
    ["Saisonfaktor (Sommer 0,45 / Herbst 1)", (x) => x.saisonF],
    ["Baumart (merkmalFaktor)", (x) => x.mf.baum],
    ["Boden (merkmalFaktor)", (x) => x.mf.boden],
    ["Lage (merkmalFaktor)", (x) => x.mf.lage],
  ];
  L(
    G.tabelle(
      ["Faktor", "AUC Juni–Nov.", "AUC Aug.–Okt."],
      EINZEL.map(([n, f]) => {
        const a1 = auc(werte.filter((x) => x.st).map(f), werte.filter((x) => !x.st).map(f)),
          a2 = auc(aug.filter((x) => x.st).map(f), aug.filter((x) => !x.st).map(f));
        return [n, k2(a1), k2(a2)];
      }),
    ),
  );
  L("### Blockweise: je Jahr");
  L();
  const jahre = [...new Set(werte.map((x) => x.j))].sort();
  L(
    G.tabelle(
      [
        "Jahr",
        "Steinpilz",
        "Hintergrund",
        "AUC Endwert (nur dieses Jahr)",
        "AUC Saison (nur dieses Jahr)",
        "AUC Endwert (Jahr ausgelassen)",
      ],
      jahre.map((j) => {
        const drin = werte.filter((x) => x.j === j),
          ohne = werte.filter((x) => x.j !== j),
          p = drin.filter((x) => x.st),
          n = drin.filter((x) => !x.st);
        return [
          String(j),
          String(p.length),
          String(n.length),
          p.length >= 3
            ? k2(
                auc(
                  p.map((x) => x.endwert),
                  n.map((x) => x.endwert),
                ),
              )
            : "(zu wenige)",
          p.length >= 3
            ? k2(
                auc(
                  p.map((x) => x.saison),
                  n.map((x) => x.saison),
                ),
              )
            : "(zu wenige)",
          k2(
            auc(
              ohne.filter((x) => x.st).map((x) => x.endwert),
              ohne.filter((x) => !x.st).map((x) => x.endwert),
            ),
          ),
        ];
      }),
    ),
  );
  L("### Blockweise: Nord-/Südhälfte (Grenze " + R.mitte[0].toFixed(2).replace(".", ",") + "° N)");
  L();
  L(
    G.tabelle(
      ["Hälfte", "Steinpilz", "Hintergrund", ...SCORES.map((s) => "AUC " + s[0])],
      [
        ["Nord", werte.filter((x) => x.nord)],
        ["Süd", werte.filter((x) => !x.nord)],
      ].map(([n, l]) => [
        n,
        String(l.filter((x) => x.st).length),
        String(l.filter((x) => !x.st).length),
        ...SCORES.map((s) => zeile(l, s, false)[1]),
      ]),
    ),
  );

  // --- b) Kalibrierung
  L("## b) Kalibrierung");
  L();
  const klassen = [
    [0, 20],
    [20, 40],
    [40, 60],
    [60, 80],
    [80, 101],
  ];
  const kal = (l) =>
    klassen.map(([a, b]) => {
      const k = l.filter((x) => x.endwert >= a && x.endwert < b);
      return [
        a + "–" + Math.min(b, 100),
        G.zahl(k.length),
        String(k.filter((x) => x.st).length),
        pc(k.filter((x) => x.st).length, k.length),
      ];
    });
  L(G.tabelle(["Endwert", "Meldungen", "davon Steinpilz", "Anteil Steinpilz"], kal(werte)));
  L("Gesamtanteil Steinpilz: " + pc(nSt, werte.length) + ".");
  L();
  L("### Steinpilz-Anteil je Monat gegen den Saisonfaktor des Modells");
  L();
  const MONAT = ["", "", "", "", "", "", "Juni", "Juli", "August", "September", "Oktober", "November"];
  L(
    G.tabelle(
      ["Monat", "Meldungen", "davon Steinpilz", "Anteil Steinpilz", "SAISON (st)"],
      [6, 7, 8, 9, 10, 11].map((m) => {
        const l = werte.filter((x) => x.m === m),
          p = l.filter((x) => x.st).length;
        return [
          MONAT[m],
          G.zahl(l.length),
          String(p),
          pc(p, l.length),
          k2(A.SAISON[m >= 9 ? "herbst" : "sommer"].st),
        ];
      }),
    ),
  );

  // --- c) Regenfenster
  L("## c) Regenfenster (beschreibend)");
  L();
  L("Steinpilz-Anteil nach Regensumme am Meldeort (HYRAS) in Quartilen aller ausgewerteten Meldungen.");
  L();
  const fenster = [7, 14, 26, 42, 56];
  L(
    G.tabelle(
      ["Fenster", "Q1 (niedrig)", "Q2", "Q3", "Q4 (hoch)", "Grenzen (mm)", "AUC"],
      fenster.map((k) => {
        const q = quartile(werte.map((x) => x.regen[k])),
          qk = (x) => (x <= q[0] ? 0 : x <= q[1] ? 1 : x <= q[2] ? 2 : 3),
          zell = [0, 1, 2, 3].map((i) => {
            const l = werte.filter((x) => qk(x.regen[k]) === i);
            return (
              pc(l.filter((x) => x.st).length, l.length) +
              " (" +
              l.filter((x) => x.st).length +
              "/" +
              l.length +
              ")"
            );
          });
        return [
          k + " Tage",
          ...zell,
          q.map((v) => Math.round(v)).join(" / "),
          k2(
            auc(
              werte.filter((x) => x.st).map((x) => x.regen[k]),
              werte.filter((x) => !x.st).map((x) => x.regen[k]),
            ),
          ),
        ];
      }),
    ),
  );
  L("Kinoko fand die stärkste Trennung bei Fenstern von 2–8 Wochen.");
  L();

  // --- d) Trockenheits-Deckel
  L("## d) Trockenheits-Deckel");
  L();
  L(
    G.tabelle(
      ["Regenfaktor rf", "Steinpilz", "Anteil an allen Steinpilzen", "Hintergrund", "Anteil am Hintergrund"],
      [
        ["< 0,2", (x) => x.rf < 0.2],
        ["< 0,4", (x) => x.rf < 0.4],
        ["≥ 0,4", (x) => x.rf >= 0.4],
      ].map(([n, f]) => {
        const p = werte.filter((x) => x.st && f(x)).length,
          h = werte.filter((x) => !x.st && f(x)).length;
        return [n, String(p), pc(p, nSt), G.zahl(h), pc(h, nHg)];
      }),
    ),
  );
  L(
    "Unter rf 0,2 deckelt `deckel` den Endwert auf 8–30 (je nach Standortgüte). Liegen dort anteilig ähnlich viele " +
      "Steinpilze wie Hintergrund, ist der Deckel für diese Daten zu streng.",
  );
  L();

  // --- e) Frost und Kältesumme
  L("## e) Frost und Kältesumme (beschreibend)");
  L();
  const gruppe = (titel, klassenF) =>
    G.tabelle(
      [titel, "Meldungen", "davon Steinpilz", "Anteil Steinpilz"],
      klassenF.map(([n, f]) => {
        const l = werte.filter(f);
        return [
          n,
          G.zahl(l.length),
          String(l.filter((x) => x.st).length),
          pc(l.filter((x) => x.st).length, l.length),
        ];
      }),
    );
  L(
    gruppe("Frostnächte (Tmin ≤ 0 °C) in 14 Tagen", [
      ["0", (x) => x.frost14 === 0],
      ["1", (x) => x.frost14 === 1],
      ["2 und mehr", (x) => x.frost14 >= 2],
    ]),
  );
  L(
    gruppe("Kältesumme ab 1.9.", [
      ["0", (x) => x.ks === 0],
      ["> 0–25", (x) => x.ks > 0 && x.ks <= 25],
      ["> 25–60", (x) => x.ks > 25 && x.ks <= 60],
      ["> 60", (x) => x.ks > 60],
    ]),
  );

  // --- f) Standort
  L("## f) Standort: Beobachtung gegen die Gewichte W (Steinpilz)");
  L();
  L(
    "Verhältnis = Anteil der Klasse bei Steinpilz ÷ Anteil im Hintergrund (> 1 = bei Steinpilz häufiger). " +
      "W = Gewicht im Modell (`W.<merkmal>.<klasse>.st`, 0–10). „Widerspruch“: Verhältnis und Gewicht zeigen in " +
      "verschiedene Richtungen (Verhältnis > 1,2 bei W unter dem Mittel oder < 0,8 bei W darüber; Mittel = W " +
      "gewichtet mit der Häufigkeit der Klassen im Hintergrund), „neutral“ = Verhältnis 0,8–1,2; nur bei mindestens " +
      "5 Steinpilzmeldungen der Klasse.",
  );
  L();
  const hoeheKl = (h) =>
    h < 500
      ? "< 500 m"
      : h < 700
        ? "500–700 m"
        : h < 900
          ? "700–900 m"
          : h < 1200
            ? "900–1200 m"
            : "≥ 1200 m";
  const MERK = [
    ["baum", "Baumart (Modellklasse)", (x) => x.f.baum],
    ["boden", "Boden", (x) => x.f.boden],
    ["lage", "Lage", (x) => x.f.lage],
    ["hoehe", "Höhe", (x) => hoeheKl(x.hoehe)],
  ];
  const widersprueche = [];
  MERK.forEach(([k, titel, f]) => {
    L("### " + titel);
    L();
    const kl = [...new Set(werte.map(f))];
    // Vergleich gegen das Mittel von W, gewichtet mit der Häufigkeit der Klassen im Hintergrund
    let ws = 0,
      wn = 0;
    werte.forEach((x) => {
      const c = f(x);
      if (!x.st && A.W[k] && A.W[k][c]) {
        ws += A.W[k][c].st;
        wn++;
      }
    });
    const wMittel = wn ? ws / wn : null;
    L(
      G.tabelle(
        [titel, "Steinpilz", "Hintergrund", "Verhältnis", "W (st)", "Richtung"],
        kl
          .map((c) => {
            const p = werte.filter((x) => x.st && f(x) === c).length,
              h = werte.filter((x) => !x.st && f(x) === c).length,
              vh = h ? p / nSt / (h / nHg) : null,
              w = A.W[k] && A.W[k][c] ? A.W[k][c].st : null;
            let r = "";
            if (w !== null && vh !== null && p >= 5) {
              if ((vh > 1.2 && w < wMittel) || (vh < 0.8 && w > wMittel)) {
                r = "**Widerspruch**";
                widersprueche.push(titel + " " + c + " (Verhältnis " + k2(vh) + ", W " + w + ")");
              } else if (vh >= 0.8 && vh <= 1.2) r = "neutral";
              else r = "passt";
            } else if (w === null) r = "nicht im Modell";
            else r = "zu wenige";
            return [c, String(p), G.zahl(h), vh === null ? "–" : k2(vh), w === null ? "–" : String(w), r, h];
          })
          .sort((a, b) => b[6] - a[6])
          .map((z) => z.slice(0, 6)),
      ),
    );
  });
  L(
    "Höhe hat im Modell kein eigenes Standortgewicht; sie wirkt nur über die Regenverzögerung (`hoehenDehnung`) " +
      "und – am Pin – über die Temperatur.",
  );
  L();

  // --- g) Grenzen
  L("## g) Grenzen");
  L();
  L(
    "- **Fallzahl:** " +
      nSt +
      " Steinpilzmeldungen – die AUC-Spannen sind entsprechend breit; Einzelfaktoren und Klassen mit wenigen " +
      "Fällen sind Hinweise, keine Belege.",
  );
  L(
    "- **Suchaufwand:** Der Hintergrund zeigt, wo und wann gesucht wurde – aber nicht, wonach. Wer gezielt Steinpilze " +
      "sucht, geht nach Regen in Fichtenwälder; das stärkt die Trennung des Modells womöglich künstlich. " +
      "Pilzmeldungen allgemein häufen sich bei feuchtem Wetter, das schwächt die Wettertrennung.",
  );
  L(
    "- **Fehlbestimmungen:** Steinpilz/Sommersteinpilz werden verwechselt (deshalb zusammengefasst); " +
      "iNaturalist „Research grade“ braucht zwei übereinstimmende Bestimmungen.",
  );
  L(
    "- **Baumartenkarte 2017/18** für Meldungen 2015–2025 (Käferflächen, Umbau); Boden aus der ÜBK25, " +
      "Grundstock 150 m gegenüber Meldungen mit bis zu 500 m Unsicherheit.",
  );
  L("- **Unterwuchs und Bestand unbekannt** → fest Moos und 15–25 m; Struktur „innen“.");
  L(
    "- **Wetter:** ET0 geschätzt (Hargreaves), keine Bodenfeuchte; HYRAS-Tageswerte 06–06 UTC; Temperatur der " +
      "1-km-Zelle statt des Meldeorts.",
  );
  L();

  // --- h) Urteil
  L("## h) Urteil");
  L();
  const a = (l, f) => auc(l.filter((x) => x.st).map(f), l.filter((x) => !x.st).map(f));
  const aE = a(werte, (x) => x.endwert),
    aS = a(werte, (x) => x.saison),
    aSG = a(werte, (x) => x.sg),
    aWF = a(werte, (x) => x.wf),
    aE2 = a(aug, (x) => x.endwert),
    aS2 = a(aug, (x) => x.saison),
    aWF2 = a(aug, (x) => x.wf);
  const pos = (f, l) => l.filter((x) => x.st).map(f),
    neg = (f, l) => l.filter((x) => !x.st).map(f),
    sE = aucSpanne(
      pos((x) => x.endwert, werte),
      neg((x) => x.endwert, werte),
    ),
    besser = sE[0] > 0.5 && aE > aS + 0.05;
  // Satz 1: trennt das Modell besser als „nur Saison“?
  L(
    (besser ? "Ja – " : "Nein – ") +
      "der Endwert trennt Steinpilz vom Hintergrund " +
      (besser ? "besser" : "nicht besser") +
      " als „nur Saison“: AUC " +
      k2(aE) +
      " (" +
      k2(sE[0]) +
      "–" +
      k2(sE[1]) +
      ") gegen " +
      k2(aS) +
      " über Juni–November, innerhalb August–Oktober " +
      k2(aE2) +
      " gegen " +
      k2(aS2) +
      (sE[0] <= 0.5 ? "; die Spanne des Endwerts schließt den Zufall (0,5) ein." : "."),
  );
  // Satz 2: welcher Teil trägt?
  const teile = EINZEL.map(([n, f]) => [n.replace(/ \(.*\)$/, ""), auc(pos(f, werte), neg(f, werte))]).sort(
    (x, y) => y[1] - x[1],
  );
  L(
    (teile[0][1] < 0.6 ? "Kein Teil trägt deutlich – am stärksten sind " : "Am stärksten tragen ") +
      teile[0][0] +
      " (" +
      k2(teile[0][1]) +
      ") und " +
      teile[1][0] +
      " (" +
      k2(teile[1][1]) +
      "), Standortgüte " +
      k2(aSG) +
      " und Wetterfaktor " +
      k2(aWF) +
      " liegen gleichauf; innerhalb der Hauptsaison (Aug.–Okt.) fällt der Wetterfaktor auf " +
      k2(aWF2) +
      ".",
  );
  // Satz 3: Stufe 3 – erwartete Spanne bei mehr Fällen (Breite ∝ 1/√n, Ausbeute wie im jetzigen Gebiet)
  if (VG && VG.gebiet) {
    const ausbeute = nSt / VG.gebiet,
      halb = (sE[1] - sE[0]) / 2,
      nBy = Math.round(VG.bayern * ausbeute),
      nDe = Math.round(VG.deutschland * ausbeute),
      hw = (n) => (halb * Math.sqrt(nSt / n)).toFixed(2).replace(".", ",");
    L(
      "Mit " +
        nSt +
        " Fällen ist die Spanne ±" +
        halb.toFixed(2).replace(".", ",") +
        " – Unterschiede unter ≈ 0,1 sind nicht messbar; Bayern brächte bei gleicher Ausbeute etwa " +
        nBy +
        " Fälle (±" +
        hw(nBy) +
        "), ganz Deutschland etwa " +
        G.zahl(nDe) +
        " (±" +
        hw(nDe) +
        "), deshalb lohnt Stufe 3 nur als deutschlandweite Prüfung (Zählung GBIF " +
        VG.abgerufen +
        ": Steinpilz Juni–Nov. 2015–2025 mit Unsicherheit ≤ 500 m – Gebiet " +
        VG.gebiet +
        ", Bayern " +
        VG.bayern +
        ", Deutschland " +
        G.zahl(VG.deutschland) +
        ").",
    );
  }
  if (widersprueche.length) {
    L();
    L("Richtungs-Widersprüche Standort: " + widersprueche.join("; ") + ".");
  }
  return t;
}

async function hauptprogramm() {
  log("Meldungen filtern …");
  const M = meldungenLaden();
  log(
    M.meldungen.length,
    "Meldungen nach Filtern und Dubletten, davon",
    M.meldungen.filter((r) => r.st).length,
    "Steinpilz",
  );
  const reihen = await reihenBauen(M.meldungen);
  log("Modell rechnen …");
  const W = rechnen(M.meldungen, reihen);
  G.schreiben(path.join(G.CACHE, "stufe2-werte.json"), W.werte); // für Nachprüfungen (nicht im Repo)
  const VG = await vergleichZaehlen(G.lesen(path.join(G.CACHE, "taxa.json")));
  const text = bericht(M, W, et0Vergleich(), VG);
  fs.writeFileSync(path.join(G.BERICHTE, "gbif-stufe2.md"), text);
  log("Bericht geschrieben: werkzeuge/berichte/gbif-stufe2.md");
}
// Nachschau (gbif-nachschau.js) nutzt Filter, Reihen und Rechnung von hier
module.exports = { A, meldungenLaden, reihenBauen, rechnen, auc, aucSpanne, zufall, JAHR_AB, JAHR_BIS };
if (require.main === module)
  hauptprogramm().catch((e) => {
    console.error(e.stack || e.message);
    process.exit(1);
  });
