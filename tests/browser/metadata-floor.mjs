import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { validatePack } from "../../src/content/validate.mjs";
import { captureDocumentEvidence } from "./page-edit.mjs";

const floor = 0.875;
const common = [
  [".site-footer p", 0.75], // Privacy, storage and backup caveats, not branding.
  [".theme-toggle", 0.875],
  [".site-nav a", 0.875],
];
const detail = [
  [".breadcrumbs a, .breadcrumbs span:not([aria-hidden])", 0.75],
  [".page-heading .eyebrow", 0.65], // Actual record type/category/private status.
  [".evidence-caveat strong, .evidence-caveat p", 0.85],
  [".provenance dt", 0.875],
  [".provenance dd", 0.85],
  [".source-list p", 0.8],
  [".source-list .muted", 0.85],
  [".requirements small", 0.78],
  [".provenance > p.muted", 0.9],
];
const surfaces = [
  {
    name: "catalog",
    path: "/catalog/",
    targets: [
      [".result-count", 0.8],
      [".catalog-section .eyebrow", 0.65], // Source-backed/fictional status.
      [".card-meta > span", 0.875],
      [".card-foot > span", 0.875],
    ],
  },
  {
    name: "published-recipe",
    path: "/recipes/mw4--recipe-medkit/",
    targets: [...detail, [".source-list a", 0.85]],
  },
  {
    name: "fictional-recipe",
    path: "/recipes/demo--scanner-build/",
    targets: [
      ...detail,
      [".source-list li", 0.85], // Real unlinked fictional source title.
      [".fixture-notice strong, .fixture-notice p", 0.85],
    ],
  },
  {
    name: "progression",
    path: "/progression/?pack=demo%3Atraining-pack",
    targets: [
      ["#pack-note", 0.85],
      ["#save-status", 0.8],
      ["#progress-rows dt", 0.75],
      ["#progress-rows dd", 1],
      ["#progress-rows .eyebrow", 0.9], // .panel p already wins the cascade.
      ["#progress-rows .source-list li", 0.85],
      ["#progress-rows .source-list p", 0.8],
      ["#main > p.notice", 0.85],
    ],
  },
  {
    name: "long-fictional-local",
    path: "/local/?pack=demo%3Atraining-pack&id=demo%3Ascanner-build",
    targets: [
      ...detail,
      [".source-list li", 0.85],
      [".fixture-notice strong, .fixture-notice p", 0.85],
      ["#pack-note, #local-records > p.notice", 0.85],
      ["#save-status", 0.8],
    ],
  },
  ...[
    ["inventory", "PRIVATE / ON THIS DEVICE"],
    ["editor", "PRIVATE / NEVER PUBLISHED AUTOMATICALLY"],
  ].map(([route, privacyText]) => ({
    name: `${route}-privacy`,
    path: `/${route}/?pack=demo%3Atraining-pack`,
    privacyText,
    targets: [
      [".page-heading .eyebrow", 0.65],
      ["#pack-note", 0.85],
      ["#save-status", 0.8],
    ],
  })),
];

async function longFictionalPack() {
  const pack = JSON.parse(
    await readFile("dist/assets/content/packs/demo-training.json", "utf8"),
  );
  pack.title =
    "FICTIONAL METADATA READABILITY FIXTURE / NOT GAME FACTS / ".repeat(3);
  pack.sources[0].title =
    "Original fictional long evidence title / software readability fixture / ".repeat(
      4,
    );
  pack.sources[0].supports =
    "Fictional support statement for readable metadata, not gameplay advice. ".repeat(
      13,
    );
  validatePack(
    pack,
    JSON.parse(await readFile("schemas/pack.schema.json", "utf8")),
  );
  return pack;
}

async function inspectMetadata(page, targets) {
  return page.evaluate((targets) => {
    const rect = (r) => ({
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
    });
    const entries = targets.map(([selector, baselineRem]) => ({
      selector,
      baselineRem,
      nodes: [...document.querySelectorAll(selector)].flatMap((node) => {
        const style = getComputedStyle(node);
        if (
          !node.getClientRects().length ||
          style.visibility !== "visible" ||
          node.closest("[hidden]")
        )
          return [];
        // Inspect the text that actually inherits this element's computed font,
        // not a descendant with a different cascade or a detached test span.
        const textNodes = [...node.childNodes].filter(
          (child) =>
            child.nodeType === Node.TEXT_NODE && child.textContent.trim(),
        );
        if (!textNodes.length) return [];
        const textRects = textNodes.flatMap((text) => {
          const range = document.createRange();
          range.selectNodeContents(text);
          return [...range.getClientRects()]
            .filter((r) => r.width && r.height)
            .map(rect);
        });
        const clippedBy = [];
        for (let ancestor = node; ancestor; ancestor = ancestor.parentElement) {
          const css = getComputedStyle(ancestor);
          const bounds = ancestor.getBoundingClientRect();
          if (
            css.visibility !== "visible" ||
            Number(css.opacity) === 0 ||
            css.maskImage !== "none" ||
            css.clipPath !== "none" ||
            textRects.some(
              (r) =>
                (["hidden", "clip"].includes(css.overflowX) &&
                  (r.left < bounds.left - 1 || r.right > bounds.right + 1)) ||
                (["hidden", "clip"].includes(css.overflowY) &&
                  (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1)),
            )
          )
            clippedBy.push(
              ancestor.id || ancestor.className || ancestor.tagName,
            );
        }
        return [
          {
            text: textNodes.map((text) => text.textContent.trim()).join(" "),
            fontSize: parseFloat(style.fontSize),
            box: rect(node.getBoundingClientRect()),
            textRects,
            clippedBy,
          },
        ];
      }),
    }));
    return {
      url: location.href,
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
      bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
      entries,
      controls: [...document.querySelectorAll(".theme-toggle, .site-nav a")]
        .filter((node) => node.getClientRects().length)
        .map((node) => ({
          text: node.textContent,
          ...rect(node.getBoundingClientRect()),
        })),
    };
  }, targets);
}

// The caller retains the existing strict monitorBrowser health checks. Baseline
// is an explicitly requested reproduction, never a release-acceptance mode.
export async function runMetadataFloorTests({
  browser,
  base,
  mode,
  captureScreenshots = true,
}) {
  assert(
    ["baseline", "fixed"].includes(mode),
    "Choose baseline or fixed explicitly",
  );
  const engine = browser.browserType().name();
  const screenshots = captureScreenshots && engine !== "webkit";
  const purpose =
    mode === "baseline"
      ? "Pre-repair reproduction, NOT release acceptance"
      : "Post-repair checks; independent visual approval remains required";
  const summary = {
    mode,
    purpose,
    engine,
    cases: [],
  };
  const fixture = await longFictionalPack();
  await mkdir("test-results", { recursive: true });
  for (const surface of surfaces) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 900 },
    });
    try {
      if (surface.name === "long-fictional-local")
        await context.route(
          new URL("/assets/content/packs/demo-training.json", base).href,
          (route) =>
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(fixture),
            }),
        );
      const page = await context.newPage();
      await page.goto(base + surface.path);
      if (
        [
          "progression",
          "long-fictional-local",
          "inventory-privacy",
          "editor-privacy",
        ].includes(surface.name)
      )
        await page.waitForFunction(
          () =>
            document.querySelector("main")?.getAttribute("aria-busy") ===
            "false",
        );
      if (surface.privacyText) {
        assert.equal(
          await page.locator(".page-heading .eyebrow").textContent(),
          surface.privacyText,
        );
        assert.equal(
          await page.locator("#pack-select").inputValue(),
          "demo:training-pack",
        );
        assert.match(
          await page.locator("#pack-note").textContent(),
          /FICTIONAL TRAINING DATA/,
        );
      }
      if (surface.name === "catalog") {
        await page.waitForFunction(() =>
          document
            .querySelector("#catalog-count")
            ?.textContent.includes("matching record"),
        );
        await page.selectOption("#catalog-type", "recipe");
        await page.locator("#catalog-search").fill("Medkit");
        assert.equal(
          await page.locator("[data-record-card]:visible").count(),
          1,
        );
      }
      if (surface.name === "progression") {
        await page.locator("#progress-query").fill("Unlock training bench");
        assert.equal(await page.locator("#progress-rows article").count(), 1);
      }
      if (surface.name === "long-fictional-local") {
        assert.equal(
          await page.locator(".provenance dd").last().textContent(),
          fixture.title,
        );
        assert.equal(
          await page.locator(".source-list p").first().textContent(),
          fixture.sources[0].supports,
        );
      }
      const normalRoot = await page
        .locator("html")
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      assert.equal(normalRoot, 16, "Unmodified baseline root font");
      for (const theme of ["dark", "light"]) {
        if ((await page.locator("html").getAttribute("data-theme")) !== theme) {
          await page.locator("#theme-toggle").focus();
          await page.keyboard.press("Enter");
        }
        await page.waitForFunction(
          (theme) => document.documentElement.dataset.theme === theme,
          theme,
        );
        const normalText = new Map();
        for (const enlarged of [false, true]) {
          const style = enlarged
            ? await page.addStyleTag({
                url: new URL("/__test-text-zoom.css", base).href,
              })
            : null;
          for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(() => document.fonts.ready);
            const evidence = await inspectMetadata(page, [
              ...common,
              ...surface.targets,
            ]);
            const label = `${engine}-metadata-${mode}-${surface.name}-${width}-${theme}-${enlarged ? "200" : "normal"}`;
            const record = {
              mode,
              purpose,
              surface: surface.name,
              theme,
              enlarged,
              evidence,
            };
            await writeFile(
              `test-results/${label}.json`,
              JSON.stringify(record, null, 2),
            );
            // Preserve the real failing surface before acceptance assertions.
            if (screenshots)
              await captureDocumentEvidence(page, `test-results/${label}.png`);
            assert.equal(
              evidence.rootFont,
              normalRoot * (enlarged ? 2 : 1),
              "True 200% root text, not a narrow-viewport approximation",
            );
            assert.equal(evidence.bodyFont, evidence.rootFont);
            const actualText = evidence.entries.flatMap((entry) =>
              entry.nodes.map((node) => ({
                selector: entry.selector,
                text: node.text,
                fontSize: node.fontSize,
              })),
            );
            if (!enlarged) normalText.set(width, actualText);
            else {
              const original = normalText.get(width);
              assert.deepEqual(
                actualText.map(({ selector, text }) => ({ selector, text })),
                original.map(({ selector, text }) => ({ selector, text })),
                "Every normal-size metadata text remains present at 200%",
              );
              for (let index = 0; index < original.length; index++)
                assert(
                  Math.abs(
                    actualText[index].fontSize - original[index].fontSize * 2,
                  ) < 0.02,
                  `${actualText[index].selector}: actual metadata font doubles at 200%`,
                );
            }
            let belowFloor = 0;
            for (const entry of evidence.entries) {
              assert(
                entry.nodes.length,
                `${surface.name}: reachable visible text required for ${entry.selector}`,
              );
              for (const node of entry.nodes) {
                const actualRem = node.fontSize / evidence.rootFont;
                if (actualRem < floor - 0.001) belowFloor++;
                if (mode === "baseline")
                  assert(
                    Math.abs(actualRem - entry.baselineRem) < 0.001,
                    `Diagnostic baseline changed for ${entry.selector}: ${actualRem}rem, expected ${entry.baselineRem}rem`,
                  );
                else {
                  assert(
                    actualRem >= Math.max(floor, entry.baselineRem) - 0.001,
                    `${entry.selector} below its metadata floor: ${actualRem}rem`,
                  );
                  assert(
                    node.textRects.length,
                    `${entry.selector}: text remains rendered`,
                  );
                  assert.deepEqual(
                    node.clippedBy,
                    [],
                    `${entry.selector}: no invisible, masked or clipping ancestor`,
                  );
                  assert(
                    node.textRects.every(
                      (r) => r.left >= -1 && r.right <= width + 1,
                    ),
                    `${entry.selector}: every actual text line fits the viewport`,
                  );
                }
              }
            }
            if (mode === "baseline")
              assert(
                belowFloor > 0,
                "Diagnostic mode must reproduce genuine below-floor metadata",
              );
            else
              assert(
                evidence.documentWidth <= width + 1,
                "Fixed metadata reflows without document-wide horizontal scrolling",
              );
            for (const control of evidence.controls)
              assert(
                control.width >= 44 && control.height >= 44,
                `${control.text}: existing 44px control target preserved`,
              );
            summary.cases.push({ label, belowFloor });
            await writeFile(
              `test-results/${engine}-metadata-${mode}-summary.json`,
              JSON.stringify(summary, null, 2),
            );
          }
          if (style) await style.evaluate((node) => node.remove());
        }
      }
    } finally {
      await context.close();
    }
  }
  assert.equal(
    summary.cases.length,
    84,
    "All seven surfaces, themes, scales and widths execute",
  );
  console.log(
    `Metadata font floor ${mode}: ${summary.cases.length} ${engine} cases; ${mode === "baseline" ? "diagnostic reproduction, NOT release acceptance" : "fixed-mode functional/geometry checks passed; independent pixel review still required"}`,
  );
  return summary;
}
