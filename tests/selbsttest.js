// Modell-Selbsttest ohne Browser: node tests/selbsttest.js
// Prüft die Syntax im strikten Modus und führt selbsttest() aus index.html aus.
// Exitcode 0 = alles grün, 1 = Syntax-/Ladefehler, 2 = mindestens ein Fall oder eine Regel weicht ab.
"use strict";
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).join("\n");

try {
  new Function('"use strict";' + js);
  console.log("Syntax (strict): OK");
} catch (e) {
  console.log("Syntax (strict): FEHLER", e.message);
  process.exit(1);
}

// Platzhalter für Browser-Objekte (DOM, Leaflet …): jede Eigenschaft/jeder Aufruf liefert wieder einen Platzhalter
function stub(name) {
  return new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === "then" || k === "catch" || k === "finally") return () => stub(name + ".then()");
      if (k === "length") return 0;
      if (k === "value" || k === "textContent" || k === "innerHTML") return "";
      if (k === "checked") return false;
      return stub(name + "." + String(k));
    },
    set() {
      return true;
    },
    apply() {
      return stub(name + "()");
    },
    construct() {
      return stub("new " + name);
    },
  });
}
const store = {};
const env = {
  window: stub("window"),
  document: stub("document"),
  L: stub("L"),
  navigator: stub("navigator"),
  location: stub("location"),
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  },
  fetch: () => new Promise(() => {}),
  setTimeout: () => 0,
  setInterval: () => 0,
  requestAnimationFrame: () => 0,
  alert: () => {},
};
const namen = Object.keys(env);

// UI-Start am Ende der IIFE (update/load) überspringen und Testzugriff herausreichen
const start = /\n\s*update\(\);\s*\n\s*load\(\);/;
if (!start.test(js)) {
  console.log("FEHLER: Startstelle „update(); load();“ in index.html nicht gefunden");
  process.exit(1);
}
// Funktionen, die die Datenmodell-Tests brauchen
const EXPORT = [
  "selbsttest",
  "VERSION",
  "bewerte",
  "stelleNormal",
  "stellenGeojson",
  "stellenImport",
  "besuchWert",
  "BEGLEIT",
  "zweiRaster",
  "zweiWertAn",
  "wetterPotenzial",
  "standortGuete",
];
const kern = js.replace(
  start,
  "\nglobalThis.__T = {" + EXPORT.map((k) => k + ": " + k).join(", ") + "}; return;\n",
);

let t, T;
try {
  new Function(...namen, '"use strict";' + kern)(...namen.map((k) => env[k]));
  T = globalThis.__T;
  console.log("Version:", T.VERSION);
  t = T.selbsttest();
} catch (e) {
  console.log("FEHLER beim Laden/Ausführen:", e && e.stack ? e.stack : e);
  process.exit(1);
}

// ---- Datenmodell „Besuche“ ----
function pruefe(name, fn) {
  let g = false,
    info = "";
  try {
    g = fn();
  } catch (e) {
    info = "  (" + (e && e.message ? e.message : e) + ")";
  }
  t.n++;
  if (g === true) t.ok++;
  t.zeilen.push((g === true ? "OK   " : "FEHL ") + "Test: " + name + info);
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// (a) Stelle im alten Format → genau ein Besuch, alte Felder bleiben stehen
pruefe("(a) alte Stelle wird in einen Besuch umgewandelt", () => {
  const alt = {
    name: "Schliersee 22.9.",
    lat: 47.82,
    lng: 11.74,
    pf: 32,
    st: 54,
    som: 5,
    v: { baum: "fichte", alter: "mittel", boden: "sauer", unter: "moos", lage: "nord", rand: "innen" },
    fund: ["st", "marone", "hexflock"],
    besucht: 1790000000000,
    finger: "maessig",
    fundAlter: "jung",
    wf: { pf: 0.6, st: 0.8, som: 0.3 },
    ts: 1789000000000,
  };
  const sp = T.stelleNormal(JSON.parse(JSON.stringify(alt)));
  const b = sp.besuche && sp.besuche[0];
  return (
    sp.besuche.length === 1 &&
    b.ts === alt.besucht &&
    gleich(b.fund, alt.fund) &&
    b.alter === "jung" &&
    b.finger === "maessig" &&
    gleich(b.unter, ["moos"]) &&
    b.bestand === "mittel" &&
    gleich(b.bewertung, { pf: 32, st: 54, som: 5 }) &&
    gleich(b.wf, alt.wf) &&
    b.nachgetragen === false &&
    // nichts verloren: alte Felder unverändert
    gleich(sp.fund, alt.fund) &&
    sp.besucht === alt.besucht &&
    sp.finger === alt.finger &&
    sp.fundAlter === alt.fundAlter &&
    // unbesuchte alte Stelle (fund null) → keine Besuche; zweiter Aufruf ändert nichts
    T.stelleNormal({ fund: null, v: {} }).besuche.length === 0 &&
    T.stelleNormal(sp).besuche.length === 1
  );
});

// (b) zwei Besuche derselben Stelle überstehen Export → Import (auch doppelt importiert)
pruefe("(b) zwei Besuche bleiben beim Export/Import erhalten", () => {
  const b1 = {
    ts: 1790000000000,
    fund: ["st"],
    alter: "jung",
    finger: "feucht",
    unter: ["moos"],
    bestand: "mittel",
    bewertung: { pf: 30, st: 50, som: 5 },
    wetter: null,
    wf: null,
    nachgetragen: false,
  };
  const b2 = {
    ts: 1790259200000,
    fund: [],
    alter: null,
    finger: "trocken",
    unter: ["moos", "heidel"],
    bestand: "mittel",
    bewertung: null,
    wetter: null,
    wf: null,
    nachgetragen: true,
  };
  const quelle = [
    {
      name: "Test",
      lat: 47.8,
      lng: 11.7,
      pf: 30,
      st: 50,
      som: 5,
      v: { unter: ["moos"] },
      fund: [],
      ts: 1,
      besuche: [b1, b2],
    },
  ];
  const gj = JSON.parse(JSON.stringify(T.stellenGeojson(quelle)));
  const ziel = [];
  const e1 = T.stellenImport(ziel, gj, () => ({}));
  const e2 = T.stellenImport(ziel, gj, () => ({})); // zweiter Import: nur Dubletten
  return (
    e1.stellen === 1 &&
    e1.besuche === 2 &&
    e2.stellen === 0 &&
    e2.besuche === 0 &&
    ziel.length === 1 &&
    gleich(ziel[0].besuche, [b1, b2])
  );
});

// (c) Unterwuchs als Einzelwert und als Liste mit einem Eintrag → gleiche Bewertung
pruefe("(c) Unterwuchs Einzelwert = Liste mit einem Eintrag", () => {
  const tw = new Array(36).fill(0);
  tw[35 - 9] = 30;
  const W1 = {
    tw,
    et0: tw.map(() => 1.5),
    tmin: tw.map(() => 9),
    tmax: tw.map(() => 17),
    f: { tw: [], et0: [], tmin: [], tmax: [], pp: [] },
  };
  const V = (u) => ({
    baum: "fichte",
    alter: "mittel",
    boden: "sauer",
    unter: u,
    lage: "eben",
    rand: "innen",
    saison: "herbst",
    regen: 0,
    mm: 0,
  });
  return ["moos", "heidel", "gras", "nadel", "brom", "kraut"].every((c) =>
    [W1, null].every((w) => {
      const a = T.bewerte(V(c), w, 600, undefined, 85),
        b = T.bewerte(V([c]), w, 600, undefined, 85);
      return a.pf === b.pf && a.st === b.st && a.som === b.som;
    }),
  );
});

// (d) Begleitfund zählt weiter über BEGLEIT: nur Marone → st und pf 0,5
pruefe("(d) Besuch nur mit Marone ergibt für st und pf 0,5", () => {
  const b = { ts: 1, fund: ["marone"] };
  return (
    T.besuchWert(b, "st") === 0.5 &&
    T.besuchWert(b, "pf") === 0.5 &&
    T.BEGLEIT.marone.zeigt.st === 0.5 &&
    T.besuchWert({ ts: 1, fund: ["st", "marone"] }, "st") === 1 &&
    T.besuchWert({ ts: 1, fund: [] }, "st") === 0
  );
});

// ---- Regionen-Überblick: Darstellung ohne Wetter und mit unbekanntem Boden ----
// Kleines Feinraster 4×1: Standortgüte 60, 30, Wald mit unbekanntem Boden (254), kein Wald (255)
function ueberblick(mitWetter) {
  const code = [60, 30, 254, 255],
    GN = 2,
    feld = (x) => ({
      pf: new Float32Array(GN * GN).fill(x),
      st: new Float32Array(GN * GN).fill(x),
      som: new Float32Array(GN * GN).fill(x),
    }),
    gw = () => Object.assign(feld(80), { rf: feld(0.8), tf: feld(1) });
  return {
    FX: 4,
    FY: 1,
    GN,
    tagIdx: 0,
    trend: false,
    FS: {
      pf: Uint8Array.from(code),
      st: Uint8Array.from(code),
      som: Uint8Array.from(code),
      baum: [],
      bwert: ["fichte", "fichte", "fichte", null],
      boden: ["sauer", "sauer", null, null],
    },
    GW: mitWetter ? [gw(), gw(), gw(), gw()] : null,
    saison: "herbst",
  };
}
const deckend = (R) => Array.from(R.maske).filter((m) => m).length;

// (a) ohne Wetterraster kein Wetterpotenzial: „Wetter × Standort“ wird zu „Nur Standort“, „Nur Wetter“ bleibt leer
pruefe("(a) Überblick ohne Wetter zeichnet kein Wetterpotenzial", () => {
  const C = ueberblick(false),
    zwei = T.zweiRaster(C, "zwei", "best", 0),
    wet = T.zweiRaster(C, "wetter", "best", 0),
    mit = T.zweiRaster(ueberblick(true), "zwei", "best", 0);
  return (
    zwei.modus === "standort" &&
    zwei.ohneWetter === true &&
    deckend(zwei) === 3 && // zwei Standorte + ein graues Pixel, nichts für „kein Wald“
    wet.modus === "wetter" &&
    deckend(wet) === 0 &&
    mit.modus === "zwei" &&
    mit.ohneWetter === false
  );
});

// (b) unbekannter Boden: grau, nicht in Bestwert, Anzahl und Perzentilen
pruefe("(b) Unbekannter Boden fließt nicht in die Standortgüte-Statistik ein", () => {
  const R = T.zweiRaster(ueberblick(false), "standort", "best", 0),
    o = 2 * 4; // Pixel 2 = unbekannter Boden
  return (
    R.n === 2 &&
    R.unbekannt === 1 &&
    R.top === 60 &&
    R.p10 >= 30 &&
    R.p90 <= 60 &&
    R.rgba[o] === 128 &&
    R.rgba[o + 1] === 128 &&
    R.rgba[o + 2] === 120 &&
    R.maske[3] === 0 // kein Wald bleibt leer
  );
});

// (e) gleicher Wetterdatensatz: Wetterfeld und Pin-Rechnung ergeben dasselbe Wetterpotenzial und – bei gleichen
// Standortannahmen – dieselbe Bewertung (Pixel „Bewertung“ = endwert wie am Pin, Toleranz 1 für die gerundete Güte)
pruefe("(e) Wetterfeld und Pin: gleiches Wetterpotenzial und gleiche Bewertung", () => {
  const tw = new Array(36).fill(0);
  tw[35 - 13] = 13;
  tw[35 - 5] = 31;
  const W1 = {
    tw,
    et0: tw.map(() => 1.6),
    tmin: tw.map(() => 9),
    tmax: tw.map(() => 17),
    f: { tw: [], et0: [], tmin: [], tmax: [], pp: [] },
  };
  const v = {
    baum: "fichte",
    alter: "mittel",
    boden: "sauer",
    unter: "mittel",
    lage: "eben",
    rand: "innen",
    saison: "herbst",
  };
  return ["pf", "st", "som"].every((a) => {
    const wp = T.wetterPotenzial(a, W1, 600, "herbst"),
      pinR = T.bewerte(v, W1, 600, undefined, 85)[a];
    const GN = 2,
      feld = (x) => ({
        pf: new Float32Array(4).fill(x),
        st: new Float32Array(4).fill(x),
        som: new Float32Array(4).fill(x),
      }),
      sg = Math.round(T.standortGuete(v, a) * 100),
      C = {
        FX: 1,
        FY: 1,
        GN,
        tagIdx: 0,
        trend: false,
        saison: "herbst",
        FS: {
          pf: Uint8Array.of(sg),
          st: Uint8Array.of(sg),
          som: Uint8Array.of(sg),
          baum: [],
          bwert: ["fichte"],
          boden: ["sauer"],
        },
        GW: [0, 1, 2, 3].map(() => Object.assign(feld(wp.pot), { rf: feld(wp.rf), tf: feld(wp.tf) })),
      };
    const px = T.zweiWertAn(C, "zwei", a, 0, 0);
    return Math.abs(px.pot - wp.pot) < 1e-6 && Math.abs(px.prod - pinR) <= 1;
  });
});

t.zeilen.forEach((z) => console.log(z));
console.log("Ergebnis:", t.ok + "/" + t.n + (t.ok === t.n ? " – grün" : " – ABWEICHUNG"));
process.exit(t.ok === t.n ? 0 : 2);
