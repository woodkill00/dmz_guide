import assert from "node:assert/strict";
export async function runLocalNetworkTests({ browser, base }) {
  const context = await browser.newContext(),
    remote = [];
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base) return route.continue();
    remote.push(url.origin);
    return route.abort();
  });
  const page = await context.newPage();
  for (const route of [
    "/catalog/",
    "/inventory/?pack=demo%3Atraining-pack",
    "/editor/?pack=demo%3Atraining-pack",
    "/maps/?pack=demo%3Atraining-pack",
    "/local/?pack=demo%3Atraining-pack&id=demo%3Awire",
  ]) {
    await page.goto(base + route);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("h1").count(), 1);
    await page.reload();
    assert.equal(await page.locator("h1").count(), 1);
  }
  assert.deepEqual(
    remote,
    [],
    "No external runtime requests are needed with loopback reachable",
  );
  assert.equal(
    await page.evaluate(async () =>
      navigator.serviceWorker
        ? (await navigator.serviceWorker.getRegistrations()).length
        : 0,
    ),
    0,
    "No optional service worker installed",
  );
  await context.close();
}
