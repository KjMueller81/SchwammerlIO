// Nachschau zu GBIF Stufe 2 (Auftrag M): niedrige Endwerte bei Steinpilzfunden und Saisonende.
// Aufruf:  cd werkzeuge && node gbif-nachschau.js [--offline]
//   Voraussetzung: Stufe 1 und 2 (node gbif.js, node gbif-stufe2.js) mit gefülltem Zwischenspeicher.
//   --offline  keine Abrufe (Bodenfeuchte nur aus dem Zwischenspeicher)
// 1. Bodenfeuchte: Im Test fehlt bodenF (in der App 40 % des Haltefaktors). Für alle Steinpilzmeldungen und eine
//    Zufallsauswahl des Hintergrunds holt das Werkzeug soil_moisture_0_to_7cm aus dem Open-Meteo-Archiv (je Meldung
//    eine Abfrage, 2 Tage stündlich → 1 Abruf nach der Zählregel) und rechnet Endwert/rf mit und ohne.
// 2. Begrenzender Teil je Meldung mit Endwert < 20: der Faktor, der auf 1 gesetzt den Endwert am stärksten hebt.
// 3. Saisonende: Steinpilz-Anteil je halbem Monat (September–November) gegen Frost-, Kälte- und Wetterfaktoren.
// Rechnung über gbif-stufe2.js (dieselben Filter, Reihen und App-Funktionen). Bericht: berichte/gbif-nachschau.md.
"use strict";
const fs = require("fs");
const path = require("path");
const G = require("./gbif.js");
const S = require("./gbif-stufe2.js");

const OFFLINE = process.argv.includes("--offline");
const A = S.A;
const HG_STICHPROBE = 250;
const ARCHIV = "https://archive-api.open-meteo.com/v1/archive";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const k2 = (x) => (x === null || x === undefined || Number.isNaN(x) ? "–" : x.toFixed(2).replace(".", ","));
const k1 = (x) => (x === null || x === undefined || Number.isNaN(x) ? "–" : x.toFixed(1).replace(".", ","));
const pc = (a, b) => (b ? ((100 * a) / b).toFixed(0) + " %" : "–");
const mittel = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : NaN);
const median = (l) => {
  const s = l.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
};
const MONAT = ["", "", "", "", "", "", "Juni", "Juli", "August", "September", "Oktober", "November"];

// ---------- 1. Bodenfeuchte aus dem Open-Meteo-Archiv
// wie wetterFuer in der App: Mittel der Stundenwerte über die 24 Stunden bis „jetzt“ (hier: 12 Uhr am Meldetag)
async function bodenfeuchteHolen(auswahl) {
  const datei = path.join(G.CACHE, "nachschau-bodenfeuchte.json"),
    bf = G.lesen(datei) || {},
    fehlt = auswahl.filter((r) => !(r.k in bf));
  const info = {
    angefragt: auswahl.length,
    abrufe: 0,
    schonDa: auswahl.length - fehlt.length,
    abbruch: null,
  };
  log(
    "Bodenfeuchte: " +
      fehlt.length +
      " Abrufe nötig (je 2 Tage × 1 Variable = 1 Abruf), " +
      info.schonDa +
      " im Speicher",
  );
  if (OFFLINE) {
    if (fehlt.length) info.abbruch = "offline – " + fehlt.length + " fehlen";
    return { bf, info };
  }
  for (let i = 0; i < fehlt.length; i++) {
    const r = fehlt[i],
      bis = r.datum,
      von = new Date(Date.parse(bis + "T00:00:00Z") - 864e5).toISOString().slice(0, 10),
      url =
        ARCHIV +
        "?latitude=" +
        r.la.toFixed(4) +
        "&longitude=" +
        r.ln.toFixed(4) +
        "&start_date=" +
        von +
        "&end_date=" +
        bis +
        "&hourly=soil_moisture_0_to_7cm&timezone=Europe%2FBerlin";
    let j = null;
    for (let versuch = 0; versuch < 3 && !j; versuch++) {
      await pause(1000);
      const antwort = await fetch(url).catch((e) => ({ ok: false, status: "Netz: " + e.message }));
      info.abrufe++;
      if (antwort.ok) j = await antwort.json();
      else {
        const text = antwort.text ? await antwort.text() : String(antwort.status);
        if (/Daily API request limit/i.test(text)) {
          info.abbruch = "Open-Meteo-Tageslimit erreicht";
          break;
        }
        log("Open-Meteo", antwort.status, "– neuer Versuch in 65 s");
        await pause(65000);
      }
    }
    if (info.abbruch) break;
    const h = j && j.hourly && j.hourly.soil_moisture_0_to_7cm,
      werte = h ? h.slice(12, 37).filter((x) => x !== null) : [];
    bf[r.k] = werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : null;
    if ((i + 1) % 25 === 0) {
      log("Bodenfeuchte", i + 1, "von", fehlt.length);
      G.schreiben(datei, bf);
    }
  }
  G.schreiben(datei, bf);
  return { bf, info };
}

// ---------- 2. Begrenzender Teil: welcher Faktor, auf 1 gesetzt, hebt den Endwert am stärksten?
function begrenzung(x) {
  const v = x.v,
    h = x.hoehe,
    basis = A.endwert(v, "st", x.rf, x.tf, h),
    kand = {
      Regen: A.endwert(v, "st", 1, x.tf, h),
      Temperatur: A.endwert(v, "st", x.rf, x.frost * x.kaelte, h), // Temperaturfaktor (inkl. Ausschlussregel) → 1
      Frost: x.frost < 1 ? A.endwert(v, "st", x.rf, x.tf / x.frost, h) : basis,
      Kälte: x.kaelte < 1 ? A.endwert(v, "st", x.rf, x.tf / x.kaelte, h) : basis,
      Saison: A.endwert(Object.assign({}, v, { saison: "herbst" }), "st", x.rf, x.tf, h),
      Standort: A.endwert(v, "st", x.rf, x.tf, h, undefined, 1),
    };
  let best = null;
  for (const k in kand) if (kand[k] > basis && (!best || kand[k] > kand[best])) best = k;
  if (!best || kand[best] <= 10)
    return { teil: v.boden === "moor" ? "Moor-Deckel (≤ 10)" : "kein Einzelteil", basis };
  const sg = A.standortGuete(v, "st"),
    rf = Math.min(1, x.rf),
    roh = 100 * sg * rf * x.tf * A.SAISON[v.saison].st,
    d = A.deckel(v, "st", rf, x.tf),
    gedeckelt = d < roh - 0.5;
  const name = {
    Regen: gedeckelt && A.deckel(v, "st", 1, x.tf) > d ? "Regen-Deckel" : "Regenfaktor",
    Temperatur: gedeckelt && A.deckel(v, "st", rf, 1) > d ? "Temperatur-Deckel" : "Temperaturfaktor",
    Frost: "Frost",
    Kälte: "Kälte",
    Saison: "Saisonfaktor (Sommer 0,45)",
    Standort: "Standortgüte",
  }[best];
  return { teil: name, basis, hebt: kand[best] };
}
const TEILE = [
  "Regen-Deckel",
  "Regenfaktor",
  "Temperatur-Deckel",
  "Temperaturfaktor",
  "Saisonfaktor (Sommer 0,45)",
  "Standortgüte",
  "Frost",
  "Kälte",
  "Moor-Deckel (≤ 10)",
  "kein Einzelteil",
];

// ---------- Bericht
function bericht(W0, BF, bfInfo, stichprobe, W1) {
  let t = "";
  const L = (s) => (t += (s === undefined ? "" : s) + "\n");
  const heute = new Date().toISOString().slice(0, 10),
    werte = W0.werte,
    st = werte.filter((x) => x.st),
    hg = werte.filter((x) => !x.st);
  L("# GBIF – Nachschau zu Stufe 2: niedrige Endwerte bei Steinpilzfunden und Saisonende");
  L();
  L(
    "Erzeugt von `werkzeuge/gbif-nachschau.js` am " +
      heute +
      " (App-Version " +
      A.VERSION +
      ", Lernen aus). Gleiche Meldungen, Filter, HYRAS-Reihen und Endformel wie [Stufe 2](gbif-stufe2.md) " +
      "(" +
      st.length +
      " Steinpilz-, " +
      G.zahl(hg.length) +
      " Hintergrundmeldungen). Nur Zählungen und Anteile, keine Fundorte.",
  );
  L();
  L(
    "Befund aus Stufe 2: " +
      st.filter((x) => x.endwert < 20).length +
      " von " +
      st.length +
      " Steinpilzmeldungen haben einen Endwert unter 20 – die App hätte dort „lohnt sich nicht“ gezeigt " +
      "(Hintergrund: " +
      pc(hg.filter((x) => x.endwert < 20).length, hg.length) +
      ").",
  );
  L();

  // --- 1. Bodenfeuchte
  L("## 1. Test-Artefakt? Bodenfeuchte");
  L();
  L(
    "Im Stufe-2-Test fehlt `bodenF` (Modell-Bodenfeuchte 0–7 cm, in der App 40 % des Haltefaktors). Hier für alle " +
      "Steinpilzmeldungen und " +
      stichprobe.hg +
      " zufällig gezogene Hintergrundmeldungen (feste Zufallsfolge, Jahre " +
      stichprobe.jahre +
      ") aus dem Open-Meteo-Archiv (`soil_moisture_0_to_7cm`, stündlich; Mittel über die 24 Stunden bis 12 Uhr am " +
      "Meldetag, wie `wetterFuer` in der App). Abrufe in diesem Lauf: " +
      bfInfo.abrufe +
      " (je Meldung 1 nach der Open-Meteo-Zählregel), aus dem Zwischenspeicher: " +
      bfInfo.schonDa +
      (bfInfo.abbruch ? " – **abgebrochen: " + bfInfo.abbruch + "**" : "") +
      ". Das Archiv liefert ERA5/ERA5-Land-Werte, die App die Bodenfeuchte des Vorhersagemodells – gleiche " +
      "Größe (m³/m³), anderes Modell.",
  );
  L();
  const mitBf = W1.werte,
    ohneBf = werte.filter((x) => mitBf.some((y) => y.k === x.k)),
    nachK = new Map(ohneBf.map((x) => [x.k, x]));
  const zeileBf = (name, f) => {
    const a = ohneBf.filter(f),
      b = mitBf.filter(f),
      bfWerte = b.map((x) => BF[x.k]).filter((z) => typeof z === "number");
    return [
      name,
      String(a.length),
      k2(mittel(bfWerte)),
      pc(a.filter((x) => x.endwert < 20).length, a.length),
      pc(b.filter((x) => x.endwert < 20).length, b.length),
      k2(mittel(a.map((x) => x.rf))),
      k2(mittel(b.map((x) => x.rf))),
      k1(mittel(a.map((x) => x.endwert))),
      k1(mittel(b.map((x) => x.endwert))),
    ];
  };
  L(
    G.tabelle(
      [
        "Gruppe",
        "Meldungen",
        "Bodenfeuchte (Mittel)",
        "Endwert < 20 ohne",
        "Endwert < 20 mit",
        "rf ohne",
        "rf mit",
        "Endwert ohne",
        "Endwert mit",
      ],
      [zeileBf("Steinpilz", (x) => x.st), zeileBf("Hintergrund (Stichprobe)", (x) => !x.st)],
    ),
  );
  const aucOhne = S.auc(
      ohneBf.filter((x) => x.st).map((x) => x.endwert),
      ohneBf.filter((x) => !x.st).map((x) => x.endwert),
    ),
    aucMit = S.auc(
      mitBf.filter((x) => x.st).map((x) => x.endwert),
      mitBf.filter((x) => !x.st).map((x) => x.endwert),
    );
  const unter = (l) => l.filter((x) => x.st && x.endwert < 20).length;
  const wechsel = mitBf.filter((x) => x.st && x.endwert < 20 !== nachK.get(x.k).endwert < 20).length;
  L(
    "AUC Endwert in dieser Auswahl: ohne Bodenfeuchte " +
      k2(aucOhne) +
      ", mit " +
      k2(aucMit) +
      ". Steinpilzmeldungen unter 20: ohne " +
      unter(ohneBf) +
      ", mit " +
      unter(mitBf) +
      " (" +
      wechsel +
      " wechseln die Seite der Schwelle).",
  );
  L();

  // --- 2. Begrenzender Teil
  L("## 2. Was drückt die Steinpilzmeldungen unter 20?");
  L();
  L(
    "Begrenzender Teil = der Faktor, der auf 1 gesetzt den Endwert am stärksten hebt (mit denselben Deckeln). " +
      "„Deckel“ heißt: der Endwert war durch `deckel` gekappt und der Deckel hebt sich mit dem Faktor. " +
      "Rechnung ohne Bodenfeuchte wie in Stufe 2.",
  );
  L();
  const stU = st.filter((x) => x.endwert < 20).map((x) => Object.assign({}, x, begrenzung(x)));
  const hgU = hg.filter((x) => x.endwert < 20).map((x) => Object.assign({}, x, begrenzung(x)));
  const abweichung = stU.concat(hgU).filter((x) => x.basis !== x.endwert).length;
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
  const baumName = {
    fichte: "Fichte",
    fichte_licht: "Fichte, licht",
    buche: "Buche",
    kiefer: "Kiefer",
    laub_jung: "Laub, jung",
  };
  L(
    G.tabelle(
      [
        "Monat",
        "Endwert",
        "begrenzender Teil",
        "auf 1 gesetzt",
        "Regen 26 T (mm)",
        "Tmittel 7 T (°C)",
        "Baumart",
        "Boden",
        "Höhe",
      ],
      stU
        .sort((a, b) => a.m - b.m || a.endwert - b.endwert)
        .map((x) => [
          MONAT[x.m],
          String(x.endwert),
          x.teil,
          x.hebt === undefined ? "–" : String(x.hebt),
          String(Math.round(x.regen[26])),
          k1(x.t7),
          baumName[x.v.baum] || x.v.baum,
          x.v.boden,
          hoeheKl(x.hoehe),
        ]),
    ),
  );
  if (abweichung)
    L("_Hinweis: " + abweichung + " Meldungen weichen beim Nachrechnen vom Stufe-2-Endwert ab._\n");
  const ausSt = stU.filter((x) => x.aus5),
    ausHg = hgU.filter((x) => x.aus5);
  L(
    "Davon mit greifender **Ausschlussregel Steinpilz** (5-Tage-Mittel > 17,5 °C und < 5 mm in 5 Tagen → " +
      "Temperaturfaktor ≤ 0,15): Steinpilz " +
      ausSt.length +
      " von " +
      stU.length +
      ", Hintergrund " +
      pc(ausHg.length, hgU.length) +
      ". Über alle Meldungen greift sie bei " +
      st.filter((x) => x.aus5).length +
      " von " +
      st.length +
      " Steinpilzfunden (" +
      pc(st.filter((x) => x.aus5).length, st.length) +
      ", davon " +
      st.filter((x) => x.aus5 && x.edulis).length +
      " *B. edulis*, keine Sommersteinpilz-Verwechslung als Erklärung) und bei " +
      pc(hg.filter((x) => x.aus5).length, hg.length) +
      " des Hintergrunds.",
  );
  L();
  L("### Anteile je begrenzendem Teil: Steinpilz gegen Hintergrund (je Endwert < 20)");
  L();
  L(
    G.tabelle(
      [
        "begrenzender Teil",
        "Steinpilz (n = " + stU.length + ")",
        "Hintergrund (n = " + G.zahl(hgU.length) + ")",
      ],
      TEILE.filter((k) => stU.some((x) => x.teil === k) || hgU.some((x) => x.teil === k)).map((k) => [
        k,
        stU.filter((x) => x.teil === k).length +
          " (" +
          pc(stU.filter((x) => x.teil === k).length, stU.length) +
          ")",
        G.zahl(hgU.filter((x) => x.teil === k).length) +
          " (" +
          pc(hgU.filter((x) => x.teil === k).length, hgU.length) +
          ")",
      ]),
    ),
  );

  // --- 3. Saisonende
  L("## 3. Saisonende: Steinpilz-Anteil je halbem Monat");
  L();
  const perioden = [
    [9, 1, "1.–15. September"],
    [9, 2, "16.–30. September"],
    [10, 1, "1.–15. Oktober"],
    [10, 2, "16.–31. Oktober"],
    [11, 1, "1.–15. November"],
    [11, 2, "16.–30. November"],
  ];
  const inP = (x, [m, hlf]) => x.m === m && (+x.datum.slice(8, 10) <= 15 ? 1 : 2) === hlf;
  const P = perioden.map((p) => {
    const l = werte.filter((x) => inP(x, p)),
      n = l.length,
      s = l.filter((x) => x.st).length;
    return {
      name: p[2],
      n,
      s,
      anteil: n ? s / n : NaN,
      frost: mittel(l.map((x) => x.frost)),
      kaelte: mittel(l.map((x) => x.kaelte)),
      ende: mittel(l.map((x) => x.frost * x.kaelte)),
      uebrig: mittel(l.map((x) => Math.min(1, x.rf) * x.tfTemp)), // Regen × Temperatur ohne Saisonende
      ks: median(l.map((x) => x.ks)),
      ks8: median(l.map((x) => x.ksBasis[0])),
      ks10: median(l.map((x) => x.ksBasis[1])),
      frostTage: mittel(l.map((x) => x.frost14)),
    };
  });
  const p0 = P[0];
  L(
    "Anteil = Steinpilz ÷ alle ausgewerteten Meldungen des Zeitraums. „relativ“ = bezogen auf 1.–15. September. " +
      "Saisonende-Faktor = Frost × Kälte des Modells (Mittel), übrige Wetterfaktoren = Regen × Temperatur (ohne " +
      "Frost/Kälte). Kältesumme als Median.",
  );
  L();
  L(
    G.tabelle(
      [
        "Zeitraum",
        "Meldungen",
        "Steinpilz",
        "Anteil",
        "relativ",
        "Frost",
        "Kälte",
        "Frost × Kälte relativ",
        "übrige Wetterfaktoren relativ",
        "Kältesumme",
        "Frostnächte 14 T",
      ],
      P.map((p) => [
        p.name,
        G.zahl(p.n),
        String(p.s),
        p.n ? (100 * p.anteil).toFixed(1).replace(".", ",") + " %" : "–",
        k2(p.anteil / p0.anteil),
        k2(p.frost),
        k2(p.kaelte),
        k2(p.ende / p0.ende),
        k2(p.uebrig / p0.uebrig),
        k1(p.ks),
        k1(p.frostTage),
      ]),
    ),
  );
  L("### Mögliche Werte – zu entscheiden");
  L();
  L(
    "Nötiger Saisonende-Faktor = beobachteter relativer Anteil ÷ relative übrige Wetterfaktoren (was Frost × Kälte " +
      "erklären müssten, damit das Modell den Rückgang nachzeichnet). Daneben der jetzige Wert des Modells.",
  );
  L();
  L(
    G.tabelle(
      [
        "Zeitraum",
        "Steinpilz",
        "nötig (beobachtet)",
        "Modell jetzt (Frost × Kälte)",
        "Kältesumme Basis 5 °C",
        "Basis 8 °C",
        "Basis 10 °C",
      ],
      P.slice(1).map((p) => [
        p.name,
        String(p.s),
        p.s < 3 ? "(zu wenige)" : k2(p.anteil / p0.anteil / (p.uebrig / p0.uebrig)),
        k2(p.ende / p0.ende),
        k1(p.ks),
        k1(p.ks8),
        k1(p.ks10),
      ]),
    ),
  );
  L(
    "Kältesumme je Zeitraum als Median (Basis 5 °C wie im Modell; 8 und 10 °C als Kandidaten, aus HYRAS-" +
      "Tagesmitteln ab 1.9.). Bei Basis 5 °C bleibt die Kältesumme bis Ende Oktober im Median 0 – der Rückgang ab " +
      "Oktober lässt sich damit nicht abbilden. " +
      "Jetzige Annahmen: `KAELTE_KURVE` [0 → 1, 25 → 0,7, 60 → 0,3, 100 → 0,1], `FROST` 0 °C → 0,3 über 7 Tage, " +
      "−3 °C → 0,15 über 10 Tage. Die Zeilen oben sind Kandidaten für Stützstellen (Kältesumme → Faktor), nicht " +
      "mehr: " +
      P.slice(2)
        .map((p) => p.s)
        .reduce((a, b) => a + b, 0) +
      " Steinpilzmeldungen ab Oktober tragen sie. Der Hintergrund wechselt im Oktober seine Zusammensetzung " +
      "(Fliegenpilz- und Spätherbstarten), das drückt den Anteil auch ohne echtes Saisonende.",
  );
  L();
  return t;
}

async function hauptprogramm() {
  log("Meldungen und Reihen (Stufe 2) …");
  const M = S.meldungenLaden(),
    reihen = await S.reihenBauen(M.meldungen),
    W0 = S.rechnen(M.meldungen, reihen);
  // Art je Meldung (Steinpilz-Gruppe = B. edulis + B. reticulatus): edulis-Schlüssel aus Stufe 1
  const taxa = G.lesen(path.join(G.CACHE, "taxa.json")),
    edulis = new Set(taxa.arten.st.map((m) => m.suchKey)),
    artVon = new Map(M.meldungen.map((r) => [r.k, r.t]));
  W0.werte.forEach((x) => (x.edulis = edulis.has(artVon.get(x.k))));
  // Auswahl: alle Steinpilzmeldungen + Zufallsstichprobe des Hintergrunds (feste Folge, reproduzierbar)
  const rechenbar = new Set(W0.werte.map((x) => x.k)),
    stM = M.meldungen.filter((r) => r.st && rechenbar.has(r.k)),
    hgAlle = M.meldungen.filter((r) => !r.st && rechenbar.has(r.k)),
    z = S.zufall(20260927),
    gemischt = hgAlle
      .map((r) => [z(), r])
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1]),
    hgM = gemischt.slice(0, HG_STICHPROBE),
    auswahl = stM
      .concat(hgM)
      .map((r) =>
        Object.assign(r, { datum: new Date(Date.UTC(r.j, r.m - 1, r.d)).toISOString().slice(0, 10) }),
      );
  const { bf, info } = await bodenfeuchteHolen(auswahl);
  const W1 = S.rechnen(
    auswahl.filter((r) => typeof bf[r.k] === "number"),
    reihen,
    bf,
  );
  const jahre = [...new Set(hgM.map((r) => r.j))].sort();
  const text = bericht(W0, bf, info, { hg: hgM.length, jahre: jahre[0] + "–" + jahre[jahre.length - 1] }, W1);
  fs.writeFileSync(path.join(G.BERICHTE, "gbif-nachschau.md"), text);
  log("Bericht geschrieben: werkzeuge/berichte/gbif-nachschau.md");
}
hauptprogramm().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
