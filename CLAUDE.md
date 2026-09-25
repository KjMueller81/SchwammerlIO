# Schwammerl-Karte — Projektwissen für Claude Code

Pilzsuch-Web-App für München und Umgebung (bis ~100 km). Eine einzige Datei `index.html`
(HTML + CSS + JavaScript, Leaflet 1.9.4 von cdnjs), gehostet über GitHub Pages:
https://kjmueller81.github.io/SchwammerlIO/

Bewertet Waldstandorte für **Pfifferling (pf)**, **Fichtensteinpilz (st)** und **Sommersteinpilz (som)**
aus Geodaten (Baumart, Boden, Kronendichte, Gelände) und gemessenem Wetter. Nutzer: ein Sammler,
Bedienung meist am iPhone im Wald, Auswertung am Windows-Rechner.

Stand dieser Datei: v2026-09-26.4. Die Entwicklung bis hierhin lief in einem claude.ai-Chat.

---

## Arbeitsregeln (bitte immer einhalten)

1. **Selbsttest muss grün sein.** Die App enthält `selbsttest()` (Tab „Karten“ → Diagnose →
   „Modell-Selbsttest“) mit festen Fällen (`SELBSTTEST`) und Plausibilitätsregeln. Nach jeder
   Modelländerung ausführen. Weicht ein Fall ab, entweder Fehler beheben oder – nur bei **gewollter**
   Modelländerung – die Sollwerte neu setzen und das im Commit begründen.
2. **Versionsnummer hochzählen:** `var VERSION = "JJJJ-MM-TT.n";` bei jeder Auslieferung.
3. **Formatierung:** Prettier, `--print-width 110 --parser html`. Keine Zeilen über ~120 Zeichen
   einführen (GitHub-Editor bricht sonst nicht um).
4. **Syntax prüfen** im strikten Modus, bevor committet wird (z. B. per Node:
   Skriptinhalt aus `index.html` extrahieren und `new Function('"use strict";' + js)`).
5. **Eine Endformel.** Pin, Umkreis und Regionen-Überblick rechnen über dieselben Funktionen
   (`bewerte` → `wetterFaktorenArt` → `endwert`). Nie wieder eine eigene Kurzformel für eine Ansicht bauen –
   genau das hat früher Pin und Überblick auseinanderlaufen lassen.
6. **Keine Zugangsdaten** (Tokens, Passwörter) in Code, Commits oder Chat.
7. Deutsche Oberfläche und Kommentare. Keine `alert()`-Dialoge (Ausnahme GPS-Fehler), stattdessen `toast()`.
8. Kleine, begründete Änderungen; bei Modellwerten die Quelle im Kommentar nennen.
9. **Vor jedem Commit `node tests/selbsttest.js` ausführen – muss grün sein** (Exitcode 0).
   Das Skript prüft die Syntax im strikten Modus und rechnet `selbsttest()` ohne Browser;
   Exitcode 1 = Syntax-/Ladefehler, 2 = Fall oder Regel weicht ab.

---

## Architektur (Funktionen in index.html)

**Modell**
- `standortGuete(v, art)` – gewichtetes geometrisches Mittel der Standortfaktoren aus `W` / `GEW`
  (Baum, Boden, Unterwuchs, Lage, Bestand, Struktur), mit `lernFaktor` aus den eigenen Funden.
- `wasserBilanz(tw, et0, hoehe, dichte, alter, tmax)` – Streufeuchte, Speicher `SPEICHER = 25` mm,
  Kronenabfang (`bodenRegen`), temperaturabhängige Verdunstung (`etAnteil`), Höhendehnung.
- `wirksamerRegen(art, w, …)` – artspezifischer Auslöse-Kern (Verzögerung) × Haltefaktor
  (Streubilanz 60 % + Modell-Bodenfeuchte 40 %). Regen auf feuchte Streu verkürzt die Verzögerung bis 30 %.
- `summenFaktor(art, tw)` – lange Regensumme: st 26 Tage, pf 35 Tage, som 21 Tage.
- `regenFaktorArt` – √(Auslöser × Regensumme), gedämpft bei widersprüchlichen Messquellen.
- `tempFaktor(art, tmin, tmax)` – st: 20-Tage-Mittel, Optimum 13,7 °C; pf: 14-Tage-Mittel; plus Hitze/Frost.
- `wetterFaktorenArt` – bündelt Regen- und Temperaturfaktor; enthält die **Ausschlussregel Steinpilz**
  (5-Tage-Mittel > 17,5 °C und < 5 mm in 5 Tagen → Temperaturfaktor ≤ 0,15).
- `deckel(v, art, rf, tf)` – harte Grenzen: Moor ≤ 10, Brombeere ≤ 20, Kultur ≤ 25, Trockenheits-/Temperaturdeckel.
- `endwert` – 100 × Standort × Regen × Temperatur × Saison, begrenzt durch `deckel`.
- `SAISON` – Sommer/Herbst-Faktoren je Art.

**Wetter**
- `holeWetterHaupt` / `holeWetterMulti` – Open-Meteo (35 Tage zurück, 8 voraus, Höhe, ET0, Bodenfeuchte 0–7 cm).
- `stationsNetz` / `stationsNetzBereich` – DWD-Stationen über Bright Sky; `stationsGewichte` +
  `stationsRegenMitGewichten` / `stationsRegenAm` – Interpolation, **Reichweite fest 30 km**, Gewicht 1/(d²+2).
  Regen der Vergangenheit kommt **immer aus dem Stationsnetz**, Modellregen nur als Rückfall.
- `quellenAbgleich` – bei widersprüchlichen Messungen gilt der niedrigere Wert.
- `RADAR_IM_MODELL = false` – DWD-Radar (RADOLAN SF) nur als Kartenebene, **nicht** in der Bewertung
  (gelernte Farbskala unzuverlässig, leere Bilder wurden als 0 mm gelesen).
- Rückfallkette in `holeWetter`: Open-Meteo+Station → Bright Sky komplett → Gerätearchiv (≤ 3 Tage alt)
  → ERA5-Land-Reanalyse.

**Geodaten**
- Baumarten: Thünen-WMS, Klasse per Pixelfarbe (`naechsteFarbe`, `baumAmPunkt`).
- Boden: LfU ÜBK25 GetFeatureInfo (`bodenDeuten`); im Überblick Bodenbild + aus Stützstellen gelernte
  Farblegende (`bodenLegende`), unbekannte Farben werden gezielt nachgelernt.
- Kronendichte: Copernicus HRL 2018 (`kronendichte`). Höhe/Hang: Open-Meteo Elevation (`lageAusHoehen`,
  erkennt Nord/Süd/Ost/West/Senke).

**Ansichten**
- Pin-Popup + Prognose 0–7 Tage; Rechenweg (Tab „Punkt“).
- Umkreis (`bewerteBereich`), Regionen-Überblick (`bewerteRegion`): Darstellungen
  „Wetter × Standort“ (Standard, `zeichneZweiEbenen`), „Nur Wetterpotenzial“, „Nur Standortgüte“,
  „Zellen wie bisher“. Zellen bewerten bis zu 4 Teilflächen und zeigen die beste.
- Stichproben (`stichproben`): bis 60 Punkte mit echter Pin-Rechnung zur Kontrolle.
- Regen-Ebene 3/7/14/30 Tage aus dem Stationsnetz (`zeichneRegenfeld`).
- Diagnose: Protokoll, `bericht()`, Pin-Fall als JSON (`pinFall`), CSV-Export des Rasters.

---

## Bekannte Fallstricke (alle schon einmal passiert)

- **Mercator:** Rasterbilder sind in gleichen Breitengrad-Schritten gerechnet, die Karte ist Web-Mercator.
  Vor `L.imageOverlay` immer `inMercator(...)` anwenden, sonst Nordversatz bis ~900 m.
- **Rechtecke im Überblick** entstehen, wenn Boden aus der nächsten Stützstelle statt aus der Kartenfarbe
  kommt. Unbekannte Farbe → Formularwert, nicht Nachbar-Stützstelle.
- **Ortsfestigkeit:** Ein Ort muss unabhängig von Ausschnitt und Pin denselben Wert haben
  (feste Reichweite, Kronendichte im Überblick fest 85 %, Stationen über den ganzen Bereich suchen).
- **Implizite Globals** brechen im strikten Modus nur bei bestimmten Daten – immer `var` setzen.
- Große Schleifen im Überblick: keine `map.distance` pro Tag und Zelle (→ `kmSchnell`, Gewichte je Zelle einmal).
- Popups/Formulare am iPhone: kein `prompt()` für neue Funktionen.

---

## Modellbelege

- Brejon Lamartinière & Hoffman, „Predicting porcini“, bioRxiv 2025/26 (Bielefeld, 10 Jahre, Buchenwald):
  Temperaturoptimum ≈ 13 °C (20-Tage-Mittel), Regen über 26 Tage linear, keine Obergrenze;
  frühere Fassung: 5-Tage-Mittel > 17,5 °C bei < 1 mm/Tag → kein Fund. Preprint, nicht begutachtet.
- Pfifferling (Saskatchewan): Wärmesumme > 5 °C + kumuliert 50–100 mm.
- Pilz4You (Potsdam 1988–2019): Steinpilzsaison 3–5 Dekaden zusammenhängend, 120-Tage-Mittel von
  Temperatur/Bodenfeuchte/Niederschlag wichtig – noch nicht umgesetzt (siehe offene Punkte).
- Martínez-Peña et al. 2012: Steinpilzertrag am höchsten in mittelalten Beständen.
- Erfahrungswissen (schwächer gewichtet): Osthang für Pfifferling, Zeigerpilze Marone, Hexenröhrlinge,
  Fliegenpilz, Pfefferröhrling, Semmelstoppelpilz; stickstoffreiche Krautschicht ungünstig.

---

## Felddaten des Nutzers (Kalibrierung)

- 8.9. südl. München/Holzkirchen, 32 °C, Dürre: nichts (6 Stellen).
- 13.9. Hofoldinger Forst, Regen am selben Tag: nur Flockenstielige Hexenröhrlinge.
- 22.9. Schliersee (≈ 47.82 N, 11.74 E), Fichte/sauer/Moos/Nordhang, 13 mm am 9.9. und 31 mm am 16./17.9.,
  Fingerprobe mäßig–feucht: 2 Fichtensteinpilze (zwei jung 5–10 cm, einer 20 cm), Maronen, Hexenröhrling.
- 25.9. 1 km nördlich davon: Marone mittel, ein alter Steinpilz (als Sommersteinpilz eingetragen – fraglich).
- Pilz-Ticker Bayern (passion-pilze-sammeln.com) als unabhängiger Abgleich, gleiche Einordnung.
- Stellen als GeoJSON im Browser gespeichert, Export/Import im Tab „Stellen“.

---

## Offene Punkte

- Tiefe Bodenfeuchte (Open-Meteo `soil_moisture_27_to_81cm`) als Langzeitgedächtnis – erst als Anzeige
  im Rechenweg, später evtl. als Faktor.
- Validierung der Zeitkurven mit mehr Funden inkl. Fruchtkörperalter.
- Baumartenkarte ist von 2018 (Käferflächen fehlen) – Plausibilisierung per Luftbild.
- Unsicherheitsangabe je Bewertung; Saisonende über Kältesumme statt Datum.
- Aufteilung in `modell.js` / `daten.js` / `index.html` mit Tests (Node) – erst wenn die Datei stabil ist.

---

## Typischer Ablauf einer Änderung

1. Anforderung verstehen, betroffene Funktion suchen (`grep -n "function name("`).
2. Änderung klein halten, Quelle/Begründung als Kommentar.
3. Syntax (strict) + Selbsttest prüfen, VERSION hochzählen, Prettier.
4. Diff zeigen, Commit mit deutscher Nachricht („Modell: …“, „UI: …“, „Fix: …“), Push.
5. GitHub Pages ist nach 1–2 Minuten aktualisiert; Version oben in der App kontrollieren.
