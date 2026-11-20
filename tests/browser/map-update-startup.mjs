import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { serviceOrigin } from "../../src/domain/local-services.mjs";
const base =
  process.env.DMZ_SITE_URL || serviceOrigin("guide", "http://127.0.0.1");
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    let mutations = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().includes("__map-updates"))
        mutations++;
    });
    await page.goto(new URL("/map/", base).href);
    const control = page.locator("#update-map-sources");
    await control.waitFor({ state: "attached", timeout: 45000 });
    await page.waitForFunction(
      () => document.querySelector("#update-map-sources")?.disabled === false,
      {},
      { timeout: 30000 },
    );
    assert.equal(await control.isEnabled(), true);
    assert.equal(
      await page
        .getByText(
          "Updates need the owner-enabled local development server and reviewed source fingerprints. Static builds cannot update source files.",
          { exact: true },
        )
        .count(),
      0,
    );
    assert.equal(mutations, 0);
    await page.screenshot({ path: `test-results/095-update-${name}.png` });
    console.log(
      `${name}: live Hajin update button enabled; old warning absent; no collection/activation POST`,
    );
  } finally {
    await browser.close();
  }
}
