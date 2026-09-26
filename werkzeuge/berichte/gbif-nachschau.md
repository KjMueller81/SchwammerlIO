# GBIF – Nachschau zu Stufe 2: niedrige Endwerte bei Steinpilzfunden und Saisonende

Erzeugt von `werkzeuge/gbif-nachschau.js` am 2026-09-26 (App-Version 2026-09-26.29, Lernen aus). Gleiche Meldungen, Filter, HYRAS-Reihen und Endformel wie [Stufe 2](gbif-stufe2.md) (68 Steinpilz-, 4.498 Hintergrundmeldungen). Nur Zählungen und Anteile, keine Fundorte.

Befund aus Stufe 2: 30 von 68 Steinpilzmeldungen haben einen Endwert unter 20 – die App hätte dort „lohnt sich nicht“ gezeigt (Hintergrund: 49 %).

## 1. Test-Artefakt? Bodenfeuchte

Im Stufe-2-Test fehlt `bodenF` (Modell-Bodenfeuchte 0–7 cm, in der App 40 % des Haltefaktors). Hier für alle Steinpilzmeldungen und 250 zufällig gezogene Hintergrundmeldungen (feste Zufallsfolge, Jahre 2015–2025) aus dem Open-Meteo-Archiv (`soil_moisture_0_to_7cm`, stündlich; Mittel über die 24 Stunden bis 12 Uhr am Meldetag, wie `wetterFuer` in der App). Abrufe in diesem Lauf: 0 (je Meldung 1 nach der Open-Meteo-Zählregel), aus dem Zwischenspeicher: 318. Das Archiv liefert ERA5/ERA5-Land-Werte, die App die Bodenfeuchte des Vorhersagemodells – gleiche Größe (m³/m³), anderes Modell.

| Gruppe | Meldungen | Bodenfeuchte (Mittel) | Endwert < 20 ohne | Endwert < 20 mit | rf ohne | rf mit | Endwert ohne | Endwert mit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Steinpilz | 68 | 0,36 | 44 % | 41 % | 0,74 | 0,77 | 28,5 | 29,3 |
| Hintergrund (Stichprobe) | 250 | 0,36 | 50 % | 48 % | 0,68 | 0,70 | 25,7 | 26,5 |

AUC Endwert in dieser Auswahl: ohne Bodenfeuchte 0,55, mit 0,55. Steinpilzmeldungen unter 20: ohne 30, mit 28 (2 wechseln die Seite der Schwelle).

## 2. Was drückt die Steinpilzmeldungen unter 20?

Begrenzender Teil = der Faktor, der auf 1 gesetzt den Endwert am stärksten hebt (mit denselben Deckeln). „Deckel“ heißt: der Endwert war durch `deckel` gekappt und der Deckel hebt sich mit dem Faktor. Rechnung ohne Bodenfeuchte wie in Stufe 2.

| Monat | Endwert | begrenzender Teil | auf 1 gesetzt | Regen 26 T (mm) | Tmittel 7 T (°C) | Baumart | Boden | Höhe |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Juli | 6 | Regenfaktor | 16 | 74 | 19,4 | Fichte | neutral | 500–700 m |
| Juli | 13 | Temperaturfaktor | 35 | 132 | 19,8 | Fichte | sauer | 500–700 m |
| Juli | 18 | Saisonfaktor (Sommer 0,45) | 39 | 125 | 19,3 | Fichte | sauer | 500–700 m |
| August | 3 | Temperaturfaktor | 23 | 90 | 17,1 | Fichte | kalk | 500–700 m |
| August | 3 | Temperaturfaktor | 17 | 117 | 18,6 | Fichte | neutral | 500–700 m |
| August | 4 | Temperaturfaktor | 27 | 150 | 17,0 | Fichte, licht | kalk | ≥ 1200 m |
| August | 5 | Temperaturfaktor | 31 | 188 | 19,4 | Fichte | kalk | 900–1200 m |
| August | 6 | Moor-Deckel (≤ 10) | – | 86 | 15,7 | Fichte | moor | 500–700 m |
| August | 10 | Temperaturfaktor | 35 | 139 | 19,7 | Buche | sauer | < 500 m |
| September | 3 | Temperaturfaktor | 22 | 51 | 17,4 | Fichte, licht | sauer | 500–700 m |
| September | 7 | Temperaturfaktor | 45 | 60 | 16,2 | Fichte | sauer | 500–700 m |
| September | 8 | Temperaturfaktor | 52 | 145 | 17,9 | Fichte | sauer | 500–700 m |
| September | 10 | Moor-Deckel (≤ 10) | – | 117 | 9,9 | Fichte | moor | 500–700 m |
| September | 10 | Moor-Deckel (≤ 10) | – | 63 | 17,0 | Fichte | moor | 500–700 m |
| September | 10 | Moor-Deckel (≤ 10) | – | 96 | 8,8 | Fichte | moor | 500–700 m |
| September | 10 | Moor-Deckel (≤ 10) | – | 82 | 9,6 | Fichte | moor | 500–700 m |
| September | 14 | Regenfaktor | 25 | 46 | 11,8 | Laub, jung | sauer | 500–700 m |
| September | 15 | Regenfaktor | 46 | 64 | 17,6 | Fichte | neutral | 500–700 m |
| September | 16 | Regenfaktor | 63 | 45 | 16,9 | Fichte | sauer | < 500 m |
| September | 17 | Regenfaktor | 61 | 55 | 16,7 | Fichte | sauer | 500–700 m |
| September | 17 | Regenfaktor | 55 | 78 | 16,0 | Fichte | sauer | 500–700 m |
| September | 17 | Regenfaktor | 59 | 37 | 12,8 | Fichte | sauer | 500–700 m |
| September | 18 | Regenfaktor | 59 | 57 | 17,2 | Fichte, licht | sauer | 500–700 m |
| Oktober | 8 | Regenfaktor | 55 | 14 | 8,7 | Buche | sauer | 500–700 m |
| Oktober | 11 | Regenfaktor | 35 | 43 | 9,3 | Buche | sauer | < 500 m |
| Oktober | 15 | Regenfaktor | 32 | 58 | 9,2 | Fichte | sauer | 700–900 m |
| Oktober | 15 | Temperaturfaktor | 25 | 64 | 9,6 | Laub, jung | sauer | 500–700 m |
| Oktober | 15 | Temperatur-Deckel | 75 | 249 | 7,7 | Fichte | neutral | 900–1200 m |
| November | 7 | Temperaturfaktor | 23 | 53 | 6,8 | Fichte, licht | sauer | 500–700 m |
| November | 8 | Moor-Deckel (≤ 10) | – | 128 | 6,3 | Fichte | moor | 500–700 m |

Davon mit greifender **Ausschlussregel Steinpilz** (5-Tage-Mittel > 17,5 °C und < 5 mm in 5 Tagen → Temperaturfaktor ≤ 0,15): Steinpilz 7 von 30, Hintergrund 12 %. Über alle Meldungen greift sie bei 7 von 68 Steinpilzfunden (10 %, davon 6 *B. edulis*, keine Sommersteinpilz-Verwechslung als Erklärung) und bei 6 % des Hintergrunds.

### Anteile je begrenzendem Teil: Steinpilz gegen Hintergrund (je Endwert < 20)

| begrenzender Teil | Steinpilz (n = 30) | Hintergrund (n = 2.213) |
|---|---:|---:|
| Regenfaktor | 11 (37 %) | 599 (27 %) |
| Temperatur-Deckel | 1 (3 %) | 11 (0 %) |
| Temperaturfaktor | 11 (37 %) | 653 (30 %) |
| Saisonfaktor (Sommer 0,45) | 1 (3 %) | 211 (10 %) |
| Frost | 0 (0 %) | 81 (4 %) |
| Moor-Deckel (≤ 10) | 6 (20 %) | 512 (23 %) |
| kein Einzelteil | 0 (0 %) | 146 (7 %) |

## 3. Saisonende: Steinpilz-Anteil je halbem Monat

Anteil = Steinpilz ÷ alle ausgewerteten Meldungen des Zeitraums. „relativ“ = bezogen auf 1.–15. September. Saisonende-Faktor = Frost × Kälte des Modells (Mittel), übrige Wetterfaktoren = Regen × Temperatur (ohne Frost/Kälte). Kältesumme als Median.

| Zeitraum | Meldungen | Steinpilz | Anteil | relativ | Frost | Kälte | Frost × Kälte relativ | übrige Wetterfaktoren relativ | Kältesumme | Frostnächte 14 T |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.–15. September | 484 | 14 | 2,9 % | 1,00 | 1,00 | 1,00 | 1,00 | 1,00 | 0,0 | 0,0 |
| 16.–30. September | 743 | 18 | 2,4 % | 0,84 | 1,00 | 1,00 | 0,99 | 1,07 | 0,0 | 0,0 |
| 1.–15. Oktober | 818 | 9 | 1,1 % | 0,38 | 0,93 | 0,99 | 0,93 | 0,97 | 0,0 | 0,4 |
| 16.–31. Oktober | 619 | 4 | 0,6 % | 0,22 | 0,94 | 0,99 | 0,93 | 0,60 | 0,0 | 0,6 |
| 1.–15. November | 315 | 1 | 0,3 % | 0,11 | 0,74 | 0,95 | 0,71 | 0,46 | 1,8 | 1,2 |
| 16.–30. November | 174 | 1 | 0,6 % | 0,20 | 0,42 | 0,71 | 0,33 | 0,15 | 21,9 | 5,1 |

### Mögliche Werte – zu entscheiden

Nötiger Saisonende-Faktor = beobachteter relativer Anteil ÷ relative übrige Wetterfaktoren (was Frost × Kälte erklären müssten, damit das Modell den Rückgang nachzeichnet). Daneben der jetzige Wert des Modells.

| Zeitraum | Steinpilz | nötig (beobachtet) | Modell jetzt (Frost × Kälte) | Kältesumme Basis 5 °C | Basis 8 °C | Basis 10 °C |
|---|---:|---:|---:|---:|---:|---:|
| 16.–30. September | 18 | 0,79 | 0,99 | 0,0 | 0,0 | 1,5 |
| 1.–15. Oktober | 9 | 0,39 | 0,93 | 0,0 | 3,1 | 17,4 |
| 16.–31. Oktober | 4 | 0,37 | 0,93 | 0,0 | 10,2 | 26,4 |
| 1.–15. November | 1 | (zu wenige) | 0,71 | 1,8 | 27,1 | 62,6 |
| 16.–30. November | 1 | (zu wenige) | 0,33 | 21,9 | 80,1 | 146,5 |

Kältesumme je Zeitraum als Median (Basis 5 °C wie im Modell; 8 und 10 °C als Kandidaten, aus HYRAS-Tagesmitteln ab 1.9.). Bei Basis 5 °C bleibt die Kältesumme bis Ende Oktober im Median 0 – der Rückgang ab Oktober lässt sich damit nicht abbilden. Jetzige Annahmen: `KAELTE_KURVE` [0 → 1, 25 → 0,7, 60 → 0,3, 100 → 0,1], `FROST` 0 °C → 0,3 über 7 Tage, −3 °C → 0,15 über 10 Tage. Die Zeilen oben sind Kandidaten für Stützstellen (Kältesumme → Faktor), nicht mehr: 15 Steinpilzmeldungen ab Oktober tragen sie. Der Hintergrund wechselt im Oktober seine Zusammensetzung (Fliegenpilz- und Spätherbstarten), das drückt den Anteil auch ohne echtes Saisonende.

