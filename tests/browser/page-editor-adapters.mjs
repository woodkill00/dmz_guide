import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import {
  pageEditorFixture,
  showEditorContent,
} from "../helpers/page-editor.mjs";
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.PAGE_EDITOR_ENGINE && process.env.PAGE_EDITOR_ENGINE !== name)
    continue;
  const f = await pageEditorFixture(),
    browser = await engine.launch(),
    context = await browser.newContext(),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (process.env.EDITOR_DEBUG) {
    page.on("pageerror", (e) =>
      console.log("Adapter page error", page.url(), e.stack),
    );
    page.on("requestfailed", (r) =>
      console.log("Adapter request failed", r.method(), r.url(), r.failure()),
    );
  }
  page.on("dialog", (d) => d.accept());
  try {
    for (const path of [
      "content/weapon-intel.json",
      "content/weapon-acquisition.json",
      "src/ui/weapon-camos.json",
      "src/ui/keys.json",
      "src/ui/key-supplemental.json",
      "src/ui/key-images.json",
      "src/ui/key-access.json",
    ]) {
      await mkdir(dirname(join(f.root, path)), { recursive: true });
      await writeFile(
        join(f.root, path),
        await readFile(new URL("../../" + path, import.meta.url)),
      );
    }
    const urls = [
      ...["test:recipe", "test:guide", "test:map", "test:location"].map((id) =>
        f.url(id),
      ),
      ...[
        ["weapon-intel", "weapon-intel", "han-86"],
        ["weapon-acquisition", "weapon-acquisition", "han-86"],
        ["weapon-camos", "weapon-camos", "han-86"],
        ["key-reference", "keys", "mirae-electrical-room"],
        ["key-reference", "keys", "hospital-chemical-lab"],
        ["mission-chapter", "mission-chapters", "x01-1"],
      ].map(
        ([adapter, catalogId, id]) =>
          f.app.url +
          "/?" +
          new URLSearchParams({ adapter, catalogId, id, intent: "compose" }),
      ),
    ];
    for (const [i, url] of urls.entries()) {
      await page.goto(url);
      await page.locator("#pe-add-section:enabled").waitFor();
      const adapter = new URL(url).searchParams.get("adapter");
      if (
        ["weapon-acquisition", "weapon-camos", "key-reference"].includes(
          adapter,
        )
      ) {
        await showEditorContent(page);
        const data = page.locator("#pe-record-fields");
        if (adapter === "key-reference") {
          const locations = data
            .locator("details")
            .filter({ has: page.getByText("locations", { exact: true }) });
          await locations.locator(":scope > summary").click();
          await locations
            .locator(":scope > details")
            .first()
            .locator(":scope > summary")
            .click();
          assert.equal(
            await locations.getByLabel(/^Name/).first().isDisabled(),
            true,
          );
          assert.equal(
            await locations
              .getByLabel(/^Map grid/)
              .first()
              .isDisabled(),
            true,
          );
          assert.equal(
            await data.getByLabel("Acquisition", { exact: true }).isEnabled(),
            true,
          );
          assert.match(
            await data.innerText(),
            /Read-only shared access location/,
          );
        } else {
          assert.equal(
            await data
              .locator(":scope > label")
              .filter({ hasText: /^Name/ })
              .locator("input")
              .isDisabled(),
            true,
          );
          assert.equal(
            await data
              .locator(":scope > label")
              .filter({ hasText: /^Category/ })
              .locator("input")
              .isDisabled(),
            true,
          );
          assert.equal(
            await data
              .getByLabel(
                adapter === "weapon-camos" ? "Requirement" : "Method",
                { exact: true },
              )
              .first()
              .isEnabled(),
            true,
          );
          assert.match(await data.innerText(), /Read-only shared roster/);
        }
        await page.locator("#pe-data > summary").click();
      }
      await page.locator("#pe-add-section").click();
      await page
        .getByLabel("Section title", { exact: true })
        .fill("Synthetic adapter notes " + i);
      await page
        .locator("#pe-fields")
        .getByLabel("Text", { exact: true })
        .fill("Original software fixture");
      const insertion = page
        .locator("#pe-fields .pe-actions")
        .filter({ has: page.getByLabel("Block to insert", { exact: true }) })
        .last();
      await insertion
        .getByLabel("Block to insert", { exact: true })
        .selectOption("reference");
      await insertion
        .getByRole("button", { name: "Insert here", exact: true })
        .click();
      await page
        .locator("#pe-fields")
        .getByLabel("Label", { exact: true })
        .fill("Synthetic source link");
      await page.locator("#pe-validate").click();
      await page.locator("#pe-save:enabled").waitFor();
      await page.locator("#pe-save").click();
      await page
        .locator("#pe-status")
        .filter({ hasText: /^Saved to repository/ })
        .waitFor();
      await page.locator("#pe-return").click();
      await page
        .getByRole("heading", {
          name: "Synthetic adapter notes " + i,
          exact: true,
        })
        .waitFor();
      const linked = page.getByRole("link", {
        name: "Synthetic source link",
        exact: true,
      });
      assert.match(await linked.getAttribute("href"), /^\/preview\?/);
      await linked.click();
      await page.locator("main h1").waitFor();
    }
    assert.deepEqual(errors, []);
    console.log(
      `093 ${name} recipe/guide/map/location/weapon/acquisition/camo/base-key/supplement-key/X01-chapter save+reader PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
    await f.close();
  }
}
