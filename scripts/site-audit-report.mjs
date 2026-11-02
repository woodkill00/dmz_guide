import { features, featureURL } from "../src/ui/feature-registry.mjs";
import { parseBounded } from "../src/content/limits.mjs";
import { e, renderLayout } from "../src/ui/render.mjs";
import { readCatalogFile } from "./catalog.mjs";
const targets = new Map([
  ...features
    .filter((f) => f.kind === "map" || f.kind === "studio")
    .map((f) => [f.id, featureURL(f)]),
  ["weapon-manager", "http://127.0.0.1:4176/"],
]);
export function validateSiteAudit(value) {
  if (
    !value ||
    value.format !== "dmz-site-topology-audit" ||
    value.version !== 1 ||
    !Array.isArray(value.targets) ||
    value.targets.length > 60 ||
    typeof value.checkedAt !== "string" ||
    value.checkedAt.length > 40
  )
    throw Error("Invalid audit");
  const seen = new Set();
  return {
    checkedAt: value.checkedAt,
    targets: value.targets.map((t) => {
      if (
        !t ||
        seen.has(t.id) ||
        !targets.has(t.id) ||
        t.href !== targets.get(t.id) ||
        typeof t.label !== "string" ||
        t.label.length > 180 ||
        !["passed", "failed", "unavailable", "unsupported"].includes(t.status)
      )
        throw Error("Invalid target");
      seen.add(t.id);
      const rows = (key, limit) => {
        if (!Array.isArray(t[key]) || t[key].length > limit)
          throw Error("Audit rows exceed limit");
        return t[key].map((r) => {
          if (
            !r ||
            typeof r.label !== "string" ||
            r.label.length > 180 ||
            typeof r.id !== "string" ||
            r.id.length > 300
          )
            throw Error("Invalid row");
          return { label: r.label, id: r.id };
        });
      };
      return {
        id: t.id,
        label: t.label,
        href: t.href,
        status: t.status,
        tabs: rows("tabs", 200),
        controls: rows("controls", 400),
        headings: rows("headings", 40),
        controlsTotal:
          Number.isSafeInteger(t.controlsTotal) &&
          t.controlsTotal >= t.controls.length &&
          t.controlsTotal <= 100000
            ? t.controlsTotal
            : t.controls.length,
      };
    }),
  };
}
export function renderSiteAudit(value) {
  const report = validateSiteAudit(value),
    passed = report.targets.filter((t) => t.status === "passed").length;
  const list = (rows) =>
    "<ul>" +
    rows
      .map(
        (r) =>
          `<li>${e(r.label)}${r.id ? ` <small class="muted">${e(r.id)}</small>` : ""}</li>`,
      )
      .join("") +
    "</ul>";
  return renderLayout({
    page: "sitemap",
    title: "Runtime menu and tab report",
    body: `<h1>Runtime menu and tab report</h1><p><a href="/sitemap/">← Back to the visual site map</a></p><p class="notice">Local audit snapshot. Targets were opened in isolated browser contexts; individual actions and saved-state variations are not exhaustively verified. No private field values are displayed.</p><p>Checked ${e(report.checkedAt)} · <strong>${passed} of ${report.targets.length} targets passed</strong></p>${report.targets.map((t) => `<article class="panel"><h2>${e(t.label)} — ${e(t.status)}</h2><a href="${e(t.href)}" target="_blank" rel="noopener noreferrer">Open this tool ↗</a><p>${e(t.headings.map((h) => h.label).join(" / "))}</p><details><summary>Observed tabs (${t.tabs.length})</summary>${list(t.tabs)}</details><details><summary>Visible controls (${t.controls.length} of ${t.controlsTotal})</summary>${list(t.controls)}</details></article>`).join("")}`,
  });
}
const unavailable = () =>
  renderLayout({
    page: "sitemap",
    title: "Runtime report unavailable",
    body: '<h1>Runtime report unavailable</h1><p>The latest local report is missing or could not be read safely. Run <code>npm run sitemap:audit</code> from the project folder, then reload this page.</p><p><a href="/sitemap/">Return to the visual site map</a></p>',
  });
export function createSiteAuditReader({ root, read = readCatalogFile } = {}) {
  return async (raw) => {
    if (raw !== "/local-site-audit/") return { status: 404 };
    try {
      const bytes = await read(
        root,
        ".local/site-topology-audit/audit.json",
        2097152,
      );
      const report = parseBounded(new TextDecoder().decode(bytes), 2097152, {
        depth: 20,
        nodes: 100000,
        string: 20000,
      });
      return {
        status: 200,
        type: "text/html; charset=utf-8",
        bytes: renderSiteAudit(report),
      };
    } catch {
      return {
        status: 200,
        type: "text/html; charset=utf-8",
        bytes: unavailable(),
      };
    }
  };
}
