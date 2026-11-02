import { mountHomeMindmap } from "./home-mindmap.mjs";
import { validateTopology } from "../domain/site-topology.mjs";
import { readPublicJSON } from "./public-data.mjs";
const $ = (s) => document.querySelector(s),
  make = (tag, text, cls) => {
    const n = document.createElement(tag);
    if (text) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  };
let data,
  group = "",
  query = "",
  service = "",
  family = "",
  offset = 0,
  selected = "",
  neighborhood = null,
  connectionsOffset = 0,
  connectionKind = "contextual";
const pageSize = 40;
const nodes = $("#topology-nodes"),
  groups = $("#topology-groups"),
  inspector = $("#topology-inspector");
const byId = new Map();
const matches = (n) =>
  (!neighborhood || neighborhood.has(n.id)) &&
  (!group || n.group === group) &&
  (!service || n.service === service) &&
  (!family || n.family === family) &&
  (!query ||
    [
      n.label,
      n.href,
      n.family,
      ...n.sections.map((s) => s.label),
      ...n.controls.map((c) => c.label),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query));
function safeLink(href, label) {
  const u = new URL(href, location.href);
  const a = make("a", label);
  a.href = href;
  if (u.origin !== location.origin) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.append(make("span", " ↗"));
  }
  return a;
}
function inspect(id, focus = false) {
  selected = id;
  connectionsOffset = 0;
  drawInspector();
  requestAnimationFrame(drawLines);
  for (const b of nodes.querySelectorAll("button"))
    b.setAttribute("aria-pressed", String(b.dataset.node === id));
  if (focus) inspector.querySelector("h3").focus();
}
function drawInspector() {
  const n = byId.get(selected);
  if (!n) return;
  inspector.replaceChildren();
  const heading = make("h3", n.label);
  heading.tabIndex = -1;
  inspector.append(
    heading,
    make("p", n.service + " · " + n.family, "muted"),
    safeLink(n.href, "Open this page / tool"),
    make("p", n.href, "topology-path"),
  );
  const tabs = make("div", null, "toolbar");
  for (const kind of ["contextual", "menu", "directory"]) {
    const b = make(
      "button",
      kind === "contextual"
        ? "Page links"
        : kind === "menu"
          ? "Shared menu"
          : "Directory",
    );
    b.type = "button";
    b.setAttribute("aria-pressed", String(kind === connectionKind));
    b.onclick = () => {
      connectionKind = kind;
      connectionsOffset = 0;
      drawInspector();
      requestAnimationFrame(drawLines);
    };
    tabs.append(b);
  }
  inspector.append(tabs);
  const show = make("button", "Show connections on mindmap");
  show.type = "button";
  show.id = "topology-show-connections";
  show.onclick = () => {
    neighborhood = new Set([selected]);
    for (const edge of data.edges)
      if (
        edge.kind === connectionKind &&
        (edge.from === selected || edge.to === selected)
      ) {
        neighborhood.add(edge.from);
        neighborhood.add(edge.to);
      }
    group = "";
    offset = 0;
    $("#topology-filters").reset();
    render();
  };
  inspector.append(show);
  const incoming = data.edges.filter(
      (e) => e.to === n.id && e.kind === connectionKind,
    ),
    outgoing = data.edges.filter(
      (e) => e.from === n.id && e.kind === connectionKind,
    ),
    rows = [
      ...outgoing.map((e) => ({ e, direction: "To", node: byId.get(e.to) })),
      ...incoming.map((e) => ({
        e,
        direction: "From",
        node: byId.get(e.from),
      })),
    ];
  inspector.append(
    make(
      "p",
      `${outgoing.length} outgoing · ${incoming.length} incoming ${connectionKind} connections`,
    ),
  );
  const list = make("ul", null, "topology-connections");
  for (const { e, direction, node } of rows.slice(
    connectionsOffset,
    connectionsOffset + 50,
  )) {
    const li = make("li"),
      b = make("button", direction + " " + node.label);
    b.type = "button";
    b.onclick = () => inspect(node.id, true);
    li.append(b, make("small", e.label || e.kind));
    list.append(li);
  }
  if (!rows.length)
    list.append(
      make(
        "li",
        "No " +
          connectionKind +
          " connection recorded. Dynamic actions are not inferred.",
      ),
    );
  inspector.append(list);
  if (rows.length > 50) {
    const nav = make("div", null, "toolbar");
    for (const [title, delta] of [
      ["Previous links", -50],
      ["Next links", 50],
    ]) {
      const b = make("button", title);
      b.type = "button";
      b.disabled =
        delta < 0
          ? connectionsOffset === 0
          : connectionsOffset + 50 >= rows.length;
      b.onclick = () => {
        connectionsOffset += delta;
        drawInspector();
      };
      nav.append(b);
    }
    nav.append(
      make(
        "span",
        `${connectionsOffset + 1}–${Math.min(rows.length, connectionsOffset + 50)} / ${rows.length}`,
      ),
    );
    inspector.append(nav);
  }
  for (const [label, rows] of [
    ["Sections", n.sections],
    ["Static menus, tabs and controls", n.controls],
  ]) {
    const d = make("details"),
      sum = make("summary", label + " (" + rows.length + ")");
    d.append(sum);
    const ul = make("ul");
    for (const row of rows) {
      const li = make("li", row.kind + " · " + row.label);
      if (row.id) li.append(make("small", " #" + row.id));
      ul.append(li);
    }
    d.append(ul);
    inspector.append(d);
  }
  if (n.kind === "companion")
    inspector.append(
      make(
        "p",
        "Declared companion destination. Its dynamic panels are covered by the separate local runtime audit, not this static scan.",
        "notice",
      ),
    );
}
function render() {
  query = $("#topology-query").value.trim().toLocaleLowerCase();
  service = $("#topology-service").value;
  family = $("#topology-family").value;
  const matching = data.nodes.filter(matches);
  if (neighborhood)
    matching.sort(
      (a, b) => Number(b.id === selected) - Number(a.id === selected),
    );
  offset = Math.max(
    0,
    Math.min(
      offset,
      Math.max(0, Math.ceil(matching.length / pageSize) - 1) * pageSize,
    ),
  );
  nodes.replaceChildren();
  for (const n of matching.slice(offset, offset + pageSize)) {
    const b = make("button", null, "topology-node");
    b.type = "button";
    b.dataset.node = n.id;
    b.setAttribute("aria-pressed", String(n.id === selected));
    b.append(
      make("strong", n.label),
      make("small", n.service + " · " + n.family),
    );
    b.onclick = () => inspect(n.id);
    nodes.append(b);
  }
  if (!matching.length)
    nodes.append(
      make("p", "No matching pages. Reset or choose another branch."),
    );
  for (const b of groups.querySelectorAll("button"))
    b.setAttribute("aria-pressed", String(b.dataset.group === group));
  $("#topology-range").textContent = matching.length
    ? `${offset + 1}–${Math.min(offset + pageSize, matching.length)} of ${matching.length} matching nodes`
    : "0 matching nodes";
  $("#topology-previous").disabled = offset === 0;
  $("#topology-next").disabled = offset + pageSize >= matching.length;
  $("#topology-status").textContent =
    `${matching.length} matching pages/tools${group ? " · " + group : ""}. Select a node to inspect its connections.`;
  requestAnimationFrame(drawLines);
}
function drawLines() {
  const svg = $(".topology-lines"),
    box = $(".topology-map"),
    rect = box.getBoundingClientRect();
  svg.replaceChildren();
  const height = Math.max(
    rect.height,
    nodes.offsetTop + nodes.offsetHeight + 16,
    groups.offsetTop + groups.offsetHeight + 16,
  );
  svg.style.height = height + "px";
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${height}`);
  const point = (el) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - rect.left + r.width / 2 + box.scrollLeft,
        y: r.top - rect.top + r.height / 2 + box.scrollTop,
      };
    },
    root = point($("#topology-root"));
  for (const el of groups.querySelectorAll("button")) {
    const p = point(el);
    line(root, p);
    for (const child of nodes.querySelectorAll("button"))
      if (byId.get(child.dataset.node)?.group === el.dataset.group)
        line(p, point(child));
  }
  const visible = new Map(
    [...nodes.querySelectorAll("button")].map((b) => [b.dataset.node, b]),
  );
  const drawn = new Set();
  for (const edge of data.edges) {
    const key = edge.from + "→" + edge.to;
    if (
      edge.kind !== connectionKind ||
      (edge.from !== selected && edge.to !== selected) ||
      !visible.has(edge.from) ||
      !visible.has(edge.to) ||
      drawn.has(key)
    )
      continue;
    drawn.add(key);
    line(point(visible.get(edge.from)), point(visible.get(edge.to)), true);
  }
  function line(a, b, connection = false) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute(
      "d",
      `M${a.x},${a.y} C${(a.x + b.x) / 2},${a.y} ${(a.x + b.x) / 2},${b.y} ${b.x},${b.y}`,
    );
    if (connection) path.classList.add("topology-crosslink");
    svg.append(path);
  }
}
function reset() {
  group = "";
  selected = "";
  neighborhood = null;
  offset = 0;
  $("#topology-filters").reset();
  inspector.replaceChildren(
    make("h3", "Select a node"),
    make("p", "Choose a page or tool to inspect its connections."),
  );
  render();
}
try {
  data = validateTopology(
    await readPublicJSON("/assets/content/site-topology.json", 12582912),
  );
  mountHomeMindmap(data);
  for (const n of data.nodes) byId.set(n.id, n);
  for (const name of [...new Set(data.nodes.map((n) => n.group))]) {
    const b = make("button", name);
    b.type = "button";
    b.dataset.group = name;
    b.setAttribute("aria-pressed", "false");
    b.append(
      make("small", String(data.nodes.filter((n) => n.group === name).length)),
    );
    b.onclick = () => {
      neighborhood = null;
      group = group === name ? "" : name;
      offset = 0;
      render();
    };
    groups.append(b);
  }
  for (const name of [...new Set(data.nodes.map((n) => n.family))].sort()) {
    const o = make("option", name);
    o.value = name;
    $("#topology-family").append(o);
  }
  for (const [key, label] of [
    ["routes", "guide routes"],
    ["features", "registered features"],
    ["edges", "connections"],
    ["controls", "static controls"],
  ])
    $("#topology-counts").append(make("span", data.counts[key] + " " + label));
  const audit = $("#topology-audit");
  audit.append(
    make(
      "p",
      data.issues.length +
        " static route/fragment findings. " +
        data.externals.filter((e) => e.kind === "external").length +
        " external destinations inventoried, not remotely tested.",
    ),
  );
  for (const issue of data.issues) {
    const p = make(
      "p",
      issue.kind +
        " · " +
        (byId.get(issue.from)?.label || issue.from) +
        " → " +
        issue.href,
    );
    audit.append(p);
  }
  const unlinked = data.nodes.filter(
    (n) =>
      n.kind === "record" &&
      !data.edges.some((e) => e.to === n.id && e.kind === "contextual"),
  );
  audit.append(
    make(
      "p",
      unlinked.length +
        " record pages without an incoming contextual page link. All remain available through this directory.",
    ),
  );
  const d = make("details");
  d.append(make("summary", "Review pages without contextual incoming links"));
  const ul = make("ul");
  for (const n of unlinked) {
    const li = make("li");
    li.append(safeLink(n.href, n.label));
    ul.append(li);
  }
  d.append(ul);
  audit.append(d);
  $("#topology-app").hidden = false;
  $("#topology-filters").onsubmit = (e) => e.preventDefault();
  $("#topology-filters").addEventListener("input", () => {
    neighborhood = null;
    group = "";
    offset = 0;
    render();
  });
  $("#topology-reset").onclick = reset;
  $("#topology-root").onclick = reset;
  $("#topology-previous").onclick = () => {
    offset -= pageSize;
    render();
    $("#topology-status").focus();
  };
  $("#topology-next").onclick = () => {
    offset += pageSize;
    render();
    $("#topology-status").focus();
  };
  new ResizeObserver(drawLines).observe($(".topology-map"));
  render();
} catch (e) {
  document.querySelector("#mindmap-load-error").hidden = false;
  document.querySelector("#mindmap-load-error").textContent =
    "The visual map could not load. Use the readable directory below. " +
    e.message;
  $("#topology-error").hidden = false;
  $("#topology-error").textContent =
    "The visual inventory could not load. The readable site map below is still available. " +
    e.message;
}
