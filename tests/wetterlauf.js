// Selbsttest Wetterlauf ohne Netz: node tests/wetterlauf.js
// Simuliert Antwortfolgen für anfrage() in werkzeuge/wetter.js (Wiederholung, Limit, 4xx) – ohne Wartezeit.
// Exitcode 0 = alles grün, 2 = mindestens ein Fall weicht ab.
"use strict";
const W = require("../werkzeuge/wetter.js");

const URL = "https://api.open-meteo.com/v1/forecast?latitude=48.00,48.20&longitude=11.00,11.20&daily=x";
let gewartet = [];
W.NETZ.pause = async (ms) => gewartet.push(ms);
// Antwortfolge: Zahl = HTTP-Status (200 mit leerem JSON-Objekt), "netz"/"zeit" = Netzfehler bzw. Zeitüberschreitung,
// { status, body } = Status mit eigenem Inhalt
function folge(liste) {
  let i = 0;
  gewartet = [];
  W.NETZ.fetch = async () => {
    const x = liste[Math.min(i++, liste.length - 1)];
    if (x === "netz") throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
    if (x === "zeit") throw Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" });
    const status = typeof x === "number" ? x : x.status,
      body = typeof x === "number" ? (x === 200 ? "{}" : '{"error":true,"reason":"HTTP ' + x + '"}') : x.body;
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  return () => i; // Zahl der Anfragen
}
const still = async (fn) => {
  const log = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
  }
};
const faelle = [
  [
    "503, 503, 200 → Erfolg nach zwei Wiederholungen (Pausen 5 s, 20 s)",
    async () => {
      const n = folge([503, 503, 200]),
        r = await still(() => W.anfrage("Open-Meteo", URL));
      return r.status === 200 && n() === 3 && gewartet.join() === "5000,20000";
    },
  ],
  [
    "503 × 4 → Fehler nach 3 Wiederholungen, Meldung mit Dienst, URL ohne Werte, Status, Versuch",
    async () => {
      const n = folge([503, 503, 503, 503]);
      try {
        await still(() => W.anfrage("Open-Meteo", URL));
        return false;
      } catch (e) {
        return (
          e instanceof W.DienstFehler &&
          n() === 4 &&
          gewartet.join() === "5000,20000,60000" &&
          /Open-Meteo/.test(e.message) &&
          /HTTP 503/.test(e.message) &&
          /Versuch 4/.test(e.message) &&
          /latitude=…/.test(e.message) &&
          !/48\.00/.test(e.message) &&
          W.fehlerCode(e) === 1
        );
      }
    },
  ],
  [
    "Netzfehler und Zeitüberschreitung werden wiederholt",
    async () => {
      const n = folge(["netz", "zeit", 200]),
        r = await still(() => W.anfrage("Bright Sky", URL));
      return r.status === 200 && n() === 3;
    },
  ],
  [
    "400 → sofort Fehler, keine Wiederholung",
    async () => {
      const n = folge([400, 200]);
      try {
        await still(() => W.anfrage("Open-Meteo", URL));
        return false;
      } catch (e) {
        return e instanceof W.DienstFehler && n() === 1 && gewartet.length === 0;
      }
    },
  ],
  [
    "404 bei Bright Sky erlaubt → Antwort ohne Fehler (Station ohne Daten)",
    async () => {
      folge([404]);
      const r = await still(() => W.anfrage("Bright Sky", URL, { erlaubt: [404] }));
      return r.status === 404;
    },
  ],
  [
    "429 (Open-Meteo) → einmal Limitpause, dann Limit → Exitcode 3",
    async () => {
      const n = folge([429, 429]);
      try {
        await still(() => W.omAnfrage([[48, 11]]));
        return false;
      } catch (e) {
        return e instanceof W.Limit && n() === 2 && gewartet.join() === String(W.NETZ.limitPause) && W.fehlerCode(e) === 3;
      }
    },
  ],
  [
    "Limittext ohne 429 → Limit",
    async () => {
      folge([{ status: 400, body: '{"error":true,"reason":"Daily API request limit exceeded"}' }]);
      try {
        await still(() => W.anfrage("Open-Meteo", URL));
        return false;
      } catch (e) {
        return e instanceof W.Limit && W.fehlerCode(e) === 3;
      }
    },
  ],
];

(async () => {
  let ok = 0;
  for (const [name, fn] of faelle) {
    let g = false,
      info = "";
    try {
      g = await fn();
    } catch (e) {
      info = "  (" + e.message + ")";
    }
    if (g) ok++;
    console.log((g ? "OK   " : "FEHL ") + name + info);
  }
  console.log("Wetterlauf:", ok + "/" + faelle.length + (ok === faelle.length ? " – grün" : " – ABWEICHUNG"));
  process.exit(ok === faelle.length ? 0 : 2);
})();
