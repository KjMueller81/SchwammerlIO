# Status Schwammerl-Karte

Stand: v2026-09-26.17 (26.09.2026)

## Zuletzt ausgeliefert
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

### Offen (größere Abweichungen, nur gelistet)
1. **Region-Feld verdeckt nach dem Lauf den Kreis.** Das Einpassen passiert vor dem Lauf; danach kommen
   Tagesregler und Legende dazu, das Feld wird am Handy ≈ 55 % der Kartenhöhe hoch und deckt die untere
   Kreishälfte ab (auch am Desktop unten links). Vorschlag: Feld nach dem Lauf kompakter
   (Schwelle und Tag in einer Zeile, Legende einzeilig, Bedienzeilen einklappbar) oder nach dem Lauf neu
   einpassen.
2. **Tab-Reihenfolge** „Karten · Punkt · Stellen“ entspricht nicht der Hierarchie (Punkt vor Stellen vor
   Karten). Start-Tab ist „Karten“. Umstellen berührt Start-Tab, Schublade und Gewohnheit – Entscheidung offen.
3. **Restzeit bei langen Vorgängen:** Ladeanzeige und Live-Lauf zeigen Schritt und Prozent bzw. Sekunden,
   aber keine geschätzte Restzeit.
4. **„Wetter“-Darstellung** färbt auch Nicht-Wald halbtransparent ein (Wetterpotenzial ist flächig gemeint);
   widerspricht wörtlich „nie über Felder verlaufen“. Entscheidung offen: nur Wald färben?
5. **GPS-Fehler per `alert()`** (bewusste Ausnahme laut Arbeitsregel 7, Leitlinie sagt „keine“).
6. **Leaflet-Zoomknöpfe** (Desktop) sind 30 px; am Handy gibt es sie nicht (Zwei-Finger-Zoom).
7. **Bei 100 km am breiten Bildschirm** reicht der Ausschnitt fast immer über das Grundstock-Gebiet hinaus
   → Meldung „teilweise außerhalb“ ist korrekt, aber häufig. Evtl. nur melden, wenn der *Kreis* hinausragt.

## Hinweise
- Wetterlauf: nach dem Umstellen einmal von Hand starten (Actions → Wetterlauf → Run workflow) und prüfen,
  ob er grün durchläuft; im Region-Feld steht danach die neue Uhrzeit.
- Offline-Start am iPhone einmal im Flugmodus prüfen (App vorher einmal online geöffnet).

## Nächste Schritte
- Offene Punkte 1 und 2 entscheiden.
- Validierung der Zeitkurven mit weiteren Funden (inkl. Fruchtkörperalter).
