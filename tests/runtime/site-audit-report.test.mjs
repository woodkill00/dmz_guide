import test from "node:test";
import assert from "node:assert/strict";
import {
  createSiteAuditReader,
  renderSiteAudit,
  validateSiteAudit,
} from "../../scripts/site-audit-report.mjs";
const report = () => ({
  format: "dmz-site-topology-audit",
  version: 1,
  checkedAt: "2026-11-02T00:00:00Z",
  targets: [
    {
      id: "weapon-manager",
      href: "http://127.0.0.1:4176/",
      label: "Weapon manager",
      status: "passed",
      controls: [{ id: "check", label: "Check sources" }],
      tabs: [{ id: "history", label: "History" }],
      headings: [],
      controlsTotal: 1,
    },
  ],
});
test("060 report renders trusted HTML with escaped labels and native details, no saved HTML execution", () => {
  const r = report();
  r.targets[0].label = "<script>bad()</script>";
  const html = renderSiteAudit(r);
  assert.match(html, /<h1>Runtime menu and tab report<\/h1>/);
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert(!html.includes("<script>bad()"));
  assert.match(html, /<details><summary>Observed tabs/);
  assert.match(html, /\/assets\/src\/styles.css/);
  assert(!html.includes("<style>"));
});
test("060 target identity/href and row budgets fail closed", () => {
  for (const href of [
    "javascript:alert(1)",
    "https://evil.example/",
    "http://127.0.0.1:4176/?token=secret",
  ]) {
    const r = report();
    r.targets[0].href = href;
    assert.throws(() => validateSiteAudit(r));
  }
  const r = report();
  r.targets[0].controls = Array(401).fill({ id: "x", label: "x" });
  assert.throws(() => validateSiteAudit(r));
});
test("060 reader accepts only fixed JSON path and never reads the saved HTML", async () => {
  let reads = 0;
  const reader = createSiteAuditReader({
    root: ".",
    read: async (root, path, max) => {
      reads++;
      assert.equal(path, ".local/site-topology-audit/audit.json");
      assert.equal(max, 2097152);
      return Buffer.from(JSON.stringify(report()));
    },
  });
  for (const raw of [
    "/local-site-audit/../report.html",
    "/local-site-audit/report.html",
    "/local-site-audit/?file=secret",
  ])
    assert.equal((await reader(raw)).status, 404);
  assert.equal(reads, 0);
  const page = await reader("/local-site-audit/");
  assert.equal(page.type, "text/html; charset=utf-8");
  assert.match(page.bytes, /Weapon manager/);
  assert.equal(reads, 1);
});
test("060 missing or malformed report gives HTML instructions without reflecting private bytes", async () => {
  for (const read of [
    async () => {
      throw Error("private file path");
    },
    async () => Buffer.from("{private notes"),
    async () => Buffer.from(JSON.stringify({ private: "secret" })),
  ]) {
    const r = await createSiteAuditReader({ read })("/local-site-audit/");
    assert.match(r.bytes, /Runtime report unavailable/);
    assert.match(r.bytes, /npm run sitemap:audit/);
    assert(!r.bytes.includes("private file path"));
    assert(!r.bytes.includes("secret"));
  }
});
