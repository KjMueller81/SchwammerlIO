# GBIF Stufe 2 – Probe Steinpilz im jetzigen Gebiet

Erzeugt von `werkzeuge/gbif-stufe2.js` am 2026-09-26 mit den Modellfunktionen aus index.html (Version 2026-09-26.28, Lernen aus). Nur Zählungen, Anteile und AUC – keine Fundorte. Grundlage: [Stufe 1](gbif-stufe1.md).

**Frage:** Liegen die Werte der App an Ort und Tag echter Steinpilzmeldungen höher als an Ort und Tag aller anderen Pilzmeldungen (Hintergrund = dort war jemand im Wald)? Vorbild Kinoko (modell/docs/findings-01.md).

## Daten

Steinpilz = *Boletus edulis* + *B. reticulatus*; Hintergrund = alle übrigen Pilzmeldungen ohne Flechten. Filter: Tagesdatum, Juni–November, 2015–2025, Unsicherheit ≤ 500 m oder unbekannt (verschleierte ≈ 27-km-Meldungen fallen weg), im Wald und im Grundstock-Gebiet, Boden bekannt. Dubletten: gleicher Beobachter (Hash), gleicher Tag, < 500 m → eine Meldung, Steinpilz gewinnt.

| Schritt | Meldungen | davon Steinpilz |
|---|---:|---:|
| aus Stufe 1 (Pilze ohne Flechten) | 22.848 | 285 |
| – nicht im Wald | −4.588 |  |
| – Unsicherheit > 500 m | −1.622 |  |
| – außerhalb Juni–November | −5.519 |  |
| – Boden unbekannt (im Überblick grau) | −472 |  |
| – außerhalb 2015–2025 | −1.856 |  |
| – außerhalb des Grundstocks | −29 |  |
| nach den Filtern | 8.762 | 73 |
| – Dubletten zusammengefasst | −4.196 |  |
| – HYRAS-Lücke am Meldeort | −0 |  |
| **ausgewertet** | **4.566** | **68** |

**Standort** je Meldung aus dem Grundstock (150 m): Baumart (Fichte mit < 80 % Kronendichte = „Fichte, licht“, wie im Überblick), Boden, Lage, Höhe, Kronendichte (unbekannt = 85 %). **Fest vorgegeben**, weil unbekannt: Unterwuchs Moos, Bestand 15–25 m, Struktur „innen“. Saison wie beim Lernen aus Besuchen: ab September Herbst, sonst Sommer (`SAISON.sommer.st` = 0,45 geht damit in den Endwert ein).

**Wetter:** DWD HYRAS täglich 1 km (v6-1): Niederschlag, Tmin, Tmax, Tmittel an der Zelle der Meldung (EPSG:3035, eigene LAEA-Umrechnung, gegen die lat/lon-Felder der Datei geprüft). Reihe = 36 Tage bis einschließlich Meldetag, Kältesumme mit Tagesmitteln ab 1.9. (wie `vor` in wetter.json), Vorhersage leer. HYRAS-Niederschlag gilt von 06 UTC des Tages bis 06 UTC des Folgetags – der Meldetag enthält also auch Regen nach dem Fund. Keine Bodenfeuchte: `bodenF` fehlt, der Haltefaktor kommt nur aus der Streubilanz (in der App 60 % Streu + 40 % Modell-Bodenfeuchte).

**Höhe:** `bewerte`/`wetterFaktorenArt` rechnen die Temperatur nicht selbst um – in der App macht das `wetterFuer` vorher (Open-Meteo-Modellhöhe → Zielhöhe, 0,65 °C/100 m). HYRAS liegt schon in Geländehöhe der 1-km-Zelle, deshalb gehen Tmin/Tmax **ohne** Korrektur ins Modell. Die Höhe (Grundstock, 150 m) wirkt nur über `hoehenDehnung` (Regenverzögerung) und die Wasserbilanz – wie am Pin.

**ET0 (Näherung):** Hargreaves (FAO-56 Gl. 52) aus Tmin/Tmax und Breite. Stichprobe am Tageslauf-Stand (wetter.json, 204 Punkte × 35 Tage ab 2026-08-22, n = 7.140): Hargreaves aus den Open-Meteo-Temperaturen gegen Open-Meteo-ET0 (FAO Penman-Monteith) – mittlere Abweichung 0,47 mm/Tag, systematisch +0,01 mm/Tag bei im Mittel 2,78 mm/Tag.

## a) Trennschärfe (AUC)

AUC = Wahrscheinlichkeit, dass eine zufällige Steinpilzmeldung einen höheren Wert hat als eine zufällige Hintergrundmeldung (0,5 = Zufall). In Klammern die 95-%-Spanne (Bootstrap, 1000 Ziehungen, getrennt nach Steinpilz und Hintergrund).

### (1) Juni–November

| Wert | AUC (95 %) | Steinpilz | Hintergrund |
|---|---:|---:|---:|
| Endwert (App) | 0,55 (0,49–0,61) | 68 | 4498 |
| Standortgüte allein | 0,55 (0,48–0,61) | 68 | 4498 |
| Wetterfaktor allein (rf × tf) | 0,56 (0,49–0,62) | 68 | 4498 |
| nur Saison (Kalenderwoche) | 0,56 (0,49–0,64) | 68 | 4498 |

### (2) nur August–Oktober

| Wert | AUC (95 %) | Steinpilz | Hintergrund |
|---|---:|---:|---:|
| Endwert (App) | 0,50 (0,43–0,57) | 57 | 3307 |
| Standortgüte allein | 0,52 (0,45–0,59) | 57 | 3307 |
| Wetterfaktor allein (rf × tf) | 0,51 (0,43–0,58) | 57 | 3307 |
| nur Saison (Kalenderwoche) | 0,60 (0,52–0,67) | 57 | 3307 |

### Einzelfaktoren (Juni–November)

| Faktor | AUC Juni–Nov. | AUC Aug.–Okt. |
|---|---:|---:|
| Regen: Auslöser (wirksamer Regen) | 0,56 | 0,52 |
| Regen: Summe 26 Tage (summenFaktor) | 0,57 | 0,53 |
| Regenfaktor rf (Ensemble) | 0,57 | 0,52 |
| Temperatur (ohne Frost/Kälte) | 0,54 | 0,51 |
| Frostfaktor | 0,52 | 0,51 |
| Kältefaktor | 0,54 | 0,52 |
| Saisonfaktor (Sommer 0,45 / Herbst 1) | 0,50 | 0,50 |
| Baumart (merkmalFaktor) | 0,57 | 0,55 |
| Boden (merkmalFaktor) | 0,54 | 0,53 |
| Lage (merkmalFaktor) | 0,46 | 0,45 |

### Blockweise: je Jahr

| Jahr | Steinpilz | Hintergrund | AUC Endwert (nur dieses Jahr) | AUC Saison (nur dieses Jahr) | AUC Endwert (Jahr ausgelassen) |
|---|---:|---:|---:|---:|---:|
| 2015 | 4 | 27 | 0,62 | 0,57 | 0,56 |
| 2016 | 0 | 45 | (zu wenige) | (zu wenige) | 0,55 |
| 2017 | 2 | 69 | (zu wenige) | (zu wenige) | 0,56 |
| 2018 | 2 | 37 | (zu wenige) | (zu wenige) | 0,56 |
| 2019 | 2 | 149 | (zu wenige) | (zu wenige) | 0,56 |
| 2020 | 11 | 445 | 0,50 | 0,75 | 0,56 |
| 2021 | 1 | 316 | (zu wenige) | (zu wenige) | 0,55 |
| 2022 | 12 | 651 | 0,61 | 0,70 | 0,54 |
| 2023 | 8 | 518 | 0,48 | 0,61 | 0,56 |
| 2024 | 13 | 997 | 0,57 | 0,25 | 0,55 |
| 2025 | 13 | 1244 | 0,67 | 0,64 | 0,52 |

### Blockweise: Nord-/Südhälfte (Grenze 48,14° N)

| Hälfte | Steinpilz | Hintergrund | AUC Endwert (App) | AUC Standortgüte allein | AUC Wetterfaktor allein (rf × tf) | AUC nur Saison (Kalenderwoche) |
|---|---:|---:|---:|---:|---:|---:|
| Nord | 28 | 1695 | 0,55 | 0,54 | 0,58 | 0,57 |
| Süd | 40 | 2803 | 0,57 | 0,55 | 0,55 | 0,56 |

## b) Kalibrierung

| Endwert | Meldungen | davon Steinpilz | Anteil Steinpilz |
|---|---:|---:|---:|
| 0–20 | 2.243 | 30 | 1,3 % |
| 20–40 | 1.239 | 17 | 1,4 % |
| 40–60 | 611 | 15 | 2,5 % |
| 60–80 | 467 | 6 | 1,3 % |
| 80–100 | 6 | 0 | 0,0 % |

Gesamtanteil Steinpilz: 1,5 %.

### Steinpilz-Anteil je Monat gegen den Saisonfaktor des Modells

| Monat | Meldungen | davon Steinpilz | Anteil Steinpilz | SAISON (st) |
|---|---:|---:|---:|---:|
| Juni | 305 | 5 | 1,6 % | 0,45 |
| Juli | 408 | 4 | 1,0 % | 0,45 |
| August | 700 | 12 | 1,7 % | 0,45 |
| September | 1.227 | 32 | 2,6 % | 1,00 |
| Oktober | 1.437 | 13 | 0,9 % | 1,00 |
| November | 489 | 2 | 0,4 % | 1,00 |

## c) Regenfenster (beschreibend)

Steinpilz-Anteil nach Regensumme am Meldeort (HYRAS) in Quartilen aller ausgewerteten Meldungen.

| Fenster | Q1 (niedrig) | Q2 | Q3 | Q4 (hoch) | Grenzen (mm) | AUC |
|---|---:|---:|---:|---:|---:|---:|
| 7 Tage | 1,7 % (20/1144) | 1,4 % (16/1144) | 1,6 % (18/1139) | 1,2 % (14/1139) | 8 / 19 / 34 | 0,46 |
| 14 Tage | 1,1 % (13/1145) | 1,3 % (15/1138) | 1,6 % (18/1141) | 1,9 % (22/1142) | 25 / 43 / 70 | 0,54 |
| 26 Tage | 1,0 % (11/1142) | 1,6 % (18/1141) | 1,7 % (19/1141) | 1,8 % (20/1142) | 57 / 91 / 135 | 0,57 |
| 42 Tage | 1,5 % (17/1142) | 1,3 % (15/1142) | 1,9 % (22/1140) | 1,2 % (14/1142) | 105 / 155 / 216 | 0,52 |
| 56 Tage | 1,1 % (12/1142) | 1,7 % (19/1141) | 1,9 % (22/1142) | 1,3 % (15/1141) | 154 / 212 / 282 | 0,54 |

Kinoko fand die stärkste Trennung bei Fenstern von 2–8 Wochen.

## d) Trockenheits-Deckel

| Regenfaktor rf | Steinpilz | Anteil an allen Steinpilzen | Hintergrund | Anteil am Hintergrund |
|---|---:|---:|---:|---:|
| < 0,2 | 1 | 1,5 % | 209 | 4,6 % |
| < 0,4 | 11 | 16,2 % | 1.046 | 23,3 % |
| ≥ 0,4 | 57 | 83,8 % | 3.452 | 76,7 % |

Unter rf 0,2 deckelt `deckel` den Endwert auf 8–30 (je nach Standortgüte). Liegen dort anteilig ähnlich viele Steinpilze wie Hintergrund, ist der Deckel für diese Daten zu streng.

## e) Frost und Kältesumme (beschreibend)

| Frostnächte (Tmin ≤ 0 °C) in 14 Tagen | Meldungen | davon Steinpilz | Anteil Steinpilz |
|---|---:|---:|---:|
| 0 | 3.859 | 63 | 1,6 % |
| 1 | 267 | 1 | 0,4 % |
| 2 und mehr | 440 | 4 | 0,9 % |

| Kältesumme ab 1.9. | Meldungen | davon Steinpilz | Anteil Steinpilz |
|---|---:|---:|---:|
| 0 | 3.832 | 63 | 1,6 % |
| > 0–25 | 652 | 5 | 0,8 % |
| > 25–60 | 70 | 0 | 0,0 % |
| > 60 | 12 | 0 | 0,0 % |

## f) Standort: Beobachtung gegen die Gewichte W (Steinpilz)

Verhältnis = Anteil der Klasse bei Steinpilz ÷ Anteil im Hintergrund (> 1 = bei Steinpilz häufiger). W = Gewicht im Modell (`W.<merkmal>.<klasse>.st`, 0–10). „Widerspruch“: Verhältnis und Gewicht zeigen in verschiedene Richtungen (Verhältnis > 1,2 bei W unter dem Mittel oder < 0,8 bei W darüber; Mittel = W gewichtet mit der Häufigkeit der Klassen im Hintergrund), „neutral“ = Verhältnis 0,8–1,2; nur bei mindestens 5 Steinpilzmeldungen der Klasse.

### Baumart (Modellklasse)

| Baumart (Modellklasse) | Steinpilz | Hintergrund | Verhältnis | W (st) | Richtung |
|---|---:|---:|---:|---:|---:|
| fichte | 44 | 2.262 | 1,29 | 9 | passt |
| fichte_licht | 11 | 1.185 | 0,61 | 7 | passt |
| buche | 11 | 952 | 0,76 | 8 | passt |
| laub_jung | 2 | 57 | 2,32 | 2 | zu wenige |
| kiefer | 0 | 42 | 0,00 | 5 | zu wenige |

### Boden

| Boden | Steinpilz | Hintergrund | Verhältnis | W (st) | Richtung |
|---|---:|---:|---:|---:|---:|
| sauer | 46 | 2.721 | 1,12 | 9 | neutral |
| kalk | 8 | 858 | 0,62 | 5 | passt |
| moor | 6 | 512 | 0,78 | 1 | passt |
| neutral | 8 | 407 | 1,30 | 8 | passt |

### Lage

| Lage | Steinpilz | Hintergrund | Verhältnis | W (st) | Richtung |
|---|---:|---:|---:|---:|---:|
| nord | 15 | 1.180 | 0,84 | 8 | neutral |
| west | 21 | 936 | 1,48 | 5 | **Widerspruch** |
| ost | 10 | 867 | 0,76 | 6 | **Widerspruch** |
| sued | 14 | 788 | 1,18 | 3 | neutral |
| eben | 8 | 727 | 0,73 | 5 | passt |

### Höhe

| Höhe | Steinpilz | Hintergrund | Verhältnis | W (st) | Richtung |
|---|---:|---:|---:|---:|---:|
| 500–700 m | 40 | 2.456 | 1,08 | – | nicht im Modell |
| < 500 m | 11 | 859 | 0,85 | – | nicht im Modell |
| 700–900 m | 4 | 531 | 0,50 | – | nicht im Modell |
| 900–1200 m | 10 | 497 | 1,33 | – | nicht im Modell |
| ≥ 1200 m | 3 | 155 | 1,28 | – | nicht im Modell |

Höhe hat im Modell kein eigenes Standortgewicht; sie wirkt nur über die Regenverzögerung (`hoehenDehnung`) und – am Pin – über die Temperatur.

## g) Grenzen

- **Fallzahl:** 68 Steinpilzmeldungen – die AUC-Spannen sind entsprechend breit; Einzelfaktoren und Klassen mit wenigen Fällen sind Hinweise, keine Belege.
- **Suchaufwand:** Der Hintergrund zeigt, wo und wann gesucht wurde – aber nicht, wonach. Wer gezielt Steinpilze sucht, geht nach Regen in Fichtenwälder; das stärkt die Trennung des Modells womöglich künstlich. Pilzmeldungen allgemein häufen sich bei feuchtem Wetter, das schwächt die Wettertrennung.
- **Fehlbestimmungen:** Steinpilz/Sommersteinpilz werden verwechselt (deshalb zusammengefasst); iNaturalist „Research grade“ braucht zwei übereinstimmende Bestimmungen.
- **Baumartenkarte 2017/18** für Meldungen 2015–2025 (Käferflächen, Umbau); Boden aus der ÜBK25, Grundstock 150 m gegenüber Meldungen mit bis zu 500 m Unsicherheit.
- **Unterwuchs und Bestand unbekannt** → fest Moos und 15–25 m; Struktur „innen“.
- **Wetter:** ET0 geschätzt (Hargreaves), keine Bodenfeuchte; HYRAS-Tageswerte 06–06 UTC; Temperatur der 1-km-Zelle statt des Meldeorts.

## h) Urteil

Nein – der Endwert trennt Steinpilz vom Hintergrund nicht besser als „nur Saison“: AUC 0,55 (0,49–0,61) gegen 0,56 über Juni–November, innerhalb August–Oktober 0,50 gegen 0,60; die Spanne des Endwerts schließt den Zufall (0,5) ein.
Kein Teil trägt deutlich – am stärksten sind Regen: Summe 26 Tage (0,57) und Baumart (0,57), Standortgüte 0,55 und Wetterfaktor 0,56 liegen gleichauf; innerhalb der Hauptsaison (Aug.–Okt.) fällt der Wetterfaktor auf 0,51.
Mit 68 Fällen ist die Spanne ±0,06 – Unterschiede unter ≈ 0,1 sind nicht messbar; Bayern brächte bei gleicher Ausbeute etwa 266 Fälle (±0,03), ganz Deutschland etwa 2.811 (±0,01), deshalb lohnt Stufe 3 nur als deutschlandweite Prüfung (Zählung GBIF 2026-09-26: Steinpilz Juni–Nov. 2015–2025 mit Unsicherheit ≤ 500 m – Gebiet 80, Bayern 313, Deutschland 3.307).

Richtungs-Widersprüche Standort: Lage west (Verhältnis 1,48, W 5); Lage ost (Verhältnis 0,76, W 6).
