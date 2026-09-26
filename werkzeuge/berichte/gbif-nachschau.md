# GBIF – Nachschau zu Stufe 2: niedrige Endwerte bei Steinpilzfunden und Saisonende

Erzeugt von `werkzeuge/gbif-nachschau.js` am 2026-09-26. Abschnitte 1–3: Befund mit dem **Modellstand vor Auftrag O** (App-Version 2026-09-26.30, Git 26a954b); Abschnitte 4–6: Moor-Zuordnung, Temperaturkurve und Vorher/Nachher mit dem aktuellen Modell (2026-09-26.31). Lernen aus. Gleiche Meldungen, Filter, HYRAS-Reihen und Endformel wie [Stufe 2](gbif-stufe2.md) (68 Steinpilz-, 4.498 Hintergrundmeldungen). Nur Zählungen und Anteile, keine Fundorte.

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

| Zeitraum | Steinpilz | nötig (beobachtet) | Modell vor O (Frost × Kälte) | Kältesumme Basis 5 °C | Basis 8 °C | Basis 10 °C |
|---|---:|---:|---:|---:|---:|---:|
| 16.–30. September | 18 | 0,79 | 0,99 | 0,0 | 0,0 | 1,5 |
| 1.–15. Oktober | 9 | 0,39 | 0,93 | 0,0 | 3,1 | 17,4 |
| 16.–31. Oktober | 4 | 0,37 | 0,93 | 0,0 | 10,2 | 26,4 |
| 1.–15. November | 1 | (zu wenige) | 0,71 | 1,8 | 27,1 | 62,6 |
| 16.–30. November | 1 | (zu wenige) | 0,33 | 21,9 | 80,1 | 146,5 |

Kältesumme je Zeitraum als Median (Basis 5 °C wie im Modell; 8 und 10 °C als Kandidaten, aus HYRAS-Tagesmitteln ab 1.9.). Bei Basis 5 °C bleibt die Kältesumme bis Ende Oktober im Median 0 – der Rückgang ab Oktober lässt sich damit nicht abbilden. Annahmen vor Auftrag O: `KAELTE_KURVE` [0 → 1, 25 → 0,7, 60 → 0,3, 100 → 0,1], `FROST` 0 °C → 0,3 über 7 Tage, −3 °C → 0,15 über 10 Tage. Die Zeilen oben sind Kandidaten für Stützstellen (Kältesumme → Faktor), nicht mehr: 15 Steinpilzmeldungen ab Oktober tragen sie. Der Hintergrund wechselt im Oktober seine Zusammensetzung (Fliegenpilz- und Spätherbstarten), das drückt den Anteil auch ohne echtes Saisonende.

## 4. Moor-Zuordnung der Bodenkarte (nur beschrieben)

`bodenDeuten` ordnet eine ÜBK25-Einheit „moor“ zu, wenn im Legendentext zuerst eines dieser Wörter steht: Hochmoor, Niedermoor, Anmoor, Moor, Torf, Nass-, Hang-, Quell-, Auengley oder Gley (nicht Pseudo-, Stagno-, Paragley). In den 204 ÜBK25-Einheiten aus dem Zwischenspeicher des Grundstock-Laufs sind 35 als „moor“ gedeutet: Gley (grundwassernah) 27, Anmoor 4, Moor (Hoch-/Niedermoor, Torf) 4. Im Grundstock ist „moor“ 12 % der Waldfläche. Anmoor und Gley sind Übergänge (grundwassernah, humusreich), keine Moore – dort kann der Steinpilz in der Randlage fruchten. Zuordnung unverändert.

| Einheit | Klasse | Schlüsselwort | Legende (gekürzt) |
|---|---:|---:|---:|
| 65c | Anmoor | anmoor | Fast ausschließlich Anmoorgley, Niedermoorgley und Nassgley aus Lehmsand bis Lehm (Talsediment) |
| 72c | Anmoor | anmoor | Vorherrschend Anmoorgley und humusreicher Gley, gering verbreitet Niedermoorgley aus (skelettführendem) San … |
| 72f | Anmoor | anmoor | Vorherrschend Anmoorgley und humusreicher Gley, gering verbreitet Niedermoorgley aus (skelettführendem) San … |
| 73c | Anmoor | anmoor | Vorherrschend Anmoorgley und humusreicher Gley, gering verbreitet Niedermoorgley aus (skelettführendem) Sch … |
| 7 | Gley (grundwassernah) | gley | Überwiegend pseudovergleyte Braunerde, verbreitet Braunerde aus Schluff bis Schluffton (Lösslehm) über Lehm … |
| 60 | Gley (grundwassernah) | hanggley | Bodenkomplex: Hanggleye und Quellengleye aus Substraten unterschiedlicher Herkunft mit weitem Bodenartenspe … |
| 62a | Gley (grundwassernah) | gley | Fast ausschließlich Gley-Rendzina und Rendzina-Gley aus Schluff (Kalktuff oder Alm) |
| 64a | Gley (grundwassernah) | gley | Fast ausschließlich Gley-Pararendzina und Pararendzina-Gley aus Schluff bis Lehm (Flussmergel) über Carbona … |
| 65a | Gley (grundwassernah) | gley | Fast ausschließlich Gley-Braunerde aus Lehmsand bis Lehm (Talsediment) |
| 65b | Gley (grundwassernah) | gley | Fast ausschließlich Gley und Braunerde-Gley aus Lehmsand bis Lehm (Talsediment) |
| 66a | Gley (grundwassernah) | gley | Fast ausschließlich Gley aus Lehm bis Schluff, selten Ton (See- oder Flusssediment) |
| 67 | Gley (grundwassernah) | gley | Fast ausschließlich Gley über Niedermoor und Niedermoor-Gley aus Wechsellagerungen von (Carbonat-)Lehm bis  … |
| 68 | Gley (grundwassernah) | gley | Bodenkomplex: Gleye mit weitem Bodenartenspektrum (Moräne), verbreitet mit Deckschicht, selten Moore |
| 70a | Gley (grundwassernah) | gley | Bodenkomplex: Gleye, Anmoorgleye und Pseudogleye aus Feinsand bis Schluff (See- oder Flusssediment) |
| 71 | Gley (grundwassernah) | gley | Bodenkomplex: Gleye, kalkhaltige Gleye und andere grundwasserbeeinflusste Böden mit weitem Bodenartenspektr … |
| 72b | Gley (grundwassernah) | gley | Fast ausschließlich Gley und Braunerde-Gley aus (skelettführendem) Sand (Talsediment) |
| 73a | Gley (grundwassernah) | gley | Fast ausschließlich Gley-Braunerde aus (skelettführendem) Schluff bis Lehm, selten aus Ton (Talsediment) |
| 73b | Gley (grundwassernah) | gley | Fast ausschließlich Gley und Braunerde-Gley aus (skelettführendem) Schluff bis Lehm, selten aus Ton (Talsed … |
| 75c | Gley (grundwassernah) | gley | Bodenkomplex: Vorherrschend Gley und Anmoorgley, gering verbreitet Moorgley aus (Kryo-)Sandschutt (Granit o … |
| 76a | Gley (grundwassernah) | gley | Bodenkomplex: Gleye und andere grundwasserbeeinflusste Böden aus (skelettführendem) Sand (Talsediment) |
| 76b | Gley (grundwassernah) | gley | Bodenkomplex: Gleye und andere grundwasserbeeinflusste Böden aus (skelettführendem) Schluff bis Lehm, selte … |
| 80a | Gley (grundwassernah) | gley | Fast ausschließlich (flacher) Gley über Niedermoor aus (flachen) mineralischen Ablagerungen mit weitem Bode … |
| 90a | Gley (grundwassernah) | gley | Vorherrschend Gley-Kalkpaternia, gering verbreitet kalkhaltiger Auengley aus Auensediment mit weitem Bodena … |
| 90b | Gley (grundwassernah) | gley | Vorherrschend Gley-Kalkpaternia, gering verbreitet kalkhaltiger Auengley aus Auensediment mit weitem Bodena … |
| 91c | Gley (grundwassernah) | gley | Fast ausschließlich Gley-Vega und Vega-Gley aus Schluff über Carbonatschluff (Auensediment) |
| 93 | Gley (grundwassernah) | gley | Fast ausschließlich Vega-Gley aus (kiesführendem) Sand (Auensediment) |
| 94 | Gley (grundwassernah) | auengley | Fast ausschließlich Auengley aus (kiesführendem) Sand bis Sandlehm (Auensediment) |
| 98b | Gley (grundwassernah) | gley | Fast ausschließlich Gley-Vega und Vega-Gley aus Schluff bis Lehm (Auensediment) |
| 99c | Gley (grundwassernah) | auengley | Fast ausschließlich Auengley und Vega-Gley aus Lehm bis Ton (Auensediment) |
| 850 | Gley (grundwassernah) | gley | Bodenkomplex: Humusgleye, Moorgleye, Anmoorgleye und Niedermoore aus alpinen Substraten mit weitem Bodenart … |
| 865 | Gley (grundwassernah) | gley | Bodenkomplex: Gleye und Pseudogleye aus grusführendem Lehm bis Ton (Stausediment, carbonatisch) |
| 75 | Moor (Hoch-/Niedermoor, Torf) | moor | Fast ausschließlich Moorgley, Anmoorgley und Oxigley aus Lehmgrus bis Sandgrus (Talsediment) |
| 78 | Moor (Hoch-/Niedermoor, Torf) | niedermoor | Vorherrschend Niedermoor und Erdniedermoor, gering verbreitet Übergangsmoor aus Torf über Substraten unters … |
| 78a | Moor (Hoch-/Niedermoor, Torf) | niedermoor | Fast ausschließlich Niedermoor und Übergangsmoor aus Torf über kristallinen Substraten mit weitem Bodenarte … |
| 79 | Moor (Hoch-/Niedermoor, Torf) | hochmoor | Fast ausschließlich Hochmoor und Erdhochmoor aus Torf |

**Fraglich (nur benannt):** 7, 62a, 64a, 65a, 73a, 90a, 90b, 91c, 98b – Mineralböden mit Gley-Einfluss (Gley-Braunerde, Gley-Rendzina/-Pararendzina, Gley-Kalkpaternia/-Vega); Einheit 7 ist eine pseudovergleyte Braunerde, das Muster `gley` trifft dort „vergleyt“ (der Ausschluss gilt nur für „pseudogley“). Echte Moore sind nur 78, 78a, 79 (Nieder-/Übergangs-/Hochmoor), dazu Moor- und Anmoorgleye (75, 65c, 72c, 72f, 73c).

## 5. Temperaturkurve Steinpilz (20-Tage-Mittel) – nur ausgewertet

| 20-Tage-Mittel | Meldungen | Steinpilz | Anteil | relativ zum Höchstwert | tempFaktor(st) Klassenmitte |
|---|---:|---:|---:|---:|---:|
| ≤ 10 °C | 842 | 6 | 0,7 % | 0,23 | 0,48 (9 °C) |
| 10–12 °C | 757 | 7 | 0,9 % | 0,30 | 0,75 (11 °C) |
| 12–14 °C | 626 | 7 | 1,1 % | 0,36 | 0,96 (13 °C) |
| 14–16 °C | 792 | 19 | 2,4 % | 0,77 | 0,96 (15 °C) |
| 16–18 °C | 774 | 24 | 3,1 % | 1,00 | 0,77 (17 °C) |
| 18–20 °C | 582 | 5 | 0,9 % | 0,28 | 0,55 (19 °C) |
| > 20 °C | 193 | 0 | 0,0 % | (zu wenige) | 0,35 (21 °C) |

**Zu entscheiden:** Der höchste Steinpilz-Anteil liegt in der Klasse 16–18 °C (24 Funde); das Modell hat sein Optimum bei 13,7 °C (Bielefeld-Studie). Weicht die beobachtete Kurve davon ab, wäre ein flacherer Abfall zu den warmen Klassen denkbar – mit 68 Funden nur ein Hinweis; die Warm-Klassen enthalten vor allem August-Meldungen, deren Hintergrund anders zusammengesetzt ist.

## 6. Nach Auftrag O (Moor-Deckel st, Warm-trocken 0,4, Kältesumme Basis 10 °C)

|  | vorher (2026-09-26.30) | nachher (2026-09-26.31) |
|---|---:|---:|
| AUC Endwert Juni–November | 0,55 (0,49–0,61) | 0,60 (0,54–0,66) |
| AUC Endwert August–Oktober | 0,50 (0,43–0,57) | 0,55 (0,48–0,62) |
| Steinpilzfunde mit Endwert < 20 | 30 von 68 | 30 von 68 |
| Hintergrund mit Endwert < 20 | 49 % | 54 % |

Über die Schwelle 20 gehoben: 4 Steinpilzfunde (Moor 3, warm-trocken 1, anderes 0); neu unter 20: 4 (Oktober, Oktober, Oktober, Oktober – Kältesumme Basis 10 °C). Die Zahl bleibt gleich, die Fälle tauschen.

### Steinpilz-Anteil je Endwertklasse

| Endwert | vorher | nachher |
|---|---:|---:|
| 0–20 | 1,3 % (30/2.243) | 1,2 % (30/2.479) |
| 20–40 | 1,4 % (17/1.239) | 1,6 % (22/1.353) |
| 40–60 | 2,5 % (15/611) | 2,2 % (11/500) |
| 60–80 | 1,3 % (6/467) | 2,1 % (5/234) |
| 80–100 | 0,0 % (0/6) | – |

### Saisonende mit neuem Frost × Kälte

| Zeitraum | Steinpilz | Anteil relativ (beobachtet) | nötig (beobachtet ÷ übrige) | Frost × Kälte relativ vorher | nachher | Kältesumme Median vorher (5 °C) | nachher (10 °C) |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1.–15. September | 14 | 1,00 | 1,00 | 1,00 | 1,00 | 0,0 | 0,0 |
| 16.–30. September | 18 | 0,84 | 0,80 | 0,99 | 0,91 | 0,0 | 1,4 |
| 1.–15. Oktober | 9 | 0,38 | 0,40 | 0,93 | 0,63 | 0,0 | 16,5 |
| 16.–31. Oktober | 4 | 0,22 | 0,38 | 0,93 | 0,45 | 0,0 | 26,4 |
| 1.–15. November | 1 | 0,11 | (zu wenige) | 0,71 | 0,18 | 1,8 | 62,8 |
| 16.–30. November | 1 | 0,20 | (zu wenige) | 0,33 | 0,03 | 21,9 | 144,5 |

Gewollt bildet die neue Kurve nur etwa den halben beobachteten Rückgang ab (Hintergrund verschiebt sich im Oktober). Frost-/Kältekalibrierung mit Oktober-Besuchen bleibt offen.

### Überblick heute (Tageswetter wetter.json)

Anteil der Waldfläche (Grundstock-Gebiet, 300 m, heute, Steinpilz) mit Bewertung ≥ 40: vorher 27 %, nachher 25 % (117.791 Waldpixel, Tageswetter vom 2026-09-26).

