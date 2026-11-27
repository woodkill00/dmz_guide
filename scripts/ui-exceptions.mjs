// Deliberate ledger refresh, reviewed with geometry receipts; never runs in CI.
import fs from "node:fs/promises";
if (!process.argv.includes("--review-current"))
  throw Error(
    "Run ui:audit first, then explicitly review the current declarations.",
  );
const inventory = JSON.parse(
  await fs.readFile("test-results/109-ui-inventory.json", "utf8"),
);
const entries = inventory.sheets.flatMap((sheet) =>
  sheet.rawLayoutDeclarations
    .filter(
      (d) => !(d.value.includes("calc(") && d.value.includes("var(--ui-")),
    )
    .map((d) => ({
      file: sheet.file,
      selector: d.selector,
      property: d.property,
      value: d.value,
      reason: sheet.file.endsWith("layout-tokens.css")
        ? "Token foundation or intrinsic minimum"
        : /map|x01|safe-run/.test(sheet.file)
          ? "Retained map primitive, media or intrinsic control geometry"
          : "Retained intrinsic media, table, control or breakpoint geometry",
    })),
);
await fs.writeFile(
  "specs/109-sitewide-usability-design/layout-exceptions.json",
  JSON.stringify(
    {
      version: 1,
      scope:
        "Exact retained declarations. New or changed dimensions require geometry evidence and review.",
      entries,
    },
    null,
    2,
  ) + "\n",
);
