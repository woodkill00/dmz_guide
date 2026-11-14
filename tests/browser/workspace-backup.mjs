import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startBrowserServer } from "./server.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { newProfile } from "../../src/domain/profile.mjs";

const server = await startBrowserServer();
const browser = await chromium.launch();
let failure;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(server.base + "/workspace-backup/");
  const profile = newProfile(loadFixturePack("official-starter"));
  await page.locator("#workspace-files").setInputFiles({
    name: "profile.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(profile)),
  });
  await page.locator("#workspace-create").click();
  await page.locator("#workspace-download").waitFor({ state: "visible" });
  assert.match(
    await page.locator("#workspace-create-preview").innerText(),
    /Map private workspace/,
  );
  const event = page.waitForEvent("download");
  await page.locator("#workspace-download").click();
  const download = await event;
  const bundle = await (
    await import("node:fs/promises")
  ).readFile(await download.path(), "utf8");
  await page.locator("#workspace-import").setInputFiles({
    name: "bundle.json",
    mimeType: "application/json",
    buffer: Buffer.from(bundle),
  });
  await page.locator("#workspace-modules h3").waitFor();
  assert.match(
    await page.locator("#workspace-import-preview").innerText(),
    /No data restored/,
  );
  assert.match(
    await page.locator("#workspace-modules").innerText(),
    /Guide profile/,
  );
  const damaged = JSON.parse(bundle);
  damaged.modules[0].bytes++;
  await page.locator("#workspace-import").setInputFiles({
    name: "bad-bundle.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(damaged)),
  });
  await page.waitForFunction(() =>
    document
      .querySelector("#workspace-import-preview")
      .textContent.includes("Nothing restored"),
  );
  assert.equal(await page.locator("#workspace-modules h3").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/__workspace-zoom.css", (route) =>
    route.fulfill({ contentType: "text/css", body: ":root{font-size:200%}" }),
  );
  await page.addStyleTag({ url: server.base + "/__workspace-zoom.css" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await page.locator("#workspace-files").focus();
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    "workspace-files",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Workspace backup browser round-trip and malformed-file rejection PASS",
  );
} catch (reason) {
  failure = reason;
  throw reason;
} finally {
  await browser.close();
  await server.stop(failure);
}
