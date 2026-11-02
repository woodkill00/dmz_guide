import { features, featureURL } from "../src/ui/feature-registry.mjs";
import { validateTopology } from "../src/domain/site-topology.mjs";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { e } from "../src/ui/render.mjs";
const folder = ".local/site-topology-audit";
await mkdir(folder, { recursive: true });
const graph = validateTopology(
    JSON.parse(
      await readFile("dist/assets/content/site-topology.json", "utf8"),
    ),
  ),
  started = Date.now(),
  deadline = started + 12 * 60 * 1000;
const targets = [
  ...features
    .filter((f) => f.kind === "map" || f.kind === "studio")
    .map((f) => ({ id: f.id, label: f.label, href: featureURL(f) })),
  {
    id: "weapon-manager",
    label: "Weapon update manager",
    href: "http://127.0.0.1:4176/",
  },
];
const report = {
  format: "dmz-site-topology-audit",
  version: 1,
  checkedAt: new Date().toISOString(),
  scope:
    "Fresh isolated Chromium contexts; registered loopback pages only. Static guide links/IDs and visible UI labels only. No values, private records, state mutations, remote-provider checks or exhaustive action claims.",
  build: JSON.parse(await readFile("dist/assets/build-identity.json", "utf8"))
    .buildId,
  staticCounts: graph.counts,
  staticIssues: graph.issues,
  targets: [],
};
const browser = await chromium.launch({ timeout: 10000 });
try {
  for (const target of targets) {
    const u = new URL(target.href);
    if (
      ![
        "http://127.0.0.1:5175",
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4176",
      ].includes(u.origin)
    )
      throw Error("Audit target outside service allowlist");
    const result = {
      ...target,
      status: "pending",
      controls: [],
      tabs: [],
      headings: [],
    };
    if (Date.now() >= deadline || !browser.isConnected()) {
      result.status = "unavailable";
      result.reason = "Overall audit deadline reached";
      report.targets.push(result);
      continue;
    }
    const context = await browser.newContext(),
      page = await context.newPage();
    const targetDeadline = Math.min(deadline, Date.now() + 10000);
    const remaining = () => Math.max(1, targetDeadline - Date.now());
    const timeout = setTimeout(() => {
      void context.close().catch(() => {});
    }, remaining());
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return [
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4176",
      ].includes(url.origin) || ["data:", "blob:"].includes(url.protocol)
        ? route.continue()
        : route.abort();
    });
    const errors = [];
    page.on("pageerror", () => errors.push("A page script error occurred"));
    try {
      const response = await page.goto(target.href, {
        timeout: remaining(),
        waitUntil: "domcontentloaded",
      });
      if (!response?.ok())
        throw Error("Service did not return a successful page");
      if (
        target.href.startsWith("http://127.0.0.1:5175/") &&
        !target.href.includes("help.html")
      ) {
        await page
          .locator("#zoom-in:enabled")
          .waitFor({ timeout: remaining() });
        const tool = u.searchParams.get("tool");
        if (tool)
          await page.waitForFunction(
            (tool) =>
              !!document.querySelector("#tool-navigation-error") ||
              [...document.querySelectorAll('nav a[aria-current="page"]')].some(
                (a) => new URL(a.href).searchParams.get("tool") === tool,
              ),
            tool,
            { timeout: remaining() },
          );
        if (await page.locator("#tool-navigation-error").count())
          throw Error("Requested tool did not open");
      }
      const observed = await page.evaluate(() => {
        const visible = (n) =>
          !!n.getClientRects().length &&
          getComputedStyle(n).visibility !== "hidden";
        const rows = (selector) =>
          [...document.querySelectorAll(selector)]
            .filter(visible)
            .map((n) => ({
              id: n.id || n.getAttribute("data-tab") || "",
              kind: n.getAttribute("role") || n.tagName.toLowerCase(),
              label: (n.getAttribute("aria-label") || n.textContent || "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 180),
            }))
            .filter((n) => n.label);
        const controls = rows("button,summary"),
          headings = rows("h1,h2,h3");
        return {
          controls: controls.slice(0, 400),
          controlsTotal: controls.length,
          tabs: rows('[role="tab"],[data-tab]'),
          headings: headings.slice(0, 40),
          headingsTotal: headings.length,
          hasDialog: !!document.querySelector("dialog[open]"),
        };
      });
      Object.assign(result, observed);
      if (errors.length) {
        result.status = "failed";
        result.reason = errors[0];
      } else {
        result.status = "passed";
        result.observation =
          "Page opened and visible controls inventoried; individual actions were not invoked.";
      }
    } catch (error) {
      result.status =
        Date.now() >= targetDeadline ||
        /ERR_CONNECTION|ECONNREFUSED|Timeout|successful page/.test(
          error.message,
        )
          ? "unavailable"
          : "failed";
      result.reason =
        result.status === "unavailable"
          ? "Service unavailable or readiness deadline exceeded"
          : "Page observation failed";
    } finally {
      clearTimeout(timeout);
      let cleanupTimer;
      const closed = await Promise.race([
        context.close().then(
          () => true,
          () => true,
        ),
        new Promise((resolve) => {
          cleanupTimer = setTimeout(() => resolve(false), 2000);
        }),
      ]);
      clearTimeout(cleanupTimer);
      if (!closed) {
        result.status = "failed";
        result.reason = "Context cleanup deadline exceeded";
        await browser.close();
      }
    }
    report.targets.push(result);
    console.log(result.status + " " + target.label);
  }
} finally {
  await browser.close();
}
await writeFile(folder + "/audit.json", JSON.stringify(report, null, 2));
const count = (status) =>
  report.targets.filter((t) => t.status === status).length;
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>DMZ site topology audit</title><style>body{font:16px system-ui;background:#111513;color:#f4f3e9;max-width:1000px;margin:2rem auto;padding:1rem}a{color:#e0bd72}article{padding:1rem;border:1px solid #444d40;margin:1rem 0}small{display:block}li{margin:.4rem 0}code{overflow-wrap:anywhere}</style><h1>Site map runtime review</h1><p>${e(report.scope)}</p><p>${e(report.checkedAt)} · ${graph.counts.routes} guide routes · ${graph.issues.length} static route/fragment findings · ${count("passed")}/${targets.length} companion targets opened · ${count("unavailable")} unavailable · ${count("failed")} failed</p><p><a href="http://127.0.0.1:4173/sitemap/">Open interactive mindmap</a> · <a href="audit.json">Download audit JSON</a></p>${report.targets.map((t) => `<article><h2>${e(t.label)} — ${e(t.status)}</h2><a href="${e(t.href)}">Open target</a><p>${e(t.reason || t.observation || "")}</p><p>${e(t.headings.map((h) => h.label).join(" / "))}</p><details><summary>Observed tabs (${t.tabs.length})</summary><ul>${t.tabs.map((c) => `<li>${e(c.label)} <small>${e(c.id)}</small></li>`).join("")}</ul></details><details><summary>Visible controls (${t.controls.length}; up to 400 per page)</summary><ul>${t.controls.map((c) => `<li>${e(c.kind)} · ${e(c.label)} <small>${e(c.id)}</small></li>`).join("")}</ul></details></article>`).join("")}</html>`;
await writeFile(folder + "/report.html", html);
console.log("Report: " + folder + "/report.html");
if (graph.issues.length || report.targets.some((t) => t.status !== "passed"))
  process.exitCode = 1;
