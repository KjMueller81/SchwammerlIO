# Status Schwammerl-Karte

Stand: v2026-09-26.29 (26.09.2026)

## Offene Aufträge
Angenommen, aber noch nicht ausgeliefert. Beim Start hier eintragen, bei Auslieferung nach „Zuletzt ausgeliefert“.

| Auftrag | Stand |
|---|---|
| – keine – | |

## Zuletzt ausgeliefert
Nur die letzten fünf; ältere Auslieferungen stehen im Git-Verlauf.

- **M – Nachschau Stufe 2 (26.09.2026, ohne App-Version):** `werkzeuge/gbif-nachschau.js` (Bodenfeuchte aus dem
  Open-Meteo-Archiv, begrenzender Teil je Meldung, Saisonende je halbem Monat) und Bericht
  [werkzeuge/berichte/gbif-nachschau.md](werkzeuge/berichte/gbif-nachschau.md); Kurzfassung unter „Wartet auf
  Entscheidung“.
- **L – Pin-Popup: Unsicher-Hinweis, Tabellenkopf, Arten ohne Chance (v2026-09-26.29):** Fingerprobe-Link nur, wenn
  die Spanne eine Urteilsschwelle (20/40/60) überdeckt und man vor Ort ist (GPS ≤ 10 min, ≤ 300 m), sonst kleines
  graues „Regen unsicher“, sonst nichts; Prognosetabelle mit festen Spalten (Köpfe genau über den Zahlen); Arten,
  die heute und an allen Prognosetagen unter 20 liegen, fehlen in Kopfzeile und Tabelle (gewählte Art im
  Region-Feld bleibt, sonst mindestens die beste). Tests (s)–(w).
- **K – GBIF Stufe 2, Probe Steinpilz (26.09.2026, ohne App-Version):** `werkzeuge/gbif-stufe2.js` (HYRAS 1 km,
  Endformel aus index.html, AUC/Bootstrap/Blöcke) und Bericht
  [werkzeuge/berichte/gbif-stufe2.md](werkzeuge/berichte/gbif-stufe2.md); Kurzfassung unter „Wartet auf Entscheidung“.
- **J – Backlog: Schutzgebiete und Wildruhezonen (26.09.2026, nur Doku):** Backlog-Punkt mit Quellen (LfU
  Schutzgebiete, Wildschutzgebiete der Landratsämter, DAV-Schongebiete), Umsetzungsvorschlag und Rechtshinweis.
- **G – GBIF Stufe 1 (26.09.2026, ohne App-Version):** Werkzeug `werkzeuge/gbif.js` (öffentliche GBIF-API, Zählung
  + Einzelmeldungen, Zwischenspeicher außerhalb des Repos) und Bericht
  [werkzeuge/berichte/gbif-stufe1.md](werkzeuge/berichte/gbif-stufe1.md); Kurzfassung unter „Wartet auf Entscheidung“.

## Offline-Grundkarte (entschieden: Webkarte Bayern)

- Quelle: WMTS Geobasisdaten Bayern, Layer Webkarte (`by_webkarte`, Kachelsatz `smerc`), CC BY 4.0, kostenfrei,
  CORS `*`. Quellenvermerk laut „Nutzungshinweise WMTS Geobasisdaten Bayern“ (Stand 27.10.2023):
  „© Datenquellen: Bayerische Vermessungsverwaltung, GeoBasis-DE / BKG 2023 – Daten verändert“, dazu
  „Geobasisdaten: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de, CC BY 4.0“.
- **iPhone-Stand 26.9. 21:46 (v2026-09-26.25, Home-Bildschirm-App):** 767 Kacheln · 40 MB (Gebiet Zoom 11 +
  Umgebung Hofolding 15 km / 19 MB), nach dem Aufräumen von 80 MB; „Speicher dauerhaft: ja“
  (`navigator.storage.persist()`); Offline-Umschaltung auf die Webkarte funktioniert.

## Wartet auf Entscheidung
- **Nachschau Stufe 2 – Saisonende und Ausschlussregel (Vorschläge, keine Modelländerung).** Bericht:
  [gbif-nachschau.md](werkzeuge/berichte/gbif-nachschau.md) (26.9.2026).
  **Artefakt des Tests – ausgeschlossen:** Mit Bodenfeuchte (Open-Meteo-Archiv, 318 Abrufe) sinken die Steinpilzfunde
  unter 20 nur von 30 auf 28 von 68, AUC bleibt 0,55; die fehlende Bodenfeuchte erklärt die niedrigen Werte nicht.
  **Hinweis auf das Modell:** Begrenzend bei den 30 Funden unter 20 sind Regenfaktor (11) und Temperaturfaktor (11),
  dazu der Moor-Deckel (6, Bodenkarte meldet Moor). Die Ausschlussregel Steinpilz (5 T > 17,5 °C, < 5 mm) greift bei
  7 von 68 Funden (6 davon *B. edulis*) – zu entscheiden: lockern (z. B. Deckel 0,15 → 0,4) oder beibehalten.
  Saisonende: Steinpilz-Anteil gegenüber Anfang September 1.–15.10. 0,38, 16.–31.10. 0,22 (9 bzw. 4 Funde), Modell
  Frost × Kälte 0,93; die Kältesumme (Basis 5 °C) ist bis Ende Oktober im Median 0. Zu entscheiden: `KAELTE_BASIS`
  8–10 °C (Oktober-Median dann 3–26) bzw. Stützstellen so, dass Oktober ≈ 0,4 ergibt – nur 15 Funde ab Oktober.
- **GBIF Stufe 2 (Probe Steinpilz) – Ergebnis und Vorschläge, keine Modelländerung.** Bericht:
  [gbif-stufe2.md](werkzeuge/berichte/gbif-stufe2.md) (26.9.2026; Stufe 1:
  [gbif-stufe1.md](werkzeuge/berichte/gbif-stufe1.md)).
  68 Steinpilz- gegen 4 498 Hintergrundmeldungen (Juni–Nov. 2015–2025, ortsgenau, im Wald, Wetter DWD HYRAS 1 km).
  Endwert AUC 0,55 (0,49–0,61) = „nur Saison“ 0,56; in Aug.–Okt. Endwert 0,50, Saison 0,60. Kein Teil trägt deutlich
  (Regensumme 26 T und Baumart je 0,57; Wetterfaktor in Aug.–Okt. 0,51). Kalibrierung nicht steigend (40–60: 2,5 %,
  60–80: 1,3 %). Trockenheits-Deckel nicht zu streng (rf < 0,2: 1,5 % der Steinpilze, 4,6 % des Hintergrunds).
  **Vorschläge mit Beleg (nur Hinweise, n klein):** Oktober-Anteil 0,9 % gegen September 2,6 % bei gleichem
  Saisonfaktor 1 → Saisonende früher/stärker prüfen; Lage: Westhang 1,48× (21 Fälle), Osthang 0,76×, Nordhang
  0,84× gegen W 5/6/8 → Nord-Vorzug nicht belegt; Buche 0,76× gegen Fichte 1,29× bei W 8 zu 9.
  **Empfehlung:** Stufe 3 nur deutschlandweit (≈ 2 800 Fälle, Spanne ±0,01; Bayern allein ≈ 270, ±0,03).
- **Offene Modellbeobachtungen** (mit Felddaten prüfen):
  - Pfifferling fällt nach Frost stärker als Steinpilz (Pin-Werte 38 → 12 gegenüber 48 → 15) – mit Oktober-Funden
    prüfen.
  - Kalkstandorte (z. B. Reit im Winkl, Fichte auf Kalk, Steinpilz 64) sind noch ohne Felddaten.
  - Unterwuchs bisher nur Moos/Heidelbeere besucht, keine Leerfunde in Gras/Kraut erfasst – die Lernfaktoren für
    Unterwuchs haben daher keinen Vergleich.
- **Frost- und Kältewerte kalibrieren, sobald Oktober-Besuche vorliegen.** Alle Zahlen sind Annahmen
  (Frost 0 / −3 °C, Start 0,3 / 0,15, Erholung 7 / 10 Tage, Kältesumme Basis 5 °C mit 25 → 0,7, 60 → 0,3,
  100 → 0,1, Sommersteinpilz doppelt). Besuche mit „nichts“ nach Frost und Funde nach Frost sind besonders wertvoll.
- **Zeitkurven validieren** mit weiteren Funden, inklusive Fruchtkörperalter (Regenverzögerung, Regensummen).

## Backlog
Offene Punkte ohne Termin (aus CLAUDE.md hierher verschoben, 26.9.).

- **Langzeitgedächtnis im Modell:** tiefe Bodenfeuchte (Open-Meteo `soil_moisture_27_to_81cm`) erst als Anzeige im
  Rechenweg, später evtl. als Faktor; dazu das 120-Tage-Mittel von Temperatur, Bodenfeuchte und Niederschlag
  (Pilz4You, Potsdam 1988–2019).
- **Baumartenkarte von 2018** (Käferflächen fehlen) – Plausibilisierung per Luftbild.
- **Aufteilung** in `modell.js` / `daten.js` / `index.html` mit Tests (Node) – erst wenn die Datei stabil ist.
- **Größeres Gebiet** (erst wenn die App über München ±100 km hinaus, z. B. ganz Deutschland, abdecken soll):
  Grundstock in Kacheln von ≈ 100 × 100 km, nur sichtbare laden; Tageswetter nur für das feste Gebiet plus Liste
  genutzter Zusatzkacheln (≈ 300–400 Open-Meteo-Abrufe je Kachel und Tag); offline je Kachel. Schätzung 26.9.:
  ganz Bayern ≈ 3,3 × heute → Grundstock ≈ 8–9 MB, Wetterfeld ≈ 12 MB / ≈ 10 s Desktop, Open-Meteo ≈ 4 000
  Abrufe/Tag – gefährdet das Tageslimit (≈ 10 000, geteilte GitHub-Adresse). Bis dahin außerhalb der Live-Weg
  (gleiche Endformel, nicht offline, Kalibrierung nur aus Oberbayern).
- **Überblick auf den Kreis beschneiden (Live- und Grundstock-Weg):** Beide Wege zeichnen den Überblick als
  Rechteck um den Umkreis (Befund 26.9.: 100-km-Kreis um Augsburg bzw. Landshut, Tegernsee/Chiemgau außerhalb des
  Kreises eingefärbt). Soll: in beiden Wegen auf den Kreis beschneiden oder außerhalb deutlich abdunkeln; Statistik
  und Stichproben nur innerhalb des Kreises. Im Live-Weg zusätzlich Flächen ohne Daten (z. B. Tschechien)
  schraffieren wie im Grundstock-Weg.
- **GBIF-Rückrechnung (Stufe 1 erledigt, Stufe 2 (Probe) erledigt, Stufe 3 offen):** Pilzmeldungen (GBIF, ab
  2015) gegen die Endformel prüfen, Hintergrund = alle Pilzmeldungen derselben Zelle und Woche (Vorbild Kinoko,
  github.com/frederikbeimgraben/Kinoko). Prüft Trennschärfe, Regenverzögerung, Frost, Kältesumme. Stufe 3 nur
  deutschlandweit sinnvoll (siehe „Wartet auf Entscheidung“).
- **Schutzgebiete und Wildruhezonen anzeigen:** Stellen, an denen nicht oder nur eingeschränkt gesammelt bzw.
  betreten werden darf, erkennbar machen – als Hinweis, nicht als Verbot aus der App heraus (Regeln stehen in der
  jeweiligen Verordnung).
  - Quelle 1 (offen): LfU Bayern, Schutzgebiete des Naturschutzes – Download (Shapefile, EPSG:25832/4258) bzw.
    WFS/WMS, CC BY 4.0, Quellenvermerk „Datenquelle: Bayerisches Landesamt für Umwelt, www.lfu.bayern.de“,
    Stand 1.3.2024. Enthält Naturschutzgebiete, Nationalparke, Landschaftsschutzgebiete, geschützte
    Landschaftsbestandteile, Naturdenkmale, Biosphärenreservate, Naturparke; nicht enthalten: FFH, Vogelschutz,
    Wildschutzgebiete. Für die App zunächst nur Naturschutzgebiete und Nationalparke (Zonen der Nationalparke
    Bayerischer Wald und Berchtesgaden von den Nationalparkverwaltungen, falls offen verfügbar).
  - Quelle 2 (zu klären): Wildschutzgebiete (amtlich, Betretungsverbot mit Zeitraum, z. B. Wildschutzgebiet
    Rotwand, Landkreis Miesbach, 1.12.–14.7.). Festgesetzt durch die Landratsämter; offener Gesamtdatensatz nicht
    gefunden – prüfen, ob BayernAtlas/Geoportal Bayern einen Dienst anbietet, sonst die Gebiete im Arbeitsgebiet
    einzeln mit Zeitraum erfassen.
  - Quelle 3 (zu klären): Wald-Wild-Schongebiete des DAV (freiwillig, v. a. Winter/Frühjahr, in alpenvereinaktiv
    sichtbar) – Nutzungsrechte klären, sonst weglassen.
  - Umsetzung (Vorschlag): eigene Kartenebene (Umriss, dezent schraffiert); im Pin-Popup und bei „Beste Stellen im
    Umkreis“ ein Hinweis „liegt im Naturschutzgebiet ‚Name‘ – Verordnung beachten“ bzw. „Wildschutzgebiet ‚Name‘:
    Betreten 1.12.–14.7. verboten“ (nur im Zeitraum rot); Stellen nicht ausblenden oder abwerten. Offline:
    vereinfachte Umrisse als kleines GeoJSON bzw. als Kanal im Grundstock, Stand und Quelle im Datenstand.
  - Hinweis Recht: Steinpilz und Pfifferling sind nach BArtSchV „besonders geschützt“ – Sammeln nur in geringer
    Menge für den Eigenbedarf; in Naturschutzgebieten und Nationalparken gilt die jeweilige Verordnung (oft
    Wegegebot, teils Sammelverbot).
- **Pfeil zur Stelle:** Richtung und Entfernung zu einer gespeicherten Stelle, offline über GPS und Kompass.

## Hinweise
- Offline-Test iPhone 26.9.: Grundkarte und Pin ok.

## Nächste Schritte
- Am iPhone: Toast, unteren Rand, Unsicher-Schalter und Datumsfeld (v…28) sowie Pin-Popup (v…29: Tabellenkopf,
  Fingerprobe-Link vor Ort) prüfen; bei Streifen unten die Diagnose-Zeile (Tab „Karten“ → Diagnose, „Ansicht: …“)
  in allen drei Schubladen-Stufen ablesen und schicken.
- Oktober: Besuche nach Frost erfassen, auch Leerfunde; gezielt Gras-/Kraut-Stellen und einen Kalkstandort.
