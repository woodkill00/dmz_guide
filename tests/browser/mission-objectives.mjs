import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, firefox, webkit } from "playwright";
import AxeBuilder from "../../tools/hajin-map/node_modules/@axe-core/playwright/dist/index.mjs";
import { startBrowserServer } from "./server.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";
import { missionChapterPages } from "../../src/ui/mission-chapter-page.mjs";
const server = await startBrowserServer(),
  pack = loadFixturePack("official-starter"),
  chapters = missionChapterPages([pack]),
  byId = new Map(pack.objectives.map((r) => [r.id, r]));
const expectedIds = [
  ...new Set(
    chapters.flatMap((p) =>
      [...p.body.matchAll(/data-mission-objectives="([^"]+)"/g)].map(
        (m) => m[1],
      ),
    ),
  ),
];
const initiallyOpen = new Set(
  chapters
    .filter((chapter) => /\/missions\/(?:hajin|x01)\/1\/$/.test(chapter.path))
    .flatMap((chapter) =>
      [...chapter.body.matchAll(/data-mission-objectives="([^"]+)"/g)].map(
        (match) => match[1],
      ),
    ),
);
await mkdir("test-results", { recursive: true });
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch(),
      context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(
        server.base + "/missions/?pack=official%3Amw4-dmz-starter",
      );
      const objectives = page.locator(
        "#mission-directory-hajin [data-mission-objectives],#mission-directory-x01 [data-mission-objectives]",
      );
      await objectives.first().waitFor();
      const profileBefore = await page.evaluate(async () =>
        JSON.stringify(
          (await import("/assets/src/client/common.mjs")).state.profile,
        ),
      );
      assert.equal(await objectives.count(), expectedIds.length);
      const rendered = await objectives.evaluateAll((nodes) =>
        nodes.map((n) => ({
          id: n.dataset.missionObjectives,
          open: n.open,
          steps: [...n.querySelectorAll(".mission-objective-steps>li")].map(
            (li) => li.textContent,
          ),
        })),
      );
      assert.deepEqual(
        rendered.map((r) => r.id).sort(),
        expectedIds.toSorted(),
      );
      for (const r of rendered) {
        assert.equal(r.open, initiallyOpen.has(r.id), r.id);
        assert.deepEqual(r.steps, byId.get(r.id).steps, r.id);
      }
      const gear = page.locator(
          '[data-mission-objectives="mw4:order-gear-up"]',
        ),
        next = page.locator('[data-mission-objectives="mw4:order-crackshot"]');
      for (const disclosure of [gear, next])
        if (await disclosure.evaluate((node) => node.open))
          await disclosure.locator("summary").click();
      await gear.locator("summary").focus();
      await page.keyboard.press("Enter");
      assert.equal(await gear.evaluate((n) => n.open), true);
      assert.equal(await gear.locator("ol").isVisible(), true);
      assert.deepEqual(
        await gear.locator("ol>li").allTextContents(),
        byId.get("mw4:order-gear-up").steps,
      );
      await next.locator("summary").click();
      assert.equal(
        await gear.evaluate((n) => n.open),
        true,
        "Opening another mission never closes Gear Up",
      );
      await gear.locator("summary").click();
      assert.equal(await next.evaluate((n) => n.open), true);
      await gear.locator("summary").click();
      assert.equal(
        await page.evaluate(async () =>
          JSON.stringify(
            (await import("/assets/src/client/common.mjs")).state.profile,
          ),
        ),
        profileBefore,
        "Reading and toggling objectives does not change inventory or mission progress",
      );
      for (const width of [320, 390, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${name} directory overflow ${width}`,
        );
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await gear.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `test-results/mission-objectives-directory-${name}.png`,
      });
      for (const theme of ["dark", "light"]) {
        await page.evaluate(
          (theme) => (document.documentElement.dataset.theme = theme),
          theme,
        );
        const report = await new AxeBuilder({ page })
          .include("#mission-directory-hajin")
          .include("#mission-directory-x01")
          .analyze();
        assert.deepEqual(
          report.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
      }
      // Static chapter routes expose instructions even without hydration.
      for (const chapter of chapters) {
        const response = await page.request.get(server.base + chapter.path);
        assert.equal(response.status(), 200);
        const html = await response.text();
        assert(!html.includes("Open this mission to view its tasks"));
        for (const match of chapter.body.matchAll(
          /data-mission-objectives="([^"]+)"/g,
        ))
          assert(html.includes(`data-mission-objectives="${match[1]}" open`));
      }
      for (const set of ["hajin", "x01"]) {
        await page.goto(server.base + `/missions/${set}/1/`);
        const first = page.locator("[data-mission-objectives]").first(),
          id = await first.getAttribute("data-mission-objectives");
        assert.equal(await first.evaluate((n) => n.open), true);
        assert.deepEqual(
          await first.locator("ol>li").allTextContents(),
          byId.get(id).steps,
        );
        await page.evaluate(
          () => (document.documentElement.style.fontSize = "200%"),
        );
        await page.setViewportSize({ width: 320, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.evaluate(
          () => (document.documentElement.style.fontSize = ""),
        );
        await page.setViewportSize({ width: 1440, height: 1000 });
        await first.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `test-results/mission-objectives-${set}-${name}.png`,
        });
        const report = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          report.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
        );
        await first
          .locator("xpath=..")
          .getByRole("link", { name: "Full guide & edit", exact: true })
          .click();
        await page.locator(".mission-task-list").waitFor();
        assert.deepEqual(
          await page.locator(".mission-task-list>li").allTextContents(),
          byId.get(id).steps,
        );
        assert.equal(
          await page.locator("[data-compose-record]").isVisible(),
          true,
        );
      }
      assert.deepEqual(errors, []);
      console.log(
        `FR13 ${name}: ${expectedIds.length} directory mission instructions/collapsed/independent keyboard toggles;29 static chapters;Hajin+X01 expanded tasks→detail/Edit;320–1920px/200%/dark-light/axe PASS`,
      );
    } finally {
      await context.close();
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
