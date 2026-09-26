// GBIF Stufe 1: Bestandsaufnahme der Pilzmeldungen im Grundstock-Gebiet (Auftrag G).
// Aufruf:  cd werkzeuge && node gbif.js [--nur-zaehlen] [--offline]
//   --nur-zaehlen  nur die Zählungen (Facetten), keine Einzelmeldungen
//   --offline      nur aus dem Zwischenspeicher auswerten, keine Abrufe
// Quelle: öffentliche GBIF-API ohne Konto (api.gbif.org/v1). Filter: country=DE, basisOfRecord=HUMAN_OBSERVATION,
// hasCoordinate=true, hasGeospatialIssue=false, Rechteck des Grundstocks (meta.json), Jahre 2015 bis heute.
// Abrufe höchstens 1/s; jede Seite (300 Meldungen) liegt einzeln im Zwischenspeicher werkzeuge/cache/gbif/ –
// Abbruch (Strg+C) und Fortsetzen sind jederzeit möglich. Der Zwischenspeicher wird NICHT committet: Teile stehen
// unter CC BY-NC, genaue Fundorte geschützter Arten (Steinpilz, Pfifferling: BArtSchV „besonders geschützt“)
// gehören nicht in ein öffentliches Repo. Beobachternamen nur als Hash (mit lokalem Salz, für Dubletten).
// Ergebnis: werkzeuge/berichte/gbif-stufe1.md (nur Zählungen und Anteile) + gbif-stufe1-zellen.png (10-km-Zellen).
// Nur Standardbibliothek (fetch, zlib, crypto) – PNG lesen/schreiben von Hand (RGB, 8 bit, ohne Interlace).
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

const WURZEL = path.join(__dirname, "..");
const META = JSON.parse(fs.readFileSync(path.join(WURZEL, "daten", "grundstock", "meta.json"), "utf8"));
const R = META.raster;
const CACHE = path.join(__dirname, "cache", "gbif");
const BERICHTE = path.join(__dirname, "berichte");
const API = "https://api.gbif.org/v1/";
const JAHR_AB = 2015,
  JAHR_BIS = new Date().getFullYear(),
  SEITE = 300;
const ARGS = process.argv.slice(2);
const NUR_ZAEHLEN = ARGS.includes("--nur-zaehlen"),
  OFFLINE = ARGS.includes("--offline");

// Arten wie in index.html (Zielarten, Zeiger = BEGLEIT). Mehrere Namen = in GBIF getrennt geführte Arten, die im
// Gelände dieselbe Art meinen (Flockenstieliger Hexenröhrling: N. erythropus, N. luridiformis, B. erythropus).
const ARTEN = [
  { id: "st", name: "Fichtensteinpilz", gruppe: "ziel", namen: ["Boletus edulis"] },
  { id: "pf", name: "Pfifferling", gruppe: "ziel", namen: ["Cantharellus cibarius"] },
  { id: "som", name: "Sommersteinpilz", gruppe: "ziel", namen: ["Boletus reticulatus"] },
  { id: "marone", name: "Marone", gruppe: "zeiger", namen: ["Imleria badia"] },
  {
    id: "hexflock",
    name: "Flockenstieliger Hexenröhrling",
    gruppe: "zeiger",
    namen: ["Neoboletus erythropus", "Neoboletus luridiformis", "Boletus erythropus"],
  },
  { id: "hexnetz", name: "Netzstieliger Hexenröhrling", gruppe: "zeiger", namen: ["Suillellus luridus"] },
  { id: "fliegen", name: "Fliegenpilz", gruppe: "zeiger", namen: ["Amanita muscaria"] },
  { id: "pfeffer", name: "Pfefferröhrling", gruppe: "zeiger", namen: ["Chalciporus piperatus"] },
  { id: "semmel", name: "Semmelstoppelpilz", gruppe: "zeiger", namen: ["Hydnum repandum"] },
];
// Flechten: fast ganz in diesen Klassen; lichenisierte Arten anderer Klassen (v. a. Verrucariales) über die Ordnung.
// Einzelne lichenisierte Gattungen in sonst nicht lichenisierten Ordnungen bleiben drin (im Bericht vermerkt).
const FLECHTEN_KLASSEN = [
  "Lecanoromycetes",
  "Arthoniomycetes",
  "Lichinomycetes",
  "Coniocybomycetes",
  "Candelariomycetes",
];
const FLECHTEN_ORDNUNGEN = ["Verrucariales"];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function lesen(datei) {
  try {
    return JSON.parse(fs.readFileSync(datei, "utf8"));
  } catch (e) {
    return null;
  }
}
function schreiben(datei, obj) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const tmp = datei + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, datei); // erst vollständig, dann sichtbar – ein Abbruch hinterlässt keine halbe Seite
}

// ---------- Abrufe (höchstens 1 je Sekunde, Wiederholung bei 429/5xx)
let letzterAbruf = 0,
  abrufe = 0;
async function holen(pfad) {
  if (OFFLINE) throw new Error("offline: " + pfad + " fehlt im Zwischenspeicher");
  for (let versuch = 0; ; versuch++) {
    const warten = letzterAbruf + 1000 - Date.now();
    if (warten > 0) await pause(warten);
    letzterAbruf = Date.now();
    abrufe++;
    let r;
    try {
      r = await fetch(API + pfad, { headers: { "User-Agent": "SchwammerlIO-gbif-stufe1" } });
    } catch (e) {
      r = { ok: false, status: "Netz: " + e.message };
    }
    if (r.ok) return r.json();
    if (versuch >= 3 || !(r.status === 429 || r.status >= 500 || typeof r.status === "string"))
      throw new Error("GBIF " + r.status + " bei " + pfad);
    log("GBIF", r.status, "– neuer Versuch in", 10 * (versuch + 1), "s");
    await pause(10000 * (versuch + 1));
  }
}
async function gemerkt(datei, pfad, maxAlterTage) {
  const d = path.join(CACHE, datei);
  const alt = fs.existsSync(d) && (Date.now() - fs.statSync(d).mtimeMs) / 864e5;
  if (alt !== false && (OFFLINE || maxAlterTage === undefined || alt <= maxAlterTage)) return lesen(d);
  const j = await holen(pfad);
  schreiben(d, j);
  return j;
}

// ---------- Filter
const FILTER = [
  "country=DE",
  "basisOfRecord=HUMAN_OBSERVATION",
  "hasCoordinate=true",
  "hasGeospatialIssue=false",
  "decimalLatitude=" + R.latS.toFixed(5) + "," + R.latN.toFixed(5),
  "decimalLongitude=" + R.lngW.toFixed(5) + "," + R.lngE.toFixed(5),
].join("&");
const suche = (taxa, extra) =>
  "occurrence/search?" + FILTER + "&" + taxa.map((k) => "taxonKey=" + k).join("&") + "&" + extra;

// ---------- 1. Taxon-Schlüssel auflösen (species/match), nicht fest eingetragen
async function taxaAufloesen() {
  const t = { arten: {}, flechten: [], fungi: null };
  const match = async (name, rank) => {
    const j = await gemerkt(
      "match/" + name.replace(/ /g, "_") + ".json",
      "species/match?kingdom=Fungi&name=" + encodeURIComponent(name) + (rank ? "&rank=" + rank : ""),
      90,
    );
    return {
      name,
      key: j.usageKey,
      wissenschaftlich: j.scientificName,
      status: j.status,
      matchType: j.matchType,
      akzeptiert: j.acceptedUsageKey || null,
    };
  };
  t.fungi = await match("Fungi", "KINGDOM");
  for (const a of ARTEN) {
    t.arten[a.id] = [];
    for (const n of a.namen) {
      const m = await match(n);
      if (!m.key || m.matchType === "NONE") throw new Error("kein GBIF-Treffer für " + n);
      m.suchKey = m.akzeptiert || m.key; // Synonym → akzeptierter Name (taxonKey schließt dessen Synonyme ein)
      t.arten[a.id].push(m);
    }
  }
  for (const n of FLECHTEN_KLASSEN)
    t.flechten.push(Object.assign(await match(n, "CLASS"), { rang: "Klasse" }));
  for (const n of FLECHTEN_ORDNUNGEN)
    t.flechten.push(Object.assign(await match(n, "ORDER"), { rang: "Ordnung" }));
  return t;
}

// ---------- 2. Zählen (limit=0 mit Facetten)
async function zaehlen(taxa) {
  const z = {};
  const facetten = async (id, keys) => {
    const j = await gemerkt(
      "zaehlung/" + id + ".json",
      suche(
        keys,
        "year=" +
          JAHR_AB +
          "," +
          JAHR_BIS +
          "&limit=0&facet=year&facet=month&facet=datasetKey&facetLimit=200",
      ),
      1,
    );
    const f = {};
    (j.facets || []).forEach(
      (x) => (f[x.field] = Object.fromEntries(x.counts.map((c) => [c.name, c.count]))),
    );
    return { anzahl: j.count, jahr: f.YEAR || {}, monat: f.MONTH || {}, datensatz: f.DATASET_KEY || {} };
  };
  for (const a of ARTEN)
    z[a.id] = await facetten(
      a.id,
      taxa.arten[a.id].map((m) => m.suchKey),
    );
  z.fungi = await facetten("fungi", [taxa.fungi.key]);
  // Flechten je Jahr (für „Hintergrund ohne Flechten“)
  z.flechten = await facetten(
    "flechten",
    taxa.flechten.map((m) => m.key),
  );
  return z;
}

// ---------- 3. Einzelmeldungen (Seiten à 300, je Jahr, Zwischenspeicher je Seite)
function saltLesen() {
  const d = path.join(CACHE, "salz.txt");
  if (!fs.existsSync(d)) {
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(d, crypto.randomBytes(16).toString("hex"));
  }
  return fs.readFileSync(d, "utf8").trim();
}
const SALZ = saltLesen();
const beobachterHash = (s) =>
  s
    ? crypto
        .createHash("sha256")
        .update(SALZ + String(s).trim().toLowerCase())
        .digest("hex")
        .slice(0, 12)
    : null;
// Nur die Felder, die die Auswertung braucht; Beobachter nur als Hash
function kuerzen(r) {
  return {
    k: r.key,
    t: r.speciesKey || r.acceptedTaxonKey || r.taxonKey,
    c: r.classKey || null,
    o: r.orderKey || null,
    la: r.decimalLatitude,
    ln: r.decimalLongitude,
    u: r.coordinateUncertaintyInMeters === undefined ? null : r.coordinateUncertaintyInMeters,
    j: r.year || null,
    m: r.month || null,
    d: r.day || null,
    e: r.eventDate || null,
    ds: r.datasetKey,
    li: lizenzKurz(r.license),
    b: beobachterHash(r.recordedBy),
  };
}
function lizenzKurz(l) {
  if (!l) return "unbekannt";
  const m = /licenses\/([a-z-]+)\//.exec(l) || /publicdomain\/(zero)/.exec(l);
  return m ? (m[1] === "zero" ? "CC0" : "CC " + m[1].toUpperCase()) : l;
}
async function meldungenLaden(id, keys, jahrZahl) {
  const alle = [];
  let seiten = 0,
    neu = 0;
  for (let jahr = JAHR_AB; jahr <= JAHR_BIS; jahr++) {
    const n = jahrZahl[jahr] || 0;
    for (let off = 0; off < n; off += SEITE) {
      const datei = path.join(CACHE, "seiten", id, jahr + "-" + off + ".json");
      // laufendes Jahr wächst noch: nach 7 Tagen neu holen; abgeschlossene Jahre bleiben
      const frisch =
        fs.existsSync(datei) && (jahr < JAHR_BIS || (Date.now() - fs.statSync(datei).mtimeMs) / 864e5 < 7);
      let s = frisch || OFFLINE ? lesen(datei) : null;
      if (!s && !OFFLINE) {
        const j = await holen(suche(keys, "year=" + jahr + "&limit=" + SEITE + "&offset=" + off));
        s = j.results.map(kuerzen);
        schreiben(datei, s);
        neu++;
        if (neu % 10 === 0) log(id, jahr, "Seite", off / SEITE + 1, "von", Math.ceil(n / SEITE));
      }
      if (s) {
        seiten++;
        s.forEach((r) => alle.push(r));
      }
    }
  }
  // Seitengrenzen können sich zwischen Abrufen verschieben → nach GBIF-Schlüssel entdoppeln
  const m = new Map();
  alle.forEach((r) => m.set(r.k, r));
  return { meldungen: [...m.values()], seiten, neu };
}

// ---------- PNG (RGB, 8 bit) lesen und schreiben, nur Standardbibliothek
function pngLesen(datei) {
  const b = fs.readFileSync(datei);
  let p = 8,
    breite = 0,
    hoehe = 0,
    typ = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p),
      art = b.toString("ascii", p + 4, p + 8),
      d = b.subarray(p + 8, p + 8 + len);
    if (art === "IHDR") {
      breite = d.readUInt32BE(0);
      hoehe = d.readUInt32BE(4);
      typ = d[9];
      if (d[8] !== 8 || (typ !== 2 && typ !== 6) || d[12] !== 0)
        throw new Error(datei + ": nur RGB/RGBA 8 bit");
    } else if (art === "IDAT") idat.push(d);
    p += 12 + len;
  }
  const bpp = typ === 6 ? 4 : 3,
    zeile = breite * bpp,
    roh = zlib.inflateSync(Buffer.concat(idat)),
    px = Buffer.alloc(zeile * hoehe);
  for (let y = 0; y < hoehe; y++) {
    const f = roh[y * (zeile + 1)],
      q = y * (zeile + 1) + 1,
      z = y * zeile;
    for (let x = 0; x < zeile; x++) {
      const a = x >= bpp ? px[z + x - bpp] : 0,
        o = y ? px[z - zeile + x] : 0,
        c = x >= bpp && y ? px[z - zeile + x - bpp] : 0;
      let v = roh[q + x];
      if (f === 1) v += a;
      else if (f === 2) v += o;
      else if (f === 3) v += (a + o) >> 1;
      else if (f === 4) {
        const pa = Math.abs(o - c),
          pb = Math.abs(a - c),
          pc = Math.abs(a + o - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? o : c;
      }
      px[z + x] = v & 255;
    }
  }
  return { breite, hoehe, bpp, px };
}
function pngSchreiben(datei, breite, hoehe, rgb) {
  const chunk = (art, d) => {
    const l = Buffer.alloc(4),
      c = Buffer.alloc(4),
      a = Buffer.from(art, "ascii");
    l.writeUInt32BE(d.length);
    c.writeUInt32BE(zlib.crc32(Buffer.concat([a, d])) >>> 0);
    return Buffer.concat([l, a, d, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const roh = Buffer.alloc((breite * 3 + 1) * hoehe);
  for (let y = 0; y < hoehe; y++)
    rgb.copy(roh, y * (breite * 3 + 1) + 1, y * breite * 3, (y + 1) * breite * 3);
  fs.writeFileSync(
    datei,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(roh, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

// ---------- Grundstock an der Meldestelle (wie grundstockAmPunkt in index.html)
let GS = null;
function grundstockLaden() {
  const g = pngLesen(path.join(WURZEL, "daten", "grundstock", "grundlage.png")),
    h = pngLesen(path.join(WURZEL, "daten", "grundstock", "hoehe.png"));
  GS = { g, h };
}
function grundstockAm(la, ln) {
  const i = Math.floor((R.latN - la) / R.dLat),
    j = Math.floor((ln - R.lngW) / R.dLng);
  if (i < 0 || j < 0 || i >= R.NY || j >= R.NX) return null;
  const q = i * R.NX + j,
    g = GS.g.px,
    h = GS.h.px,
    bg = GS.g.bpp,
    bh = GS.h.bpp;
  return {
    baum: g[q * bg],
    boden: g[q * bg + 1],
    lage: g[q * bg + 2],
    hoehe: h[q * bh] * 12,
    dichte: h[q * bh + 1] <= 100 ? h[q * bh + 1] : null, // Kronendichte %, 255 = unbekannt
    daten: h[q * bh + 2] !== 0,
  };
}

// ---------- Auswertung
const KM_LAT = 111.32,
  KM_LNG = 111.32 * Math.cos((R.mitte[0] * Math.PI) / 180);
function zelle(r, km) {
  return Math.floor(((R.latN - r.la) * KM_LAT) / km) + ":" + Math.floor(((r.ln - R.lngW) * KM_LNG) / km);
}
function kmAbstand(a, b) {
  return Math.hypot((a.la - b.la) * KM_LAT, (a.ln - b.ln) * KM_LNG);
}
function tagesDatum(r) {
  if (!r.j || !r.m || !r.d) return false;
  if (r.e && r.e.indexOf("/") > 0) {
    const [a, b] = r.e.split("/");
    return a.slice(0, 10) === b.slice(0, 10); // Spanne über mehrere Tage = kein Tagesdatum
  }
  return true;
}
function isoWoche(r) {
  const d = new Date(Date.UTC(r.j, r.m - 1, r.d));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); // Donnerstag derselben Woche
  const jahr = d.getUTCFullYear(),
    erster = new Date(Date.UTC(jahr, 0, 4));
  const woche = 1 + Math.round(((d - erster) / 864e5 - 3 + ((erster.getUTCDay() + 6) % 7)) / 7);
  return jahr + "-W" + String(woche).padStart(2, "0");
}
const wochentag = (r) => new Date(Date.UTC(r.j, r.m - 1, r.d)).getUTCDay(); // 0 = Sonntag
const pct = (a, b) => (b ? ((100 * a) / b).toFixed(b >= 1000 ? 1 : 0).replace(".", ",") + " %" : "–");
const zahl = (x) => (x === null || x === undefined ? "–" : Number(x).toLocaleString("de-DE"));
function unsicherKlasse(u) {
  if (u === null) return "unbekannt";
  if (u <= 150) return "≤ 150 m";
  if (u <= 500) return "≤ 500 m";
  if (u <= 1000) return "≤ 1000 m";
  return "größer";
}
const U_KLASSEN = ["≤ 150 m", "≤ 500 m", "≤ 1000 m", "größer", "unbekannt"];
// Dubletten: gleicher Beobachter-Hash, gleicher Tag, gleiche Art, < 200 m → alle außer der ersten
function dubletten(liste) {
  const gruppen = new Map();
  let n = 0;
  liste.forEach((r) => {
    if (!r.b || !tagesDatum(r)) return;
    const k = r.b + "|" + r.j + "-" + r.m + "-" + r.d + "|" + r.t;
    if (!gruppen.has(k)) gruppen.set(k, []);
    const g = gruppen.get(k);
    if (g.some((x) => kmAbstand(x, r) < 0.2)) n++;
    else g.push(r);
  });
  return n;
}
function hoeheKlasse(h) {
  return h < 500
    ? "< 500 m"
    : h < 700
      ? "500–700 m"
      : h < 900
        ? "700–900 m"
        : h < 1200
          ? "900–1200 m"
          : "≥ 1200 m";
}
const H_KLASSEN = ["< 500 m", "500–700 m", "700–900 m", "900–1200 m", "≥ 1200 m"];

function tabelle(kopf, zeilen) {
  return (
    "| " +
    kopf.join(" | ") +
    " |\n|" +
    kopf.map((k, i) => (i ? "---:" : "---")).join("|") +
    "|\n" +
    zeilen.map((z) => "| " + z.join(" | ") + " |").join("\n") +
    "\n"
  );
}

async function hauptprogramm() {
  fs.mkdirSync(CACHE, { recursive: true });
  log("Taxa auflösen …");
  const taxa = await taxaAufloesen();
  schreiben(path.join(CACHE, "taxa.json"), taxa);
  log("Zählen …");
  const Z = await zaehlen(taxa);
  const flechtenKeys = new Set(taxa.flechten.map((m) => m.key));
  const istFlechte = (r) => flechtenKeys.has(r.c) || flechtenKeys.has(r.o);
  // Datensätze benennen
  const dsKeys = new Set(Object.keys(Z.fungi.datensatz));
  const DS = {};
  for (const k of dsKeys) {
    const j = await gemerkt("datensatz/" + k + ".json", "dataset/" + k, 90);
    DS[k] = { titel: j.title, lizenz: lizenzKurz(j.license) };
  }
  if (NUR_ZAEHLEN) log("nur gezählt – keine Einzelmeldungen");

  // Einzelmeldungen: Ziel- und Zeigerarten, dazu der Hintergrund (alle Pilze) für Woche × Zelle und Standort
  const M = {};
  let seitenGesamt = 0;
  if (!NUR_ZAEHLEN) {
    for (const a of ARTEN) {
      const x = await meldungenLaden(
        a.id,
        taxa.arten[a.id].map((m) => m.suchKey),
        Z[a.id].jahr,
      );
      M[a.id] = x.meldungen;
      seitenGesamt += x.seiten;
      log(a.name + ":", x.meldungen.length, "Meldungen,", x.seiten, "Seiten (" + x.neu + " neu)");
    }
    const h = await meldungenLaden("fungi", [taxa.fungi.key], Z.fungi.jahr);
    M.fungi = h.meldungen;
    seitenGesamt += h.seiten;
    log("Hintergrund:", h.meldungen.length, "Meldungen,", h.seiten, "Seiten (" + h.neu + " neu)");
  }
  log("Abrufe in diesem Lauf:", abrufe);
  grundstockLaden();
  const text = bericht(taxa, Z, DS, M, istFlechte, seitenGesamt);
  fs.mkdirSync(BERICHTE, { recursive: true });
  fs.writeFileSync(path.join(BERICHTE, "gbif-stufe1.md"), text);
  log("Bericht geschrieben: werkzeuge/berichte/gbif-stufe1.md");
}

function bericht(taxa, Z, DS, M, istFlechte, seitenGesamt) {
  const heute = new Date().toISOString().slice(0, 10);
  const jahre = [];
  for (let j = JAHR_AB; j <= JAHR_BIS; j++) jahre.push(j);
  const hgJahr = (j) => (Z.fungi.jahr[j] || 0) - (Z.flechten.jahr[j] || 0);
  const hgGesamt = Z.fungi.anzahl - Z.flechten.anzahl;
  let t = "";
  const L = (s) => (t += (s === undefined ? "" : s) + "\n");

  L("# GBIF Stufe 1 – Bestandsaufnahme der Pilzmeldungen");
  L();
  L(
    "Erzeugt von `werkzeuge/gbif.js` am " +
      heute +
      ". Nur Zählungen und Anteile, keine Fundorte. Quelle: GBIF.org (Occurrence Search API, abgerufen " +
      heute +
      ").",
  );
  L();
  L(
    "**Filter:** country=DE, basisOfRecord=HUMAN_OBSERVATION, hasCoordinate=true, hasGeospatialIssue=false, " +
      "Rechteck des Grundstocks " +
      R.latS.toFixed(3) +
      "–" +
      R.latN.toFixed(3) +
      " N, " +
      R.lngW.toFixed(3) +
      "–" +
      R.lngE.toFixed(3) +
      " E (München ±100 km, deutscher Teil), Jahre " +
      JAHR_AB +
      "–" +
      JAHR_BIS +
      " (" +
      JAHR_BIS +
      " unvollständig).",
  );
  L();

  // --- Taxa
  L("## Taxon-Schlüssel (species/match)");
  L();
  const tz = [];
  ARTEN.forEach((a) =>
    taxa.arten[a.id].forEach((m) =>
      tz.push([
        a.name + (a.gruppe === "ziel" ? " (Ziel)" : " (Zeiger)"),
        "*" + m.wissenschaftlich + "*",
        m.status + (m.akzeptiert ? " → " + m.akzeptiert : ""),
        String(m.suchKey),
      ]),
    ),
  );
  tz.push([
    "Hintergrund",
    "*" + taxa.fungi.wissenschaftlich + "*",
    taxa.fungi.status,
    String(taxa.fungi.key),
  ]);
  taxa.flechten.forEach((m) =>
    tz.push([
      "Flechten (abgezogen)",
      "*" + m.wissenschaftlich + "* (" + m.rang + ")",
      m.status,
      String(m.key),
    ]),
  );
  L(tabelle(["Gruppe", "GBIF-Name", "Status", "taxonKey"], tz));
  L(
    "Die Suche über `taxonKey` schließt Synonyme ein (z. B. *Boletus " +
      "aestivalis* → *B. reticulatus*, *Xerocomus badius* → " +
      "*Imleria badia*). Beim Flockenstieligen Hexenröhrling führt GBIF drei Namen als eigene Arten; sie sind hier " +
      "zusammengefasst. Flechten: abgezogen über die Klassen oben und " +
      "die Ordnung Verrucariales; einzelne lichenisierte " +
      "Gattungen in anderen Ordnungen bleiben im Hintergrund (geringer Anteil).",
  );
  L();

  // --- a) Menge
  L("## a) Menge");
  L();
  L("### Meldungen je Art und Jahr");
  L();
  const zeilenJahr = ARTEN.map((a) => [
    a.name,
    ...jahre.map((j) => zahl(Z[a.id].jahr[j] || 0)),
    "**" + zahl(Z[a.id].anzahl) + "**",
  ]);
  zeilenJahr.push([
    "Hintergrund (Pilze ohne Flechten)",
    ...jahre.map((j) => zahl(hgJahr(j))),
    "**" + zahl(hgGesamt) + "**",
  ]);
  zeilenJahr.push([
    "Flechten (abgezogen)",
    ...jahre.map((j) => zahl(Z.flechten.jahr[j] || 0)),
    zahl(Z.flechten.anzahl),
  ]);
  L(tabelle(["Art", ...jahre.map(String), "gesamt"], zeilenJahr));
  const a15 = hgJahr(2015) + hgJahr(2016) + hgJahr(2017),
    a23 = hgJahr(2023) + hgJahr(2024) + hgJahr(2025);
  L(
    "Suchaufwand wächst: Hintergrund 2023–2025 = " +
      (a23 / Math.max(1, a15)).toFixed(1).replace(".", ",") +
      "× so viele Meldungen wie 2015–2017. Anteile je Art an allen Pilzmeldungen (Ziel/Hintergrund) sind daher " +
      "aussagekräftiger als absolute Zahlen.",
  );
  L();
  const anteil = (a, b) => ((100 * a) / b).toFixed(2).replace(".", ",") + " %";
  L(
    "Zum Vergleich Kinoko (modell/README.md, ganz Deutschland, alle Jahre): 746 827 Pilzmeldungen, davon 4 659 " +
      "*B. edulis* (" +
      anteil(4659, 746827) +
      ") und 2 174 *C. cibarius* (" +
      anteil(2174, 746827) +
      "). Hier: Steinpilz " +
      anteil(Z.st.anzahl, hgGesamt) +
      ", Pfifferling " +
      anteil(Z.pf.anzahl, hgGesamt) +
      " des Hintergrunds; das Gebiet hält " +
      anteil(Z.fungi.anzahl, 746827) +
      " der deutschen Pilzmeldungen (mit Flechten).",
  );
  L();
  L("### Saisonkurve (Meldungen je Monat, alle Jahre)");
  L();
  const monate = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const hgMonat = (m) => (Z.fungi.monat[m] || 0) - (Z.flechten.monat[m] || 0);
  const zm = ARTEN.map((a) => [a.name, ...monate.map((x, i) => zahl(Z[a.id].monat[i + 1] || 0))]);
  zm.push(["Hintergrund", ...monate.map((x, i) => zahl(hgMonat(i + 1)))]);
  zm.push([
    "Steinpilz je 1000 Hintergrund",
    ...monate.map((x, i) =>
      hgMonat(i + 1)
        ? ((1000 * (Z.st.monat[i + 1] || 0)) / hgMonat(i + 1)).toFixed(1).replace(".", ",")
        : "–",
    ),
  ]);
  zm.push([
    "Pfifferling je 1000 Hintergrund",
    ...monate.map((x, i) =>
      hgMonat(i + 1)
        ? ((1000 * (Z.pf.monat[i + 1] || 0)) / hgMonat(i + 1)).toFixed(1).replace(".", ",")
        : "–",
    ),
  ]);
  L(tabelle(["Art", ...monate], zm));

  if (!M.fungi) {
    L(
      "_Nur gezählt (`--nur-zaehlen`) – Qualität, Raum, Standort und Tauglichkeit brauchen die Einzelmeldungen._",
    );
    return t;
  }

  const HG = M.fungi.filter((r) => !istFlechte(r));
  const gruppen = ARTEN.map((a) => ({ id: a.id, name: a.name, r: M[a.id] })).concat([
    { id: "hg", name: "Hintergrund", r: HG },
  ]);

  // --- b) Qualität
  L("## b) Qualität");
  L();
  L(
    tabelle(
      [
        "Art",
        "Meldungen",
        "mit Tagesdatum",
        ...U_KLASSEN.map((k) => "Unsicherheit " + k),
        "Dubletten",
        "Beobachter",
        "größter Beobachter",
      ],
      gruppen.map((g) => {
        const n = g.r.length,
          u = {};
        g.r.forEach((r) => (u[unsicherKlasse(r.u)] = (u[unsicherKlasse(r.u)] || 0) + 1));
        const bz = {};
        g.r.forEach((r) => (bz[r.b] = (bz[r.b] || 0) + 1));
        return [
          g.name,
          zahl(n),
          pct(g.r.filter(tagesDatum).length, n),
          ...U_KLASSEN.map((k) => pct(u[k] || 0, n)),
          zahl(dubletten(g.r)),
          zahl(Object.keys(bz).length),
          pct(Math.max(0, ...Object.values(bz)), n),
        ];
      }),
    ),
  );
  L(
    "Dublette = gleicher Beobachter (Hash), gleicher Tag, gleiche Art, weniger als 200 m entfernt (ohne die erste).",
  );
  L();
  // Verschleierte Fundorte: iNaturalist vergröbert auf Wunsch des Beobachters (bzw. bei Schutzstatus) auf ≈ 0,2°
  const versch = (l) => l.filter((r) => r.u !== null && r.u > 20000 && r.u < 30000);
  const vSt = versch(M.st),
    vBz = {};
  vSt.forEach((r) => (vBz[r.b] = (vBz[r.b] || 0) + 1));
  L(
    "**Verschleierte Fundorte:** Fast alle Meldungen mit Unsicherheit > 1 km stammen von iNaturalist und sind auf " +
      "≈ 27 km vergröbert („Coordinate uncertainty increased … at the " +
      "request of the observer“). Betroffen: Steinpilz " +
      pct(vSt.length, M.st.length) +
      ", Pfifferling " +
      pct(versch(M.pf).length, M.pf.length) +
      ", Marone " +
      pct(versch(M.marone).length, M.marone.length) +
      ", Hintergrund " +
      pct(versch(HG).length, HG.length) +
      ". Beim Steinpilz kommen " +
      zahl(Math.max(0, ...Object.values(vBz))) +
      " der " +
      zahl(vSt.length) +
      " verschleierten Meldungen von einem einzigen Beobachter (v. a. 2023/24) – der Sprung in der Jahresreihe ist " +
      "also ein Einzelner, kein Pilzjahr. Für Ort-genaue Auswertungen bleiben beim Steinpilz " +
      zahl(M.st.filter((r) => r.u === null || r.u <= 1000).length) +
      " Meldungen.",
  );
  L();
  L("### Datensätze und Lizenzen (Hintergrund)");
  L();
  const dsZ = {},
    liZ = {},
    liZiel = {};
  HG.forEach((r) => {
    dsZ[r.ds] = (dsZ[r.ds] || 0) + 1;
    liZ[r.li] = (liZ[r.li] || 0) + 1;
  });
  ["st", "pf", "som"].forEach((id) => M[id].forEach((r) => (liZiel[r.li] = (liZiel[r.li] || 0) + 1)));
  const zielN = M.st.length + M.pf.length + M.som.length;
  L(
    tabelle(
      ["Datensatz", "Lizenz (Datensatz)", "Meldungen", "Anteil", "davon Zielarten"],
      Object.keys(dsZ)
        .sort((a, b) => dsZ[b] - dsZ[a])
        .map((k) => [
          (DS[k] && DS[k].titel) || k,
          (DS[k] && DS[k].lizenz) || "?",
          zahl(dsZ[k]),
          pct(dsZ[k], HG.length),
          zahl(["st", "pf", "som"].reduce((s, id) => s + M[id].filter((r) => r.ds === k).length, 0)),
        ]),
    ),
  );
  L(
    "Lizenz je Meldung – Hintergrund: " +
      Object.keys(liZ)
        .sort((a, b) => liZ[b] - liZ[a])
        .map((k) => k + " " + pct(liZ[k], HG.length))
        .join(", ") +
      "; Zielarten: " +
      Object.keys(liZiel)
        .sort((a, b) => liZiel[b] - liZiel[a])
        .map((k) => k + " " + pct(liZiel[k], zielN))
        .join(", ") +
      ".",
  );
  L();

  // --- c) Raum
  L("## c) Raum");
  L();
  const imWald = (r) => {
    const g = grundstockAm(r.la, r.ln);
    return g && g.baum > 0;
  };
  L(
    tabelle(
      ["Art", "Meldungen", "im Wald (Grundstock, 150 m)", "im Wald, Unsicherheit ≤ 500 m"],
      gruppen.map((g) => {
        const u5 = g.r.filter((r) => r.u !== null && r.u <= 500);
        return [
          g.name,
          zahl(g.r.length),
          pct(g.r.filter(imWald).length, g.r.length),
          pct(u5.filter(imWald).length, u5.length),
        ];
      }),
    ),
  );
  L(
    "Waldmaske = Baumartenkarte (Thünen) im 150-m-Raster; Meldungen am " +
      "Waldrand oder mit grober Koordinate fallen oft " +
      "knapp daneben – der Anteil ist eher eine Untergrenze.",
  );
  L();
  // 10-km-Zellen
  const nZy = Math.ceil(((R.latN - R.latS) * KM_LAT) / 10),
    nZx = Math.ceil(((R.lngE - R.lngW) * KM_LNG) / 10);
  const zaehleZellen = (liste) => {
    const z = new Map();
    liste.forEach((r) => z.set(zelle(r, 10), (z.get(zelle(r, 10)) || 0) + 1));
    return z;
  };
  const zHG = zaehleZellen(HG),
    zZiel = zaehleZellen(M.st.concat(M.pf, M.som)),
    zZeig = zaehleZellen(ARTEN.filter((a) => a.gruppe === "zeiger").flatMap((a) => M[a.id]));
  const verteilung = (z) => {
    const w = [...z.values()].sort((a, b) => b - a),
      s = w.reduce((a, b) => a + b, 0),
      top = w.slice(0, Math.ceil(w.length / 10)).reduce((a, b) => a + b, 0);
    return [zahl(z.size), pct(top, s)];
  };
  L(
    tabelle(
      [
        "",
        "belegte 10-km-Zellen (von " + nZx * nZy + ")",
        "Anteil der Meldungen in den 10 % stärksten Zellen",
      ],
      [
        ["Hintergrund", ...verteilung(zHG)],
        ["Zielarten", ...verteilung(zZiel)],
        ["Zeiger", ...verteilung(zZeig)],
      ],
    ),
  );
  // Stadtnähe: Meldungen im Umkreis 15 km um die Stadtmitte München
  const muc = { la: R.mitte[0], ln: R.mitte[1] };
  L(
    "Stadtnähe: " +
      pct(HG.filter((r) => kmAbstand(r, muc) < 15).length, HG.length) +
      " des Hintergrunds und " +
      pct(M.st.concat(M.pf, M.som).filter((r) => kmAbstand(r, muc) < 15).length, zielN) +
      " der Zielarten liegen im 15-km-Kreis um die Münchner Innenstadt (" +
      pct(Math.PI * 15 * 15, (R.latN - R.latS) * KM_LAT * (R.lngE - R.lngW) * KM_LNG) +
      " der Rechteckfläche).",
  );
  L();
  zellenBild(nZx, nZy, [zHG, zZiel, zZeig]);
  L("![Meldungen je 10-km-Zelle](gbif-stufe1-zellen.png)");
  L();
  L(
    "Bild: Meldungen je 10-km-Zelle, links Hintergrund, Mitte Zielarten (Steinpilz, Pfifferling, Sommersteinpilz), " +
      "rechts Zeiger; Norden oben, logarithmisch von dunkel (1) bis hell (Höchstwert), schwarz = keine Meldung, " +
      "rotes Kreuz = Stadtmitte München. Verschleierte Meldungen (siehe b) liegen irgendwo in ihrer ≈ 0,2°-Zelle.",
  );
  L();

  // --- d) Standort
  L("## d) Standort an der Meldestelle (Unsicherheit ≤ 500 m, im Wald)");
  L();
  const codes = META.codes;
  const baumName = (c) => (codes.baum[c - 1] ? codes.baum[c - 1].art : "?");
  const bodenName = (c) => Object.keys(codes.boden).find((k) => codes.boden[k] === c) || "unbekannt";
  const lageName = (c) => Object.keys(codes.lage).find((k) => codes.lage[k] === c) || "?";
  const standort = (liste) =>
    liste
      .filter((r) => r.u !== null && r.u <= 500)
      .map((r) => grundstockAm(r.la, r.ln))
      .filter((g) => g && g.baum > 0);
  const hgS = standort(HG);
  const merkmale = [
    ["Baumart", (g) => baumName(g.baum), codes.baum.map((b) => b.art)],
    ["Boden", (g) => bodenName(g.boden), Object.keys(codes.boden).concat(["unbekannt"])],
    ["Lage", (g) => lageName(g.lage), Object.keys(codes.lage)],
    ["Höhe", (g) => hoeheKlasse(g.hoehe), H_KLASSEN],
  ];
  const standortArten = ARTEN.filter((a) => standort(M[a.id]).length >= 5);
  L(
    "Anteil je Klasse; in Klammern das Verhältnis zum Hintergrund (> 1 " +
      "= häufiger als bei allen Pilzmeldungen im Wald). " +
      "n = Meldungen mit Unsicherheit ≤ 500 m im Wald. Arten mit weniger als 5 solchen Meldungen fehlen.",
  );
  L();
  const artS = Object.fromEntries(standortArten.map((a) => [a.id, standort(M[a.id])]));
  merkmale.forEach(([titel, f, klassen]) => {
    L("### " + titel);
    L();
    const anteil = (liste, k) => liste.filter((g) => f(g) === k).length / Math.max(1, liste.length);
    L(
      tabelle(
        [
          titel,
          "Hintergrund (n = " + zahl(hgS.length) + ")",
          ...standortArten.map((a) => a.name + " (n = " + artS[a.id].length + ")"),
        ],
        klassen
          .filter((k) => anteil(hgS, k) > 0 || standortArten.some((a) => anteil(artS[a.id], k) > 0))
          .map((k) => {
            const h = anteil(hgS, k);
            return [
              k,
              (100 * h).toFixed(0) + " %",
              ...standortArten.map((a) => {
                const x = anteil(artS[a.id], k);
                return (
                  (100 * x).toFixed(0) +
                  " %" +
                  (h > 0 ? " (" + (x / h).toFixed(1).replace(".", ",") + ")" : "")
                );
              }),
            ];
          }),
      ),
    );
  });
  L("Nur beschrieben, nichts ins Modell übernommen.");
  L();

  // --- e) Tauglichkeit für Stufe 2
  L("## e) Tauglichkeit für Stufe 2");
  L();
  const saison = (r) => r.m >= 6 && r.m <= 11;
  // Nur Meldungen, deren Ort zur Zellgröße passt: 1 km → Unsicherheit ≤ 500 m, 5 km → ≤ 2500 m, unbekannt zählt mit
  const genau = (r, km) => r.u === null || r.u <= km * 500;
  const zw = (liste, km) =>
    new Set(
      liste
        .filter((r) => tagesDatum(r) && saison(r) && genau(r, km))
        .map((r) => zelle(r, km) + "|" + isoWoche(r)),
    );
  const kombis = [
    ["Fichtensteinpilz", M.st],
    ["Pfifferling", M.pf],
    ["Sommersteinpilz", M.som],
    ["Steinpilz + Sommersteinpilz", M.st.concat(M.som)],
    ["alle Zielarten", M.st.concat(M.pf, M.som)],
    ["Zielarten + Zeiger", ARTEN.flatMap((a) => M[a.id])],
  ];
  const hg1 = zw(HG, 1),
    hg5 = zw(HG, 5);
  L(
    "Zelle-Wochen = verschiedene Kombinationen aus Rasterzelle und Kalenderwoche mit mindestens einer Meldung " +
      "(nur Tagesdatum, Juni–November, Unsicherheit ≤ halbe Zellgröße oder unbekannt – verschleierte Meldungen " +
      "fallen weg). Hintergrund: " +
      zahl(hg1.size) +
      " Zelle-Wochen bei 1 km, " +
      zahl(hg5.size) +
      " bei 5 km.",
  );
  L();
  L(
    tabelle(
      [
        "Art / Gruppe",
        "Zelle-Wochen 1 km",
        "Anteil am Hintergrund 1 km",
        "Zelle-Wochen 5 km",
        "Anteil am Hintergrund 5 km",
      ],
      kombis.map(([n, l]) => {
        const a = zw(l, 1),
          b = zw(l, 5);
        return [n, zahl(a.size), pct(a.size, hg1.size), zahl(b.size), pct(b.size, hg5.size)];
      }),
    ),
  );
  // Wetterarchiv: Zahl der Orte (0,1°-Zellen, ERA5-Land-Auflösung) mit Hintergrund in der Saison
  const orte = new Set(
    HG.filter((r) => tagesDatum(r) && saison(r)).map(
      (r) => Math.floor(r.la * 10) + ":" + Math.floor(r.ln * 10),
    ),
  );
  const orte5 = new Set(HG.filter((r) => tagesDatum(r) && saison(r)).map((r) => zelle(r, 5)));
  const jahreArchiv = JAHR_BIS - JAHR_AB, // abgeschlossene Jahre; laufendes Jahr liefert der Tageslauf
    tageSaison = 30 + 31 + 31 + 31 + 30 + 31 + 30 + 35, // Mai–Nov + 35 Tage Vorlauf (Regensummen)
    kosten = (n, tage) => Math.round(n * Math.ceil(tage / 14)); // Open-Meteo-Zählregel, 4 Variablen ≤ 10
  L("### Wetter-Archiv für " + JAHR_AB + "–" + (JAHR_BIS - 1));
  L();
  L(
    tabelle(
      ["Weg", "Orte", "Abrufe (Open-Meteo-Zählregel)", "Tage bei 10 000/Tag"],
      [
        [
          "Open-Meteo-Archiv, 0,1°-Zellen mit Meldungen, Saison (Mai–Nov + 35 Tage)",
          zahl(orte.size),
          zahl(kosten(orte.size, jahreArchiv * tageSaison)),
          "",
        ],
        [
          "Open-Meteo-Archiv, 5-km-Zellen mit Meldungen, Saison",
          zahl(orte5.size),
          zahl(kosten(orte5.size, jahreArchiv * tageSaison)),
          "",
        ],
        [
          "Open-Meteo-Archiv, 5-km-Zellen, ganzjährig",
          zahl(orte5.size),
          zahl(kosten(orte5.size, jahreArchiv * 365)),
          "",
        ],
      ].map((z) => {
        z[3] = (Number(z[2].replace(/\./g, "")) / 10000).toFixed(1).replace(".", ",");
        return z;
      }),
    ),
  );
  L(
    "Gerechnet mit 4 Variablen (Regen, ET0, Tmin, Tmax) je Ort und " +
      "Anfrage, Abrufe = Orte × Tage/14 (wie `omZaehlen`). " +
      "Das Archiv (ERA5/ERA5-Land ≈ 9–11 km) ist gröber als 5 km – " +
      "mehrere 5-km-Zellen teilen sich einen Modellpunkt, " +
      "0,1° genügt also. DWD HYRAS (opendata.dwd.de, `grids_germany/daily/hyras_de`, 1 km, Regen und Temperatur " +
      "tägl.): je Jahr und Variable eine NetCDF-Datei (Regen ≈ 45 MB, Temperatur ≈ 70 MB), für " +
      jahreArchiv +
      " Jahre × 4 Variablen ≈ " +
      jahreArchiv * 4 +
      " Downloads, ≈ " +
      String(Math.round((jahreArchiv * (45 + 3 * 70)) / 100) / 10).replace(".", ",") +
      " GB, ohne Abrufgrenze; Regen dort aus Stationen interpoliert wie " +
      "der Pin (aber ohne ET0 → aus Temperatur schätzen).",
  );
  L();

  // --- f) Grenzen
  L("## f) Grenzen");
  L();
  const datiert = HG.filter(tagesDatum),
    we = datiert.filter((r) => [0, 6].includes(wochentag(r))).length;
  const zielDat = M.st.concat(M.pf, M.som).filter(tagesDatum),
    weZ = zielDat.filter((r) => [0, 6].includes(wochentag(r))).length;
  L(
    "- **Suchaufwand:** Wochenende " +
      pct(we, datiert.length) +
      " des Hintergrunds und " +
      pct(weZ, zielDat.length) +
      " der Zielarten (bei Gleichverteilung 29 %); Stadtnähe und Häufung in wenigen Zellen siehe c). " +
      "Meldungen zeigen, wo und wann gesucht wurde – ohne Hintergrund taugen sie nicht als Fundwahrscheinlichkeit.",
  );
  L(
    "- **Fehlbestimmungen:** Steinpilz und Sommersteinpilz werden oft " +
      "verwechselt (der eigene Fund vom 25.9. ist ein " +
      "Beispiel); iNaturalist „Research grade“ braucht nur zwei übereinstimmende Bestimmungen, andere Plattformen " +
      "prüfen unterschiedlich. *Boletus pinophilus* (Kiefern-Steinpilz) ist nicht enthalten.",
  );
  L(
    "- **Sommersteinpilz:** " +
      zahl(M.som.length) +
      " Meldungen in " +
      (JAHR_BIS - JAHR_AB + 1) +
      " Jahren – für eine eigene Auswertung zu wenig.",
  );
  L(
    "- **Leerstellen:** Keine Meldung heißt nicht „kein Pilz“; Stufe 2 kann nur relativ zum Hintergrund werten " +
      "(Anteil der Zielart an allen Pilzmeldungen derselben Zelle und Woche).",
  );
  L(
    "- **Koordinaten:** „unbekannte“ Unsicherheit ist meist eine Punktangabe ohne Genauigkeit; " +
      "grobe Rundung (COORDINATE_ROUNDED) versetzt Meldungen um bis zu einige 100 m.",
  );
  L();
  L("## Aufwand");
  L();
  L(
    "Einzelmeldungen: " +
      zahl(seitenGesamt) +
      " Seiten à " +
      SEITE +
      " (Ziel-, Zeigerarten und Hintergrund, je Jahr), höchstens 1 Abruf/s → etwa " +
      Math.ceil(seitenGesamt / 60) +
      " min beim ersten Lauf, danach aus dem Zwischenspeicher. Zählungen: " +
      (ARTEN.length + 2) +
      " Abrufe, Taxa " +
      (ARTEN.reduce((s, a) => s + a.namen.length, 0) + taxa.flechten.length + 1) +
      ", Datensätze " +
      Object.keys(DS).length +
      ".",
  );
  return t;
}

// Kleines PNG: drei Tafeln (Hintergrund, Ziel, Zeiger), je Zelle 8 px, logarithmische Helligkeit
function zellenBild(nx, ny, karten) {
  const s = 8,
    rand = 6,
    B = karten.length * nx * s + (karten.length + 1) * rand,
    H = ny * s + 2 * rand,
    px = Buffer.alloc(B * H * 3, 40);
  const setze = (x, y, c) => {
    if (x < 0 || y < 0 || x >= B || y >= H) return;
    const q = (y * B + x) * 3;
    px[q] = c[0];
    px[q + 1] = c[1];
    px[q + 2] = c[2];
  };
  karten.forEach((z, k) => {
    const max = Math.max(1, ...z.values()),
      x0 = rand + k * (nx * s + rand);
    for (let i = 0; i < ny; i++)
      for (let j = 0; j < nx; j++) {
        const n = z.get(i + ":" + j) || 0,
          f = n ? 0.25 + (0.75 * Math.log(n)) / Math.log(Math.max(2, max)) : 0,
          c = n ? [Math.round(40 + 200 * f), Math.round(60 + 190 * f), Math.round(30 + 80 * f)] : [0, 0, 0];
        for (let a = 0; a < s - 1; a++)
          for (let b = 0; b < s - 1; b++) setze(x0 + j * s + b, rand + i * s + a, c);
      }
    // Stadtmitte München
    const mi = ((R.latN - R.mitte[0]) * KM_LAT) / 10,
      mj = ((R.mitte[1] - R.lngW) * KM_LNG) / 10,
      cx = Math.round(x0 + mj * s),
      cy = Math.round(rand + mi * s);
    for (let d = -4; d <= 4; d++) {
      setze(cx + d, cy, [220, 40, 40]);
      setze(cx, cy + d, [220, 40, 40]);
    }
  });
  pngSchreiben(path.join(BERICHTE, "gbif-stufe1-zellen.png"), B, H, px);
}

// Stufe 2 (gbif-stufe2.js) nutzt Zwischenspeicher, Grundstock-Lesen und Datumshilfen von hier
module.exports = {
  CACHE,
  BERICHTE,
  META,
  lesen,
  schreiben,
  pngSchreiben,
  grundstockLaden,
  grundstockAm,
  tagesDatum,
  isoWoche,
  kmAbstand,
  tabelle,
  zahl,
  pct,
};
if (require.main === module)
  hauptprogramm().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
