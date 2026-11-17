import {
  projectDashboard,
  buildWindow,
  dashboardPreferences,
  dashboardSections,
  dashboardTitles,
  dashboardLink,
  dashboardItemLink,
  weaponDashboard,
} from "../domain/dashboard.mjs";
import {
  dashboardEscape as e,
  dashboardNumber as n,
  dashboardDestinations,
  dashboardTile,
  dashboardItemPanel,
  dashboardProgressRows,
  dashboardFacts,
  dashboardQualifiers,
} from "../ui/dashboard-page.mjs";
import { readPublicJSON } from "./public-data.mjs";
import { summarizeHomeProgress } from "../domain/home-progress.mjs";
import {
  readDashboardProfile,
  readDashboardArmory,
  readDashboardOverlay,
} from "../storage/dashboard-context.mjs";
import { validatePack } from "../content/validate.mjs";
import {
  createFoundOperation,
  commitFoundOperation,
  verifyFoundOperation,
} from "./collection-action.mjs";
import {
  hydrateInventoryIcons,
  releaseInventoryIcons,
} from "./inventory-icons.mjs";

import { quickCollect } from "../domain/quick-collect.mjs";
const preferenceKey = "dmz-dashboard-v1";
export async function mountDashboard() {
  const root = document.querySelector("#dashboard");
  if (!root) return;
  const $ = (s) => root.querySelector(s);
  let prefs;
  try {
    prefs = dashboardPreferences(
      JSON.parse(
        (localStorage.getItem(preferenceKey) || "null").slice(0, 8193),
      ),
    );
  } catch {
    prefs = dashboardPreferences(null);
  }
  let catalogs = [],
    pack = null,
    profile = null,
    model = null,
    armory = null,
    weapons = [],
    armoryState = "loading",
    generation = 0,
    controller = new AbortController(),
    busy = false,
    operation = null,
    verification = null,
    schema = null,
    overlayTag = "false:0",
    catalogWarning = "";
  const expanded = {},
    pages = {},
    selected = {},
    drafts = {},
    rows = new Map();
  let crafting = false,
    refreshNeeded = false;
  const status = (text) => {
    $("#dashboard-action-status").textContent = text;
  };
  const dirty = () =>
    Object.values(drafts).some(Boolean) ||
    busy ||
    operation?.state === "committed-unverified";
  const mayLeave = () =>
    !dirty() ||
    (!busy &&
      operation?.state !== "committed-unverified" &&
      window.confirm("Leave the unsaved found amount?"));
  const mayDiscardPanel = (id) =>
    !busy &&
    operation?.state !== "committed-unverified" &&
    (!drafts[id] || window.confirm("Leave the unsaved found amount?"));
  function savePrefs() {
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify(dashboardPreferences(prefs)),
      );
    } catch {
      status(
        "Layout is available for this session; preferences could not be saved.",
      );
    }
  }
  function layout() {
    const grid = $("#dashboard-grid");
    for (const id of prefs.order) {
      const section = $(`[data-dashboard-section="${id}"]`);
      const position = prefs.order.indexOf(id);
      if (grid.children[position] !== section)
        grid.insertBefore(section, grid.children[position] || null);
      $(`#dash-body-${id}`).hidden = !!prefs.collapsed[id];
      const b = $(`[data-dash-collapse="${id}"]`);
      b.textContent = prefs.collapsed[id] ? "Expand" : "Collapse";
      b.setAttribute("aria-expanded", String(!prefs.collapsed[id]));
    }
  }
  const contextHref = (id) =>
    dashboardLink(dashboardDestinations[id], $("#hub-pack").value);
  const panelFor = (id) => $(`[data-dash-detail="${id}"]`);
  function clearPanels() {
    for (const id of dashboardSections) {
      const p = panelFor(id);
      p.hidden = true;
      p.replaceChildren();
      delete selected[id];
      delete drafts[id];
    }
  }
  function pager(id, total, count) {
    const page = pages[id] || 0,
      last = Math.max(0, Math.ceil(total / count) - 1);
    pages[id] = Math.min(page, last);
    return `<div class="dash-pager"><button type="button" data-dash-page="${id}" data-step="-1"${pages[id] === 0 ? " disabled" : ""}>Previous</button><span>Page ${pages[id] + 1}/${last + 1} · ${total} listed</span><button type="button" data-dash-page="${id}" data-step="1"${pages[id] >= last ? " disabled" : ""}>Next</button></div>`;
  }
  const expandButton = (id) =>
    `<button type="button" class="dash-more" data-dash-more="${id}">${expanded[id] ? "Compact view" : "Show more"}</button>`;
  function collectionTiles(list, id, key) {
    return `<div class="dash-tiles">${list
      .map((r, i) => {
        const rowKey = `${key}:${r.id}`;
        const row = id === "builds" ? { ...r, alternative: false } : r;
        rows.set(rowKey, row);
        return dashboardTile(row, pack, id, rowKey);
      })
      .join("")}</div>`;
  }
  function render() {
    rows.clear();
    layout();
    for (const id of dashboardSections)
      $(`[data-dash-view-all="${id}"]`).href = contextHref(id);
    const state = model?.status;
    for (const id of dashboardSections.filter((id) => id !== "weapons")) {
      const content = $(`[data-dash-content="${id}"]`);
      if (state !== "ready") {
        content.innerHTML = `<p>${state === "absent" ? "No saved profile yet." : state === "stale" ? "Saved catalog needs review." : state === "unavailable" ? "Saved records unavailable." : "Reading your records…"}</p><a href="${e(state === "absent" ? dashboardLink("/inventory/", $("#hub-pack").value) : "/settings/")}">${state === "absent" ? "Set up tracking" : "Review saved records"}</a>`;
        continue;
      }
      if (id === "builds") {
        const window = buildWindow(model.builds, {
          expanded: expanded[id],
          page: pages[id] || 0,
        });
        pages[id] = window.page;
        content.innerHTML =
          model.builds.status !== "ok"
            ? "<p>Build calculation needs review. Open Quick collect.</p>"
            : `<p>Missing ingredients for additional items. Group estimates are separate; shared totals count stock once.</p>${window.groups.length ? window.groups.map((g) => `<div class="dash-group"><h3>${e(g.name)}${g.quantity ? " ×" + n(g.quantity) : ""}</h3>${g.ambiguous ? '<a href="' + e(dashboardLink("/collection/", pack.id)) + '#crafting">Choose a recipe</a>' : g.noRecipe ? "<p>No crafting recipe recorded. Collect the item directly.</p>" : ""}${collectionTiles(g.tiles, id, `build-${g.id}`)}${g.total > g.tiles.length ? `<a href="${e(contextHref(id))}">${g.total - g.tiles.length} more ingredients in Quick collect</a>` : ""}</div>`).join("") : "<p>Select Want to build / get in Inventory to see ingredients here.</p>"}${window.truncated || expanded[id] ? expandButton(id) : ""}${expanded[id] ? pager(id, window.total, 5) : ""}`;
      } else if (id === "needed") {
        const list = model.needed.items,
          count = expanded[id] ? 50 : 12;
        const last = Math.max(0, Math.ceil(list.length / count) - 1);
        pages[id] = Math.min(pages[id] || 0, last);
        const start = (pages[id] || 0) * count;
        content.innerHTML = `<label class="dash-inline-options"><input id="dashboard-crafting" type="checkbox"${crafting ? " checked" : ""}>Include crafting alternatives</label>${model.needed.status !== "ok" ? "<p>Counts need a catalog or scope review.</p>" : list.length ? collectionTiles(list.slice(start, start + count), id, "needed") : "<p>No known outstanding items in this scope.</p>"}${list.length > 12 ? expandButton(id) : ""}${expanded[id] ? pager(id, list.length, 50) : ""}<p>Unrecorded requirements may remain. Counts are not added to build estimates.</p>`;
      } else if (id === "upgrades") {
        const list = model.upgrades,
          sorted = [
            ...list.filter((r) => !r.complete),
            ...list.filter((r) => r.complete),
          ],
          count = expanded[id] ? 50 : 5;
        content.innerHTML = `<p>${list.filter((r) => r.complete).length}/${list.length} listed upgrade families complete</p>${dashboardProgressRows(sorted, pack.id, { limit: count })}${list.length > 5 ? expandButton(id) : ""}`;
      } else if (id === "orders") {
        content.innerHTML =
          ["hajin", "x01", "other"]
            .map((set) => {
              const all = model.orders.filter((r) => r.set === set);
              if (!all.length) return "";
              const list = [
                ...all.filter((r) => r.done < r.total || r.total === 0),
                ...all.filter((r) => r.done === r.total && r.total > 0),
              ];
              return `<h3>${set === "hajin" ? "Hajin · 24 reported rosters" : set === "x01" ? "X01 · 5 pages" : "Listed missions"}</h3><p>${all.reduce((a, r) => a + r.done, 0)}/${all.reduce((a, r) => a + r.total, 0)} visible listed missions complete</p><ul class="dash-progress-list">${list
                .slice(0, expanded[id] ? 29 : 3)
                .map(
                  (r) =>
                    `<li><div><a href="${e(dashboardLink("/missions/", pack.id) + (r.page ? `&page=${set}-${r.page}` : ""))}">${e(r.label)}</a>${r.variable ? "<small> · chapter position may vary</small>" : ""}${r.rows
                      .filter((m) => !m.done)
                      .slice(0, 1)
                      .map(
                        (m) =>
                          `<p><a href="${e(dashboardItemLink(pack.id, m.id))}">${e(m.name)}</a></p>`,
                      )
                      .join(
                        "",
                      )}</div><span>${r.done}/${r.total} complete</span></li>`,
                )
                .join("")}</ul>`;
            })
            .join("") + expandButton(id);
      } else if (id === "recipes") {
        const list = model.recipes;
        content.innerHTML = `<p>${list.filter((r) => r.owned).length}/${list.length} listed item blueprints owned · others not marked owned</p>${dashboardProgressRows(list, pack.id, { kind: "recipes", limit: expanded[id] ? 50 : 5 })}${list.length > 5 ? expandButton(id) : ""}`;
      }
    }
    const weaponRoot = $('[data-dash-content="weapons"]');
    if (!["ready", "absent"].includes(armoryState))
      weaponRoot.innerHTML = `<p>${armoryState === "loading" ? "Reading existing armory…" : "Armory unavailable. Other records remain available."}</p><a href="/armory/acquisition/">Open manual tracker</a>`;
    else if (!weapons.length)
      weaponRoot.innerHTML =
        '<p>Weapon list unavailable. Open the manual tracker to review your records.</p><a href="/armory/acquisition/">Open manual tracker</a>';
    else {
      const roster = weaponDashboard(armory?.acquisition, weapons);
      const list = roster.filter((r) => r.outstanding);
      weaponRoot.innerHTML = `<p>${list.length ? `${roster.filter((r) => !r.manual).length} manuals not marked collected · ${list.length} weapon manual goals to track` : "All listed manuals marked collected with 3+ extractions recorded."}</p><ul class="dash-progress-list">${list
        .slice(0, expanded.weapons ? 50 : 5)
        .map(
          (r) =>
            `<li data-dashboard-manual="${e(r.id)}"><div><a href="/armory/acquisition/?weapon=${encodeURIComponent(r.id)}#weapon-${encodeURIComponent(r.id)}">${e(r.name)}</a><p>${r.manual ? "Manual collected" : "Manual not marked collected"}</p></div><span>${r.unrecorded ? "<strong>3</strong> to record · extraction count not entered" : `<strong>${r.remaining}</strong> more manual extraction${r.remaining === 1 ? "" : "s"} · ${r.manualExtractions} / 3 recorded`}</span></li>`,
        )
        .join("")}</ul>${list.length > 5 ? expandButton("weapons") : ""}`;
    }
    if (state === "ready") {
      const summary = summarizeHomeProgress(pack, profile, {
        reveal: profile.spoilers,
      });
      $("#hub-progress").textContent = summary.limited
        ? "Progress scope is protected. Open your trackers to review."
        : `Saved locally · revision ${profile.revision} · ${summary.upgradesDone}/${summary.upgrades} listed upgrades · ${summary.missionsDone}/${summary.missions} listed missions complete`;
      if (catalogWarning)
        $("#hub-progress").textContent += " · " + catalogWarning;
      $("#dashboard-summary").innerHTML = [
        [
          "builds",
          model.builds.status === "ok"
            ? model.builds.groups.length + " build targets"
            : "Build needs require review",
        ],
        [
          "needed",
          model.needed.status === "ok"
            ? model.needed.items.length + " needed types"
            : "Outstanding needs require review",
        ],
        [
          "upgrades",
          model.upgrades.filter((r) => !r.complete).length +
            " upgrade families unfinished",
        ],
        ["orders", "Hajin & X01 Orders"],
        [
          "recipes",
          model.recipes.filter((r) => !r.owned).length +
            " item blueprints unmarked",
        ],
      ]
        .map(([id, label]) => `<a href="#dashboard-${id}">${e(label)}</a>`)
        .join("");
      void hydrateInventoryIcons(pack, {
        root,
        visibleOnly: true,
        readOnly: true,
      });
    } else $("#dashboard-summary").replaceChildren();
    for (const [id, selection] of Object.entries(selected)) {
      const tile = $(`[data-dash-key="${CSS.escape(selection.key)}"]`);
      tile?.setAttribute("aria-expanded", "true");
    }
  }
  async function refresh({ force = false } = {}) {
    if (busy || operation?.state === "committed-unverified") {
      refreshNeeded = true;
      return;
    }
    if (!force && dirty()) {
      refreshNeeded = true;
      status(
        "Saved data may have changed. Your draft is retained; review it before adding.",
      );
      return;
    }
    controller.abort();
    controller = new AbortController();
    const signal = controller.signal,
      token = ++generation,
      id = $("#hub-pack").value;
    const entry = catalogs.find((r) => r.id === id);
    if (!entry) return;
    const same = pack?.id === id;
    if (!same) {
      pack = null;
      profile = null;
      model = null;
      clearPanels();
      render();
    }
    $("#hub-progress").textContent = "Reading saved records…";
    try {
      const [publishedPack, nextProfile, overlay] = await Promise.all([
        readPublicJSON(entry.path, 8388608, signal),
        readDashboardProfile(id, { signal }),
        readDashboardOverlay(id, { signal }),
      ]);
      if (signal.aborted || token !== generation) return;
      let nextPack = publishedPack;
      catalogWarning = "";
      overlayTag = overlay.tag;
      if (overlay.pack) {
        try {
          validatePack(overlay.pack, schema);
          if (overlay.pack.id !== id) throw Error("Catalog identity differs");
          nextPack = overlay.pack;
        } catch {
          catalogWarning =
            "Local catalog invalid; published baseline shown. Review local content in Settings.";
        }
      }
      pack = nextPack;
      profile = nextProfile;
      model = projectDashboard(pack, profile, { crafting });
      $("#hub-progress").textContent =
        model.status === "ready"
          ? `Saved locally · revision ${profile.revision}`
          : model.status === "absent"
            ? "No saved profile for this catalog. Open Inventory or Upgrades to begin."
            : model.status === "stale"
              ? "Saved profile uses an older catalog. Review it in Settings."
              : "Saved records unavailable.";
    } catch {
      if (signal.aborted || token !== generation) return;
      model = { status: "unavailable" };
      $("#hub-progress").textContent =
        "Saved progress unavailable, blocked, timed out or invalid. Open Settings to inspect.";
    }
    if (token === generation && !signal.aborted) {
      refreshNeeded = false;
      render();
      syncPanels();
    }
  }
  async function loadArmory() {
    const token = generation;
    try {
      const result = await readDashboardArmory({ signal: controller.signal });
      if (token !== generation) return;
      armory = result;
      armoryState = result ? "ready" : "absent";
    } catch {
      if (token !== generation) return;
      armoryState = "unavailable";
    }
    render();
  }
  function syncPanels() {
    if (model?.status !== "ready") return;
    const needed = quickCollect(pack, profile, { crafting }).items;
    for (const id of ["builds", "needed"]) {
      const selection = selected[id];
      if (!selection) continue;
      const canonical =
        id === "needed"
          ? needed.find((r) => r.id === selection.row.id)
          : model.builds.groups
              .flatMap((g) =>
                [...g.direct, ...g.alternatives, g.root]
                  .filter(Boolean)
                  .map((row) => ({ key: `build-${g.id}:${row.id}`, row })),
              )
              .find((entry) => entry.key === selection.key)?.row;
      let row = rows.get(selection.key) || canonical;
      if (!row && id === "builds" && selection.key.startsWith("build-shared:"))
        row = model.builds.combined.find((r) => r.id === selection.row.id);
      if (!row)
        row = {
          ...selection.row,
          held: profile.inventory[selection.row.id] ?? null,
          required: 0,
          remaining: 0,
          minimum: false,
          assumedZero: false,
        };
      selection.row = row;
      panelFor(id).querySelector("[data-dash-facts]").innerHTML =
        dashboardFacts(row);
      panelFor(id).querySelector("[data-dash-qualifiers]").textContent =
        dashboardQualifiers(row);
    }
  }
  function verify() {
    if (verification) return verification;
    if (!operation || operation.state !== "committed-unverified")
      return Promise.resolve();
    const op = operation,
      token = generation,
      contextPack = pack;
    verification = (async () => {
      let saved;
      try {
        saved = await verifyFoundOperation(op);
      } catch {
        if (operation === op) {
          status(
            "Saved update needs verification. Do not add the amount again.",
          );
          showVerify();
        }
        return;
      }
      if (operation !== op) return;
      // Durable reconciliation belongs to this operation, paint belongs to the
      // captured generation. No late verification can clear a newer operation.
      operation = null;
      if (op.owner) {
        drafts[op.owner] = "";
        const input = panelFor(op.owner).querySelector("input");
        if (input) input.value = "";
      }
      lock(false);
      if (
        token !== generation ||
        contextPack !== pack ||
        op.packId !== $("#hub-pack").value ||
        op.version !== pack?.contentVersion
      ) {
        refreshNeeded = true;
        if (document.visibilityState === "visible") void refresh();
        return;
      }
      profile = saved;
      model = projectDashboard(pack, profile, { crafting });
      render();
      syncPanels();
      status("Found items saved to Inventory.");
    })().finally(() => {
      verification = null;
    });
    return verification;
  }
  function showVerify() {
    const box = $("#dashboard-action-status");
    box.replaceChildren(
      document.createTextNode("Saved update needs verification. "),
    );
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Verify saved update";
    button.addEventListener("click", verify);
    box.append(button);
    const review = document.createElement("a");
    review.href = dashboardLink("/inventory/", operation.packId);
    review.target = "_blank";
    review.rel = "noopener noreferrer";
    review.textContent = "Review saved Inventory ↗";
    box.append(" ", review);
  }
  function lock(value) {
    busy = value;
    $("#hub-pack").disabled =
      value || operation?.state === "committed-unverified";
    for (const panel of root.querySelectorAll("[data-dash-detail]"))
      for (const control of panel.querySelectorAll("button,input"))
        control.disabled = value || operation?.state === "committed-unverified";
  }
  root.addEventListener("input", (event) => {
    const form = event.target.closest("[data-dashboard-found]");
    if (form) {
      const owner =
        event.target.closest("[data-dash-detail]").dataset.dashDetail;
      drafts[owner] = event.target.value;
    }
  });
  root.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-dashboard-found]");
    if (!form) return;
    event.preventDefault();
    if (
      busy ||
      operation?.state === "committed-unverified" ||
      !profile ||
      model?.status !== "ready"
    )
      return;
    const input = form.elements.amount,
      raw = input.value,
      owner = form.closest("[data-dash-detail]").dataset.dashDetail,
      token = generation,
      y = scrollY;
    lock(true);
    form.parentElement.querySelector("[data-dash-error]").textContent = "";
    try {
      const [current, currentOverlay] = await Promise.all([
        readDashboardProfile(pack.id),
        readDashboardOverlay(pack.id),
      ]);
      if (token !== generation) return;
      if (
        !current ||
        current.revision !== profile.revision ||
        currentOverlay.tag !== overlayTag
      ) {
        refreshNeeded = true;
        throw Error(
          "Another page changed this profile. Close or clear the draft, then Refresh before adding.",
        );
      }
      operation = createFoundOperation(
        pack,
        profile,
        form.dataset.dashboardFound,
        raw,
      );
      operation.owner = owner;
      await commitFoundOperation(operation);
      await verify();
    } catch (reason) {
      if (token === generation) {
        form.parentElement.querySelector("[data-dash-error]").textContent =
          reason.message;
        status("Not saved. Your entered amount is retained.");
        if (operation?.state === "failed-before-commit") operation = null;
      }
    } finally {
      lock(false);
      if (token === generation && input.isConnected) {
        input.focus({ preventScroll: true });
        scrollTo({ top: y });
      }
    }
  });
  root.addEventListener("click", (event) => {
    const b = event.target.closest("button");
    if (!b) return;
    if (b.id === "hub-refresh") {
      if (!mayLeave()) return;
      clearPanels();
      if (!catalogs.length || !schema) {
        void loadCatalogs();
        return;
      }
      void refresh({ force: true });
      void loadArmory();
    }
    if (b.id === "dashboard-reset") {
      prefs = dashboardPreferences(null);
      prefs.catalogId = $("#hub-pack").value;
      savePrefs();
      layout();
      status("Layout reset. Your inventory and progress are unchanged.");
    }
    if (b.dataset.dashCollapse) {
      const id = b.dataset.dashCollapse;
      prefs.collapsed[id] = !prefs.collapsed[id];
      savePrefs();
      layout();
      b.focus({ preventScroll: true });
    }
    if (b.dataset.dashMove) {
      const id = b.dataset.dashMove,
        i = prefs.order.indexOf(id),
        to = i + Number(b.dataset.direction);
      if (to < 0 || to >= 6) return;
      [prefs.order[i], prefs.order[to]] = [prefs.order[to], prefs.order[i]];
      savePrefs();
      layout();
      b.focus({ preventScroll: true });
      status(`${dashboardTitles[id]} moved to position ${to + 1}.`);
    }
    if (b.dataset.dashMore) {
      const id = b.dataset.dashMore;
      if (selected[id] && !mayDiscardPanel(id)) return;
      expanded[id] = !expanded[id];
      pages[id] = 0;
      render();
      $(`[data-dash-more="${id}"]`)?.focus({ preventScroll: true });
    }
    if (b.dataset.dashPage) {
      const id = b.dataset.dashPage;
      if (selected[id] && !mayDiscardPanel(id)) return;
      pages[id] = (pages[id] || 0) + Number(b.dataset.step);
      panelFor(id).hidden = true;
      delete selected[id];
      delete drafts[id];
      render();
      $(`[data-dash-page="${id}"]:not(:disabled)`)?.focus({
        preventScroll: true,
      });
    }
    if (b.dataset.dashItem) {
      const id = b.dataset.dashOwner;
      if (selected[id] && !mayDiscardPanel(id)) return;
      const row = rows.get(b.dataset.dashKey);
      if (!row) return;
      root
        .querySelectorAll(`[data-dash-owner="${id}"]`)
        .forEach((t) => t.setAttribute("aria-expanded", "false"));
      selected[id] = { key: b.dataset.dashKey, row };
      drafts[id] = "";
      const panel = panelFor(id);
      panel.id = `dash-detail-${id}`;
      panel.innerHTML = dashboardItemPanel(row, pack);
      panel.hidden = false;
      b.setAttribute("aria-expanded", "true");
      panel.querySelector("input").focus({ preventScroll: true });
    }
    if (b.hasAttribute("data-dash-close")) {
      const panel = b.closest("[data-dash-detail]"),
        id = panel.dataset.dashDetail;
      if (!mayDiscardPanel(id)) return;
      const key = selected[id]?.key;
      delete selected[id];
      delete drafts[id];
      panel.hidden = true;
      const tile = $(`[data-dash-key="${CSS.escape(key || "")}"]`);
      tile?.setAttribute("aria-expanded", "false");
      tile?.focus({ preventScroll: true });
    }
  });
  root.addEventListener("change", (event) => {
    if (event.target.id === "dashboard-crafting") {
      if (!mayLeave()) {
        event.target.checked = crafting;
        return;
      }
      crafting = event.target.checked;
      clearPanels();
      model = projectDashboard(pack, profile, { crafting });
      pages.needed = 0;
      render();
      $("#dashboard-crafting")?.focus({ preventScroll: true });
    }
  });
  $("#hub-pack").addEventListener("change", () => {
    if (!mayLeave()) {
      $("#hub-pack").value = prefs.catalogId;
      return;
    }
    prefs.catalogId = $("#hub-pack").value;
    savePrefs();
    clearPanels();
    releaseInventoryIcons();
    void refresh({ force: true }).then(loadArmory);
  });
  document.addEventListener("click", (event) => {
    const a = event.target.closest("a[href]");
    if (
      !a ||
      a.target === "_blank" ||
      a.getAttribute("href").startsWith("#") ||
      !dirty()
    )
      return;
    if (!mayLeave()) event.preventDefault();
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pagehide", () => {
    controller.abort();
    generation++;
  });
  const resume = () => {
    if (document.visibilityState === "hidden") return;
    if (!catalogs.length || !pack) {
      void loadCatalogs();
      return;
    }
    if (operation?.state === "committed-unverified") void verify();
    else void refresh().then(loadArmory);
  };
  window.addEventListener("focus", resume);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) resume();
  });
  async function loadCatalogs() {
    controller.abort();
    controller = new AbortController();
    const owner = controller,
      token = ++generation;
    try {
      const manifest = await readPublicJSON(
        "/assets/content/manifest.json",
        65536,
        owner.signal,
      );
      if (owner.signal.aborted || token !== generation) return;
      schema = await readPublicJSON(
        "/assets/schemas/pack.schema.json",
        2097152,
        owner.signal,
      );
      if (owner.signal.aborted || token !== generation) return;
      catalogs = manifest.catalogs.filter((c) =>
        /^\/assets\/content\/packs\/[a-zA-Z0-9_-]+\.json$/.test(c.path),
      );
      $("#hub-pack").replaceChildren(
        ...catalogs.map((c) => {
          const o = document.createElement("option");
          o.value = c.id;
          o.textContent = c.title;
          return o;
        }),
      );
      const query = new URL(location.href).searchParams.get("pack");
      const chosen =
        catalogs.find((c) => c.id === query) ||
        catalogs.find((c) => c.id === prefs.catalogId) ||
        catalogs.find((c) => c.id === "official:mw4-dmz-starter") ||
        catalogs[0];
      if (!chosen) {
        status("No catalogs available.");
        return;
      }
      $("#hub-pack").value = chosen.id;
      prefs.catalogId = chosen.id;
      try {
        weapons = await readPublicJSON(
          "/assets/content/dashboard-weapons.json",
          65536,
          owner.signal,
        );
      } catch {
        weapons = [];
      }
      if (owner.signal.aborted || token !== generation) return;
      await refresh({ force: true });
      await loadArmory();
    } catch {
      if (owner.signal.aborted || token !== generation) return;
      status(
        "Catalog list unavailable. Public feature links remain available.",
      );
    }
  }
  await loadCatalogs();
}
