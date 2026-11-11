import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { mkdir } from "node:fs/promises";
const engine = process.env.BROWSER || "chromium",
  browser = await { chromium, firefox, webkit }[engine].launch(),
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(
    "http://127.0.0.1:4173/inventory/?pack=official%3Amw4-dmz-starter",
  );
  await page.waitForFunction(
    () => document.querySelector("main")?.getAttribute("aria-busy") === "false",
  );
  await page.locator("#inventory-query").fill("Gold Skull");
  await page.waitForFunction(() =>
    [...document.querySelectorAll("[data-inventory-icon]")].every(
      (c) => c.dataset.iconStatus === "available",
    ),
  );
  for (const theme of ["dark", "light"])
    for (const width of [320, 390, 667, 900, 1100, 1280, 1440]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      await page.setViewportSize({ width, height: 1000 });
      const result = await page
        .locator(".inventory-entry > .inventory-row")
        .evaluateAll((rows) =>
          rows.map((row) => {
            const b = row.getBoundingClientRect(),
              cells = [...row.children]
                .filter((c) => c.getClientRects().length)
                .map((c) => ({
                  name: c.className,
                  x: c.getBoundingClientRect().x,
                  y: c.getBoundingClientRect().y,
                  w: c.getBoundingClientRect().width,
                  h: c.getBoundingClientRect().height,
                })),
              badge = row
                .querySelector(".collection-state")
                .getBoundingClientRect();
            return {
              row: { x: b.x, y: b.y, w: b.width, h: b.height },
              cells,
              badge: { w: badge.width, h: badge.height },
            };
          }),
        );
      assert.equal(result.length, 2);
      for (const r of result) {
        for (const c of r.cells) {
          assert(
            c.x >= r.row.x - 1 && c.x + c.w <= r.row.x + r.row.w + 1,
            `${width}: ${c.name} outside row`,
          );
        }
        for (let i = 0; i < r.cells.length; i++)
          for (let j = i + 1; j < r.cells.length; j++) {
            const a = r.cells[i],
              b = r.cells[j],
              overlap =
                Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 &&
                Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
            assert(!overlap, `${width}: ${a.name}/${b.name} overlap`);
          }
        assert(
          r.badge.w < 100 && r.badge.h <= 24,
          "status should be a compact label",
        );
        if (width <= 700) {
          const need = r.cells.find((c) =>
            c.name.includes("inventory-upgrade-need"),
          );
          assert(
            need.h <= 72,
            "mobile Needed/Missing columns must stay compact and labelled",
          );
          assert(r.row.h <= 200, "mobile row should avoid vertical gaps");
        }
        if (width > 1100)
          assert(r.row.h <= 84, "desktop row should be compact");
      }
      assert(
        Math.abs(result[0].row.h - result[1].row.h) < 1,
        "mirrored spacing differs by less than a CSS pixel",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      if (
        engine !== "webkit" &&
        theme === "dark" &&
        [390, 900, 1440].includes(width)
      ) {
        await mkdir(".local/item-icons/spacing", { recursive: true });
        await page.screenshot({
          path: `.local/item-icons/spacing/${engine}-${width}.png`,
        });
      }
    }
  await page.locator("#inventory-query").fill("Staff Emergency Exfil Keycard");
  const checkbox = page.locator(
    '[data-item-blueprint="mw4:x01-staff-emergency-exfil-keycard"]',
  );
  await checkbox.check();
  const quantity = page.locator(
    '[data-field="inventory"][data-id="mw4:x01-staff-emergency-exfil-keycard"]',
  );
  await quantity.fill("3");
  assert(await checkbox.isChecked());
  assert.equal(await quantity.inputValue(), "3");
  assert.deepEqual(errors, []);
  console.log(
    "PASS compact status/desktop row heights, no overlapping cells or overflow at320–1440px, aligned mirrored rows in both themes, long-name blueprint/quantity controls work.",
  );
} finally {
  await browser.close();
}
