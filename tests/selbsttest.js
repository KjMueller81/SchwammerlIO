// Modell-Selbsttest ohne Browser: node tests/selbsttest.js
// Prüft die Syntax im strikten Modus und führt selbsttest() aus index.html aus.
// Exitcode 0 = alles grün, 1 = Syntax-/Ladefehler, 2 = mindestens ein Fall oder eine Regel weicht ab.
"use strict";
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).join("\n");

try {
  new Function('"use strict";' + js);
  console.log("Syntax (strict): OK");
} catch (e) {
  console.log("Syntax (strict): FEHLER", e.message);
  process.exit(1);
}

// Platzhalter für Browser-Objekte (DOM, Leaflet …): jede Eigenschaft/jeder Aufruf liefert wieder einen Platzhalter
function stub(name) {
  return new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === "then" || k === "catch" || k === "finally") return () => stub(name + ".then()");
      if (k === "length") return 0;
      if (k === "value" || k === "textContent" || k === "innerHTML") return "";
      if (k === "checked") return false;
      return stub(name + "." + String(k));
    },
    set() {
      return true;
    },
    apply() {
      return stub(name + "()");
    },
    construct() {
      return stub("new " + name);
    },
  });
}
const store = {};
const env = {
  window: stub("window"),
  document: stub("document"),
  L: stub("L"),
  navigator: stub("navigator"),
  location: stub("location"),
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => (store[k] = String(v)),
    removeItem: (k) => delete store[k],
  },
  fetch: () => new Promise(() => {}),
  setTimeout: () => 0,
  setInterval: () => 0,
  requestAnimationFrame: () => 0,
  alert: () => {},
};
const namen = Object.keys(env);

// UI-Start am Ende der IIFE (update/load) überspringen und Testzugriff herausreichen
const start = /\n\s*update\(\);\s*\n\s*load\(\);/;
if (!start.test(js)) {
  console.log("FEHLER: Startstelle „update(); load();“ in index.html nicht gefunden");
  process.exit(1);
}
const kern = js.replace(start, "\nglobalThis.__T = { selbsttest: selbsttest, VERSION: VERSION }; return;\n");

let t;
try {
  new Function(...namen, '"use strict";' + kern)(...namen.map((k) => env[k]));
  console.log("Version:", globalThis.__T.VERSION);
  t = globalThis.__T.selbsttest();
} catch (e) {
  console.log("FEHLER beim Laden/Ausführen:", e && e.stack ? e.stack : e);
  process.exit(1);
}
t.zeilen.forEach((z) => console.log(z));
console.log("Ergebnis:", t.ok + "/" + t.n + (t.ok === t.n ? " – grün" : " – ABWEICHUNG"));
process.exit(t.ok === t.n ? 0 : 2);
