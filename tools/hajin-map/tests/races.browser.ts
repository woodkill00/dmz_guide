import assert from "node:assert/strict";
export async function runRaceBrowser(parent, base) {
  const page = await parent.context().newPage(),
    checks = [];
  const read = () =>
    page.evaluate(async (base) => {
      const { openWorkspace } = await import(`${base}/src/workspace/store.ts`);
      const db = await openWorkspace();
      try {
        return (await db.read()).current?.data;
      } finally {
        db.close();
      }
    }, base);
  await page.goto(base);
  await page.locator("#workspace-open:enabled").waitFor();
  await page.locator("#zoom-in:enabled").waitFor();
  let release, intercepted;
  const gate = new Promise((resolve) => (release = resolve)),
    arrival = new Promise((resolve) => (intercepted = resolve));
  await page.route("**/prepare-worker.ts*", async (route) => {
    intercepted();
    await gate;
    await route.continue();
  });
  await page.locator("#workspace-open").click();
  await page.locator("#point-title").fill("SYNTHETIC save lock");
  await page.locator("#point-owned").check();
  await page.locator("#save-point").click();
  await Promise.race([
    arrival,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Preparation worker was not intercepted")),
        3000,
      ),
    ),
  ]);
  assert.equal(
    await page.locator("#workspace-content").evaluate((e) => e.inert),
    true,
  );
  assert.equal(
    await page
      .locator("#workspace-tab-sources")
      .evaluate((e) => e.closest("[inert]") !== null),
    true,
  );
  release();
  await page
    .getByRole("heading", { name: "SYNTHETIC save lock", exact: true })
    .waitFor();
  assert.equal((await read()).annotations.length, 1);
  assert.equal(
    await page.locator("#workspace-content").evaluate((e) => e.inert),
    false,
  );
  checks.push(
    "save form cannot change while a queued atomic mutation is preparing",
  );
  await page.locator("#close-workspace").click();
  await page.locator("#toggle-key").click();
  await page.locator("#workspace-map-search").fill("SYNTHETIC");
  await page.locator("#key-customEnabled").uncheck();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-toast")?.textContent ===
      "Layer visibility saved",
  );
  await page.waitForTimeout(650);
  let state = await read();
  assert.equal(state.visibility.customEnabled, false);
  assert.equal(state.visibility.query, "SYNTHETIC");
  await page
    .locator("#workspace-map-search")
    .fill("MUST NOT REPLAY AFTER UNDO");
  await page.locator("#workspace-open").click();
  await page.locator("#undo-workspace").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#workspace-message")
      ?.textContent.includes("Previous valid workspace restored"),
  );
  await page.waitForTimeout(650);
  state = await read();
  assert.notEqual(state.visibility.query, "MUST NOT REPLAY AFTER UNDO");
  await page.locator("#close-workspace").click();
  await page
    .locator("#workspace-map-search")
    .fill("MUST NOT REPLAY AFTER RELOAD");
  await page.locator("#workspace-open").click();
  await page.locator("#workspace-tab-backup").click();
  await page.locator("#reload-workspace").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-message")?.textContent ===
      "Saved workspace reloaded.",
  );
  await page.waitForTimeout(650);
  state = await read();
  assert.notEqual(state.visibility.query, "MUST NOT REPLAY AFTER RELOAD");
  checks.push(
    "search debounce cannot undo newer masks or replay after undo/reload",
  );
  const currentRaw = await page.evaluate(() =>
    localStorage.getItem("hajin.source-filters.v1.official"),
  );
  await page.locator("#close-workspace").click();
  await page.locator("#key-hide-all").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#workspace-toast")?.textContent ===
      "All layers hidden",
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage.getItem("hajin.source-filters.v1.official"),
    ),
    currentRaw,
  );
  checks.push(
    "machine migration freeze survives empty workspace creation and later preference changes",
  );
  await page.close();
  return checks;
}
