import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, firefox, webkit } from "playwright";
import { captureDocumentEvidence } from "./page-edit.mjs";
await mkdir("test-results", { recursive: true });
const output = await mkdtemp(join("test-results", "109-capture-settlement-"));
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  try {
    for (const mode of ["stable", "grow", "shrink", "moving"]) {
      const page = await browser.newPage({
        viewport: { width: 320, height: 240 },
      });
      await page.setContent(
        `<style>body{margin:0}main{height:${mode === "shrink" ? 600 : 500}px}</style><main>SYNTHETIC screenshot geometry fixture</main>`,
      );
      const path = join(output, `${name}-${mode}.png`);
      const original = page.screenshot.bind(page);
      let captures = 0;
      page.screenshot = async (...args) => {
        const bytes = await original(...args);
        captures++;
        if (mode === "moving" || (captures === 1 && mode !== "stable"))
          await page.evaluate((mode) => {
            const n = document.querySelector("main");
            n.style.height =
              (mode === "shrink"
                ? 500
                : n.offsetHeight + (mode === "grow" ? 37 : 1)) + "px";
          }, mode);
        return bytes;
      };
      if (mode === "moving") {
        await assert.rejects(
          () => captureDocumentEvidence(page, path),
          /Document geometry stays stable/,
        );
        assert.equal(
          captures,
          2,
          "An unstable second capture must fail without another retry",
        );
        await assert.rejects(
          readFile(path.replace(/\.png$/, "-coverage.json")),
          { code: "ENOENT" },
        );
      } else {
        await captureDocumentEvidence(page, path);
        const evidence = JSON.parse(
          await readFile(path.replace(/\.png$/, "-coverage.json"), "utf8"),
        );
        assert.equal(evidence.captureAttempts, mode === "stable" ? 1 : 2);
        assert.equal(evidence.complete, true);
        assert.equal(
          evidence.coveredPixels,
          evidence.dimensions.width * evidence.dimensions.height,
        );
        assert.equal(evidence.dimensions.height, mode === "grow" ? 537 : 500);
        const bytes = await readFile(path);
        assert.equal(bytes.readUInt32BE(20), evidence.dimensions.height);
        if (mode !== "stable") {
          const first = await readFile(
            path.replace(/\.png$/, "-unstable-first.png"),
          );
          assert.equal(first.readUInt32BE(20), mode === "shrink" ? 600 : 500);
        }
      }
      await page.close();
    }
    console.log(
      `${name} capture: stable, settle once after growth/shrink, retain first evidence, reject continuing movement PASS`,
    );
  } finally {
    await browser.close();
  }
}
