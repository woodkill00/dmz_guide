if (!process.argv.includes("--apply"))
  throw Error(
    "One-time migration: review the diff, then supply --apply. Use npm run ui:audit for read-only checks.",
  );
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(
    new URL("../tools/hajin-map/package.json", import.meta.url),
  ),
  postcss = require("postcss");
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
const files = [...walk("src"), ...walk("tools/hajin-map/src")].filter(
  (p) =>
    p.endsWith(".css") &&
    !p.endsWith("layout-tokens.css") &&
    !p.endsWith("layout-refinements.css"),
);
const spaces = [
  0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.25, 1.5, 2, 3,
];
const types = {
  0.8125: "meta",
  0.875: "label",
  0.9375: "body",
  1: "base",
  1.125: "lead",
  1.25: "heading",
  1.5: "title",
};
const radius = [0.25, 0.5, 0.75, 1];
const changed = [];
let declarations = 0;
for (const file of files) {
  const ast = postcss.parse(fs.readFileSync(file, "utf8"));
  let count = 0;
  ast.walkDecls((d) => {
    let category =
      /^(padding|margin|gap|row-gap|column-gap|scroll-margin|scroll-padding)(-|$)/.test(
        d.prop,
      )
        ? "space"
        : d.prop === "font-size"
          ? "type"
          : d.prop === "border-radius"
            ? "radius"
            : null;
    if (!category || d.value.includes("url(") || d.value.includes("var(--ui-"))
      return;
    if (
      d.prop === "font-size" &&
      d.parent.selector?.split(",").some((s) => s.trim() === ":root")
    ) {
      d.value = "100%";
      count++;
      return;
    }
    const next = d.value.replace(
      /(-?(?:\d*\.)?\d+)(rem|px)\b/g,
      (match, raw, unit) => {
        const value = Number(raw),
          rem = Math.abs(value) / (unit === "px" ? 16 : 1);
        if (value === 0 || rem > 4 || (category === "type" && rem > 1.75))
          return match;
        let token;
        if (category === "type") {
          const n = Object.keys(types)
            .map(Number)
            .reduce((a, b) => (Math.abs(b - rem) < Math.abs(a - rem) ? b : a));
          token = "--ui-type-" + types[n];
        } else if (category === "radius") {
          const n = radius.reduce((a, b) =>
            Math.abs(b - rem) < Math.abs(a - rem) ? b : a,
          );
          token = "--ui-radius-" + (radius.indexOf(n) + 1);
        } else {
          const n = spaces.reduce((a, b) =>
            Math.abs(b - rem) < Math.abs(a - rem) ? b : a,
          );
          token = "--ui-space-" + (spaces.indexOf(n) + 1);
        }
        return value < 0
          ? "calc(var(" + token + ") * -1)"
          : "var(" + token + ")";
      },
    );
    if (next !== d.value) {
      d.value = next;
      count++;
    }
  });
  if (count) {
    fs.writeFileSync(file, ast.toString());
    declarations += count;
    changed.push({ file: file.replaceAll("\\", "/"), declarations: count });
  }
}
fs.writeFileSync(
  "test-results/109-token-migration.json",
  JSON.stringify(
    {
      scope:
        "Spacing/type/radius source consumers; no world coordinates, widths or event owners rewritten",
      declarations,
      changed,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ declarations, stylesheets: changed.length }));
