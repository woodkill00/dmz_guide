import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { chromium, firefox, webkit } from "playwright";
import { runEditorTests } from "./editor.mjs";
import { monitorBrowser } from "./health.mjs";
import { startBrowserServer } from "./server.mjs";

export async function runUIAuthoringTests({
  browser,
  base,
  includeProtocolPreservation = true,
}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(base + "/editor/?pack=demo%3Atraining-pack");
    await page.locator('[data-path="contentVersion"]').waitFor();
    assert.equal(
      await page.locator("html").getAttribute("data-ui-variant"),
      "modern",
    );
    assert.match(
      await page.locator("main").innerText(),
      /private|not published/i,
    );
    assert.equal(await page.locator("#guided-form").count(), 1);
    const input = page.locator('[data-path="contentVersion"]');
    const original = await input.inputValue();
    await input.fill(original + "-layout-only");
    for (const width of [1440, 390, 320])
      for (const theme of ["dark", "light"])
        for (const text of [100, 200]) {
          await page.setViewportSize({ width, height: 568 });
          await page.evaluate(
            ({ theme, text }) => {
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.fontSize = text + "%";
            },
            { theme, text },
          );
          assert.equal(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth + 1,
            ),
            false,
          );
          assert.equal(
            await input.inputValue(),
            original + "-layout-only",
            "Layout must not reset the draft",
          );
          for (const id of [
            "editor-guided",
            "editor-pictures",
            "editor-transfer",
          ]) {
            const link = page.locator(
              `nav[aria-label="Private editor sections"] a[href$="#${id}"]`,
            );
            await link.click();
            assert.equal(new URL(page.url()).hash, "#" + id);
          }
        }
    // Never save this deliberate display-only draft.
  } finally {
    await context.close();
  }

  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 568 },
  });
  try {
    const p = await noJS.newPage();
    await p.goto(base + "/editor/");
    assert.match(await p.locator("noscript").innerText(), /JavaScript/);
    await p
      .locator(
        'nav[aria-label="Private editor sections"] a[href="#editor-transfer"]',
      )
      .click();
    assert.equal(new URL(p.url()).hash, "#editor-transfer");
    await p.goto(base + "/local/");
    assert.match(await p.locator("noscript").innerText(), /JavaScript/);
    assert(
      await p
        .getByRole("link", { name: "Open the published catalog", exact: true })
        .isVisible(),
    );
  } finally {
    await noJS.close();
  }
  if (includeProtocolPreservation)
    await runEditorTests({ browser, base, captureScreenshots: false });
}

/** Use only an already-owned disposable Studio service; no Save is dispatched here. */
export async function runUIStudioPresentationTests({ browser, base }) {
  const context = await browser.newContext();
  try {
    const p = await context.newPage();
    await p.goto(base);
    assert.equal(
      await p.locator("html").getAttribute("data-ui-surface"),
      "studio",
    );
    assert.equal(
      await p.locator("html").getAttribute("data-ui-variant"),
      "modern",
    );
    await p.locator("#studio-nav").waitFor();
    assert.match(
      await p.locator("header").first().innerText(),
      /repository|checkout/i,
    );
    for (const width of [1440, 390, 320]) {
      await p.setViewportSize({ width, height: 568 });
      await p.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      assert.equal(
        await p.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 1,
        ),
        false,
      );
      for (const link of await p.locator("#studio-nav a").all()) {
        await link.scrollIntoViewIfNeeded();
        const b = await link.boundingBox();
        assert(b && Math.round(b.height * 64) / 64 >= 44);
      }
    }
  } finally {
    await context.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await startBrowserServer();
  try {
    for (const [name, engine] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await engine.launch(),
        health = monitorBrowser(browser);
      try {
        await runUIAuthoringTests({ browser, base: server.base });
        health();
        console.log(
          name + "071 authoring presentation and existing editor protocol PASS",
        );
      } finally {
        await browser.close();
      }
    }
  } finally {
    await server.stop();
  }
}
