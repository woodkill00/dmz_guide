// Synthetic, read-only reference fixture; no profile or real game facts.
import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import { renderItemCard } from "../../src/ui/item-card.mjs";
const base = process.env.DMZ_SITE_URL || "http://127.0.0.1:4173";
const cards = ["regular", "compact", "inline", "icon"]
  .flatMap((size) =>
    ["short", "covered", "review"].map((state) =>
      renderItemCard(
        {
          id: "synthetic-reference",
          name: "SYNTHETIC long item name for narrow layouts and missing artwork",
          rarity: "Unknown",
          pack: { id: "demo:training-pack" },
        },
        {
          size,
          state,
          href: "/help/",
          className: "dash-tile",
          quantityLabel: "Remaining",
          quantityValue: "7,000,000,000",
          notes: ["Partial / unknown scope"],
          facts: [{ label: "Needed", value: "Unknown" }],
        },
      ),
    ),
  )
  .join("");
const html = `<!doctype html><html lang="en" data-layout-system="109" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Synthetic component reference</title><link rel="stylesheet" href="/assets/src/styles.css"><style>main{padding:var(--ui-gutter)}.reference-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(1rem * 16)),1fr));gap:var(--ui-gap)}input{max-inline-size:100%}</style></head><body><main><h1>Component reference · synthetic</h1><p>No game facts or saved player state.</p><div class="reference-grid">${cards}</div><label>Large cash <input aria-label="Large cash" value="7,000,000,000" readonly size="16"></label><details><summary>Details and recovery</summary><p role="status">Loading fixture</p><p role="alert">Synthetic save failed. Draft retained.</p><button type="button">Retry</button></details><p>Empty fixture: no records selected.</p></main></body></html>`;
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    // Only this inert reference context permits Axe injection; production suites keep CSP intact.
    const context = await browser.newContext({ bypassCSP: true }),
      page = await context.newPage();
    await context.route("**/__ui-reference109", (r) =>
      r.fulfill({ contentType: "text/html", body: html }),
    );
    await page.goto(base + "/__ui-reference109");
    for (const width of [320, 390, 768, 1280, 1440, 1920])
      for (const big of [false, true])
        for (const theme of ["dark", "light"])
          for (const density of ["comfortable", "compact"]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(
              ({ big, theme, density }) => {
                document.documentElement.style.fontSize = big ? "200%" : "";
                document.documentElement.dataset.theme = theme;
                document.documentElement.dataset.density = density;
              },
              { big, theme, density },
            );
            assert(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
              `${name}/${width}/${big}/${theme}/${density}`,
            );
          }
    await page.locator("summary").click();
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    assert.deepEqual(
      violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: `test-results/109-components-${name}.png` });
    console.log(
      name +
        ":48 width/text/theme/density states plus expanded empty/error/loading/missing-art accessibility PASS",
    );
  } finally {
    await browser.close();
  }
}
