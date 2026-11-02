export function buildHomeHierarchy(topology) {
  const nodes = new Map(
      topology.nodes.map((n) => [n.id, { ...n, children: [], parent: null }]),
    ),
    root = nodes.get("route:/");
  if (!root) throw Error("Home page missing from topology");
  root.label = "Home";
  root.note = "Start here";
  const add = (n) => {
    if (nodes.has(n.id)) throw Error("Duplicate hierarchy identity");
    nodes.set(n.id, { children: [], parent: null, ...n });
  };
  const parent = (id, p) => {
    if (!nodes.has(p) || id === p) throw Error("Invalid hierarchy parent");
    nodes.get(id).parent = p;
  };
  const pathOwner = (path) =>
    [...nodes.values()].find((n) => n.href === path && n.service === "Guide");
  const map = nodes.get("feature:hajin-map"),
    guide = pathOwner("/dmz-guide/"),
    fob = pathOwner("/dmz-fob/"),
    weapons = pathOwner("/dmz-weapons/"),
    tools = pathOwner("/settings/");
  if (!map || !guide || !fob || !weapons || !tools)
    throw Error(
      "Main hubs are missing. Rebuild the guide before opening its mindmap.",
    );
  map.label = "Map";
  tools.label = "Tools & settings";
  const main = [map.id, guide.id, fob.id, weapons.id, tools.id];
  const fobPaths = new Set([
    "/upgrades/",
    "/inventory/",
    "/items/",
    "/recipes/",
    "/planner/",
    "/collection/",
  ]);
  const guidePaths = new Set([
    "/catalog/",
    "/keys/",
    "/missions/",
    "/progression/",
    "/guides/",
    "/local/",
  ]);
  const workspaces = topology.nodes
    .filter(
      (n) => n.kind === "workspace" && n.href.startsWith("/") && n.href !== "/",
    )
    .sort((a, b) => b.href.length - a.href.length || a.id.localeCompare(b.id));
  const fallback = {
    item: "/items/",
    recipe: "/recipes/",
    guide: "/guides/",
    weapon: "/weapons/",
    objective: "/progression/",
    map: "/maps/",
    location: "/maps/",
    404: "/sitemap/",
  };
  const ownerByPath = new Map(
    topology.nodes
      .filter((n) => n.service === "Guide")
      .map((n) => [n.href, n.id]),
  );
  const authorOwners = new Map();
  for (const edge of topology.edges) {
    const from = nodes.get(edge.from),
      to = nodes.get(edge.to);
    if (
      edge.kind === "contextual" &&
      from?.kind === "record" &&
      to?.kind === "authoring" &&
      !authorOwners.has(to.id)
    )
      authorOwners.set(to.id, from.id);
  }
  for (const original of topology.nodes) {
    if (original.id === root.id) continue;
    let p;
    if (main.includes(original.id)) p = root.id;
    else if (
      original.service === "Map" ||
      ["/maps/", "/map-workspace/"].includes(original.href)
    )
      p = map.id;
    else if (
      original.kind === "workspace" ||
      original.kind === "companion" ||
      original.kind === "runtime"
    ) {
      if (
        original.href.startsWith("/armory/") ||
        original.href === "/weapons/" ||
        original.service === "Weapon manager"
      )
        p = weapons.id;
      else if (fobPaths.has(original.href)) p = fob.id;
      else if (guidePaths.has(original.href)) p = guide.id;
      else p = tools.id;
    } else if (original.kind === "authoring")
      p = authorOwners.get(original.id) || ownerByPath.get("/community/");
    else
      p =
        ownerByPath.get(original.ownerPath) ||
        workspaces.find(
          (w) => original.href.startsWith(w.href) && original.id !== w.id,
        )?.id ||
        ownerByPath.get(fallback[original.family]) ||
        ownerByPath.get("/sitemap/");
    parent(original.id, p || guide.id);
  }
  const websites = new Map();
  for (const source of topology.externals || []) {
    if (
      source.kind !== "external" ||
      typeof source.href !== "string" ||
      source.href.length > 2048
    )
      continue;
    let u;
    try {
      u = new URL(source.href);
    } catch {
      continue;
    }
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
      continue;
    if (!websites.has(u.hostname)) websites.set(u.hostname, u.href);
  }
  if (websites.size > 1000)
    throw Error("Reference website hierarchy limit exceeded");
  if (websites.size) {
    add({
      id: "branch:websites",
      label: "Source websites",
      href: "/community/",
      kind: "branch",
      group: "Reference",
      service: "External references",
      family: "Reference websites",
    });
    parent("branch:websites", root.id);
    for (const [host, href] of websites) {
      const id = "website:" + host;
      add({
        id,
        label: host,
        href,
        kind: "website",
        group: "Reference",
        service: "External reference",
        family: "Reference website",
      });
      parent(id, "branch:websites");
    }
  }
  if (nodes.size > 7000) throw Error("Hierarchy node limit exceeded");
  for (const node of nodes.values()) {
    if (node.id !== root.id) {
      const seen = new Set([node.id]);
      let p = node.parent;
      while (p !== root.id) {
        if (!p || seen.has(p)) throw Error("Hierarchy is not rooted at Home");
        seen.add(p);
        p = nodes.get(p)?.parent;
      }
    }
    if (node.parent) nodes.get(node.parent).children.push(node.id);
  }
  for (const n of nodes.values())
    if (n.id !== root.id)
      n.children.sort(
        (a, b) =>
          nodes.get(a).label.localeCompare(nodes.get(b).label) ||
          a.localeCompare(b),
      );
  const rootOrder = [...main, "branch:websites"];
  root.children.sort((a, b) => rootOrder.indexOf(a) - rootOrder.indexOf(b));
  return {
    root: root.id,
    nodes,
    sourceCount: topology.nodes.length,
    websiteCount: websites.size,
  };
}
export function searchHomeHierarchy(tree, query, offset = 0) {
  const q = query.normalize("NFKC").trim().toLocaleLowerCase().slice(0, 120),
    matches = [...tree.nodes.values()].filter(
      (n) =>
        n.kind !== "branch" &&
        [n.label, n.href]
          .join(" ")
          .normalize("NFKC")
          .toLocaleLowerCase()
          .includes(q),
    );
  const start = Math.max(
      0,
      Math.min(
        Math.floor(Math.max(0, offset) / 40) * 40,
        Math.max(0, Math.ceil(matches.length / 40) - 1) * 40,
      ),
    ),
    allowed = new Set([tree.root]);
  for (const node of matches.slice(start, start + 40)) {
    let id = node.id;
    while (id) {
      allowed.add(id);
      id = tree.nodes.get(id).parent;
    }
  }
  return { allowed, total: matches.length, offset: start };
}
export function visibleHomeHierarchy(
  tree,
  expanded,
  limits = new Map(),
  allowed = null,
) {
  const rows = [],
    edges = [];
  const visit = (id, depth) => {
    if (allowed && !allowed.has(id)) return;
    const node = tree.nodes.get(id);
    if (!node) throw Error("Hierarchy node missing");
    if (rows.length >= 250 || depth > 20)
      throw Error(
        "Display limit reached. Collapse another branch before expanding more notes.",
      );
    rows.push({ ...node, depth });
    if (!allowed && !expanded.has(id)) return;
    const children = node.children.filter((c) => !allowed || allowed.has(c)),
      count = allowed
        ? children.length
        : Math.min(children.length, limits.get(id) || 25);
    for (const child of children.slice(0, count)) {
      edges.push({ from: id, to: child });
      visit(child, depth + 1);
    }
    if (count < children.length) {
      if (rows.length >= 250)
        throw Error(
          "Display limit reached. Collapse another branch before expanding more notes.",
        );
      const more = "more:" + id;
      rows.push({
        id: more,
        label: `Show ${Math.min(25, children.length - count)} more`,
        note: `${count} of ${children.length} shown`,
        kind: "more",
        parent: id,
        depth: depth + 1,
        children: [],
        owner: id,
      });
      edges.push({ from: id, to: more });
    }
  };
  visit(tree.root, 0);
  return { rows, edges };
}
export function layoutHomeHierarchy(visible, unit = 1) {
  if (!Number.isFinite(unit) || unit < 0.5 || unit > 4)
    throw Error("Invalid diagram scale");
  const w = 236 * unit,
    h = 112 * unit,
    gapX = 88 * unit,
    gapY = 20 * unit,
    margin = 32 * unit,
    children = new Map(visible.rows.map((n) => [n.id, []])),
    positions = new Map();
  for (const e of visible.edges) children.get(e.from).push(e.to);
  let next = margin;
  const place = (id) => {
    const row = visible.rows.find((n) => n.id === id),
      kids = children.get(id);
    let y;
    if (kids.length) {
      const ys = kids.map(place);
      y = (ys[0] + ys.at(-1)) / 2;
    } else {
      y = next;
      next += h + gapY;
    }
    positions.set(id, {
      x: margin + row.depth * (w + gapX),
      y,
      width: w,
      height: h,
    });
    return y;
  };
  place(visible.rows[0].id);
  return {
    positions,
    width: Math.max(...[...positions.values()].map((p) => p.x + w)) + margin,
    height: Math.max(...[...positions.values()].map((p) => p.y + h)) + margin,
  };
}

export const mindmapZoomLimits = Object.freeze({ min: 0.25, max: 2 });
export function clampMindmapZoom(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(
    mindmapZoomLimits.min,
    Math.min(mindmapZoomLimits.max, value),
  );
}
export function wheelMindmapZoom(scale, delta, mode = 0, pageHeight = 800) {
  if (
    ![scale, delta, mode, pageHeight].every(Number.isFinite) ||
    pageHeight <= 0
  )
    return clampMindmapZoom(scale);
  const pixels = delta * (mode === 1 ? 16 : mode === 2 ? pageHeight : 1),
    bounded = Math.max(-240, Math.min(240, pixels));
  return clampMindmapZoom(scale * Math.exp(-bounded * 0.002));
}
export function anchoredMindmapScroll(left, top, x, y, from, to) {
  return {
    left: ((left + x) / from) * to - x,
    top: ((top + y) / from) * to - y,
  };
}
