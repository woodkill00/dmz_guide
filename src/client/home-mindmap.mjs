import {
  buildHomeHierarchy,
  searchHomeHierarchy,
  visibleHomeHierarchy,
  layoutHomeHierarchy,
} from "../domain/home-mindmap.mjs";
const make = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
export function mountHomeMindmap(topology) {
  const tree = buildHomeHierarchy(topology),
    $ = (s) => document.querySelector(s),
    viewport = $("#mindmap-viewport"),
    stage = $("#mindmap-stage"),
    world = $("#mindmap-world"),
    notes = $("#mindmap-notes"),
    svg = $("#mindmap-lines"),
    outline = $("#mindmap-outline");
  let expanded = new Set([tree.root]),
    limits = new Map(),
    query = "",
    searchOffset = 0,
    scale = 1,
    outlineMode = false,
    visible,
    layout;
  const setStatus = (text) => {
    $("#mindmap-status").textContent = text;
  };
  function link(node) {
    const a = make("a", node.label, "note-link");
    a.tabIndex = 0;
    a.href = node.href;
    a.title = node.label;
    const u = new URL(node.href, location.href);
    if (u.origin !== location.origin) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.append(make("span", " ↗", "note-external"));
    }
    return a;
  }
  function change(id, more = false) {
    const next = new Set(expanded),
      nextLimits = new Map(limits);
    if (more) nextLimits.set(id, (limits.get(id) || 25) + 25);
    else if (next.has(id)) next.delete(id);
    else next.add(id);
    try {
      visibleHomeHierarchy(tree, next, nextLimits);
      const before = layout?.positions.get(id);
      expanded = next;
      limits = nextLimits;
      render();
      const after = layout?.positions.get(id);
      if (before && after) viewport.scrollTop += (after.y - before.y) * scale;
    } catch (error) {
      setStatus(error.message);
    }
  }
  function note(node, asOutline = false) {
    const card = make(
      asOutline ? "div" : "article",
      null,
      "map-note" +
        (node.id === tree.root ? " map-note-home" : "") +
        (node.kind === "branch" ? " map-note-branch" : ""),
    );
    card.dataset.note = node.id;
    card.dataset.branch = node.group?.toLowerCase() || "";
    if (node.kind === "more") {
      const b = make("button", node.label, "note-more");
      b.type = "button";
      b.setAttribute(
        "aria-label",
        node.label + " below " + tree.nodes.get(node.owner).label,
      );
      b.onclick = () => change(node.owner, true);
      card.append(b, make("small", node.note));
      return card;
    }
    const heading = make("div", null, "note-heading");
    heading.append(
      link(node),
      make(
        "small",
        node.id === tree.root
          ? "Start here"
          : node.kind === "branch"
            ? "Section"
            : node.fixture === true
              ? "Fictional fixture"
              : node.service,
      ),
    );
    card.append(heading);
    if (node.children.length) {
      const b = make("button", null, "note-toggle");
      b.type = "button";
      const isOpen = query
        ? visible.edges.some((e) => e.from === node.id)
        : expanded.has(node.id);
      b.setAttribute("aria-expanded", String(isOpen));
      b.setAttribute(
        "aria-label",
        (isOpen ? "Collapse " : "Expand ") +
          node.label +
          ` · ${node.children.length} ${node.children.length === 1 ? "child" : "children"}`,
      );
      const symbol = make("span", isOpen ? "−" : "+");
      symbol.setAttribute("aria-hidden", "true");
      b.append(make("span", String(node.children.length)), symbol);
      b.title = `${node.children.length} child pages or branches`;
      b.disabled = !!query;
      b.onclick = () => change(node.id);
      card.append(b);
    } else
      card.append(
        make(
          "small",
          node.kind === "website" ? "Reference website" : "Page link",
          "note-leaf",
        ),
      );
    return card;
  }
  function render() {
    const active = document.activeElement;
    const activeNote = active?.closest?.("[data-note]");
    const restore =
      activeNote && (notes.contains(active) || outline.contains(active))
        ? { id: activeNote.dataset.note, tag: active.tagName.toLowerCase() }
        : null;
    let search = null;
    if (query) search = searchHomeHierarchy(tree, query, searchOffset);
    visible = visibleHomeHierarchy(tree, expanded, limits, search?.allowed);
    const unit =
      parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    layout = layoutHomeHierarchy(visible, unit);
    notes.replaceChildren();
    svg.replaceChildren();
    world.style.width = layout.width + "px";
    world.style.height = layout.height + "px";
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    for (const edge of visible.edges) {
      const a = layout.positions.get(edge.from),
        b = layout.positions.get(edge.to),
        path = document.createElementNS("http://www.w3.org/2000/svg", "path"),
        x1 = a.x + a.width,
        y1 = a.y + a.height / 2,
        x2 = b.x,
        y2 = b.y + b.height / 2;
      path.setAttribute(
        "d",
        `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`,
      );
      svg.append(path);
    }
    if (!outlineMode)
      for (const row of visible.rows) {
        const card = note(row),
          p = layout.positions.get(row.id);
        card.style.left = p.x + "px";
        card.style.top = p.y + "px";
        notes.append(card);
      }
    outline.replaceChildren();
    if (outlineMode) {
      const byId = new Map(visible.rows.map((n) => [n.id, n])),
        kids = new Map(visible.rows.map((n) => [n.id, []]));
      for (const e of visible.edges) kids.get(e.from).push(e.to);
      const branch = (id) => {
        const li = make("li");
        li.append(note(byId.get(id), true));
        if (kids.get(id).length) {
          const ul = make("ul");
          for (const c of kids.get(id)) ul.append(branch(c));
          li.append(ul);
        }
        return li;
      };
      const ul = make("ul");
      ul.append(branch(tree.root));
      outline.append(ul);
    }
    applyScale();
    $("#mindmap-search-pages").hidden = !search || search.total <= 40;
    if (search) {
      searchOffset = search.offset;
      $("#mindmap-search-range").textContent = search.total
        ? `${search.offset + 1}–${Math.min(search.offset + 40, search.total)} of ${search.total}`
        : "0 matches";
      $("#mindmap-search-prev").disabled = !search.offset;
      $("#mindmap-search-next").disabled = search.offset + 40 >= search.total;
      setStatus(
        `${search.total} matching page/website notes. Ancestors show the path from Home.`,
      );
    } else
      setStatus(
        `${tree.sourceCount} page/tool notes and ${tree.websiteCount} source websites · ${visible.rows.filter((r) => r.kind !== "more").length} notes visible. Expand a branch to follow its pages.`,
      );
    if (
      restore &&
      (document.activeElement === document.body ||
        document.activeElement === active)
    ) {
      const container = outlineMode ? outline : notes;
      let card = container.querySelector(
        `[data-note="${CSS.escape(restore.id)}"]`,
      );
      if (!card && restore.id.startsWith("more:"))
        card = container.querySelector(
          `[data-note="${CSS.escape(restore.id.slice(5))}"]`,
        );
      (
        card?.querySelector(restore.tag) || card?.querySelector("a,button")
      )?.focus({ preventScroll: true });
    }
  }
  function applyScale() {
    world.style.transform = `scale(${scale})`;
    stage.style.width = Math.ceil(layout.width * scale) + "px";
    stage.style.height = Math.ceil(layout.height * scale) + "px";
    $("#mindmap-zoom").textContent = Math.round(scale * 100) + "%";
    $("#mindmap-zoom-out").disabled = scale <= 0.5;
    $("#mindmap-zoom-in").disabled = scale >= 1.5;
  }
  function zoom(next) {
    const x = (viewport.scrollLeft + viewport.clientWidth / 2) / scale,
      y = (viewport.scrollTop + viewport.clientHeight / 2) / scale;
    scale = Math.max(0.5, Math.min(1.5, next));
    applyScale();
    viewport.scrollLeft = x * scale - viewport.clientWidth / 2;
    viewport.scrollTop = y * scale - viewport.clientHeight / 2;
  }
  function centerHome() {
    const p = layout.positions.get(tree.root);
    viewport.scrollLeft = Math.max(0, p.x * scale - 24);
    viewport.scrollTop = Math.max(
      0,
      (p.y + p.height / 2) * scale - viewport.clientHeight / 2,
    );
  }
  $("#mindmap-form").onsubmit = (e) => e.preventDefault();
  $("#mindmap-query").oninput = (e) => {
    query = e.target.value.trim();
    searchOffset = 0;
    try {
      render();
      centerHome();
    } catch (error) {
      setStatus(error.message);
    }
  };
  $("#mindmap-home").onclick = () => {
    expanded = new Set([tree.root]);
    limits = new Map();
    query = "";
    searchOffset = 0;
    scale = 1;
    $("#mindmap-query").value = "";
    render();
    viewport.scrollTo({ left: 0, top: 0, behavior: "instant" });
  };
  $("#mindmap-fit").onclick = () => {
    zoom(
      Math.min(
        viewport.clientWidth / layout.width,
        viewport.clientHeight / layout.height,
      ) * 0.95,
    );
    viewport.scrollTo({ left: 0, top: 0, behavior: "instant" });
  };
  $("#mindmap-zoom-in").onclick = () => zoom(scale + 0.1);
  $("#mindmap-zoom-out").onclick = () => zoom(scale - 0.1);
  $("#mindmap-outline-toggle").onclick = () => {
    outlineMode = !outlineMode;
    $("#mindmap-outline-toggle").setAttribute(
      "aria-pressed",
      String(outlineMode),
    );
    viewport.hidden = outlineMode;
    outline.hidden = !outlineMode;
    render();
  };
  for (const [id, delta] of [
    ["#mindmap-search-prev", -40],
    ["#mindmap-search-next", 40],
  ])
    $(id).onclick = () => {
      searchOffset += delta;
      render();
      centerHome();
    };
  let drag = null;
  viewport.addEventListener("pointerdown", (e) => {
    if (
      e.button !== 0 ||
      e.pointerType !== "mouse" ||
      e.target.closest("a,button,input,select")
    )
      return;
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    viewport.setPointerCapture(e.pointerId);
    viewport.classList.add("is-panning");
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    viewport.scrollLeft = drag.left - (e.clientX - drag.x);
    viewport.scrollTop = drag.top - (e.clientY - drag.y);
  });
  const stop = () => {
    drag = null;
    viewport.classList.remove("is-panning");
  };
  viewport.addEventListener("pointerup", stop);
  viewport.addEventListener("pointercancel", stop);
  let frame;
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (visible) render();
    });
  }).observe(viewport);
  $("#home-mindmap-app").hidden = false;
  render();
  requestAnimationFrame(() =>
    viewport.scrollTo({ left: 0, top: 0, behavior: "instant" }),
  );
  return tree;
}
