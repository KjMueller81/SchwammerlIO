# Status Schwammerl-Karte

Stand: v2026-09-26.28 (26.09.2026)

## Offene Aufträge
Angenommen, aber noch nicht ausgeliefert. Beim Start hier eintragen, bei Auslieferung nach „Zuletzt ausgeliefert“.

| Auftrag | Stand |
|---|---|
| – keine – | |

## Zuletzt ausgeliefert
Nur die letzten fünf; ältere Auslieferungen stehen im Git-Verlauf.

- **J – Backlog: Schutzgebiete und Wildruhezonen (26.09.2026, nur Doku):** Backlog-Punkt mit Quellen (LfU
  Schutzgebiete, Wildschutzgebiete der Landratsämter, DAV-Schongebiete), Umsetzungsvorschlag und Rechtshinweis.
- **G – GBIF Stufe 1 (26.09.2026, ohne App-Version):** Werkzeug `werkzeuge/gbif.js` (öffentliche GBIF-API, Zählung
  + Einzelmeldungen, Zwischenspeicher außerhalb des Repos) und Bericht
  [werkzeuge/berichte/gbif-stufe1.md](werkzeuge/berichte/gbif-stufe1.md); Kurzfassung unter „Wartet auf Entscheidung“.
- **I – Toast, unterer Rand, Bearbeiten-Formular, Felddaten (v2026-09-26.28):** Toast-Knopf rechts oder darunter,
  nie über dem Text; Home-Bildschirm-App mit `100lvh` bis zum Bildschirmrand, dazu Diagnose-Zeile (innerHeight,
  visualViewport, safe-area, Unterkanten) zum Ablesen am iPhone; Gebiet-Zeile mit Datum (Kacheln tragen ihr
  Speicherdatum, ohne Datum lädt „Aktualisieren“ neu); „Bestimmung unsicher“ als Häkchen-Zeile je Fund;
  Datumsfeld ohne iOS-Mindestbreite; Felddaten 25.9. korrigiert.
- **H – Doku aufgeräumt (26.09.2026, ohne App-Version):** offene Punkte aus CLAUDE.md hierher („Backlog“),
  STATUS.md gekürzt.
- **F – Offline-Speicher und unterer Rand (v2026-09-26.27):** Gebiet vollständig → Zeile „Gebiet offline ✓ · 379
  Kacheln · 21 MB · Stand 26.9.“ mit „Aktualisieren“ (fehlende Kacheln; älter als 180 Tage: alle neu), sonst der
  grüne Knopf mit „(x % gespeichert)“; Toast bei 0 neuen Kacheln „… war schon vollständig gespeichert.“; Toasts
  oben über der Karte statt über der Schublade; unterer Rand am iPhone: sicherer Bereich genau einmal.

## Offline-Grundkarte (entschieden: Webkarte Bayern)

- Quelle: WMTS Geobasisdaten Bayern, Layer Webkarte (`by_webkarte`, Kachelsatz `smerc`), CC BY 4.0, kostenfrei,
  CORS `*`. Quellenvermerk laut „Nutzungshinweise WMTS Geobasisdaten Bayern“ (Stand 27.10.2023):
  „© Datenquellen: Bayerische Vermessungsverwaltung, GeoBasis-DE / BKG 2023 – Daten verändert“, dazu
  „Geobasisdaten: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de, CC BY 4.0“.
- **iPhone-Stand 26.9. 21:46 (v2026-09-26.25, Home-Bildschirm-App):** 767 Kacheln · 40 MB (Gebiet Zoom 11 +
  Umgebung Hofolding 15 km / 19 MB), nach dem Aufräumen von 80 MB; „Speicher dauerhaft: ja“
  (`navigator.storage.persist()`); Offline-Umschaltung auf die Webkarte funktioniert.

## Wartet auf Entscheidung
- **GBIF Stufe 2 – ja/nein und in welchem Gebiet?** Bericht: [gbif-stufe1.md](werkzeuge/berichte/gbif-stufe1.md)
  (Stand 26.9.2026). Im Gebiet 2015–2026: 22 848 Pilzmeldungen ohne Flechten (Suchaufwand 2023–25 ≈ 8,7× 2015–17),
  Fichtensteinpilz 271, Pfifferling 56, Sommersteinpilz 14. 60 % der Steinpilze sind von iNaturalist auf ≈ 27 km
  verschleiert, 145 davon von einem einzigen Beobachter → nur 101 ortsgenaue Steinpilz-Meldungen.
  Zelle-Wochen (Juni–Nov., 5 km, ortsgenau): Steinpilz 95, Pfifferling 37, Sommersteinpilz 8 gegenüber 6 653 im
  Hintergrund. Standort (≤ 500 m, im Wald): Steinpilz n = 55, Pfifferling n = 14 – nur Tendenzen (Fichte ×1,2–1,3).
  **Empfehlung:** Stufe 2 nur für Steinpilz (Sommersteinpilz zusammengefasst), 5-km-Zelle × Woche gegen den
  Hintergrund; Pfifferling nur beschreibend. Für belastbare Zahlen das Prüfgebiet auf Bayern/Deutschland erweitern
  (Kinoko: 4 659 Steinpilze bundesweit). Wetter aus DWD HYRAS 1 km (≈ 44 Dateien, ≈ 2,8 GB, keine Abrufgrenze)
  statt Open-Meteo-Archiv (≈ 86 000 Abrufe ≈ 9 Tage Tageslimit); Meldungen als GBIF-Download mit DOI.
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
- **GBIF-Rückrechnung (Stufe 1 erledigt, Stufe 2 offen):** Pilzmeldungen (GBIF, ab 2015) im Gebiet gegen die
  Endformel prüfen, Hintergrund = alle Pilzmeldungen derselben Zelle und Woche (Vorbild Kinoko,
  github.com/frederikbeimgraben/Kinoko). Prüft Trennschärfe, Regenverzögerung, Frost, Kältesumme.
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
- Am iPhone: Toast, unteren Rand, Unsicher-Schalter und Datumsfeld prüfen (v2026-09-26.28); bei Streifen unten
  die Diagnose-Zeile (Tab „Karten“ → Diagnose, „Ansicht: …“) in allen drei Schubladen-Stufen ablesen und schicken.
- Oktober: Besuche nach Frost erfassen, auch Leerfunde; gezielt Gras-/Kraut-Stellen und einen Kalkstandort.
