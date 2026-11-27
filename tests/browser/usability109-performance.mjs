import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const read = async (file) => JSON.parse(await readFile(file, "utf8"));
const budgets = await read(
  "specs/109-sitewide-usability-design/performance-budgets.json",
);
const baseline = (
  await read("specs/109-sitewide-usability-design/layout-dom-baseline.json")
).results;
const candidate = (await read("test-results/109-verified-sweep.json")).results;
const comparisons = candidate.map((row) => {
  const before = baseline.find(
    (b) => b.route === row.route && b.width === row.width,
  );
  assert(before, "Missing matched baseline " + row.route);
  const ratio = row.nodes / before.nodes;
  assert(
    ratio <= budgets.familyDomGrowthMaximumRatio,
    "DOM growth " + row.route,
  );
  return {
    route: row.route,
    width: row.width,
    before: before.nodes,
    after: row.nodes,
    ratio,
  };
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(process.env.DMZ_SITE_URL || "http://127.0.0.1:4186");
  await page.waitForSelector("[data-ui-navigation-toggle]");
  await page.waitForLoadState("networkidle");
  const samples = await page.evaluate(async () => {
    const samples = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      document.querySelector("[data-ui-navigation-toggle]").click();
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      samples.push(performance.now() - start);
    }
    return samples;
  });
  assert(
    Math.max(...samples) <= budgets.navigationInteractionMaximumMs,
    "Navigation sample budget exceeded",
  );
  await writeFile(
    "test-results/109-performance.json",
    JSON.stringify(
      {
        method:
          "Matched Chromium fixtures; native menu activation plus two animation frames; local measurements, not a device SLA",
        comparisons,
        navigationSamplesMs: samples,
        budgets,
      },
      null,
      2,
    ),
  );
  console.log(
    comparisons.length +
      " DOM comparisons and10 navigation samples meet fixed budgets",
  );
} finally {
  await browser.close();
}
