import { chromium, firefox, webkit } from "playwright";
import { mkdtemp, mkdir, cp, writeFile, rm, rename } from "node:fs/promises";
import { join, resolve, sep, basename } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { startOwnedServer } from "../../scripts/server-readiness.mjs";
import { monitorBrowser } from "./health.mjs";
const root = await mkdtemp(join(tmpdir(), "dmz-report060-"));
let server, failure;
const file = join(root, ".local/site-topology-audit/audit.json");
const fixture = {
  format: "dmz-site-topology-audit",
  version: 1,
  checkedAt: "2026-11-02T00:00:00Z",
  targets: [
    {
      id: "weapon-manager",
      href: "http://127.0.0.1:4176/",
      label: "Report fixture <script>bad()</script>",
      status: "passed",
      tabs: [{ id: "history", label: "History tab" }],
      controls: [{ id: "check", label: "Check source reports" }],
      headings: [],
      controlsTotal: 1,
    },
  ],
};
try {
  for (const folder of ["scripts", "src"])
    await cp(folder, join(root, folder), { recursive: true });
  await mkdir(join(root, "dist/assets"), { recursive: true });
  await cp("src", join(root, "dist/assets/src"), { recursive: true });
  for (const file of ["index.html", "404.html"])
    await cp("dist/" + file, join(root, "dist", file));
  await mkdir(join(root, "dist/sitemap"), { recursive: true });
  await cp("dist/sitemap/index.html", join(root, "dist/sitemap/index.html"));
  await mkdir(join(root, "dist/assets/content"), { recursive: true });
  await cp(
    "dist/assets/content/site-topology.json",
    join(root, "dist/assets/content/site-topology.json"),
  );
  await mkdir(join(root, ".local/site-topology-audit"), { recursive: true });
  await writeFile(file, JSON.stringify(fixture));
  server = await startOwnedServer({ cwd: root });
  const base = server.base;
  const response = await fetch(base + "/local-site-audit/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert(
    !response.headers.get("content-security-policy").includes("unsafe-inline"),
  );
  assert.match(await response.text(), /<h1>Runtime menu and tab report<\/h1>/);
  const head = await fetch(base + "/local-site-audit/", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal(
    (await fetch(base + "/local-site-audit/", { method: "POST" })).status,
    405,
  );
  for (const path of [
    "/local-site-audit/report.html",
    "/local-site-audit/?file=secret",
    "/local-site-audit/%2e%2e%2fsecret",
    "/.local/site-topology-audit/audit.json",
  ])
    assert.equal((await fetch(base + path)).status, 404, path);
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const b = await engine.launch(),
      health = monitorBrowser(b);
    try {
      const c = await b.newContext(),
        p = await c.newPage();
      await p.goto(base + "/sitemap/");
      await p
        .getByRole("link", { name: "Open runtime report", exact: true })
        .click();
      await p.waitForURL("**/local-site-audit/");
      assert(
        await p
          .getByRole("heading", {
            name: "Runtime menu and tab report",
            exact: true,
          })
          .isVisible(),
      );
      assert.match(
        await p.locator("body").textContent(),
        /1 of 1 targets passed/,
      );
      assert(
        await p
          .getByRole("heading", {
            name: "Report fixture <script>bad()</script> — passed",
          })
          .isVisible(),
      );
      await p.getByText("Observed tabs (1)", { exact: true }).click();
      assert(await p.getByText("History tab", { exact: false }).isVisible());
      await p.setViewportSize({ width: 320, height: 900 });
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      health();
      console.log(
        name +
          " rendered HTTP report PASS: sitemap link, real heading, escaped hostile label, expandable tabs, mobile, strict CSP/health",
      );
    } finally {
      await b.close();
    }
  }
  await rm(file);
  let r = await fetch(base + "/local-site-audit/");
  assert.match(await r.text(), /Runtime report unavailable/);
  await writeFile(file, '{"private":"secret"}');
  r = await fetch(base + "/local-site-audit/");
  const missing = await r.text();
  assert.match(missing, /npm run sitemap:audit/);
  assert(!missing.includes("secret"));
  await rename(
    join(root, "scripts/site-audit-report.mjs"),
    join(root, "scripts/site-audit-report.saved"),
  );
  await server.stop();
  server = await startOwnedServer({ cwd: root });
  assert.equal((await fetch(server.base + "/local-site-audit/")).status, 404);
  assert.equal((await fetch(server.base + "/")).status, 200);
  console.log(
    "HTTP HEAD/405/hostile paths/missing/malformed/optional-module archive fallback PASS",
  );
} catch (e) {
  failure = e;
  throw e;
} finally {
  if (server) await server.stop(failure);
  const path = resolve(root);
  assert(
    path.startsWith(resolve(tmpdir()) + sep) &&
      basename(path).startsWith("dmz-report060-"),
  );
  await rm(path, { recursive: true, force: true });
}
