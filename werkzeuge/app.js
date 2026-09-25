// Lädt den Skriptteil aus index.html in Node (ohne Browser) und reicht ausgewählte Funktionen/Tabellen heraus.
// So nutzen Grundstock- und Wetterlauf exakt dieselben Farbtabellen, Deutungsregeln und Modellfunktionen wie die App.
"use strict";
const fs = require("fs");
const path = require("path");

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

// namen: Liste der Bezeichner, die herausgereicht werden sollen (fehlende werden undefined)
function ladeApp(namen) {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).join("\n");
  const start = /\n\s*update\(\);\s*\n\s*load\(\);/;
  if (!start.test(js)) throw new Error("Startstelle „update(); load();“ in index.html nicht gefunden");
  const rueck =
    "{" + namen.map((n) => JSON.stringify(n) + ": typeof " + n + ' !== "undefined" ? ' + n + " : undefined").join(", ") + "}";
  const kern = js.replace(start, "\nglobalThis.__APP = " + rueck + "; return;\n");
  const env = {
    window: stub("window"),
    document: stub("document"),
    L: stub("L"),
    navigator: stub("navigator"),
    location: stub("location"),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {}, key: () => null, length: 0 },
    fetch: () => new Promise(() => {}),
    setTimeout: () => 0,
    setInterval: () => 0,
    requestAnimationFrame: () => 0,
    alert() {},
  };
  new Function(...Object.keys(env), '"use strict";' + kern)(...Object.values(env));
  return globalThis.__APP;
}

module.exports = { ladeApp };
