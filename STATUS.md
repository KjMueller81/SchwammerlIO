# Status Schwammerl-Karte

Stand: v2026-09-26.28 (26.09.2026)

## Offene Aufträge
Angenommen, aber noch nicht ausgeliefert. Beim Start hier eintragen, bei Auslieferung nach „Zuletzt ausgeliefert“.

| Auftrag | Stand |
|---|---|
| – keine – | |

## Zuletzt ausgeliefert
Nur die letzten fünf; ältere Auslieferungen stehen im Git-Verlauf.

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
- **D – Stellen und Besuche bearbeiten (v2026-09-26.26):** Aufklapper „Bearbeiten“ je Stelle (Name, Merkmale mit
  Hand-Vermerk ✎, alle Besuche mit Ändern/Löschen/Wetter nachholen), jede Änderung mit „Rückgängig“; Fund
  „unsicher“ zählt halb (auch in „Besuch erfassen“); Datumsänderung bildet das Wetter an der Stelle neu; feste
  Besuchs-id, Import erkennt geänderte Besuche per id. „Letzten Besuch löschen“ entfällt.
- **E – Offline-Befunde vom iPhone (v2026-09-26.25):** Umkreis offline bzw. ohne Baumartenkarte aus dem Grundstock
  (150 m) statt aus dem Formular, Unbekanntes grau, keine Scheinrangliste (Gleichstand → näher am Pin, kaum
  Unterschiede → Hinweis); „Gleich los“ erst ab Urteilsstufe „mittel“, sonst „Diese Woche kaum Aussicht hier.“;
  Umkreis als ein Bild ohne Gitterlinien; „Wetter von heute …“; neue Version meldet sich („Neue Version — neu
  laden“); übrig gebliebene Zoom-12-Kacheln werden einmalig freigegeben.

## Offline-Grundkarte (entschieden: Webkarte Bayern)

- Quelle: WMTS Geobasisdaten Bayern, Layer Webkarte (`by_webkarte`, Kachelsatz `smerc`), CC BY 4.0, kostenfrei,
  CORS `*`. Quellenvermerk laut „Nutzungshinweise WMTS Geobasisdaten Bayern“ (Stand 27.10.2023):
  „© Datenquellen: Bayerische Vermessungsverwaltung, GeoBasis-DE / BKG 2023 – Daten verändert“, dazu
  „Geobasisdaten: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de, CC BY 4.0“.
- **iPhone-Stand 26.9. 21:46 (v2026-09-26.25, Home-Bildschirm-App):** 767 Kacheln · 40 MB (Gebiet Zoom 11 +
  Umgebung Hofolding 15 km / 19 MB), nach dem Aufräumen von 80 MB; „Speicher dauerhaft: ja“
  (`navigator.storage.persist()`); Offline-Umschaltung auf die Webkarte funktioniert.

## Wartet auf Entscheidung
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
- **Live-Weg außerhalb des Gebiets:** Überblick auf den Kreis beschneiden (bisher Rechteck), Flächen ohne Daten
  (z. B. Tschechien) schraffieren wie im Grundstock-Weg.
- **GBIF-Rückrechnung:** Pilzmeldungen (GBIF, ab 2015) im Gebiet gegen die Endformel prüfen, Hintergrund = alle
  Pilzmeldungen derselben Zelle und Woche (Vorbild Kinoko, github.com/frederikbeimgraben/Kinoko). Prüft
  Trennschärfe, Regenverzögerung, Frost, Kältesumme.
- **Pfeil zur Stelle:** Richtung und Entfernung zu einer gespeicherten Stelle, offline über GPS und Kompass.

## Hinweise
- Offline-Test iPhone 26.9.: Grundkarte und Pin ok.

## Nächste Schritte
- Am iPhone: Toast, unteren Rand, Unsicher-Schalter und Datumsfeld prüfen (v2026-09-26.28); bei Streifen unten
  die Diagnose-Zeile (Tab „Karten“ → Diagnose, „Ansicht: …“) in allen drei Schubladen-Stufen ablesen und schicken.
- Oktober: Besuche nach Frost erfassen, auch Leerfunde; gezielt Gras-/Kraut-Stellen und einen Kalkstandort.
