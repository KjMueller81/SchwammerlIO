# Schwammerl-Karte — Projektwissen für Claude Code

Pilzsuch-Web-App für München und Umgebung (bis ~100 km). Eine einzige Datei `index.html`
(HTML + CSS + JavaScript, Leaflet 1.9.4 von cdnjs), gehostet über GitHub Pages:
https://kjmueller81.github.io/SchwammerlIO/

Bewertet Waldstandorte für **Pfifferling (pf)**, **Fichtensteinpilz (st)** und **Sommersteinpilz (som)**
aus Geodaten (Baumart, Boden, Kronendichte, Gelände) und gemessenem Wetter. Nutzer: ein Sammler,
Bedienung meist am iPhone im Wald, Auswertung am Windows-Rechner.

Stand dieser Datei: v2026-09-26.28. Die Entwicklung bis v2026-09-26.4 lief in einem claude.ai-Chat.

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
7. Deutsche Oberfläche und Kommentare. Keine `alert()`/`confirm()`/`prompt()`, stattdessen `toast()`
   (auch GPS-Fehler).
   Oberfläche nach den **UI/UX-Leitlinien** (eigener Abschnitt); offene Punkte und Stand in `STATUS.md`.
8. Kleine, begründete Änderungen; bei Modellwerten die Quelle im Kommentar nennen.
9. **Vor jedem Commit `node tests/selbsttest.js` ausführen – muss grün sein** (Exitcode 0).
   Das Skript prüft die Syntax im strikten Modus und rechnet `selbsttest()` ohne Browser;
   Exitcode 1 = Syntax-/Ladefehler, 2 = Fall oder Regel weicht ab.
   Tests (h)/(i) rechnen den Grundstock-Weg auf `tests/daten/ebersberg.json` (Ausschnitt um den Ebersberger Pin,
   erzeugt mit `werkzeuge/testausschnitt.js`; nach neuem Grundstock oder geänderter `wetter.json`-Form neu erzeugen).
10. **Aufträge in `STATUS.md` führen:** Angenommene Aufträge beim Start unter „Offene Aufträge“ eintragen
    (Stand begonnen / wartet), bei Auslieferung nach „Zuletzt ausgeliefert“ verschieben.

---

## UI/UX-Leitlinien

### Grundsatz
Karte zuerst. Die App wird im Wald einhändig am Handy bedient, oft ohne Netz, und abends am Rechner
ausgewertet. Jedes Bedienelement muss sich seinen Platz verdienen; im Zweifel einklappen oder weglassen.

### Hierarchie
1. Karte mit Region-Überblick (wichtigste Funktion) und Pin
2. Pin-Popup: Urteil mit Spanne, Prognose, Besuch erfassen
3. Tab „Punkt": Pin-Details, beste Stellen im Umkreis
4. Tab „Stellen": Liste, Bearbeiten, Export/Import
5. Tab „Karten": Hintergrund- und Datenebenen
6. Alles zum Debuggen (Diagnose, Rechenweg, Protokoll) standardmäßig zugeklappt

### Layout
- Mobil (< 900 px): Schublade unten (zu / halb / voll), Karte darüber.
- Desktop (≥ 900 px): Seitenleiste rechts, ca. 400 px, volle Höhe; Karte füllt den Rest.
- Schwebende Kartenelemente: Region-Feld unten links, GPS/Folgen am Rand der Seitenleiste bzw. rechts.
  Sie dürfen Popup und einander nicht verdecken.
- Beim Einpassen auf einen Umkreis alle verdeckenden Elemente berücksichtigen; der Kreis füllt den freien
  Kartenbereich möglichst aus.

### Kompaktheit
- Auswahl mit mehreren Optionen als Dropdown, nicht als Knopfreihe. Einfachauswahl: natives `<select>`.
  Mehrfachauswahl: eigenes kompaktes Dropdown mit Häkchen (kein `<select multiple>`).
- Formulare zweispaltig, Beschriftung klein über dem Feld.
- Sekundäre Infos (Wetterdetails, Quellen, Rechenweg) hinter „Details" bzw. `<details>`.
- Keine doppelten Funktionen (eine Speichern-Aktion, ein Schwellenregler je Zweck).
- Keine Texte, die erklären, was sichtbar ist; Hinweise nur, wenn sie eine Entscheidung ändern.

### Bedienung
- Tippflächen mindestens 40 px hoch, Abstand ≥ 6 px.
- Keine `alert()`/`confirm()`/`prompt()`; Rückmeldung per `toast()`, Bestätigungen im Element selbst,
  Löschen mit „Rückgängig".
- Lange Vorgänge mit Fortschritt (Schritt, Prozent, Restzeit); die Karte bleibt dabei bedienbar.
- Ein Tipp auf die Karte bei offenem Popup schließt nur das Popup.

### Ehrlichkeit der Anzeige
- Ortsfest: gleiche Stelle = gleicher Wert, egal welcher Ausschnitt oder Pin.
- Pin und Überblick rechnen über dieselbe Endformel; Abweichungen werden sichtbar gemacht, nicht versteckt.
- Unsicherheit zeigen: Spanne zu jedem Wert („34 (24–50)"); breite Spanne mit Hinweis auf die Fingerprobe.
- Datenstand immer erkennbar: „Wetter: heute 5:30", „offline — Wetter vom …", „live nachgeladen".
- Unbekanntes grau darstellen, nie mit Annahmen schönrechnen. Fehlt das Wetter, keine Wetterfarben.

### Darstellung auf der Karte
- Bewertungsfarben: rot schlecht → orange → gelb → grün gut, gleiche Skala wie am Pin (`farbeStetig`;
  `farbeGrob` nur für die Darstellungen „Wetter“, „Standort“ und den Trend).
- Regen/Feuchte: eigene Blauskala, nie rot–grün.
- Flächenbilder: innen geglättet, an Waldkanten hart; nie über Felder verlaufen.
- Rasterbilder immer mit `inMercator` ausrichten.

### Stil
- Dunkles Waldthema, Farben nur über CSS-Variablen (`--moos`, `--moos-hell`, `--papier`, `--papier-2`,
  `--linie`, `--feld`, `--pfiff`); keine neuen Einzelfarben im Code.
- Deutsche, knappe Beschriftungen; Einheiten mit Leerzeichen („12 mm", „630 m").
- Zahlen tabellarisch ausgerichtet (`font-variant-numeric: tabular-nums`).

### Vor jedem UI-Commit prüfen
Handy-Breite (ca. 390 px) und Desktop-Breite: Konsole ohne Skriptfehler, Popup, Region-Lauf,
Tagesregler, Schwellenregler, Besuch speichern, Umkreis-Suche, Offline-Hinweis.

### Umsetzung im Code (Stand v2026-09-26.16)
- Alle Farben stehen in `:root` (u. a. `--weiss`, `--tief`, `--knopf`, `--glas`, `--standort`, `--grau-leer`).
  Leaflet-Linien und -Marker verstehen keine CSS-Variablen → `cssFarbe("--name")`. Ausnahme: die Farbskalen
  (`SKALA_GROB`, `SKALA_REGEN`, Legenden-Verläufe) sind Daten.
- `toast(text, { text: "Rückgängig", fn })` zeigt einen Knopf im Toast (8 s). Löschen einer Stelle oder des
  letzten Besuchs geschieht sofort, rückgängig über den Toast. Notizen werden im Element bearbeitet
  (Stellenliste: Textfeld, Enter/Wegtippen speichert, Escape verwirft; Popup: „Notiz“ klappt `#pn-notiz` auf).
- Breite Spanne (> 20 Punkte bei einer Art, ohne Fingerprobe): Popup zeigt „Unsicher — Fingerprobe klärt
  das“ (`.unsicher`), der Link springt zum Boden-Feld `#bz-boden` im Besuchsblock (`__bzFinger`).
- Tippflächen: Selects, Regler, Aufklapper, Ebenen-Zeilen, GPS-Knöpfe und Region-Bedienung ≥ 40 px.
- Sicherer Bereich (iPhone als Home-Bildschirm-App, `viewport-fit=cover`, Statusleiste durchscheinend): Variablen
  `--sicher-oben/-unten/-links/-rechts` aus `env(safe-area-inset-*)`; Kopfzeile oben, Schublade (auch zugeklappt)
  unten. Zum Testen die Variablen per Stil überschreiben (z. B. 47 px / 34 px). Version im Kopf ohne Umbruch,
  unter 480 px ohne Jahr (`#version .jahr`). `#app` liegt `position: fixed; inset: 0` über dem ganzen Bildschirm
  (kein `-webkit-fill-available` – das zog in der Home-Bildschirm-App die Home-Leiste schon ab, der Streifen unten
  war doppelt). Zugeklappte Schublade = `--tabs-hoehe` (57 px) + 1 px Rand + `--sicher-unten`. Als
  Home-Bildschirm-App (`display-mode: standalone`) hat `#app` die Höhe `100lvh` statt `bottom: 0` – am iPhone
  endete der Anfangs-Viewport noch ≈ 26 pt über der Home-Leiste. Diagnose-Zeile `#dbg-ansicht` (`ansichtMessen`):
  innerHeight, visualViewport, screen, 100vh/dvh/lvh, sicherer Bereich unten, Unterkante von `#app` und Schublade.
- Toast = Text (`.toast-text`) + optional Knopf im Flex-Umbruch: passt beides, steht der Knopf rechts, sonst darunter
  (≥ 6 px Abstand, Knopf 40 px) – nie übereinander.
- Toasts oben über der Karte (`top: --sicher-oben + 100 px`; Handy links 10 / rechts 60 px frei für GPS, Desktop
  mittig über der Karte) – sie verdecken keine Knöpfe der Schublade.
- Überlappung: Ladeanzeigen (`#start`, `#lade`) lassen rechts 60 px für GPS/Folgen frei; das Pin-Popup hält am
  Handy oben 104 px Abstand, unten Zuschreibungshöhe + 10 px, Höhe = freie Karte (`pinInhalt`, auch nach
  `setzeStufe`). Umkreis-Kreise sind dunkel (`--humus`), sonst auf der
  hellen OSM-Karte unsichtbar.
- Region-Feld: Handy nach dem Lauf kompakte Leiste (`regionKompakt`, `#rg-kompakt` „Steinpilz · 25 km · Heute ·
  ab 40“ + Tagesregler, Tipp klappt auf); die Leiste wird **vor** dem Einpassen gesetzt, damit der Kreis mit
  ihrer Höhe rechnet. Desktop ≥ 900 px: `regionPlatz` hängt `#region` oberhalb der Tabs in die Seitenleiste
  (`.in-leiste`, immer offen), die Karte bleibt frei; bei Größenwechsel zurück auf die Karte.
- Tabs „Punkt · Stellen · Karten“, Punkt ist Standard. „Wetter“-Darstellung nur im Wald (Waldmaske).
- Restzeit nur im Live-Rückfall (`ladeOhneRest` im Grundstock-Lauf). Zoomknöpfe (Desktop, Maus) bleiben 30 px –
  die 40-px-Regel gilt für Touch.
- „teilweise außerhalb“ nur, wenn der Umkreis-Kreis das Gebiet um mehr als 1 km überragt (`grundstockLage`).
- Offene Abweichungen stehen in `STATUS.md`.

## Schichten der Rechnung (Architektur-Umbau ab v2026-09-26.13)

Die Rechnung ist in fünf Schichten getrennt. Die Endformel bleibt **eine** Funktion (`endwert`) für Schicht 4 und 5.

| Schicht | Inhalt | ändert sich | woher |
|---|---|---|---|
| 1 Grundlage | Waldmaske, Baumart, Boden, Höhe, Hangrichtung, Kronendichte | Monate–Jahre | Grundstock-Dateien `daten/grundstock/` |
| 2 Standortgüte | je Pixel und Pilzart, Unterwuchs neutral | nur mit den Modellgewichten | beim App-Start aus Schicht 1 |
| 3 Wetterlage | Wetterfaktoren je Wetterpunkt, Art und Tag (heute … +3), Regen-Ensemble je Punkt | 1–2× täglich | beim Start aus `wetter.json` (nur Rohreihen) |
| 4 Anzeige | Bewertung, Schwelle, Tag, Art, Darstellung, Ausschnitt | bei jeder Bedienung | nur Rechnen und Zeichnen, **keine Netzabfrage** |
| 5 Pin | wie bisher live | je Pin | Live-Abrufe |

### Grundstock (Schicht 1)
- `werkzeuge/grundstock.js` (Node, `cd werkzeuge && npm install && node grundstock.js`, ≈ 1–2 min, Abrufe werden in
  `werkzeuge/.cache/` zwischengespeichert). Nutzt über `werkzeuge/app.js` dieselben Tabellen/Funktionen wie die App
  (`BAUM_FARBEN`, `naechsteFarbe`, `bodenDeuten`, `lageAusHoehen`).
- Gebiet München ±100 km, Raster 150 m (1333 × 1333, gleiche Gradschritte). Ablage `daten/grundstock/`:
  `grundlage.png` (R Baumart-Code, G Boden-Code, B Lage-Code), `hoehe.png` (R Höhe/12 m, G Kronendichte in 5-%-Stufen,
  nur im Wald, 255 = unbekannt; B Datenabdeckung 1/0), `meta.json` (Raster, Stand, Version, Codes, Quellen,
  Lizenzen, Statistik). ≈ 2,6 MB. Die App lädt die Bilder mit `?v=<stand>.<version>` (`grundstockSchluessel`) –
  bei einem neuen Dateiformat `meta.version` erhöhen, sonst bleibt am Gerät der alte Stand im Speicher.
- Datenabdeckung (ab `version` 2, `meta.abdeckung`): Zelle in Deutschland (Natural Earth 1:10 Mio., gemeinfrei,
  ≈ 1 km genau) oder Wald laut Baumartenkarte = 1. Außerhalb (Österreich) kennt die Baumartenkarte keinen Wald –
  ohne Maske sähe das aus wie „kein Wald“.
- Baumart: Thünen bei 50 m, Wald ab 4 von 9 Teilpunkten, häufigste Art. Boden: LfU bei 30 m (ScaleHint!), Zellmitte,
  Farben per GetFeatureInfo gedeutet (3 Stellen je Farbe, Mehrheit), seltene Farben → nächste bekannte (< 36).
  Höhe: AWS Terrain Tiles z11. Hangrichtung: `lageAusHoehen` mit Nachbarn ±150 m auf 200 m hochgerechnet, keine
  Senke. Kronendichte: Copernicus HRL 2018 roh (`format=bsq`), Mittel aus 3 × 3 Teilpunkten.
- **Neu rechnen**, wenn: eine Quelle einen neuen Stand hat (Baumartenkarte, ÜBK25, HRL-Jahrgang), sich Klassen/Codes
  oder `bodenDeuten`/`lageAusHoehen` ändern, oder das Gebiet wachsen soll. Danach `meta.json`-Stand prüfen, committen.

### Täglicher Wetterlauf (Rohdaten für Schicht 3)
- `werkzeuge/wetter.js` (reines Node, keine Pakete) + `.github/workflows/wetter.yml` (3:30 und 10:30 UTC = 5:30/12:30
  MESZ, auch von Hand: Actions → Wetterlauf → Run workflow). Ergebnis `wetter.json` liegt als **einziger Commit** auf dem
  Zweig `wetterdaten` (Force-Push, keine Historie) und wird über
  `https://raw.githubusercontent.com/KjMueller81/SchwammerlIO/wetterdaten/wetter.json` geladen (CORS `*`, 5 min CDN-Cache,
  gzip ≈ 90 kB, roh ≈ 340 kB).
- Inhalt: Open-Meteo auf 0,2° (≈ 200 Punkte: Modellhöhe `e`, 36 Tage `tw/et0/tmin/tmax`, Vorhersage `f`, Bodenfeuchte
  `bf`), Stationsregen auf 0,05° (Tage 1–35 zurück, Zehntel mm, −1 = keine Station in 30 km), interpoliert wie in der App
  (Suchfelder 30 km, je 14 Stationen mit Daten, 1/(d²+2), ≥ 12 Stundenwerte). Nur Rohreihen, keine Faktoren.
- `datum0` = Open-Meteo-Datum des ersten Werts (Europe/Berlin). Kältesumme: sobald die Reihe nach dem 1.9. beginnt,
  schreibt der Lauf je Punkt `vor` = Tagesmittel (Modellhöhe) von `vorAb` (1.9.) bis zum Tag vor `datum0`,
  fortgeschrieben aus dem vorherigen `wetter.json` (`vorlaufBauen`, keine Zusatzabrufe; fehlt der Vorstand, bleiben
  die Tage `null` und zählen nicht). Die App mischt `vor` in `omMischen` mit Höhenkorrektur; der Pin holt ihn aus
  dem Tageswetter (`vorlaufAnhaengen`). Fehlt der Vorstand, meldet der Lauf das als `::warning::` und holt die
  Lücke einmalig aus dem Open-Meteo-Archiv (`vorlaufNachholen`, `temperature_2m_mean`, von der Archivhöhe auf die
  Modellhöhe umgerechnet). Solange Werte fehlen, zeigt das Region-Feld „Kältesumme unvollständig“ (`kaelteLuecke`).
- Verbrauch je Lauf: Open-Meteo ≈ 630 Abrufe (≈ 1 250/Tag), Bright Sky ≈ 800 Anfragen, Laufzeit ≈ 30 s + Einrichtung.
- Open-Meteo-Limit (GitHub-Adressen sind geteilt): eine Wiederholung nach 5 min, sonst Exitcode 3 → Warnung im Log,
  der alte Stand auf `wetterdaten` bleibt. Geplante Läufe schaltet GitHub nach 60 Tagen ohne Repo-Aktivität ab.

### App: Start, Schicht 2/3 und Überblick aus Grundstock
- Start (`datenLaden`, Ladeanzeige `#start`, Karte sofort bedienbar): `meta.json` (Netz zuerst) → `grundlage.png`/
  `hoehe.png` (`?v=<stand>`, Gerätespeicher zuerst, Cache API `schwammerl-daten-v1`, alte Stände werden gelöscht)
  → `wetter.json` von `raw.githubusercontent.com` (Netz zuerst, sonst Gerätespeicher) → Schicht 2+3 im Web Worker.
- Worker (`workerHaupt`, per Blob-URL): lädt den Skripttext der App mit Platzhaltern (wie `werkzeuge/app.js`) und
  rechnet `standortFeldBauen` (Schicht 2) und `wetterFeldBauen` (Schicht 3). Ohne Worker: `direktRechnen`.
  Gelernte Gewichte gehen per `lernUebernehmen` mit.
- Schicht 2 (`standortFeldBauen`): Hangrichtung je Pixel aus dem Grundstock (Nord/Süd/Ost/West/eben, keine Senke),
  Fichte mit < 80 % Kronendichte = „Fichte, licht“ (wie am Pin), Struktur innen, Bestand mittel, Unterwuchs neutral.
  Selbsttest-Regel: Nordhang ist für Steinpilz im Überblick nicht schlechter als eben.
- Schicht 3 (`wetterFeldBauen`): Knoten = 0,05°-Stationsraster aus `wetter.json`; je Knoten Höhenstufen à 250 m über
  die Waldhöhen der Umgebung; je Stufe drei Kronendichte-Klassen `WF_DICHTE = [60, 85, 100]` (Index `wfIndex`),
  je Klasse für heute … +3 und jede Art `rf` (Ensemble-Mitte), `rfMin`, `rfMax`, `tf`
  (über `wetterFaktorenArt`, wie am Pin). Open-Meteo bilinear aus 0,2° (`omMischen`, Temperatur je Ecke auf die
  Stufenhöhe), Regen der Vergangenheit aus dem Stationsraster. ≈ 6 300 Knotenstufen × 3 Dichten, 3,6 MB, ≈ 3 s Desktop.
- Schicht 4 (`regionAusGrundstock`): schneidet 25/50 km in 150 m, 100 km in 300 m aus dem Grundstock, Wetter je Pixel
  über `wetterAmPixel` (bilinear über 4 Knoten, linear über Höhenstufen und zwischen den Dichteklassen; echte
  Kronendichte des Pixels, unbekannt = 85 %, unter 60 % wie 60 %) → `wetterPixel`/`potAn`/`bewertungAn`.
  Keine Netzabfrage. Der alte Live-Weg bleibt Rückfall: Grundstock fehlt/lädt, kein Tageswetter, Wetter älter als
  26 h (außer offline) oder Mitte außerhalb des Gebiets – der Grund steht im Region-Feld (`#rg-stand`).
- Außerhalb des Grundstocks (`grundstockLage(b)`: innen/teil/aussen): Mitte draußen → live mit „Außerhalb des
  Kartengebiets München ±100 km — nur live, langsamer“; Rand draußen → Grundstock-Weg, Rand grau, „teilweise
  außerhalb — Rand wird grau“. Die Gebietsgrenze zeigt `grenzeZeigen` als dünne gestrichelte Linie, sobald
  der Kartenausschnitt über das Gebiet hinausreicht.
- Region-Feld zeigt den Datenstand („Wetter: heute 5:30 · Grundlage: Sept. 2026“). Ohne Pin/GPS nimmt der Umkreis
  die letzte Region-Mitte, solange sie im Bild ist (sonst wanderte die Mitte mit jedem Einpassen nach Süden).
- Ist `wetter.json` von einem früheren Tag, rücken Pin und Wetterfeld die Reihen gleich vor
  (`tageswetterVorruecken`, fehlende Tage aus der damaligen Vorhersage, höchstens 4 Tage).

### Offline-Betrieb
- `sw.js` (Service Worker, nur über https/localhost): App-Seite Netz zuerst, Leaflet Speicher zuerst, angesehene
  OSM-/OpenTopoMap-Kacheln (höchstens 3 000) aus dem Speicher. Grundstock und `wetter.json` hält die App selbst
  (`schwammerl-daten-v1`). Neue Cache-Namen in `sw.js` räumen alte Stände beim Aktivieren weg.
- Pin ohne Netz (`navigator.onLine` false): Baumart, Boden, Hang, Höhe, Kronendichte aus dem Grundstock
  (`grundstockAmPunkt`, 150 m), Wetter aus dem Tageswetter (`wetterAusTageswetter` über `wetterAusDaten`,
  Quelle „offline — Wetter vom …“). Mit Netz, aber ohne Open-Meteo und Bright Sky, greift das Tageswetter vor
  Gerätearchiv und Reanalyse. Region-Feld: „offline — Wetter vom … · Grundlage: …“. Besuche speichern geht offline.
- Offline-Erkennung (`istOffline`): `navigator.onLine` false, oder die Probe `netzPruefen` (eigene Seite
  `daten/grundstock/meta.json`, gleiche Adresse, kann kein Dienst blockieren) scheitert, oder `wetter.json` kam
  aus dem Gerätespeicher. Offline zeigt der Kopf statt der Saison den Hinweis `#netz-chip` „offline — Wetter vom …“,
  das rote Band (`zeigeFehler` aus `merkeBlockade`) kommt nur, wenn Netz da ist und die Dienste abweisen.
- Kartenhintergrund hell (`--karte-leer`): wo offline keine Kachel liegt, bleiben die Bewertungsfarben lesbar.
- **Offline-Grundkarte** (Webkarte Bayern, WMTS Geobasisdaten Bayern, Kachelsatz `smerc`, CC BY 4.0): nur auf
  Knopfdruck. Stand des Gebiets (`gkGebietStand`, `gk.gebiet`): vollständig → „Gebiet offline ✓ · n Kacheln · MB ·
  Stand“ mit „Aktualisieren“ (fehlende Kacheln; älter als `GK_GEBIET_ALT_TAGE` = 180: alle neu), sonst grüner
  Knopf mit „(x % gespeichert)“; 0 neue Kacheln → „… war schon vollständig gespeichert.“ Jede Kachel trägt ihr
  Speicherdatum (Header `X-Gespeichert`); ohne gespeichertes Gebiet-Datum gilt die jüngste Kachel, ohne beides
  entfällt „Stand“, und „Aktualisieren“ lädt dann alles neu.
  „Gebiet grob, Umgebungen fein“ (v2026-09-26.24): Tab „Karten“: „Gebiet offline speichern“
  (`gkGebietKacheln`, Grundstock-Gebiet, Zoom 0–11, 379 Kacheln ≈ 20 MB; ältere Zoom-12-Kacheln bleiben bis zum
  Löschen), Liste der Umgebungen (`gk.umg`, `schwammerl:umgebungen`: Name = Stelle ≤ 100 m oder nächster Ort über
  OSM Nominatim, Radius, Größe, Datum, „Auf Karte zeigen“, „Löschen“), „Offline-Karte löschen“ (alles). Tab
  „Punkt“: Radius 5/10/15 km (`#gk-r`, Standard 10) + „Umgebung speichern“ (Zoom 13–15, bei 15 km Zoom 15 nur im
  inneren 5-km-Kreis, `umgZooms`; erster Tipp nennt Kacheln und MB, zweiter lädt). Überschneidungen: eine Kachel
  liegt nur einmal im Cache; `umgLoeschen` entfernt nur Kacheln, die keine andere Umgebung braucht; Größen je
  Eintrag zählen gemeinsame Kacheln mit (`umgGroessenNeu`). Abgebrochene Umgebungen stehen als „unvollständig“ in
  der Liste. Die frühere 15-km-Umgebung (Zoom 13–14) übernimmt `umgUebernehmen` einmalig als ersten Eintrag
  (Mitte = Schwerpunkt der Zoom-14-Kacheln). Nach „Besuch speichern“ bietet der Toast „Umgebung (10 km, ca. x MB)
  offline speichern?“ an, wenn online und die Stelle nicht schon in einer Umgebung liegt (`umgebungAngebot`).
  `gkLaden`: Pakete à 4 parallel, 120 ms Pause, Gespeichertes übersprungen, Fortschritt/Restzeit/Abbrechen
  (`.gk-fort`). Cache `schwammerl-grundkarte-v1`, Schlüssel immer `wmtsod1` (keine Dreifachablage), Zähler in
  `schwammerl:grundkarte` (beim Start mit dem Cache abgeglichen, `gkInit`). `navigator.storage.persist()` beim
  ersten Laden, Ergebnis im Tab „Karten“ („Speicher dauerhaft: ja/nein“).
- Offline mit gespeicherter Webkarte ersetzt `grundkarteWahl` OSM (`osmEbene`) durch `gkEbene` (liest nur aus
  dem Cache; fehlt eine Stufe, wird die nächstgröbere bis 6 Stufen vergrößert). Online immer OSM. Quellenvermerk
  laut Nutzungshinweisen WMTS (Stand 27.10.2023) in `GK_ZUSCHREIBUNG`; am Handy kleinere Attributionsschrift.

## Architektur (Funktionen in index.html)

**Modell**
- `standortGuete(v, art)` – gewichtetes geometrisches Mittel der Standortfaktoren aus `W` / `GEW`
  (Baum, Boden, Unterwuchs, Lage, Bestand, Struktur), mit `lernFaktor` aus den eigenen Funden.
  Einzelfaktor über `merkmalFaktor`.
- Unterwuchs `v.unter` ist eine **Liste** (`unterListe` liest auch alte Einzelwerte): `unterFaktor` =
  Mittelwert der Klassengewichte; Kraut deckelt den Mittelwert auf sein eigenes Gewicht, Brombeere
  in der Liste → `deckel` ≤ 20. Formular `#f-unter` ist `<select multiple>` (`unterAusForm`, `setzeUnterForm`).
- `wasserBilanz(tw, et0, hoehe, dichte, alter, tmax)` – Streufeuchte, Speicher `SPEICHER = 25` mm,
  Kronenabfang (`bodenRegen`), temperaturabhängige Verdunstung (`etAnteil`), Höhendehnung.
- `wirksamerRegen(art, w, …)` – artspezifischer Auslöse-Kern (Verzögerung) × Haltefaktor
  (Streubilanz 60 % + Modell-Bodenfeuchte 40 %). Regen auf feuchte Streu verkürzt die Verzögerung bis 30 %.
- `summenFaktor(art, tw)` – lange Regensumme: st 26 Tage, pf 35 Tage, som 21 Tage.
- `regenFaktorArt` – √(Auslöser × Regensumme), gedämpft bei widersprüchlichen Messquellen.
- **Regen-Ensemble** (`regenFaktorEnsemble`, `REGEN_ENSEMBLE = [0.85, 1, 1.15]`): Der Regenfaktor wird mit dem
  Regen der Vergangenheit ×0,85 / ×1 / ×1,15 gerechnet und gemittelt; die Vorhersage bleibt unskaliert
  (`wetterAmTag` merkt die Grenze in `vergangen`). Glättet die Streu-Kante (Ebersberger Forst: Wetterpotenzial
  bei Regen −20…+20 % vorher 27/32/36/54/70, jetzt 28/34/43/55/64). Gilt überall über `wetterFaktorenArt`
  (Pin, Rechenweg, Wetterfeld, Stichproben, Lernen). `bewerte` liefert zusätzlich `<art>_min`/`_max` aus den
  drei Einzelrechnungen; Prognose/Popup zeigen heute „34 (24–50)“, der Rechenweg die Einzelwerte, der
  Überblick die Mitte und die Spanne im Tipp (`GW[tag].rfMin/rfMax`). Rechenzeit Überblick etwa ×3.
- `tempFaktor(art, tmin, tmax)` – st: 20-Tage-Mittel, Optimum 13,7 °C; pf: 14-Tage-Mittel; plus Hitze
  (der frühere 4-Tage-Frostabschlag ist durch `frostFaktor` ersetzt).
- **Saisonende** (v2026-09-26.21, alle Zahlen Annahmen, `FROST`, `KAELTE_*`): `frostFaktor(art, tmin)` – Frostnacht
  Tmin ≤ 0 °C auf Zielhöhe → 0,3, über 7 Tage linear auf 1; harter Frost ≤ −3 °C → 0,15, über 10 Tage; mehrere
  Nächte: niedrigster Wert, keine Multiplikation; gilt auch für Vorhersagetage. `kaelteFaktor(art, kaelteSumme(w))` –
  KS = Σ max(0, 5 °C − Tagesmittel) ab 1.9. (Reihe + Vorlauf `vor`), 0 → 1, 25 → 0,7, 60 → 0,3, 100 → 0,1;
  Sommersteinpilz mit doppelter KS (endet früher). Beide multiplikativ auf `tf` in `wetterFaktorenArt` (also auch
  unter den Temperaturdeckel), dieselbe Endformel für Pin, Wetterfeld und Stichproben. Wetterreihen tragen
  `datum0` (Datum des ersten Werts; `datum0Von`, `wetterAmTag` und `tageswetterVorruecken` reichen es weiter).
  Anzeige: Popup „Saison klingt ab — n Frostnächte (letzte vor x Tagen), Kältesumme KS“ ab Faktor < 0,9
  (`saisonEndeText`), Rechenweg mit eigenen Zeilen Frost und Kältesumme. Sommer/Herbst-Schalter bleibt nur
  für die Gewichtung der Arten.
- `wetterFaktorenArt` – bündelt Regen- und Temperaturfaktor; enthält die **Ausschlussregel Steinpilz**
  (5-Tage-Mittel > 17,5 °C und < 5 mm in 5 Tagen → Temperaturfaktor ≤ 0,15).
- `deckel(v, art, rf, tf)` – harte Grenzen: Moor ≤ 10, Brombeere ≤ 20, Kultur ≤ 25, Trockenheits-/Temperaturdeckel.
- `endwert` – 100 × Standort × Regen × Temperatur × Saison, begrenzt durch `deckel`.
- `SAISON` – Sommer/Herbst-Faktoren je Art.

**Wetter**
- `holeWetterHaupt` / `holeWetterMulti` – Open-Meteo (35 Tage zurück, 8 voraus, ET0, Bodenfeuchte 0–7 cm) über
  eine gemeinsame Schicht `omWetterJ`: Punkte auf 0,05° gerundet (`omKey`, Pin/Überblick/Stichproben teilen sie),
  bis 50 Orte je Anfrage, Bodenfeuchte in derselben Anfrage, 30 min Zwischenspeicher (Speicher + localStorage
  `schwammerl:om:*`, höchstens 40 Punkte). Kein Höhenparameter: `wetterFuer` rechnet die Temperatur von der
  Modellhöhe (`j.elevation`) mit 0,65 °C/100 m auf die Zielhöhe um (`tempAufHoehe`).
- Überblick: nur 3×3 Wetterpunkte (100 km: 4×4), dazwischen `wetterMisch` (bilinear, Temperatur je Ecke auf die
  Ortshöhe), Höhe je Zelle aus den Geländekacheln (`HF`).
- Höhen: `hoehen(punkte, zoom)` zuerst aus den AWS-Geländekacheln (Terrarium, kein Tageslimit,
  `hoehenTerrarium`), Rückfall Open-Meteo-Elevation, dann Open Topo Data.
- Verbrauch: `omZaehlen` schätzt je erfolgreichem Abruf nach der Open-Meteo-Zählregel (Orte × Tage/14 ×
  Variablen/10) und zeigt „Open-Meteo heute“ in der Diagnose (`#om-zaehler`) und im Bericht.
- `stationsNetz` / `stationsNetzBereich` – DWD-Stationen über Bright Sky; `stationsGewichte` +
  `stationsRegenMitGewichten` / `stationsRegenAm` – Interpolation, **Reichweite fest 30 km**, Gewicht 1/(d²+2).
  Regen der Vergangenheit kommt **immer aus dem Stationsnetz**, Modellregen nur als Rückfall.
  `stationsNetz` nimmt die nächsten Stationen **mit Daten** (doppelt so viele Kandidaten abfragen);
  `stationsNetzBereich` sucht in Feldern alle 30 km (höchstens 49 Felder, je 14 Stationen).
  Stationen, die bei Bright Sky 404 liefern, merkt `stationOhneDaten` für die Sitzung und fragt sie nicht
  erneut ab; das Protokoll meldet sie gesammelt („x Stationen ohne Daten übersprungen“, fetch-Option
  `leise404` unterdrückt die Einzelzeilen).
- `quellenAbgleich` – bei widersprüchlichen Messungen gilt der niedrigere Wert.
- `RADAR_IM_MODELL = false` – DWD-Radar (RADOLAN SF) nur als Kartenebene, **nicht** in der Bewertung
  (gelernte Farbskala unzuverlässig, leere Bilder wurden als 0 mm gelesen).
- Rückfallkette in `holeWetter`: (offline → Tageswetter) Open-Meteo+Station → Bright Sky komplett → Tageswetter
  (`wetter.json`) → Gerätearchiv (≤ 3 Tage alt) → ERA5-Land-Reanalyse.

**Geodaten**
- Baumarten: Thünen-WMS, Klasse per Pixelfarbe (`naechsteFarbe`, `baumAmPunkt`).
- Boden: LfU ÜBK25 GetFeatureInfo (`bodenDeuten`); im Überblick Bodenbild + aus Stützstellen gelernte
  Farblegende (`bodenLegende`), unbekannte Farben werden gezielt nachgelernt. Das Bodenbild kommt über
  `pixelBildFein` in Kacheln bis 2048 px mit höchstens 35 m/Pixel (sonst liefert die LfU ein leeres Bild).
  Ohne bekannte Kartenfarbe ist der Boden **unbekannt** (keine Nachbar-Stützstelle mehr).
- Kronendichte: Copernicus HRL 2018 (`kronendichte`). Höhe/Hang: Open-Meteo Elevation (`lageAusHoehen`,
  erkennt Nord/Süd/Ost/West/Senke).

**Ansichten**
- Layout: unter 900 px Karte oben, Schublade unten (`setzeStufe` zu/halb/voll, `MOBIL` ab < 700 px bzw.
  Handy-Kennung). Ab 900 px Seitenleiste rechts (400 px, volle Höhe, Tabs oben, eigener Scroll), Karte
  füllt den Rest; GPS-/Folgen-Knopf (Leaflet `topright`) sitzen damit am linken Rand der Seitenleiste.
- Tab „Karten“: Ebenen, Regen-Ebene 3/7/14/30 Tage aus dem Stationsnetz (`zeichneRegenfeld`),
  Diagnose zugeklappt (`#diag-box`: Protokoll, `bericht()`, Pin-Fall als JSON `pinFall`, CSV des Rasters,
  Modell-Selbsttest). Eigene WMS-Ebenen gibt es nicht mehr (`frageLayer` bleibt für die festen Ebenen).
- Tab „Punkt“: Urteil, Prognose, Begründung des Pins → „Beste Stellen im Umkreis“ (`bewerteUmkreis` →
  `bewerteBereich`, 500 m–3 km, Top 5, `#u-list`) → zugeklappt „Merkmale & Wetter anpassen“, „Rechenweg“
  (`#rw-box`), „Anzeige“ (Deckkraft `#r-deck`, Schwelle `#r-min`, Fläche zeigen/löschen).
  Schwelle je Ansicht gemerkt (`SCHWELLE.region` 40, `SCHWELLE.umkreis` 20, `setzeSchwelle`).
- Umkreis-Grundlage: live Baumartenkarte, Boden-Stützstellen, Kronendichte, Höhen. **Offline oder wenn die
  Baumartenkarte nicht erreichbar ist** rechnet `bereichAusGrundstock` je Zelle mit Baumart, Boden, Kronendichte,
  Hangrichtung und Höhe aus dem Grundstock (150 m), Wetter wie am Pin bzw. aus dem Tageswetter; Hinweis „offline —
  Grundstock 150 m“. Ohne Grundstockdaten (keine Daten, Boden unbekannt) wird die Zelle grau (`C.grau`), nie
  Formularwerte. Unterwuchs und Bestand kommen in beiden Wegen aus dem Formular (in keiner Karte).
  Rangfolge `umkreisRangfolge` (Gleichstand → näher am Pin); liegt der Bestwert < 3 Punkte über dem Median
  (`umkreisUnterschiede`), keine Top 5, sondern „Keine Unterschiede im Umkreis erkennbar“. Gezeichnet als ein Bild
  (`umkreisBild`, 4 px je Zelle, Rechtecke nur unsichtbar zum Antippen) – keine Gitterlinien.
- Urteilsstufen `URTEIL` (gut 60, mittel 40, schwach 20) für Popup, Tab „Punkt“ und Prognosesatz: „Gleich los“ erst
  ab „mittel“, darunter „Diese Woche kaum Aussicht hier.“, wird es besser „Warten bis …“.
- Datenstand mit Präposition (`standKurz`): „Wetter von heute 16:41“, „von gestern …“, „vom 25.9. …“.
- Neue Version: `versionPruefen` vergleicht `VERSION` mit der Seite im Netz (Start + 15 s, alle 30 min, beim
  Zurückholen der App) – `sw.js` ändert sich bei Auslieferungen nicht. Toast „Neue Version — neu laden“ mit Knopf,
  danach „Neu laden“ im Kopf; nie automatisch, bei offenem Besuchsentwurf erst speichern.
- Offline-Karte: einmaliges Aufräumen `gkAufraeumen` (Merker `schwammerl:gk-aufgeraeumt`) löscht Kacheln, die
  weder zum Gebiet (Zoom ≤ 11) noch zu einer Umgebung gehören – v. a. die früheren Zoom-12-Kacheln.
- Schwelle im Region-Feld: Regler „Zeigen ab“ (`#g-min`, 0–80, Schritt 5) über dem Tagesregler. Für den
  Überblick sind `#g-min` und `#r-min` (Anzeige) derselbe Wert (`setzeRegionSchwelle`), die Umkreis-Suche
  behält ihren eigenen. Beim Ziehen Zahl sofort, Fläche nach 150 ms neu (`schwelleNeuZeichnen`, ohne
  Neuberechnung); Kopfzeile `#rg-info` „x Waldpixel ab 40 · Best y“ (`tagInfo`). Bedeutung: „Bewertung“ →
  erwartete Bewertung, „Standort“ → echte Standortgüte (nicht die Perzentil-Farbskala), „Wetter“ → Regler
  ausgegraut (`schwelleAktiv`). Regler im Feld 40 px hoch; das Feld ist höchstens Kartenhöhe − 130 px
  (GPS-Knöpfe bleiben frei) und scrollt sonst innen.
- Region-Überblick als Feld auf der Karte (Handy) bzw. in der Seitenleiste (Desktop) (`#region`, zugeklappt
  Knopf `#region-knopf`, `regionOffen`, `regionPlatz`, `regionKompakt`):
  Dropdowns Umkreis `#g-r` (25/50/100 km, passt sofort ein) und Pilzart `#g-art`, Darstellung `#g-modus` („Bewertung“ = Wert `zwei`, „Wetter“, „Standort“),
  „Region bewerten“ (`bewerteRegion`), Tagesregler `#tagregler` (Tage ohne Neuberechnung,
  `setzeTag`), Stichproben (`stichproben`, bis 60 Punkte mit echter Pin-Rechnung). Am Handy klappt das
  Feld beim Pin-Setzen ein; der Knopf „Region“ ist unter 900 px ausgeblendet, solange ein Popup offen ist
  (`#map.popup-offen`), weil er über der Kartenebene liegt. Zellen im `rasterCache` bleiben für
  Stichproben, Kontrollzeile und CSV.
- Überblick ehrlich: Unterwuchs im Überblick und in den Stichproben neutral (`UNTER_FERN` = Pseudoklasse
  `W.unter.mittel`, Mittel aller Klassen, ohne Kraut-/Brombeer-Deckel); der Pin nutzt die echte Eingabe.
  Feinraster-Code `FS` 255 = kein Wald, 254 = Wald mit unbekanntem Boden (grau, nicht in Bestwert/Statistik),
  253 = außerhalb des Grundstock-Gebiets, 252 = keine Daten (außerhalb Deutschlands); beide dezent grau
  schraffiert, in jeder Darstellung, nicht in der Statistik. Tipp: „keine Daten (außerhalb Deutschlands)“.
  Bild: `ueberblickBild` baut es in **einem** Durchgang (k-fach vergrößert, Zeilen gleich in Web-Mercator, Farben
  innerhalb gleicher Klasse bilinear geglättet, Kanten hart über die Maske, Schraffur ≈ 10 Bildschirmpixel).
  Pin-Fall (`pinFall`) schreibt im Grundstock-Weg `zelle` mit Baumart, Boden, Hang, Kronen, Höhe, Standortgüte,
  Wetterpotenzial, Bewertung und Spanne des Feinpixels.
  `zweiRaster(C, modus, art, min)` rechnet die Darstellung ohne Leinwand (testbar), `zeichneZweiEbenen` malt.
  „Bewertung“: Farbe = erwartete Bewertung je Feinpixel (`bewertungAn` → `endwert` mit der Standortgüte des
  Pixels als `sgVorab`, Regen-/Temperaturfaktor aus dem Wetterfeld `GW[tag].rf/.tf`), Skala `farbeStetig` wie
  am Pin, Deckkraft einheitlich. Wetterfeld über `wetterPotenzial(a, w, hoehe, saison)` (Kronen 85 %).
  Tipp auf die Fläche: „Bewertung ≈ x (Wetter y %, Standort z %) · Pin: p“ zur Kontrolle.
  Standortgüte-Farben relativ zum Ausschnitt (10.–90. Perzentil, Legende `#rg-legende` mit echten Werten).
  Ohne Wetterraster (`GW = null`): „Wetter × Standort“ zeigt nur den Standort (`zweiModusFuer`) mit Warnung
  im Region-Feld, „Nur Wetter“ zeichnet nichts. `holeWetterMulti` fasst bei 429/5xx zweimal nach.
  Stichproben holen ihr Wetter selbst (`holeWetterMulti`), wenn die Zellen keins haben.
- `zoomAufUmkreis(rKm)`: zoomt genau auf den Kreis um Pin → GPS-Standort → Kartenmitte (Viertel-
  Zoomstufen), zeigt ihn gestrichelt (`regionKreis`) und rechnet verdeckte Flächen (`verdeckteRaender`:
  Region-Feld, Ladeanzeige, Schublade/Seitenleiste falls überlappend) als `paddingTopLeft/BottomRight` ein.
  Handy: vorher Schublade zu.

**Stellen und Besuche (Datenmodell)**
- Stelle (`spots[]`, Gerätespeicher `schwammerl:spots`): `name, lat, lng, pf, st, som, v` (Merkmale), `notiz`,
  `besuche[]`. Die alten Felder `fund`, `besucht`, `finger`, `fundAlter`, `wf` bleiben stehen und spiegeln
  den letzten Besuch (`altfelderSpiegeln`), damit ältere Stände lesbar bleiben.
- Besuch: `{ ts, fund: [] (leer = nichts), alter (jung|mittel|alt|gemischt, nur bei Fund), finger
  (trocken|maessig|feucht), unter: [], bestand, bewertung: {pf,st,som}|null, wetter: {regen7, regen26,
  streu, tageSeitRegen, temp20}|null, wf: {pf,st,som}|null, nachgetragen }`.
- `stelleNormal(sp)` wandelt alte Stellen beim Laden/Import einmalig um (nur wenn `fund` ein Array ist,
  wird daraus ein erster Besuch mit `umgewandelt: true`); idempotent.
- Popup-Block „Besuch erfassen“ (`besuchBlockHtml`, Entwurf `entwurf` je Pin, Handler `__bz`,
  `__bzDatum`, `__bzSpeichern`): speichert an eine Stelle im Umkreis 25 m (`stelleBei`) oder legt sie an
  (eigener „Speichern“-Knopf entfällt; unten nur Details · Umkreis · Notiz). Kompakt in zwei Spalten,
  Beschriftung klein darüber: Fund | Alter, Unterwuchs | Boden, Bestand | Datum. Einfachauswahl als
  `<select>` (Boden, Bestand, Alter – Alter nur bei Pilzfund). Fund und Unterwuchs als eigenes
  Mehrfach-Dropdown (`.md-kopf`/`.md-liste`, `__mdAuf`, `entwurf.offen`): zu eine Zeile mit der Auswahl,
  offen Liste mit Häkchen über die volle Breite (Einträge ≥ 40 px), Zeiger unter einer Trennlinie,
  „Nichts“ schließt Pilze aus. Tipp außerhalb/Escape schließt (`mdZu`, ohne Neuzeichnen). Bewusst kein
  `<select multiple>` (am Desktop offene Liste). Datum zeigt „heute“, die Datumsauswahl liegt unsichtbar
  darüber. Wetterzeilen des Pins (Regen, Regenquelle, Nächte) stehen nur hinter „Details“.
  Früheres Datum → `wetterBisTag` kürzt die Wetterreihe auf den Tag (≤ 35 Tage, sonst ohne Wetter),
  `wetterSchnappschuss` bildet die Werte; der Besuch gilt als `nachgetragen`.
- Lernen (`lerne`): jeder Besuch einzeln. `besuchWert` = 1 bei Zielart, sonst stärkstes `BEGLEIT`-Gewicht
  (`fundGewicht`), sonst 0. `besuchGewicht`: Fund 1, Leerfund nach `wf` (mind. 0,1); nachgetragen ohne
  Schnappschuss × 0,5. Unterwuchs/Bestand kommen vom Besuch, übrige Merkmale von der Stelle.
- GeoJSON: `stellenGeojson` (alte Felder + `besuche`), `stellenImport` (Stellen < 25 m zusammenführen,
  Besuche mit gleichem Zeitstempel ±5 Min. = Dublette; alte Exporte ohne `besuche` über `stelleNormal`).
- Markerfarbe nach letztem Besuch (`besuchFarbe`): gold Zielart, braun nur Zeiger, grau nichts, grün unbesucht.
- Besuch zusätzlich (v2026-09-26.26): `id` (fest, lazy in `stelleNormal` über `besuchIds`, idempotent),
  `geaendert` (Zeitstempel der letzten Bearbeitung), `unsicher` (Liste der Fund-Schlüssel mit unsicherer
  Bestimmung; Eingabe je Fund als Häkchen-Zeile „☐ Steinpilz – Bestimmung unsicher“, Standard aus).
  `fundGewicht(fund, a, unsicher)`: unsicherer Zielart-Fund 0,5, unsicherer Begleitfund halbes
  Zeigergewicht (`UNSICHER_FAKTOR`, Annahme, zu kalibrieren); `besuchKurz` zeigt „?“. Import
  (`besucheZusammenfuehren`): zuerst gleiche `id` → jüngeres `geaendert` gewinnt, erst ohne id-Treffer die
  ts-±5-Min.-Regel; neue Besuche ohne id bekommen eine.
- Stelle zusätzlich: `hand` = { Merkmal: true } für von Hand korrigierte Merkmale (nichts überschreibt sie; auch
  „Besuch speichern“ setzt `v.unter`/`v.alter` nur ohne Hand-Vermerk), `vGeo` = Merkmale vor der ersten Korrektur
  (einmalig gesichert). Die Stellenliste zeigt die Merkmale mit „✎“ (Tooltip: ursprünglicher Wert).
- Bearbeiten (Tab „Stellen“, Aufklapper „Bearbeiten“, `bb`): oben Name und Merkmale (Auswahl aus den Formular-
  optionen, Unterwuchs als Mehrfach-Dropdown), darunter alle Besuche (neueste oben) mit „Ändern“, „Löschen“ und
  ggf. „Wetter nachholen“. Besuch ändern mit denselben Bausteinen wie „Besuch erfassen“ (`bzZelle`, `bzAuswahl`,
  `bzMdKopf`, `bzMdListe`, `bzUnsicher`). Übernehmen/Enter/Wegtippen speichert, Verwerfen/Escape verwirft; jede
  Änderung und Löschung sofort mit „Rückgängig“ (tiefe Kopie der Stelle, `stelleGeaendert`). Datum geändert →
  `besuchWetterNeu` mit dem Wetter an der Stelle (`stelleWetter`: Grundstock-Höhe/-Dichte, `holeWetterCached`);
  offline oder außerhalb der Reihe → ohne Wetter, nachgetragen, später „Wetter nachholen“. Unterwuchs/Bestand
  geändert und Wetter vorhanden → Bewertung/wf neu. „Neu laden“ wartet, solange das Bearbeiten ungespeichert ist.

---

## Bekannte Fallstricke (alle schon einmal passiert)

- **Mercator:** Rasterbilder sind in gleichen Breitengrad-Schritten gerechnet, die Karte ist Web-Mercator.
  Vor `L.imageOverlay` immer `inMercator(...)` anwenden, sonst Nordversatz bis ~900 m.
- **Umkreis rechnet offline mit dem Formular:** `bewerteBereich` fiel ohne Baumartenkarte/Boden/Kronendichte auf
  `readForm()` zurück – offline war der Kreis einfarbig, die Top 5 identisch und am Nordrand (Zählreihenfolge).
  Seit v2026-09-26.25 Grundstock statt Formular (`bereichAusGrundstock`), Test (n).
- **Nahtlinien:** `inMercator` kopiert Zeile für Zeile per `drawImage` – das ergab im Überblick feine waagrechte
  Linien über die ganze Breite (Desktop und iPhone). Der Grundstock-Überblick rechnet Mercator deshalb direkt in
  den Pixeln (`ueberblickBild`); `inMercator` nur noch für den alten Live-Weg.
- **Rechtecke im Überblick** entstehen, wenn Boden aus der nächsten Stützstelle statt aus der Kartenfarbe
  kommt. Unbekannte Farbe → Formularwert, nicht Nachbar-Stützstelle.
- **Ortsfestigkeit:** Ein Ort muss unabhängig von Ausschnitt und Pin denselben Wert haben
  (feste Reichweite, Kronendichte/Hangrichtung im Überblick aus dem Grundstock, Stationen über den ganzen Bereich suchen).
- **Implizite Globals** brechen im strikten Modus nur bei bestimmten Daten – immer `var` setzen.
- Große Schleifen im Überblick: keine `map.distance` pro Tag und Zelle (→ `kmSchnell`, Gewichte je Zelle einmal).
- Popups/Formulare am iPhone: kein `prompt()` für neue Funktionen.
- **Knöpfe im Pin-Popup, die den Inhalt neu zeichnen,** brauchen `event.stopPropagation()` im `onclick`.
  Sonst ist der Knopf beim Kartenklick schon aus dem DOM gelöst, Leaflet hält ihn für einen Kartenklick
  und schließt das Popup (am Rechner setzt der nächste Klick sogar einen neuen Pin). Neu zeichnen über
  `pinInhalt()` – hält Scrollstand und begrenzt die Höhe auf die sichtbare Karte.
- **LfU-Bodenkarte hat einen ScaleHint (max. 99 m Pixeldiagonale):** gröber als ~45 m/Pixel kommt Status 200
  mit einem **leeren** PNG – kein Fehler, nur keine Farben. Gemessen: 42 m/px gezeichnet, 48 m/px leer.
  Deshalb `pixelBildFein` mit 35 m/px. Folge des Fehlers war „unbekannte Bodenfarbe“ für fast alle Waldpixel.
- **Open-Meteo-Kosten:** Eine Wetterabfrage mit 43 Tagen kostet je Ort ≈ 3,07 Abrufe (Tage/14). Vorher:
  Überblick ≈ 507 (100 Orte Wetter + 100 Bodenfeuchte + 100 Höhen), Pin ≈ 8, Stichproben ≈ 300 (Höhen).
  Jetzt: Überblick 25/50 km ≈ 28, 100 km ≈ 49, Pin ≈ 3 (0 im Zwischenspeicher), Höhen 0. Ob mehrere Orte in einer
  Anfrage einzeln zählen, sagt die Doku nicht ausdrücklich – die Schätzung nimmt es an.
- **Open-Meteo-Mehrpunktabrufe** zählen je Ort und Tagespanne; zwei Überblicke kurz hintereinander liefen ins
  Minutenlimit (429) → „Wetter fehlt“. `holeWetterMulti` wartet und wiederholt, das Protokoll nennt den Grund.
  Beim **Tageslimit** („Daily API request limit exceeded“, gilt je Internetadresse, ein Überblick kostet
  mehrere Hundert Abrufe) merkt `openMeteoTageslimit` das für die Sitzung: keine Wiederholungen, Höhen über
  den Ersatzdienst, im Region-Feld steht der Grund. Viele Testläufe am PC sperren auch die App am PC.
- **Stationsnetz Pin ↔ Überblick:** Viele DWD-Stationen liefern bei Bright Sky 404. Wer „die 14 nächsten“ nimmt
  und leere erst danach verwirft, verliert nahe Stationen. Im Ebersberger Forst fehlte dem Überblick so
  Ebersberg-Halbing (7 km, dominierendes Gewicht) → Zelle 56 % Wetter statt 36 % am Pin. Immer „die nächsten
  N mit Daten“ und dichte Suchfelder (30 km).
- **Copernicus-Kronendichte (ImageServer):** `identify` braucht die Koordinaten **mit** `spatialReference` im Punkt;
  der Parameter `sr=4326` wird ignoriert → „NoData“ (so lief der Pin bis v2026-09-26.12 immer ohne Kronendichte).
  `exportImage` hält die Pixel in Grad quadratisch und dehnt den Ausschnitt → Werte über `extent` der Antwort
  zuordnen, nicht über die Anfrage. Rohwerte nur mit `format=bsq` (erst Daten, dann Maske), PNG ist eingefärbt.
- **Interne Leaflet-Funktionen:** `mdZu()` ruft nach dem Schließen einer Mehrfach-Liste `popup._updateLayout()`
  und `popup._updatePosition()` auf, damit das Popup ohne Neuzeichnen schrumpft. Beides ist nicht öffentliche
  Leaflet-API (1.9.4) und kann bei einem Leaflet-Update wegfallen oder sich ändern – dann bleibt unten im
  Popup eine Leerfläche (der Aufruf ist mit `if (pp._updateLayout)` abgesichert). Beim Update prüfen.

---

## Modellbelege

- Brejon Lamartinière & Hoffman, „Predicting porcini“, bioRxiv 2025/26 (Bielefeld, 10 Jahre, Buchenwald):
  Temperaturoptimum ≈ 13 °C (20-Tage-Mittel), Regen über 26 Tage linear, keine Obergrenze;
  frühere Fassung: 5-Tage-Mittel > 17,5 °C bei < 1 mm/Tag → kein Fund. Preprint, nicht begutachtet.
- Pfifferling (Saskatchewan): Wärmesumme > 5 °C + kumuliert 50–100 mm.
- Pilz4You (Potsdam 1988–2019): Steinpilzsaison 3–5 Dekaden zusammenhängend, 120-Tage-Mittel von
  Temperatur/Bodenfeuchte/Niederschlag wichtig – noch nicht umgesetzt (siehe STATUS.md, Backlog).
- Martínez-Peña et al. 2012: Steinpilzertrag am höchsten in mittelalten Beständen.
- Messunsicherheit des Stationsregens: Die Interpolation aus DWD-Stationen (1/(d²+2), 30 km) weicht am Ort
  typisch ±15–20 % ab (konvektive Schauer, Stationsabstand 7–15 km); daher das Regen-Ensemble ×0,85/1/1,15.
  Belegt im eigenen Datensatz: Ebersberger Forst, Nachbarstationen 16.9. zwischen 2,9 und 19,2 mm.
- Saisonende (**zu kalibrieren**): Frost und plötzliche Abkühlung unterbrechen die Fruchtbildung beim Steinpilz
  (Angelini et al.); die Pilzsaison endet allgemein mit Frost (Kauserud et al. 2012, PNAS); die Versorgung durch die
  Wirtsbäume lässt im Herbst nach. Feste Schwellen gibt es in der Literatur nicht – Frostgrenzen (0 / −3 °C),
  Startwerte (0,3 / 0,15), Erholungszeiten (7 / 10 Tage), Kältesumme (Basis 5 °C, Kurve 25/60/100) sind Annahmen.
- Erfahrungswissen (schwächer gewichtet): Osthang für Pfifferling, Zeigerpilze Marone, Hexenröhrlinge,
  Fliegenpilz, Pfefferröhrling, Semmelstoppelpilz; stickstoffreiche Krautschicht ungünstig.

---

## Felddaten des Nutzers (Kalibrierung)

- 8.9. südl. München/Holzkirchen, 32 °C, Dürre: nichts (6 Stellen).
- 13.9. Hofoldinger Forst, Regen am selben Tag: nur Flockenstielige Hexenröhrlinge.
- 22.9. Schliersee (≈ 47.82 N, 11.74 E), Fichte/sauer/Moos/Nordhang, 13 mm am 9.9. und 31 mm am 16./17.9.,
  Fingerprobe mäßig–feucht: 2 Fichtensteinpilze (zwei jung 5–10 cm, einer 20 cm), Maronen, Hexenröhrling.
- 25.9. 1 km nördlich davon (≈ 47.832 N, 11.751 E), Fichte/sauer/Nordhang/innen, Unterwuchs Moos + Heidelbeere:
  Marone mittel; ein alter Fichtensteinpilz (zuerst als Sommersteinpilz erfasst, am 26.9. in der App korrigiert,
  Bestimmung sicher).
- Pilz-Ticker Bayern (passion-pilze-sammeln.com) als unabhängiger Abgleich, gleiche Einordnung.
- Stellen als GeoJSON im Browser gespeichert, Export/Import im Tab „Stellen“.

---

## Offene Punkte

Offene Punkte: siehe `STATUS.md`, Abschnitt „Backlog“ (und „Wartet auf Entscheidung“).

---

## Typischer Ablauf einer Änderung

1. Anforderung verstehen, betroffene Funktion suchen (`grep -n "function name("`).
2. Änderung klein halten, Quelle/Begründung als Kommentar.
3. Syntax (strict) + Selbsttest prüfen, VERSION hochzählen, Prettier.
4. Diff zeigen, Commit mit deutscher Nachricht („Modell: …“, „UI: …“, „Fix: …“), Push.
5. GitHub Pages ist nach 1–2 Minuten aktualisiert; Version oben in der App kontrollieren.
