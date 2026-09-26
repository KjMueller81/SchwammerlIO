// Testausschnitt für tests/selbsttest.js: Grundstock + Tageswetter um den Ebersberger Pin als eine JSON-Datei,
// damit der Test ohne pngjs und ohne das (nicht eingecheckte) daten/wetter.json läuft.
// Aufruf: node testausschnitt.js [pfad/zu/wetter.json]  → ../tests/daten/ebersberg.json
"use strict";
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const PIN = [48.08315, 11.89476],
  HALB_LAT = 0.06,
  HALB_LNG = 0.09;
const D = path.join(__dirname, "..", "daten"),
  wj = JSON.parse(fs.readFileSync(process.argv[2] || path.join(D, "wetter.json"), "utf8")),
  meta = JSON.parse(fs.readFileSync(path.join(D, "grundstock", "meta.json"), "utf8")),
  R = meta.raster,
  g = PNG.sync.read(fs.readFileSync(path.join(D, "grundstock", "grundlage.png"))),
  h = PNG.sync.read(fs.readFileSync(path.join(D, "grundstock", "hoehe.png")));

// Grundstock-Ausschnitt
const i0 = Math.floor((R.latN - (PIN[0] + HALB_LAT)) / R.dLat),
  i1 = Math.ceil((R.latN - (PIN[0] - HALB_LAT)) / R.dLat),
  j0 = Math.floor((PIN[1] - HALB_LNG - R.lngW) / R.dLng),
  j1 = Math.ceil((PIN[1] + HALB_LNG - R.lngW) / R.dLng),
  NY = i1 - i0,
  NX = j1 - j0;
const grund = { baum: [], boden: [], lage: [], hoehe: [], dichte: [], abdeckung: [] };
for (let i = i0; i < i1; i++)
  for (let j = j0; j < j1; j++) {
    const q = (i * R.NX + j) * 4;
    grund.baum.push(g.data[q]);
    grund.boden.push(g.data[q + 1]);
    grund.lage.push(g.data[q + 2]);
    grund.hoehe.push(h.data[q]);
    grund.dichte.push(h.data[q + 1]);
    grund.abdeckung.push(h.data[q + 2]);
  }
const metaA = {
  stand: meta.stand,
  version: meta.version,
  abdeckung: meta.abdeckung,
  codes: meta.codes,
  raster: Object.assign({}, R, { latN: R.latN - i0 * R.dLat, lngW: R.lngW + j0 * R.dLng, NX, NY }),
};

// Teilraster (Knoten mit einem Rand, damit alle Pixel vier Nachbarknoten haben)
function teil(G, daten) {
  const y0 = Math.max(0, Math.floor((G.latN - metaA.raster.latN) / G.schritt) - 1),
    y1 = Math.min(G.NY - 1, Math.ceil((G.latN - (metaA.raster.latN - NY * R.dLat)) / G.schritt) + 1),
    x0 = Math.max(0, Math.floor((metaA.raster.lngW - G.lngW) / G.schritt) - 1),
    x1 = Math.min(G.NX - 1, Math.ceil((metaA.raster.lngW + NX * R.dLng - G.lngW) / G.schritt) + 1),
    out = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(daten[y * G.NX + x]);
  return {
    G: Object.assign({}, G, {
      latN: G.latN - y0 * G.schritt,
      lngW: G.lngW + x0 * G.schritt,
      NY: y1 - y0 + 1,
      NX: x1 - x0 + 1,
    }),
    daten: out,
  };
}
const om = teil(wj.om, wj.omDaten),
  rg = teil(wj.regen, wj.regenDaten);
const aus = {
  hinweis: "erzeugt mit werkzeuge/testausschnitt.js – Pin " + PIN.join("/") + ", Tageswetter " + wj.stand,
  pin: PIN,
  meta: metaA,
  grund,
  wetter: { stand: wj.stand, om: om.G, omDaten: om.daten, regen: rg.G, regenDaten: rg.daten },
};
const ziel = path.join(__dirname, "..", "tests", "daten", "ebersberg.json");
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, JSON.stringify(aus));
console.log(
  ziel,
  NX + "×" + NY,
  "Pixel,",
  om.daten.length,
  "OM-Punkte,",
  rg.daten.length,
  "Regenknoten,",
  Math.round(fs.statSync(ziel).size / 1024),
  "kB",
);
