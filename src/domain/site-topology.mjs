import { features, featureURL } from "../ui/feature-registry.mjs";
import { parseBounded } from "../content/limits.mjs";
const guideOrigin = "http://127.0.0.1:4173";
const companionOrigins = new Set([
  "http://127.0.0.1:5175",
  "http://127.0.0.1:4174",
  "http://127.0.0.1:4176",
]);
export const decodeHTML = (s) =>
  String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi, (m, k) => {
    if (k[0] === "#") {
      const n =
        k[1].toLowerCase() === "x"
          ? parseInt(k.slice(2), 16)
          : Number(k.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "�";
    }
    return (
      { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" }[k.toLowerCase()] ?? m
    );
  });
const text = (s) =>
  decodeHTML(String(s).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
const attr = (s, key) => {
  const match = s.match(
    new RegExp(
      "(?:^|\\s)" + key + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))",
      "i",
    ),
  );
  return match ? decodeHTML(match[1] ?? match[2] ?? match[3]) : "";
};
function omitSpoilers(html) {
  let depth = 0,
    start = -1,
    end = 0,
    result = "";
  for (const match of html.matchAll(
    /<\/?details\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi,
  )) {
    const closing = /^<\//.test(match[0]);
    if (!closing) {
      if (
        start < 0 &&
        attr(match[0], "class").split(/\s+/).includes("spoiler-content")
      ) {
        start = match.index;
        depth = 1;
      } else if (start >= 0) depth++;
    } else if (start >= 0 && --depth === 0) {
      result +=
        html.slice(end, start) +
        "<details><summary>Reveal spoiler content</summary></details>";
      end = match.index + match[0].length;
      start = -1;
    }
  }
  return result + html.slice(end, start >= 0 ? start : html.length);
}
export function scanPublicHTML(html) {
  if (
    typeof html !== "string" ||
    new TextEncoder().encode(html).byteLength > 4 * 1024 * 1024
  )
    throw Error("Topology page exceeds scan limit");
  const ids = new Set(),
    links = [],
    controls = [],
    sections = [];
  const raw = html.replace(
    /<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi,
    "",
  );
  for (const m of raw.matchAll(
    /<[a-z][\w:-]*\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi,
  )) {
    const id = attr(m[0], "id");
    if (id) ids.add(id);
  }
  const clean = omitSpoilers(raw);
  const labels = [];
  for (const match of clean.matchAll(
    /<label\b((?:[^>"']|"[^"]*"|'[^']*')*)>([^]*?)<\/label\s*>/gi,
  )) {
    labels.push({
      id: attr(match[1], "for"),
      start: match.index,
      end: match.index + match[0].length,
      label: text(
        match[2]
          .replace(/<(select|textarea)\b[^>]*>[^]*?<\/\1\s*>/gi, "")
          .replace(/<input\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, ""),
      ),
    });
  }
  const controlLabel = (attrs, index) =>
    attr(attrs, "aria-label") ||
    labels.find(
      (l) =>
        (l.id && l.id === attr(attrs, "id")) ||
        (l.start <= index && index < l.end),
    )?.label ||
    attr(attrs, "id");
  for (const m of clean.matchAll(
    /<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([^]*?)<\/a\s*>/gi,
  )) {
    const href = attr(m[1], "href");
    if (href)
      links.push({
        href,
        label: attr(m[1], "aria-label") || text(m[2]) || "Unlabelled link",
      });
  }
  for (const m of clean.matchAll(
    /<(button|select|summary|h[1-6])\b((?:[^>"']|"[^"]*"|'[^']*')*)>([^]*?)<\/\1\s*>/gi,
  )) {
    const label = (
      m[1] === "select"
        ? controlLabel(m[2], m.index)
        : attr(m[2], "aria-label") || text(m[3])
    ).slice(0, 180);
    if (!label) continue;
    const row = {
      kind: m[1].startsWith("h")
        ? "section"
        : attr(m[2], "role") === "tab"
          ? "tab"
          : m[1],
      id: attr(m[2], "id"),
      label,
    };
    if (row.kind === "section") sections.push(row);
    else controls.push(row);
  }
  for (const match of clean.matchAll(
    /<(input|textarea)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi,
  )) {
    if (attr(match[2], "type") === "hidden") continue;
    const label = controlLabel(match[2], match.index).slice(0, 180);
    if (label)
      controls.push({ kind: match[1], id: attr(match[2], "id"), label });
  }
  const auditLinks = [...raw.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)]
    .map((m) => ({ href: attr(m[1], "href"), label: "Static anchor" }))
    .filter((a) => a.href);
  return { ids: [...ids], links, auditLinks, controls, sections };
}
export function buildSiteTopology(pages, renderedPages) {
  if (pages.length > 5000) throw Error("Topology route limit exceeded");
  const nodes = [],
    edges = [],
    issues = [],
    externals = new Map(),
    byPath = new Map(),
    featureNodes = new Map(),
    scans = new Map(),
    edgeKeys = new Set();
  const edge = (from, to, kind, href, label) => {
    const key = JSON.stringify([from, to, kind, href]);
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    if (edges.length >= 150000)
      throw Error("Topology connection limit exceeded");
    edges.push({ from, to, kind, href, label });
  };
  for (const page of pages) {
    const feature = features.find(
        (f) => f.kind === "guide" && f.path === page.path,
      ),
      id = "route:" + page.path;
    const node = {
      id,
      label: page.title,
      href: page.path,
      kind: feature
        ? "workspace"
        : page.path.startsWith("/contribute/")
          ? "authoring"
          : "record",
      group:
        feature?.group ||
        (page.path.startsWith("/contribute/")
          ? "Authoring guidance"
          : "Record pages"),
      family: page.page || "page",
      service: "Guide",
      featureIds: [],
      controls: [],
      sections: [],
      fixture: page.fixture === true,
      ...(page.ownerPath ? { ownerPath: page.ownerPath } : {}),
    };
    nodes.push(node);
    byPath.set(page.path, node);
  }
  for (const f of features) {
    const href = featureURL(f),
      guide = !f.kind || f.kind === "guide";
    let node = guide ? byPath.get(f.path) : null;
    if (!node) {
      node = {
        id: "feature:" + f.id,
        label: f.label,
        href,
        kind: guide ? "missing-workspace" : "companion",
        group: f.group,
        family: f.kind || "guide",
        service:
          f.kind === "map"
            ? "Map"
            : f.kind === "studio"
              ? "Content Studio"
              : "Guide",
        featureIds: [],
        controls: [],
        sections: [],
      };
      nodes.push(node);
      if (guide) issues.push({ kind: "missing-feature", from: f.id, href });
    }
    node.featureIds.push(f.id);
    featureNodes.set(f.id, node);
  }
  nodes.push({
    id: "service:weapon-manager",
    label: "Weapon update manager",
    href: "http://127.0.0.1:4176/",
    kind: "companion",
    group: "Manage",
    family: "manager",
    service: "Weapon manager",
    featureIds: [],
    controls: [],
    sections: [],
  });
  const runtimeReport = {
    id: "runtime:site-audit",
    label: "Runtime menu and tab report",
    href: "/local-site-audit/",
    kind: "runtime",
    group: "Manage",
    family: "local report",
    service: "Guide",
    featureIds: [],
    controls: [],
    sections: [],
  };
  nodes.push(runtimeReport);
  byPath.set(runtimeReport.href, runtimeReport);
  const resolve = (from, link, kind) => {
    let u;
    try {
      u = new URL(link.href, new URL(from.href, guideOrigin));
    } catch {
      issues.push({ kind: "invalid-url", from: from.id, href: link.href });
      return;
    }
    if (!["http:", "https:"].includes(u.protocol)) return;
    if (u.origin !== guideOrigin) {
      if (companionOrigins.has(u.origin)) {
        const target =
          nodes.find(
            (n) => n.kind === "companion" && new URL(n.href).href === u.href,
          ) ||
          nodes.find(
            (n) =>
              n.kind === "companion" &&
              new URL(n.href).origin === u.origin &&
              new URL(n.href).pathname === u.pathname &&
              !new URL(n.href).search,
          );
        if (target) edge(from.id, target.id, kind, link.href, link.label);
        else
          externals.set(u.href, {
            href: u.href,
            kind: "local-service",
            label: link.label,
          });
      } else
        externals.set(u.href, {
          href: u.href,
          kind: "external",
          label: link.label,
        });
      return;
    }
    const target = byPath.get(u.pathname);
    if (!target) {
      if (!/\.[a-z0-9]+$/i.test(u.pathname))
        issues.push({ kind: "missing-route", from: from.id, href: link.href });
      else
        externals.set(u.href, {
          href: u.href,
          kind: "guide-resource",
          label: link.label,
        });
      return;
    }
    if (u.hash) {
      let fragment;
      try {
        fragment = decodeURIComponent(u.hash.slice(1));
      } catch {
        fragment = "";
      }
      if (!scans.get(target.href)?.ids.includes(fragment))
        issues.push({
          kind: "missing-fragment",
          from: from.id,
          href: link.href,
        });
    }
    edge(from.id, target.id, kind, link.href, link.label);
  };
  for (const page of pages) {
    const html = renderedPages.get(page.path);
    if (typeof html !== "string")
      throw Error("Missing rendered topology route " + page.path);
    const scan = scanPublicHTML(html);
    scans.set(page.path, scan);
    const node = byPath.get(page.path);
    node.controls = scan.controls;
    node.sections = scan.sections;
  }
  // Contextual links exclude the shared shell by scanning the owning body only.
  for (const page of pages) {
    const node = byPath.get(page.path);
    for (const link of scanPublicHTML(page.body || "").links)
      resolve(
        node,
        link,
        ["/sitemap/", "/features/"].includes(page.path)
          ? "directory"
          : "contextual",
      );
  }
  const home = byPath.get("/");
  if (home)
    for (const node of new Set(featureNodes.values()))
      edge(
        home.id,
        node.id,
        "menu",
        node.href,
        "Shared navigation / feature directory",
      );
  const sitemap = byPath.get("/sitemap/");
  if (sitemap)
    for (const node of nodes)
      if (node !== sitemap)
        edge(sitemap.id, node.id, "directory", node.href, "Site map inventory");
  // Validate shell/footer anchors too, without duplicating their edges hundreds of times.
  for (const page of pages) {
    const node = byPath.get(page.path);
    for (const link of scans.get(page.path).auditLinks) {
      const before = edges.length;
      resolve(node, link, "shell");
      if (edges.length > before) edges.pop();
    }
  }
  const uniqueIssues = [
    ...new Map(issues.map((i) => [JSON.stringify(i), i])).values(),
  ];
  const result = {
    format: "dmz-site-topology",
    version: 1,
    scope:
      "Public generated guide HTML and declared companion destinations. No private records, form values or external availability checks.",
    nodes,
    edges,
    externals: [...externals.values()],
    issues: uniqueIssues,
    counts: {
      routes: pages.length,
      features: features.length,
      nodes: nodes.length,
      edges: edges.length,
      controls: nodes.reduce((n, x) => n + x.controls.length, 0),
      externalLinks: externals.size,
    },
  };
  const bytes = JSON.stringify(result);
  if (new TextEncoder().encode(bytes).byteLength > 12 * 1024 * 1024)
    throw Error("Topology snapshot exceeds byte limit");
  parseBounded(bytes, 12582912, { depth: 20, nodes: 150000, string: 20000 });
  return validateTopology(result);
}
export function validateTopology(value) {
  if (
    !value ||
    value.format !== "dmz-site-topology" ||
    value.version !== 1 ||
    !Array.isArray(value.nodes) ||
    value.nodes.length > 6000 ||
    !Array.isArray(value.edges) ||
    value.edges.length > 150000
  )
    throw Error("Invalid topology snapshot");
  const ids = new Set();
  for (const node of value.nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      node.id.length > 300 ||
      ids.has(node.id) ||
      typeof node.label !== "string" ||
      node.label.length > 500 ||
      typeof node.group !== "string" ||
      typeof node.href !== "string" ||
      node.href.length > 2048
    )
      throw Error("Invalid topology node");
    if (
      (node.fixture !== undefined && typeof node.fixture !== "boolean") ||
      (node.ownerPath !== undefined &&
        !["/upgrades/", "/missions/", "/progression/"].includes(node.ownerPath))
    )
      throw Error("Invalid hierarchy ownership metadata");
    const u = new URL(node.href, guideOrigin);
    if (
      (u.origin !== guideOrigin && !companionOrigins.has(u.origin)) ||
      !["http:", "https:"].includes(u.protocol) ||
      u.username ||
      u.password
    )
      throw Error("Unsafe topology destination");
    ids.add(node.id);
    for (const field of ["controls", "sections"])
      if (
        !Array.isArray(node[field]) ||
        node[field].length > 10000 ||
        node[field].some(
          (c) =>
            !c ||
            typeof c.label !== "string" ||
            c.label.length > 180 ||
            typeof c.kind !== "string" ||
            typeof c.id !== "string",
        )
      )
        throw Error("Invalid topology controls");
  }
  for (const edge of value.edges)
    if (
      !edge ||
      !ids.has(edge.from) ||
      !ids.has(edge.to) ||
      !["contextual", "menu", "directory"].includes(edge.kind) ||
      typeof edge.href !== "string" ||
      edge.href.length > 2048 ||
      typeof edge.label !== "string"
    )
      throw Error("Invalid topology connection");
  return value;
}
