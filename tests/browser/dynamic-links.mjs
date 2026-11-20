import { chromium, firefox, webkit } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { request } from "node:http";
import { once } from "node:events";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
import { mapEntry } from "../../src/domain/map-routes.mjs";
import {
  validateDestination,
  LOCAL_SERVICE_PORTS,
} from "../../src/domain/local-services.mjs";
const bundle = JSON.parse(
  await readFile(".local/unified-map/dist/unified-map.json", "utf8"),
);
let pages = 0,
  links = 0;
async function audit(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) await audit(path);
    else if (entry.name.endsWith(".html")) {
      pages++;
      const html = await readFile(path, "utf8");
      for (const match of html.matchAll(/\bhref=["']([^"']+)["']/g)) {
        const href = match[1].replaceAll("&amp;", "&");
        assert.doesNotMatch(
          href,
          /https?:\/\/(127\.0\.0\.1|localhost):\d+/,
          path + " contains fixed local navigation",
        );
        if (!href.startsWith("/")) continue;
        const url = new URL(href, "http://local.invalid");
        if (url.pathname.startsWith("/map/")) {
          assert.ok(
            mapEntry(url.pathname) ||
              Object.hasOwn(bundle.files, url.pathname.slice("/map/".length)),
            path + " " + href,
          );
          links++;
        }
        if (url.pathname.startsWith("/local-services/")) {
          const service = /^\/local-services\/(\w+)\/$/.exec(url.pathname)?.[1];
          assert.ok(Object.hasOwn(LOCAL_SERVICE_PORTS, service), href);
          validateDestination(url.searchParams.get("destination"));
          links++;
        }
      }
    }
  }
}
await audit("dist");
await audit(".local/unified-map/dist");
console.log(
  `Audited ${pages} built pages and ${links} map/companion links: no fixed local addresses.`,
);
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((r) => reservation.close(r));
const base = "http://127.0.0.1:" + port,
  child = spawn(
    process.execPath,
    ["scripts/serve.mjs", "--maps", "--port", String(port)],
    {
      env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
      windowsHide: true,
      stdio: "ignore",
    },
  );
const exited = once(child, "exit");
try {
  let ready = false;
  for (let n = 0; n < 50; n++) {
    try {
      const status = await (
        await fetch(base + "/local-site/status.json", {
          signal: AbortSignal.timeout(1500),
        })
      ).json();
      if (status.maps) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  assert.ok(ready, "Owned alternate-port unified service ready");
  const badHost = await new Promise((resolve, reject) => {
    const r = request(
      base + "/",
      { headers: { Host: "127.0.0.1:99999" } },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    r.on("error", reject);
    r.end();
  });
  assert.equal(badHost, 400);
  assert.equal(
    (await fetch(base + "/local-site/status.json")).status,
    200,
    "bad Host cannot stop the service",
  );
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    context.setDefaultTimeout(15000);
    let page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(base + "/");
      const mapPopup = page.waitForEvent("popup");
      await page
        .locator('.site-nav [data-feature-id="hajin-map"]')
        .first()
        .click();
      page = await mapPopup;
      page.on("pageerror", (e) => errors.push(e.message));
      await page.waitForURL(
        (url) => url.origin === base && url.pathname === "/map/",
      );
      await page.locator(".leaflet-marker-icon").first().waitFor();
      for (const [id, path] of [
        ["hajin-map", "/map/"],
        ["x01-map", "/map/x01/"],
        ["safe-runs", "/map/safes/"],
        ["loot-runs", "/map/loot/"],
      ]) {
        const href = await page
          .locator(`.site-nav [data-feature-id="${id}"]`)
          .first()
          .getAttribute("href");
        const url = new URL(href, page.url());
        assert.equal(url.origin, base, id);
        assert.equal(url.pathname, path, id);
        await page.goto(url.href);
        await page.locator(".leaflet-marker-icon").first().waitFor();
      }
      const homePopup = page.waitForEvent("popup");
      await page.locator('.site-nav [data-feature-id="home"]').first().click();
      page = await homePopup;
      page.on("pageerror", (e) => errors.push(e.message));
      await page.waitForURL(base + "/");
      await page.goto(base + "/armory/50-gs/");
      const author = page.locator("a[data-compose-source]").first();
      assert.ok((await author.count()) > 0, "editor link exists");
      {
        const href = await author.getAttribute("href");
        const response = await page.request.get(base + href, {
          maxRedirects: 0,
        });
        assert.equal(response.status(), 302);
        assert.equal(
          new URL(response.headers().location).hostname,
          "127.0.0.1",
        );
      }
      await page.goto(base + "/inventory/?pack=official%3Amw4-dmz-starter");
      await page.waitForFunction(
        () =>
          document.querySelector("main")?.getAttribute("aria-busy") === "false",
      );
      for (const href of await page
        .locator(".site-nav a[href]")
        .evaluateAll((nodes) => nodes.map((x) => x.getAttribute("href")))) {
        if (href.startsWith("/map/") || href.startsWith("/local-services/"))
          assert.equal(
            new URL(href, page.url()).searchParams.has("pack"),
            false,
            "catalog does not corrupt cross-service links",
          );
      }
      assert.deepEqual(errors, [], name);
      console.log(
        name +
          " actual menu clicks and all four maps stay on alternate port " +
          port,
      );
    } finally {
      await context.close();
      await browser.close();
    }
  }
} finally {
  if (child.exitCode === null) child.kill();
  await exited;
}
