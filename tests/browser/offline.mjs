import assert from "node:assert/strict";
import { runEditorTests } from "./editor.mjs";
export async function runLocalNetworkTests({
  browser,
  base,
  captureScreenshots = true,
}) {
  const remote = [];
  const localBrowser = {
    newContext: async (...args) => {
      const context = await browser.newContext(...args);
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin === base) return route.continue();
        remote.push(url.origin);
        return route.abort();
      });
      return context;
    },
  };
  // This repeats the actual original PNG/JPEG/WebP clean-profile import, saved raster decode,
  // private linked routes and reload journey while every non-loopback request is blocked.
  await runEditorTests({ browser: localBrowser, base, captureScreenshots });
  const context = await localBrowser.newContext(),
    page = await context.newPage();
  await page.goto(base + "/inventory/?pack=demo%3Atraining-pack");
  await page.waitForSelector('[data-id="demo:wire"][data-field="inventory"]');
  await page
    .locator('[data-id="demo:wire"][data-field="inventory"]')
    .fill("23");
  await page
    .getByRole("button", { name: "Save inventory", exact: true })
    .click();
  await page.waitForFunction(() =>
    document.querySelector("#save-status").textContent.includes("revision"),
  );
  await page.reload();
  await page.waitForSelector('[data-field="inventory"]');
  assert.equal(
    await page
      .locator('[data-id="demo:wire"][data-field="inventory"]')
      .inputValue(),
    "23",
  );
  for (const [route, ready] of [
    ["/catalog/", "#catalog-pack"],
    ["/maps/?pack=demo%3Atraining-pack", "#location-list button"],
    ["/local/?pack=demo%3Atraining-pack&id=demo%3Awire", "#local-records h2"],
  ]) {
    await page.goto(base + route);
    await page.waitForSelector(ready);
    await page.reload();
    await page.waitForSelector(ready);
    assert.equal(await page.locator("h1").count(), 1);
  }
  assert.deepEqual(
    remote,
    [],
    "No external runtime requests needed with loopback reachable",
  );
  assert.equal(
    await page.evaluate(async () =>
      navigator.serviceWorker
        ? (await navigator.serviceWorker.getRegistrations()).length
        : 0,
    ),
    0,
  );
  await context.close();
}
