import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chromium, firefox, webkit } from "playwright";

// Original synthetic semantic rows only; no catalogs, player profiles or network providers.
const sourceFile = new URL("../../src/ui/directory-view.mjs", import.meta.url);
const styleFile = new URL("../../src/ui/directory-view.css", import.meta.url);
const escape = (value) =>
  String(value).replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const fixture = ({
  variant = "modern",
  pagination = true,
  editable = false,
  optIn = true,
  ownSearch = true,
  startup = false,
} = {}) => `<!doctype html>
<html lang="en" data-ui-variant="${variant}" data-ui-mounted="071-v1"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic directory fixture</title>
<link rel="stylesheet" href="/directory-view.css"><style>
*{box-sizing:border-box}body{margin:0;padding:12px;font:16px/1.45 system-ui;background:#18201d;color:#eef3ea}button,input,select{font:inherit;min-height:44px;max-width:100%}button{padding:8px 12px}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ffe88a;outline-offset:2px}a{color:#d6e9ac}.fixture-scroll{max-width:100%;max-height:420px;overflow:auto}table{border-collapse:collapse;width:100%}th,td{padding:8px;text-align:left;vertical-align:top;border-bottom:1px solid #54675b}caption{text-align:left}.bulk{display:flex;flex-wrap:wrap;gap:8px}.owner-filter{display:block;margin:8px 0}
</style></head><body><main><h1>Synthetic directory</h1><section id="records" ${optIn ? "data-ui-directory" : ""} data-ui-directory-pagination="${pagination}" data-ui-directory-sticky-identity="true" aria-label="Synthetic reference directory">
<label class="owner-filter">Search synthetic public labels<input id="search" ${ownSearch ? "data-ui-directory-search" : ""} type="search" maxlength="200"></label>
<div class="bulk"><button id="all-matching" data-ui-directory-bulk-scope="all-matching">Select all matching references</button><button id="this-page" data-ui-directory-bulk-scope="this-page">Select this page</button></div>
<div class="fixture-scroll" data-ui-directory-scroll role="region" aria-label="Synthetic reference table" tabindex="0"><table><caption>125 synthetic references; unknown values remain unknown</caption><thead><tr><th scope="col">Reference</th><th scope="col">Known quantity</th><th scope="col">Evidence / requirements</th><th scope="col">Action</th></tr></thead><tbody data-ui-directory-rows>${Array.from({ length: 125 }, (_, i) => `<tr id="row-${i}" data-ui-directory-row data-ui-directory-search-text="Visible reference ${i}"><th scope="row"><a href="#detail-${i}">Visible reference ${i}${i === 2 ? escape(" — Synthetic unusually long location and prerequisite name ".repeat(12)) : ""}</a></th><td>${i === 0 ? "Unknown" : i === 1 ? "0" : String(i)}</td><td>${i === 0 ? "*WZ · untested DMZ; missing evidence is not zero" : "Synthetic source report"}${i === 45 ? "<span hidden data-private-field>private-sentinel-never-index</span>" : ""}${editable && i === 124 ? `<label>Owned synthetic quantity<input id="owned-count" type="number" value="7" ${startup ? "disabled" : ""}></label>` : ""}</td><td><button type="button" data-inspect="${i}">Inspect reference ${i}</button></td></tr>`).join("")}</tbody></table></div></section></main>
<script type="module">
import {mountDirectories} from '/directory-view.mjs';
globalThis.originalRows=[...document.querySelectorAll('[data-ui-directory-row]')];globalThis.originalInput=document.querySelector('#owned-count');globalThis.bulkEvents=[];globalThis.inspections=0;
for(const button of document.querySelectorAll('[data-ui-directory-bulk-scope]'))button.addEventListener('click',()=>bulkEvents.push(button.dataset.uiDirectoryBulkScope));
for(const button of document.querySelectorAll('[data-inspect]'))button.addEventListener('click',()=>inspections++);
globalThis.cleanupDirectory=mountDirectories(document);globalThis.mountAgain=()=>mountDirectories(document);document.documentElement.dataset.directoryFixtureReady='true';
</script></body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  try {
    if (
      url.pathname === "/directory-view.mjs" ||
      url.pathname === "/directory-view.css"
    ) {
      response.setHeader(
        "content-type",
        url.pathname.endsWith(".mjs") ? "text/javascript" : "text/css",
      );
      response.end(
        await readFile(url.pathname.endsWith(".mjs") ? sourceFile : styleFile),
      );
      return;
    }
    if (url.pathname === "/fixture.html") {
      response.setHeader("content-type", "text/html");
      response.end(
        fixture({
          variant: url.searchParams.get("variant") ?? "modern",
          pagination: url.searchParams.get("pagination") !== "false",
          editable: url.searchParams.get("editable") === "true",
          optIn: url.searchParams.get("optIn") !== "false",
          ownSearch: url.searchParams.get("ownSearch") !== "false",
          startup: url.searchParams.get("startup") === "true",
        }),
      );
      return;
    }
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }
    response.writeHead(404).end("Synthetic fixture: unknown route");
  } catch {
    response
      .writeHead(404)
      .end("Synthetic fixture: implementation asset unavailable");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  assert.equal(
    (await fetch(`${base}/directory-view.mjs`)).status,
    200,
    "Directory implementation must exist before its real-browser checks can pass",
  );
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();
      const errors = [],
        remote = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("requestfailed", (request) =>
        errors.push(`Request failed: ${request.url()}`),
      );
      page.on("response", (response) => {
        if (response.status() >= 400)
          errors.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      await context.route("**/*", (route) => {
        if (new URL(route.request().url()).origin !== base) {
          remote.push(route.request().url());
          return route.abort();
        }
        return route.continue();
      });
      const ready = async (query = "") => {
        await page.goto(`${base}/fixture.html${query}`);
        await page.waitForFunction(
          () =>
            document.documentElement.dataset.directoryFixtureReady === "true",
        );
      };
      const rows = () =>
        page.locator("[data-ui-directory-rows] > [data-ui-directory-row]");
      const status = () => page.locator("[data-ui-directory-status]");
      const settledRows = async (count, first = null) =>
        page
          .waitForFunction(
            ({ count, first }) => {
              const rows = document.querySelectorAll(
                "[data-ui-directory-rows] > [data-ui-directory-row]",
              );
              return (
                rows.length === count &&
                (first === null || rows[0]?.id === first)
              );
            },
            { count, first },
          )
          .catch(async (error) => {
            console.log(
              await page.evaluate(() => ({
                rows: [
                  ...document.querySelectorAll(
                    "[data-ui-directory-rows] > [data-ui-directory-row]",
                  ),
                ].map((row) => row.id),
                status: document.querySelector("[data-ui-directory-status]")
                  ?.textContent,
                query: document.querySelector("#search")?.value,
              })),
            );
            throw error;
          });
      await ready();
      assert.equal(await rows().count(), 50);
      assert.equal(
        await page.locator("#row-0 td").first().textContent(),
        "Unknown",
      );
      assert.equal(await page.locator("#row-1 td").first().textContent(), "0");
      assert.match(await status().textContent(), /125/);
      const pageSize = page.getByLabel("Rows per page", { exact: true });
      await pageSize.selectOption("25");
      assert.equal(await rows().count(), 25);
      await pageSize.selectOption("100");
      assert.equal(await rows().count(), 100);
      await pageSize.selectOption("50");
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
      assert.equal(await rows().count(), 50);
      assert.equal(await rows().first().getAttribute("id"), "row-50");
      await page
        .getByRole("button", { name: "Previous page", exact: true })
        .click();
      assert(
        await page
          .locator("#row-0")
          .evaluate((row) => row === window.originalRows[0]),
      );
      await page.locator("#row-0 [data-inspect]").focus();
      await page.evaluate(() =>
        document
          .querySelector(
            "[data-ui-directory-pagination-controls] button:last-of-type",
          )
          .click(),
      );
      assert(
        await page
          .locator("#row-0 [data-inspect]")
          .evaluate((button) => button === document.activeElement),
        "Clean focused row is not evicted during an external page change",
      );
      await page.locator("#search").focus();
      await page.evaluate(() =>
        document
          .querySelector("#records")
          .dispatchEvent(new CustomEvent("ui-directory-refresh")),
      );
      assert.equal(await rows().count(), 50);
      await page
        .getByRole("button", { name: "Previous page", exact: true })
        .click();

      await page.evaluate(() => {
        const secondCleanup = window.mountAgain();
        secondCleanup();
      });
      assert.equal(
        await page.locator("[data-ui-directory-pagination-controls]").count(),
        1,
        "Repeated mounting has one owned controller",
      );
      assert.deepEqual(await page.evaluate(() => window.bulkEvents), []);
      assert.equal(
        await page
          .locator("#all-matching")
          .getAttribute("data-ui-directory-bulk-scope"),
        "all-matching",
      );
      assert.equal(
        await page
          .locator("#this-page")
          .getAttribute("data-ui-directory-bulk-scope"),
        "this-page",
      );
      assert.equal(
        await page.locator("#all-matching").textContent(),
        "Select all matching references",
      );
      await page.locator("#this-page").click();
      assert.deepEqual(
        await page.evaluate(() => window.bulkEvents),
        ["this-page"],
        "Only the owner handles its explicitly scoped mutation action",
      );

      await page.locator("#search").fill("Visible reference 124");
      await settledRows(1, "row-124");
      assert.equal(await rows().count(), 1);
      assert.equal(await rows().first().getAttribute("id"), "row-124");
      assert(
        await rows()
          .first()
          .evaluate((row) => row === window.originalRows[124]),
      );
      await page.locator("#search").fill("private-sentinel-never-index");
      await settledRows(0);
      assert.equal(
        await rows().count(),
        0,
        "Hidden/private body text is not an implicit generic search index",
      );
      await page.locator("#search").fill("");
      await settledRows(50, "row-0");
      assert.equal(await rows().count(), 50);
      await page.evaluate(() => {
        const row = document.createElement("tr");
        row.id = "row-new";
        row.dataset.uiDirectoryRow = "";
        row.dataset.uiDirectorySearchText = "New synthetic reference";
        row.innerHTML =
          '<th scope="row">New synthetic reference</th><td>Unknown</td><td>Unverified</td><td><button>Inspect new reference</button></td>';
        document.querySelector("[data-ui-directory-rows]").append(row);
        document
          .querySelector("#records")
          .dispatchEvent(new CustomEvent("ui-directory-refresh"));
      });
      await page.locator("#search").fill("New synthetic reference");
      await settledRows(1, "row-new");
      assert.equal(await rows().count(), 1);
      assert.equal(await rows().first().getAttribute("id"), "row-new");
      await page.locator("#search").fill("");
      await page.evaluate(() => window.cleanupDirectory());
      assert.equal(
        await rows().count(),
        126,
        "Cleanup restores original plus owner-added rows without cloning",
      );
      assert.equal(
        await page.locator("[data-ui-directory-pagination-controls]").count(),
        0,
      );
      assert.equal(
        await page.locator("[data-ui-directory-mounted]").count(),
        0,
      );
      assert(
        await page
          .locator("#row-124")
          .evaluate((row) => row === window.originalRows[124]),
      );

      await ready("?editable=true");
      await page.locator("#owned-count").fill("9");
      await page.locator("#owned-count").focus();
      await page.evaluate(() => {
        const select = document.querySelector(
          "[data-ui-directory-pagination-controls] select",
        );
        select.value = "25";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      assert(await page.locator("#owned-count").isVisible());
      assert.equal(await page.locator("#owned-count").inputValue(), "9");
      assert(
        await page
          .locator("#owned-count")
          .evaluate(
            (input) =>
              input === window.originalInput &&
              input === document.activeElement,
          ),
      );
      await page.locator("#search").fill("Visible reference 123");
      await settledRows(2, "row-123");
      assert(
        await page.locator("#owned-count").isVisible(),
        "Filtering does not evict a dirty editable row",
      );
      assert.equal(await page.locator("#owned-count").inputValue(), "9");
      await page.evaluate(() => window.cleanupDirectory());
      assert(
        await page
          .locator("#owned-count")
          .evaluate((input) => input === window.originalInput),
      );
      assert.equal(await page.locator("#owned-count").inputValue(), "9");

      await ready("?editable=true&startup=true");
      assert.equal(
        await page.locator("#owned-count").count(),
        1,
        "Disabled startup form rows are not detached before their owner binds them",
      );
      assert(await page.locator("#owned-count").isDisabled());
      await page.evaluate(() => {
        const input = document.querySelector("#owned-count");
        input.addEventListener("input", () => {
          window.ownerInputEvents = (window.ownerInputEvents ?? 0) + 1;
        });
        input.disabled = false;
      });
      await page.locator("#owned-count").fill("12");
      assert.equal(await page.evaluate(() => window.ownerInputEvents), 1);
      assert(
        await page
          .locator("#owned-count")
          .evaluate((input) => input === window.originalInput),
      );
      for (const width of [1440, 320])
        for (const textSize of [100, 200]) {
          await page.setViewportSize({ width, height: 844 });
          await ready();
          await page.evaluate((scale) => {
            document.documentElement.style.fontSize = `${scale}%`;
          }, textSize);
          // Wider owner columns exercise both sticky axes; narrow mode releases the identity column.
          await page.evaluate(() =>
            document
              .querySelector("table")
              .style.setProperty("--ui-directory-columns", "12"),
          );
          assert.equal(
            await page
              .locator('#row-2 th[scope="row"]')
              .evaluate((cell) => getComputedStyle(cell).position),
            width <= 700 ? "static" : "sticky",
          );
          const action = page.locator("#row-2 [data-inspect]");
          await action.focus();
          await action.scrollIntoViewIfNeeded();
          await action.press("Enter");
          assert.equal(await page.evaluate(() => window.inspections), 1);
          const geometry = await action.evaluate((button) => {
            const rect = button.getBoundingClientRect(),
              scroll = button
                .closest("[data-ui-directory-scroll]")
                .getBoundingClientRect();
            const point = document.elementFromPoint(
              rect.x + rect.width / 2,
              rect.y + rect.height / 2,
            );
            return {
              overflow:
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth + 1,
              inside:
                rect.x >= scroll.x &&
                rect.right <= scroll.right + 1 &&
                rect.top >= scroll.top &&
                rect.bottom <= scroll.bottom + 1,
              hit: point === button || button.contains(point),
              width: rect.width,
              height: rect.height,
            };
          });
          assert.equal(
            geometry.overflow,
            false,
            JSON.stringify({ name, width, textSize, geometry }),
          );
          assert(
            geometry.inside && geometry.hit,
            JSON.stringify({ name, width, textSize, geometry }),
          );
          assert(geometry.width >= 44 && geometry.height >= 44);
          assert.equal(await page.locator("table caption").count(), 1);
          assert.equal(await page.locator('thead th[scope="col"]').count(), 4);
        }
      for (const query of [
        "?variant=legacy",
        "?optIn=false",
        "?pagination=false",
      ]) {
        await ready(query);
        assert.equal(await rows().count(), 125);
        if (query !== "?pagination=false")
          assert.equal(
            await page
              .locator("[data-ui-directory-pagination-controls]")
              .count(),
            0,
          );
      }
      await ready("?ownSearch=false");
      await page.locator("#search").fill("Visible reference 124");
      assert.equal(
        await rows().count(),
        50,
        "No marker means generic helper does not take over an existing search",
      );
      const noJS = await browser.newContext({
          javaScriptEnabled: false,
          viewport: { width: 390, height: 844 },
        }),
        noJSPage = await noJS.newPage();
      await noJSPage.goto(`${base}/fixture.html`);
      assert.equal(
        await noJSPage.locator("[data-ui-directory-row]").count(),
        125,
      );
      assert.equal(
        await noJSPage
          .locator("[data-ui-directory-pagination-controls]")
          .count(),
        0,
      );
      await noJS.close();
      assert.deepEqual(errors, []);
      assert.deepEqual(remote, []);
      console.log(
        `${name} directory PASS: opt-in pagination/search, original DOM/input identity, protected edits, scoped owner actions, cleanup, long cells320px/200%text and native/no-JS fallback`,
      );
      await context.close();
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
