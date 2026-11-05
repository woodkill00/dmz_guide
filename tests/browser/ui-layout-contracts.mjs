import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
// Measurement only: fresh ephemeral browser profiles; no saved player fixture or writes.
const mode = process.env.UI_LAYOUT_MODE;
assert.ok(
  ["baseline", "modern"].includes(mode),
  "Explicit UI_LAYOUT_MODE=baseline|modern required",
);
const root = resolve(process.cwd()),
  runs = Number(process.env.UI_LAYOUT_RUNS || 3);
assert.ok(
  Number.isInteger(runs) && runs >= 3 && runs <= 20,
  "UI_LAYOUT_RUNS must be3..20",
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
const identityBytes = await readFile(
    resolve(root, "dist/assets/build-identity.json"),
  ),
  identity = JSON.parse(identityBytes);
const fixtureDigest = hash(
  JSON.stringify({
    catalog: identity.capturedCatalogFiles,
    packs: identity.capturedPackHashes,
    media: identity.capturedMediaFiles,
    content: Object.fromEntries(
      Object.entries(identity.sourceFiles).filter(
        ([path]) =>
          path.startsWith("content/") ||
          (path.endsWith(".json") && path.startsWith("src/ui/")),
      ),
    ),
  }),
);
const historicalPath = resolve(root, ".local/ui-layout-baseline.json");
let historical = null;
try {
  historical = await readFile(historicalPath);
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const sourcePaths = [
  "src/ui/site-navigation.mjs",
  "src/ui/render.mjs",
  "src/ui/private-pages.mjs",
  "src/ui/progression-page.mjs",
  "src/client/profile.mjs",
  "src/client/keys.mjs",
  "src/client/armory.mjs",
  "src/ui/gunsmith-view.mjs",
];
const sourceHashes = {};
for (const p of sourcePaths)
  sourceHashes[p] = hash(await readFile(resolve(root, p)));
const { startOwnedServer } = await import(
  pathToFileURL(resolve(root, "scripts/server-readiness.mjs")).href
);
const owned = process.env.UI_BASE
  ? null
  : await startOwnedServer({ cwd: root });
const base = process.env.UI_BASE || owned.base;
const browser = await chromium.launch(),
  rows = [],
  failures = [];
const fixtures = [
  { id: "home", path: "/", search: "#hub-query" },
  { id: "keys", path: "/keys/", search: "#key-search" },
  { id: "inventory", path: "/inventory/", search: "#inventory-query" },
  {
    id: "upgrades",
    path: "/upgrades/?pack=observed%3Aupgrade-review-20261026",
    search: "#progress-query",
  },
  { id: "armory", path: "/armory/", search: "[data-weapon-search]" },
];
const filterContracts = {
  keys: {
    status: "#key-count",
    pattern: "^0 of \\d+ keys · 0 matching use locations",
    rows: "[data-key-row]:not([hidden])",
    empty: "#key-empty",
  },
  inventory: {
    status: "#inventory-count",
    pattern: "^0 of \\d+ visible catalog items match\\.",
    rows: "[data-inventory-item]",
  },
  upgrades: {
    status: "#progress-count",
    pattern: "^Showing 0–0 of 0 matching",
    rows: "#progress-rows > article,#progress-rows > .upgrade-family",
  },
  armory: {
    status: "[data-weapon-count]",
    pattern: "^0 of \\d+ weapons$",
    rows: "[data-weapon-row]:not([hidden])",
    empty: "[data-gs-empty]",
  },
};
const viewports = [
  { id: "desktop", width: 1440, height: 900, text: 1 },
  { id: "compact", width: 320, height: 568, text: 1 },
  { id: "compact-text200", width: 320, height: 568, text: 2 },
];
const output = resolve(
  root,
  ".local",
  mode === "modern"
    ? "ui-layout-modern.json"
    : historical
      ? "ui-layout-baseline-measured.json"
      : "ui-layout-baseline.json",
);
const screenshots = resolve(root, ".local", "ui-layout-" + mode + "-screens");
await mkdir(screenshots, { recursive: true });
try {
  for (const fixture of fixtures)
    for (const viewport of viewports)
      for (let run = 0; run < runs; run++) {
        const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
          }),
          page = await context.newPage(),
          errors = [],
          forbidden = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await context.route("**/*", (route) => {
          const request = route.request(),
            url = new URL(request.url());
          if (
            ["http:", "https:"].includes(url.protocol) &&
            (url.origin !== new URL(base).origin ||
              !["GET", "HEAD"].includes(request.method()))
          ) {
            forbidden.push(request.method() + " " + url.origin + url.pathname);
            return route.abort();
          }
          return route.continue();
        });
        const start = performance.now();
        await page.goto(base + fixture.path);
        await page.waitForLoadState("domcontentloaded");
        if (mode === "modern")
          await page.waitForFunction(
            () => document.documentElement.dataset.uiShellMounted === "071-v1",
          );
        const actual = await page.locator("html").evaluate((e) => ({
          variant: e.dataset.uiVariant || "legacy",
          contract: e.dataset.uiContract || null,
          shell: e.dataset.uiShellMounted || null,
          adapter: e.dataset.uiAdapter || null,
          feature: document.body.dataset.uiFeatureId || null,
        }));
        assert.equal(
          actual.variant,
          mode === "modern" ? "modern" : "legacy",
          "Effective variant admission",
        );
        if (mode === "modern") {
          assert.equal(actual.shell, "071-v1");
          assert.equal(actual.contract, "071-v1");
          assert.equal(actual.adapter, "guide-shell");
          assert.equal(actual.feature, fixture.id);
        }
        if (await page.locator("#pack-select").count())
          await page.waitForFunction(() => {
            const s = document.querySelector("#pack-select");
            return (
              s &&
              !s.disabled &&
              s.value &&
              document.querySelector("main")?.getAttribute("aria-busy") ===
                "false"
            );
          });
        if (fixture.id === "keys")
          await page.waitForFunction(
            () =>
              document.querySelector("main")?.dataset.keyWorkspaceReady ===
              "true",
          );
        if (fixture.id === "armory")
          await page.waitForFunction(
            () =>
              document.querySelector("[data-weapon-filter]")?.dataset
                .enhanced === "true",
          );
        if (fixture.id === "home")
          await page.waitForFunction(
            () => document.querySelector("#hub-pack")?.value,
          );
        const readyMs = performance.now() - start;
        if (viewport.text === 2)
          await page.evaluate(
            () => (document.documentElement.style.fontSize = "200%"),
          );
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(75);
        const metrics = await page.evaluate(() => {
          const rect = (e) => {
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return {
              x: r.x + scrollX,
              y: r.y + scrollY,
              width: r.width,
              height: r.height,
            };
          };
          return {
            dom: document.getElementsByTagName("*").length,
            documentWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            documentHeight: document.documentElement.scrollHeight,
            rootFont: getComputedStyle(document.documentElement).fontSize,
            rects: {
              header: rect(document.querySelector(".site-header")),
              nav: rect(document.querySelector(".site-nav")),
              main: rect(document.querySelector("main")),
            },
            visualViewport: visualViewport
              ? {
                  pageLeft: visualViewport.pageLeft,
                  pageTop: visualViewport.pageTop,
                  width: visualViewport.width,
                  height: visualViewport.height,
                  scale: visualViewport.scale,
                }
              : null,
            navigation: performance.getEntriesByType("navigation")[0]?.toJSON(),
          };
        });
        const controls = [];
        for (const selector of [
          "main h1",
          fixture.search,
          ".site-nav summary",
        ]) {
          const control = page.locator(selector).first();
          if (!(await control.count())) continue;
          if (!(await control.isVisible())) continue;
          await control.scrollIntoViewIfNeeded();
          const receipt = await control.evaluate((e) => {
            const r = e.getBoundingClientRect(),
              x = Math.max(0, Math.min(innerWidth - 1, r.x + r.width / 2)),
              y = Math.max(0, Math.min(innerHeight - 1, r.y + r.height / 2)),
              hit = document.elementFromPoint(x, y);
            return {
              tag: e.tagName,
              rect: {
                x: r.x + scrollX,
                y: r.y + scrollY,
                width: r.width,
                height: r.height,
              },
              hit: e === hit || e.contains(hit),
              point: { x, y },
              clipped: r.x < -0.5 || r.right > innerWidth + 0.5,
            };
          });
          controls.push({ selector, ...receipt });
          if (!receipt.hit || receipt.clipped)
            failures.push({
              fixture: fixture.id,
              viewport: viewport.id,
              run,
              kind: "control-geometry",
              selector,
              ...receipt,
            });
        }
        const search = page.locator(fixture.search).first();
        if (await search.count())
          await search.evaluate((e) => {
            for (
              let parent = e.parentElement;
              parent;
              parent = parent.parentElement
            )
              if (parent.tagName === "DETAILS") parent.open = true;
          });
        let input = null;
        if (
          (await search.count()) &&
          (await search.isVisible()) &&
          (await search.isEnabled())
        ) {
          await search.scrollIntoViewIfNeeded();
          await search.focus();
          const focus = await search.evaluate(
            (e) => document.activeElement === e,
          );
          assert.equal(focus, true);
          const contract = filterContracts[fixture.id] || null;
          const initialFilter = contract
            ? await page.evaluate((contract) => {
                const status = document.querySelector(
                  contract.status,
                ).textContent;
                const numbers = status.match(/\d+/g).map(Number);
                return {
                  status,
                  rows: document.querySelectorAll(contract.rows).length,
                  total: numbers[contract.status === "#progress-count" ? 2 : 1],
                };
              }, contract)
            : null;
          if (contract) {
            assert.ok(
              initialFilter.total > 0,
              "Initial owner full-model count must be positive",
            );
            assert.ok(
              initialFilter.rows > 0,
              "Initial owner result window must contain records",
            );
          }
          input = await search.evaluate(async (e, contract) => {
            const started = performance.now();
            let changes = 0;
            const observer = new MutationObserver(
              (records) => (changes += records.length),
            );
            observer.observe(document.querySelector("main"), {
              subtree: true,
              childList: true,
              attributes: true,
              characterData: true,
            });
            e.value = "zz-synthetic-no-match-071";
            e.dispatchEvent(new Event("input", { bubbles: true }));
            const dispatchMs = performance.now() - started;
            let completedFilterMs = null;
            let completedStatus = null;
            const completion = (async () => {
              if (contract) {
                const completed = () => {
                  const status = document.querySelector(contract.status);
                  const empty = contract.empty
                    ? document.querySelector(contract.empty)
                    : null;
                  return (
                    status &&
                    new RegExp(contract.pattern).test(status.textContent) &&
                    document.querySelectorAll(contract.rows).length === 0 &&
                    (!contract.empty || (empty && !empty.hidden))
                  );
                };
                while (!completed()) {
                  if (performance.now() - started > 5000)
                    throw Error(
                      "Owner filter did not reach exact zero-result status and rows",
                    );
                  await new Promise(requestAnimationFrame);
                }
                completedFilterMs = performance.now() - started;
                completedStatus = document.querySelector(
                  contract.status,
                ).textContent;
              }
            })();
            await new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            );
            const twoFrameMs = performance.now() - started;
            await completion;
            await new Promise((r) => setTimeout(r, 400));
            observer.disconnect();
            return {
              dispatchMs,
              twoFrameMs,
              completedFilterMs,
              completedStatus,
              completionScope: contract
                ? "Exact owner zero-result status and zero rendered record rows; browser-clock input-to-observed-completion"
                : "N/A: Home submits to a separate search page; no inline filter",
              observedMainMutations: changes,
              measurement:
                "input dispatch and two-frame scheduling; not a domain completion latency",
              focus: document.activeElement === e,
            };
          }, contract);
          input.initialFilter = initialFilter;
          assert.equal(input.focus, true);
          await search.fill("");
          if (contract)
            await page.waitForFunction(
              ({ contract, initial }) =>
                document.querySelector(contract.status)?.textContent ===
                  initial.status &&
                document.querySelectorAll(contract.rows).length ===
                  initial.rows,
              { contract, initial: initialFilter },
              { timeout: 5000 },
            );
        }
        if (run === 0) {
          await page.evaluate(() => scrollTo(0, 0));
          await page.screenshot({
            path: resolve(screenshots, fixture.id + "-" + viewport.id + ".png"),
            fullPage: true,
          });
        }
        if (metrics.documentWidth > metrics.clientWidth + 1)
          failures.push({
            fixture: fixture.id,
            viewport: viewport.id,
            run,
            kind: "document-overflow",
            width: metrics.documentWidth,
            client: metrics.clientWidth,
          });
        if (errors.length || forbidden.length)
          failures.push({
            fixture: fixture.id,
            viewport: viewport.id,
            run,
            kind: "browser-health",
            errors,
            forbidden,
          });
        rows.push({
          fixture: fixture.id,
          path: fixture.path,
          viewport,
          run,
          coldBrowserContext: true,
          readyMs,
          ...actual,
          ...metrics,
          controls,
          input,
          errors,
          forbidden,
        });
        await context.close();
      }
} finally {
  await browser.close();
  await owned?.stop();
}
const quantile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
const summaries = fixtures.flatMap((f) =>
  viewports.map((v) => {
    const group = rows.filter(
      (r) => r.fixture === f.id && r.viewport.id === v.id,
    );
    return {
      fixture: f.id,
      viewport: v.id,
      samples: group.length,
      readyMedianMs: quantile(
        group.map((r) => r.readyMs),
        0.5,
      ),
      readyP95Ms: quantile(
        group.map((r) => r.readyMs),
        0.95,
      ),
      initialDom: group.map((r) => r.dom),
      inputTwoFrameMs: group
        .filter((r) => r.input)
        .map((r) => r.input.twoFrameMs),
      ownerFullCounts: group.map((r) => r.input?.initialFilter?.total ?? null),
      completedFilterMedianMs:
        group[0]?.input?.completedFilterMs == null
          ? null
          : quantile(
              group.map((r) => r.input.completedFilterMs),
              0.5,
            ),
      completedFilterP95Ms:
        group[0]?.input?.completedFilterMs == null
          ? null
          : quantile(
              group.map((r) => r.input.completedFilterMs),
              0.95,
            ),
    };
  }),
);
const screenshotReceipts = [];
for (const fixture of fixtures)
  for (const viewport of viewports) {
    const name = fixture.id + "-" + viewport.id + ".png";
    const bytes = await readFile(resolve(screenshots, name));
    screenshotReceipts.push({
      fixture: fixture.id,
      viewport: viewport.id,
      path: resolve(screenshots, name),
      sha256: hash(bytes),
      bytes: bytes.length,
    });
  }
let comparison = {
  status: "insufficient",
  reason:
    runs < 20
      ? "Three-run sampling is observational; T065 requires matched20run baseline and modern samples"
      : "Matched20run peer fixture/build/readiness receipt still required; do not infer historical timing improvement",
};
const peerPath = resolve(
  root,
  ".local",
  mode === "modern"
    ? "ui-layout-baseline-measured.json"
    : "ui-layout-modern.json",
);
try {
  const peer = JSON.parse(await readFile(peerPath, "utf8"));
  const matching =
    peer.format === "ui-layout-measurement-v2" &&
    peer.runs === 20 &&
    peer.fixtureDigest === fixtureDigest &&
    runs === 20 &&
    peer.node === process.version &&
    peer.platform === process.platform &&
    peer.browser === browser.version() &&
    peer.fixture ===
      "read-only shipped catalog with fresh ephemeral browser storage; no private owner state" &&
    peer.rows.length === rows.length &&
    summaries.every((group) =>
      peer.summaries.some(
        (p) =>
          p.fixture === group.fixture &&
          p.viewport === group.viewport &&
          p.samples === 20 &&
          JSON.stringify(p.ownerFullCounts) ===
            JSON.stringify(group.ownerFullCounts),
      ),
    );
  if (matching) {
    const modern = mode === "modern" ? summaries : peer.summaries,
      baseline = mode === "baseline" ? summaries : peer.summaries;
    const groups = modern.map((current) => {
      const old = baseline.find(
        (g) => g.fixture === current.fixture && g.viewport === current.viewport,
      );
      return {
        fixture: current.fixture,
        viewport: current.viewport,
        medianRatio: current.readyMedianMs / old.readyMedianMs,
        p95Ratio: current.readyP95Ms / old.readyP95Ms,
        completedFilterMedianRatio:
          old.completedFilterMedianMs === null
            ? null
            : current.completedFilterMedianMs / old.completedFilterMedianMs,
        completedFilterP95Ratio:
          old.completedFilterP95Ms === null
            ? null
            : current.completedFilterP95Ms / old.completedFilterP95Ms,
        completedFilterRequiresInvestigation:
          old.completedFilterMedianMs !== null &&
          (current.completedFilterMedianMs >
            old.completedFilterMedianMs * 1.1 ||
            current.completedFilterP95Ms > old.completedFilterP95Ms * 1.1),
        baselineDom: old.initialDom,
        modernDom: current.initialDom,
        requiresInvestigation:
          current.readyMedianMs > old.readyMedianMs * 1.1 ||
          current.readyP95Ms > old.readyP95Ms * 1.1,
      };
    });
    comparison = {
      status: groups.some((g) => g.requiresInvestigation)
        ? "investigate"
        : "observed-matched-samples",
      peer: peerPath,
      groups,
      scope:
        "Navigation-to-domain-ready wall timings; no controlled domain search-completion performance claim",
    };
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const report = {
  format: "ui-layout-measurement-v2",
  mode,
  createdAt: new Date().toISOString(),
  head: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  node: process.version,
  platform: process.platform,
  browser: browser.version(),
  base,
  fixture:
    "read-only shipped catalog with fresh ephemeral browser storage; no private owner state",
  sourceHashes,
  fixtureDigest,
  buildIdentity: {
    sha256: hash(identityBytes),
    buildId: identity.buildId,
    git: identity.git,
    sourceFiles: identity.sourceFiles,
  },
  runs,
  zoomScope: "200% root text only; native browser zoom not measured",
  historicalBaseline: historical
    ? {
        sha256: hash(historical),
        rows: JSON.parse(historical).rows?.length,
        limitations:
          "Historical18read receipt has no declared readiness/control/input/build-identity metrics; not a like-for-like timing comparison",
      }
    : null,
  comparison,
  screenshots,
  screenshotReceipts,
  timingScope:
    "Fresh browser contexts, warm server/OS allowed; navigation-to-owner-ready includes Playwright transport/operator scheduling overhead. Not a controlled user-input completion benchmark.",
  failures,
  summaries,
  rows,
};
await writeFile(output, JSON.stringify(report, null, 2));
if (historical)
  assert.equal(
    hash(await readFile(historicalPath)),
    hash(historical),
    "Historical baseline is immutable",
  );
assert.equal(
  hash(await readFile(resolve(root, "dist/assets/build-identity.json"))),
  hash(identityBytes),
  "Build changed during measurement",
);
console.log(
  JSON.stringify({
    mode,
    rows: rows.length,
    failures: failures.length,
    output,
    comparison: report.comparison,
  }),
);
assert.deepEqual(
  failures,
  [],
  "Actual geometry/health findings require owning fixes",
);
