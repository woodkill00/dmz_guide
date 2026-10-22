import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDocumentEvidence } from "./page-edit.mjs";

// The workbench must still be open: post-attachment screenshots cannot prove
// that description, decorative-purpose and rights controls remain usable.
export async function checkPictureDescriptionLayout(
  page,
  { prefix, captureScreenshots },
) {
  const viewport = page.viewportSize();
  const originalURL = page.url();
  assert.equal(
    new URL(originalURL).hash,
    "",
    "Workbench matrix begins at the document history entry",
  );
  const originalTheme = await page.locator("html").getAttribute("data-theme");
  const css = new URL("/__picture-description-text200.css", page.url()).href;
  const selectors = [
    "#picture-description",
    "#picture-decorative",
    "#picture-holder",
    "#picture-license",
    "#picture-source",
    "#picture-attribution",
    "#picture-rights",
    "#picture-private",
    "#picture-attachment",
  ];
  const retained = await page.evaluateHandle(
    (selectors) =>
      selectors.map((selector) => {
        const node = document.querySelector(selector);
        return { selector, node, value: node.value, checked: node.checked };
      }),
    selectors,
  );
  const setTheme = async (theme) => {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
      await page.locator("#theme-toggle").focus();
      assert(
        await page
          .locator("#theme-toggle")
          .evaluate((node) => node === document.activeElement),
      );
      await page.keyboard.press("Enter");
    }
    await page.waitForFunction(
      (theme) => document.documentElement.dataset.theme === theme,
      theme,
    );
  };
  await page.route(css, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      body: ":root{font-size:200%}",
    }),
  );
  await mkdir("test-results", { recursive: true });
  let style;
  let sectionNavigations = 0;
  try {
    for (const theme of ["dark", "light"]) {
      await setTheme(theme);
      const baseline = await page
        .locator("body")
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      for (const enlarged of [false, true]) {
        if (enlarged) style = await page.addStyleTag({ url: css });
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(page.url(), originalURL);
          for (const target of ["studio-review", "studio-pictures"]) {
            const targetURL = new URL(`#${target}`, originalURL).href;
            assert.notEqual(page.url(), targetURL);
            await page.locator(`#studio-nav a[href="#${target}"]`).focus();
            await page.keyboard.press("Enter");
            await page.waitForURL(targetURL);
            sectionNavigations++;
          }
          // Restore this helper-owned fragment pair promptly. Keep the later
          // single Back aimed at the real preceding preview document, not a
          // section fragment; do not accumulate history across visual cases.
          await Promise.all([
            page.waitForURL(originalURL),
            page.evaluate(() => history.go(-2)),
          ]);
          assert.equal(page.url(), originalURL);
          const retainedState = await retained.evaluate((entries) =>
            entries.every(
              ({ selector, node, value, checked }) =>
                document.querySelector(selector) === node &&
                node.value === value &&
                node.checked === checked,
            ),
          );
          const geometry = await page.evaluate((selectors) => {
            const rect = (node) => {
              const r = node.getBoundingClientRect();
              return {
                x: r.x,
                y: r.y,
                width: r.width,
                height: r.height,
                right: r.right,
              };
            };
            return {
              viewport: innerWidth,
              documentWidth: document.documentElement.scrollWidth,
              fontSize: parseFloat(getComputedStyle(document.body).fontSize),
              workbenchOpen:
                !document.querySelector("#picture-workbench").hidden,
              controls: selectors.map((selector) => {
                const node = document.querySelector(selector);
                return {
                  selector,
                  checkbox: node.type === "checkbox",
                  fontSize: parseFloat(getComputedStyle(node).fontSize),
                  ...rect(node),
                };
              }),
            };
          }, selectors);
          const path = `test-results/${prefix}-picture-description-${width}-${theme}-${enlarged ? "200" : "normal"}`;
          await writeFile(
            `${path}.json`,
            JSON.stringify(
              { theme, enlarged, retainedState, geometry },
              null,
              2,
            ),
          );
          // Preserve the actual failing surface before geometry assertions.
          if (captureScreenshots)
            await captureDocumentEvidence(page, `${path}.png`);
          assert(
            retainedState,
            "Responsive navigation preserves description, purpose and rights nodes and values",
          );
          assert(
            geometry.workbenchOpen,
            "Actual picture workbench remains open",
          );
          assert.equal(
            geometry.fontSize,
            baseline * (enlarged ? 2 : 1),
            "Actual body text size, not a viewport approximation",
          );
          assert(
            geometry.documentWidth <= geometry.viewport + 1,
            `Open picture workbench reflows: ${JSON.stringify(geometry)}`,
          );
          for (const control of geometry.controls) {
            assert(
              control.width > 0 &&
                control.height > 0 &&
                control.x >= -1 &&
                control.right <= geometry.viewport + 1,
              `Visible in-bounds control: ${JSON.stringify(control)}`,
            );
            if (control.checkbox)
              assert(
                control.width >= control.fontSize &&
                  control.height >= control.fontSize,
                `Discernible native checkbox: ${JSON.stringify(control)}`,
              );
          }
        }
        if (style) {
          await style.evaluate((node) => node.remove());
          style = undefined;
        }
      }
    }
    assert.equal(
      sectionNavigations,
      24,
      "Two real section navigations per visual case",
    );
  } finally {
    if (style) await style.evaluate((node) => node.remove());
    await setTheme(originalTheme);
    if (viewport) await page.setViewportSize(viewport);
    await page.unroute(css);
    await retained.dispose();
  }
}
