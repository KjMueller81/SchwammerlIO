# Status Schwammerl-Karte

Stand: v2026-09-26.22 (26.09.2026)

## Offene Aufträge
Angenommen, aber noch nicht ausgeliefert. Beim Start hier eintragen, bei Auslieferung nach „Zuletzt ausgeliefert“.

| Auftrag | Stand |
|---|---|
| B – iPhone-Nachtrag: sicherer Bereich oben/unten, Popup-Größe und Zuschreibung, Quellenangaben, Erklärtext Tab „Punkt“ | begonnen |
| C – Offline-Karte umgewichten: Gebiet bis Zoom 11, Umgebungen 5/10/15 km mit Liste, Angebot beim Stelle-Speichern | wartet |

## Zuletzt ausgeliefert
- **Kältesumme abgesichert (v2026-09-26.22):** Fehlt dem Tageslauf der Vorstand, meldet er das deutlich und holt die
  Lücke einmalig aus dem Open-Meteo-Archiv; das Region-Feld zeigt „Kältesumme unvollständig“, solange Werte fehlen.
- **Saisonende (v2026-09-26.21):** Frostschlag (`frostFaktor`) und Kältesumme ab 1.9. (`kaelteFaktor`) in der
  Endformel für Pin, Wetterfeld und Stichproben; Popup-Zeile „Saison klingt ab …“, Rechenweg mit eigenen Zeilen;
  Tageslauf schreibt den Kältesummen-Vorlauf fort. Kalibrierungsfälle unverändert (Tabelle im Commit).
- **Offline-Grundkarte (v2026-09-26.20):** Webkarte Bayern in zwei Stufen – „Gebiet offline speichern“
  (München ±100 km bis Zoom 12, ≈ 100 MB) im Tab „Karten“, „Umgebung speichern“ (15 km, Zoom 13–14, Größe vorab)
  im Tab „Punkt“; schonend (4 parallel, Pausen, Gespeichertes übersprungen), Fortschritt und Abbrechen,
  Speicherstand und Löschen; offline automatisch statt OSM, Quellenvermerk laut Nutzungshinweisen.
- **Teil C (v2026-09-26.19):** Entscheidungen zu den Leitlinien-Punkten umgesetzt (siehe unten, alle erledigt).
- **Teil B (v2026-09-26.18):** Im Flugmodus kein rotes Band mehr, sondern im Kopf „offline — Wetter vom …“
  (Probe gegen die eigene Seite unterscheidet „offline“ von „Dienste blockiert“); heller Kartenhintergrund,
  wo offline keine Kachel liegt.
- **Teil A (v2026-09-26.17):** Überblick ohne Nahtlinien (Bild in einem Durchgang statt Zeilenstreifen),
  innen weich geglättet, Waldkanten hart; Österreich u. ä. dezent schraffiert, Tipp „keine Daten (außerhalb
  Deutschlands)“ (Grundstock Version 2 mit Datenabdeckung); Pin-Fall schreibt wieder `zelle`.
- **Architektur:** Überblick aus Grundstock (150 m) + täglichem `wetter.json`, Ladeanzeige, Web Worker.
- **Modell:** Hangrichtung und Kronendichte im Überblick aus dem Grundstock (drei Dichteklassen).
- **Offline:** Service Worker, Pin und Überblick aus gespeicherten Daten, Besuche speichern ohne Netz.
- **Wetterlauf:** Node 24, `actions/checkout@v7` und `actions/setup-node@v7`, Runner fest `ubuntu-24.04`.
- **UI/UX-Leitlinien** in `CLAUDE.md` aufgenommen und die Oberfläche dagegen geprüft (siehe unten).
- **Außerhalb des Kartengebiets:** klare Meldung im Region-Feld, Rand grau, Gebietsgrenze gestrichelt.
- **Unsicherheit:** Spanne > 20 Punkte → „Unsicher — Fingerprobe klärt das“ im Popup, führt zum Boden-Feld.

## Prüfung gegen die UI/UX-Leitlinien (v2026-09-26.16)

### Umgesetzt (kleine Abweichungen)
| Leitlinie | vorher | jetzt |
|---|---|---|
| Dropdown statt Knopfreihe | Umkreis 25/50/100 und Pilzart als Knopfreihen im Region-Feld | zwei `<select>` in einer Zeile |
| Kein `confirm()`, Löschen mit Rückgängig | Stelle / letzten Besuch löschen mit `confirm()` | sofort gelöscht, „Rückgängig“ im Toast |
| Kein `prompt()` | Notiz per `prompt()` (Popup und Stellenliste) | Textfeld im Popup bzw. direkt in der Liste |
| Farben nur über Variablen | 28 Einzelfarben im CSS, 18 im JavaScript | alles über `:root`-Variablen, `cssFarbe()` für Leaflet; nur Farbskalen bleiben Daten |
| Tippflächen ≥ 40 px | Region-Knopf 37, × 20, „Stichproben“ 21, Aufklapper 36, Selects 39, Regler 16, Ebenen-Zeilen 23, GPS 34 px | alle ≥ 40 px |
| Keine erklärenden Texte | Region-Hinweis erklärte die Farbe (doppelt zur Legende), Statuszeilen „Startkarte …“/„Antwortet …“ offen im Tab „Karten“ | Hinweis nur noch bei Warnung (Erklärung im Tooltip), Statuszeilen in der Diagnose |
| Nichts verdeckt sich | Ladeanzeigen lagen am Handy über GPS/Folgen; Pin-Popup unter den GPS-Knöpfen | Ladeanzeigen lassen 60 px frei, Popup hält oben Abstand |
| Umkreis sichtbar | Kreis fast weiß auf der hellen OSM-Karte (praktisch unsichtbar) | dunkel gestrichelt |

### Größere Abweichungen – entschieden und umgesetzt (v2026-09-26.19)
| Punkt | Entscheidung | Umsetzung |
|---|---|---|
| Region-Feld verdeckt den Kreis | Handy: kompakte Leiste; Desktop: in die Seitenleiste | Leiste „Art · km · Tag · ab 40“ + Tagesregler, vor dem Einpassen gesetzt; Desktop oberhalb der Tabs |
| Tab-Reihenfolge | „Punkt · Stellen · Karten“, Punkt Standard | umgestellt |
| Restzeit | nur im Live-Rückfall | Live-Weg zeigt „x % · noch ~y s“ ab 12 %, Grundstock-Lauf ohne |
| „Wetter“-Darstellung | mit der Waldmaske beschneiden | Nicht-Wald bleibt leer |
| GPS-Fehler | `toast()` | umgestellt, Arbeitsregel 7 angeglichen |
| Zoomknöpfe Desktop | so lassen | 40-px-Regel gilt für Touch (CLAUDE.md) |
| „teilweise außerhalb“ | nur wenn der Kreis hinausragt | Prüfung am Kreis mit 1 km Toleranz (100 km um München ragte sonst um 25 m hinaus) |

## Offline-Grundkarte (entschieden: Webkarte Bayern, umgesetzt in v2026-09-26.20)

- Quelle: WMTS Geobasisdaten Bayern, Layer Webkarte (`by_webkarte`, Kachelsatz `smerc`), CC BY 4.0, kostenfrei,
  CORS `*`. Quellenvermerk laut „Nutzungshinweise WMTS Geobasisdaten Bayern“ (Stand 27.10.2023):
  „© Datenquellen: Bayerische Vermessungsverwaltung, GeoBasis-DE / BKG 2023 – Daten verändert“, dazu
  „Geobasisdaten: Bayerische Vermessungsverwaltung – www.geodaten.bayern.de, CC BY 4.0“.
- Gemessen im Test (Desktop, lokal): ≈ 25 Kacheln/s, Ø ≈ 55–75 kB je Kachel; Gebiet ≈ 1 min, Umgebung
  (15 km, ≈ 400 Kacheln, ≈ 29 MB) ≈ 20 s. Offline wird die gespeicherte Karte automatisch gezeigt, auch beim
  Hineinzoomen über die gespeicherte Stufe hinaus (vergrößert).
- **`navigator.storage.persist()` am iPhone:** Laut WebKit („Updates to Storage Policy“) ab iOS/Safari 17
  unterstützt; gewährt wird nach Heuristik, vor allem wenn die Seite als Home-Bildschirm-App geöffnet ist. Im
  Safari-Tab ist mit „nein“ zu rechnen. Home-Bildschirm-Apps sind ohnehin von der 7-Tage-Löschregel ausgenommen;
  die Speichergrenze liegt je Seite bei bis zu 60 % des Gerätespeichers (Browser) bzw. 15 % (andere Apps).
  Am Rechner (Chrome, lokal) ergab die Anfrage „nein“. **Am iPhone noch zu prüfen:** App vom Home-Bildschirm
  starten, einmal „Umgebung speichern“, dann im Tab „Karten“ ablesen: „Speicher dauerhaft: ja/nein“ – bitte
  das Ergebnis hier nachtragen.

## Wartet auf Entscheidung
- **Frost- und Kältewerte kalibrieren, sobald Oktober-Besuche vorliegen.** Alle Zahlen sind Annahmen
  (Frost 0 / −3 °C, Start 0,3 / 0,15, Erholung 7 / 10 Tage, Kältesumme Basis 5 °C mit 25 → 0,7, 60 → 0,3,
  100 → 0,1, Sommersteinpilz doppelt). Besuche mit „nichts“ nach Frost und Funde nach Frost sind besonders wertvoll.

## Hinweise
- Wetterlauf: nach dem Umstellen einmal von Hand starten (Actions → Wetterlauf → Run workflow) und prüfen,
  ob er grün durchläuft; im Region-Feld steht danach die neue Uhrzeit.
- Offline-Start am iPhone einmal im Flugmodus prüfen (App vorher einmal online geöffnet).

## Nächste Schritte
- Am iPhone (Home-Bildschirm-App): Offline-Karte speichern, Flugmodus testen, „Speicher dauerhaft“ nachtragen.
- Validierung der Zeitkurven mit weiteren Funden (inkl. Fruchtkörperalter).
