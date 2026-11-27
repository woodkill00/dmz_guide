import { dashboardBlueprintCards } from "../ui/blueprint-cards.mjs";
import { createOrderDisclosures } from "./order-disclosures.mjs";
import { activeOrderPageKeys } from "../domain/order-progress.mjs";
import { dashboardOrderCards } from "../ui/order-cards.mjs";
import { hydrateOrderChecks } from "../ui/order-progress.mjs";
import { mountDashboardWeapons } from "./dashboard-weapons.mjs";
import { validateCamoCatalog } from "../domain/weapon-camos.mjs";
import {
  projectDashboard,
  buildWindow,
  dashboardPreferences,
  dashboardSections,
  dashboardTitles,
  dashboardLink,
  dashboardItemLink,
} from "../domain/dashboard.mjs";
import {
  dashboardEscape as e,
  dashboardNumber as n,
  dashboardDestinations,
  dashboardTile,
  dashboardItemPanel,
  dashboardProgressRows,
  dashboardUpgradeCards,
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
  createUpgradeOperation,
  createBlueprintOperation,
  createOrderOperation,
  isStatusOperation,
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
    weaponMetadata = null,
    weaponWidget = null,
    armoryState = "loading",
    generation = 0,
    controller = new AbortController(),
    busy = false,
    operation = null,
    verification = null,
    upgradeUndo = null,
    upgradeIntent = 0,
    upgradeMessage = "",
    statusKind = "upgrade",
    schema = null,
    overlayTag = "false:0",
    catalogWarning = "";
  const orderDisclosures = createOrderDisclosures(root, () => pack?.id || "");
  const expanded = {},
    pages = {},
    selected = {},
    drafts = {},
    rows = new Map();
  let showCompletedOrders = false;
  let crafting = false,
    refreshNeeded = false;
  const status = (text) => {
    $("#dashboard-action-status").textContent = text;
  };
  for (const type of ["pointerdown", "keydown", "input"])
    document.addEventListener(type, () => upgradeIntent++);
  const dirty = () =>
    Object.values(drafts).some(Boolean) ||
    busy ||
    weaponWidget?.dirty() ||
    operation?.state === "committed-unverified" ||
    (isStatusOperation(operation) &&
      operation.state === "failed-before-commit");
  const mayLeave = () =>
    !dirty() ||
    (!busy &&
      !weaponWidget?.dirty() &&
      operation?.state !== "committed-unverified" &&
      !(
        isStatusOperation(operation) &&
        operation.state === "failed-before-commit"
      ) &&
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
            : `<p>Ingredients still needed for your selected builds.</p>${window.groups.length ? window.groups.map((g) => `<div class="dash-group"><div class="dash-build-heading"><h3>${e(g.name)}</h3>${g.shared ? '<span class="dash-build-badge">Stock counted once</span>' : g.quantity ? `<span class="dash-build-badge">${n(g.quantity)} to build</span>` : ""}</div>${g.ambiguous ? '<a href="' + e(dashboardLink("/collection/", pack.id)) + '#crafting">Choose a recipe for this build</a>' : g.noRecipe ? "<p>Recipe not recorded. Track this item directly.</p>" : ""}${collectionTiles(g.tiles, id, `build-${g.id}`)}${g.total > g.tiles.length ? `<a href="${e(contextHref(id))}">${g.total - g.tiles.length} more ingredients in Quick collect</a>` : ""}</div>`).join("") : "<p>Choose items to build in Inventory to see their ingredients here.</p>"}${window.truncated || expanded[id] ? expandButton(id) : ""}${expanded[id] ? pager(id, window.total, 5) : ""}${window.groups.length ? '<details class="dash-count-note"><summary>How counts work</summary><p>Each build is estimated separately. Shared totals count inventory once. Do not add the groups together.</p></details>' : ""}`;
      } else if (id === "needed") {
        const list = model.needed.items,
          count = expanded[id] ? 50 : 12;
        const last = Math.max(0, Math.ceil(list.length / count) - 1);
        pages[id] = Math.min(pages[id] || 0, last);
        const start = (pages[id] || 0) * count;
        content.innerHTML = `<label class="dash-inline-options"><input id="dashboard-crafting" type="checkbox"${crafting ? " checked" : ""}>Show crafting options</label>${model.needed.status !== "ok" ? "<p>Counts need a catalog or scope review.</p>" : list.length ? collectionTiles(list.slice(start, start + count), id, "needed") : "<p>No known outstanding items in this scope.</p>"}${list.length > 12 ? expandButton(id) : ""}${expanded[id] ? pager(id, list.length, 50) : ""}<p>Known requirements only. Build ingredients are tracked separately.</p>`;
      } else if (id === "upgrades") {
        const list = model.upgrades,
          sorted = [
            ...list.filter((r) => !r.complete),
            ...list.filter((r) => r.complete),
          ],
          count = expanded[id] ? 50 : 5;
        content.innerHTML = `<p>${list.filter((r) => r.complete).length}/${list.length} listed upgrade families complete</p>${dashboardUpgradeCards(sorted, pack, profile, { limit: count, undo: upgradeUndo })}${list.length > 5 ? expandButton(id) : ""}`;
      } else if (id === "orders") {
        content.innerHTML =
          dashboardOrderCards(model, pack, {
            expanded: expanded[id],
            showCompleted: showCompletedOrders,
          }) + expandButton(id);
        hydrateOrderChecks(content);
        orderDisclosures.apply(activeOrderPageKeys(model.orders));
      } else if (id === "recipes") {
        const list = model.recipes;
        content.innerHTML = dashboardBlueprintCards(list, pack, {
          readonly: model.status !== "ready",
        });
      }
    }
    const weaponRoot = $('[data-dash-content="weapons"]');
    if (!weaponWidget && weaponMetadata)
      weaponWidget = mountDashboardWeapons(weaponRoot, weaponMetadata, {
        onSaved: (value) => {
          armory = value;
          armoryState = value ? "ready" : "absent";
        },
      });
    if (weaponWidget) weaponWidget.paint(armory, armoryState);
    else
      weaponRoot.innerHTML =
        armoryState === "loading"
          ? "<p>Reading existing armory…</p>"
          : '<p>Weapon list unavailable. Open the manual tracker to review your records.</p><a href="' +
            weaponURL() +
            '">Open manual tracker</a>';
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
    upgradeFeedback();
    lock(busy);
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
      if (
        upgradeUndo &&
        (upgradeUndo.packId !== id ||
          upgradeUndo.revision !== profile?.revision ||
          upgradeUndo.overlayTag !== overlayTag)
      )
        upgradeUndo = null;
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
    if (weaponWidget?.dirty()) return;
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
      let saved, latestOverlay;
      try {
        saved = await verifyFoundOperation(op);
        if (isStatusOperation(op))
          latestOverlay = await readDashboardOverlay(op.packId);
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
      if (isStatusOperation(op) && latestOverlay.tag !== op.overlayTag) {
        upgradeUndo = null;
        await refresh({ force: true });
        status(
          "Upgrade status saved. Updated catalog loaded; inventory unchanged.",
        );
        return;
      }
      profile = saved;
      upgradeUndo =
        op.kind === "upgrade" && saved.revision === op.committedRevision
          ? { ...op, revision: saved.revision }
          : null;
      if (isStatusOperation(op))
        upgradeMessage =
          saved.revision === op.committedRevision
            ? `${op.displayName}: status saved. Inventory unchanged.`
            : "Latest saved progress loaded. This action did not change inventory.";
      model = projectDashboard(pack, profile, { crafting });
      render();
      syncPanels();
      status(
        isStatusOperation(op)
          ? "Progress saved. Inventory quantities unchanged."
          : "Found items saved to Inventory.",
      );
      if (
        isStatusOperation(op) &&
        op.intent === upgradeIntent &&
        document.visibilityState !== "hidden" &&
        (document.activeElement === document.body ||
          document.activeElement === op.control ||
          document.activeElement === op.activeElement)
      ) {
        const family = root.querySelector(
          `[data-dash-upgrade-family="${CSS.escape(op.familyId)}"]`,
        );
        (
          (op.kind === "blueprint"
            ? root.querySelector(
                `[data-blueprint-group="${CSS.escape(op.section || "")}"] > summary`,
              )
            : null) ||
          family?.querySelector("[data-dash-upgrade-complete]") ||
          root.querySelector(
            `[data-order-complete="${CSS.escape(op.orderKey || "")}"]`,
          ) ||
          (op.kind === "order"
            ? root.querySelector("[data-order-show-completed]")
            : null) ||
          $("#dashboard-upgrade-feedback")
        ).focus({ preventScroll: true });
      }
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
    review.href = dashboardLink(
      operation.kind === "order"
        ? "/missions/"
        : operation.kind === "upgrade"
          ? "/upgrades/"
          : "/inventory/",
      operation.packId,
    );
    review.target = "_blank";
    review.rel = "noopener noreferrer";
    review.textContent =
      operation.kind === "order"
        ? "Review saved Orders ↗"
        : operation.kind === "upgrade"
          ? "Review saved Upgrades ↗"
          : "Review saved Inventory ↗";
    box.append(" ", review);
  }
  function lock(value) {
    busy = value;
    const blocked =
      value ||
      operation?.state === "committed-unverified" ||
      (isStatusOperation(operation) &&
        operation.state === "failed-before-commit");
    $("#hub-pack").disabled = blocked;
    for (const control of root.querySelectorAll(
      "[data-dash-upgrade-complete]:not([data-dash-upgrade-readonly]), [data-order-complete]:not([data-order-readonly]), [data-dash-blueprint-owned]:not([data-blueprint-readonly])",
    ))
      control.disabled = blocked;
    for (const panel of root.querySelectorAll("[data-dash-detail]"))
      for (const control of panel.querySelectorAll("button,input"))
        control.disabled = blocked;
  }
  function upgradeFeedback() {
    const box = $(
      statusKind === "blueprint"
        ? "#dashboard-blueprint-feedback"
        : statusKind === "order"
          ? "#dashboard-order-feedback"
          : "#dashboard-upgrade-feedback",
    );
    for (const id of [
      "#dashboard-upgrade-feedback",
      "#dashboard-order-feedback",
      "#dashboard-blueprint-feedback",
    ]) {
      const other = $(id);
      if (other !== box && other) other.hidden = true;
    }
    if (!box) return;
    if (
      upgradeUndo &&
      (upgradeUndo.packId !== pack?.id ||
        upgradeUndo.version !== pack?.contentVersion ||
        upgradeUndo.revision !== profile?.revision ||
        upgradeUndo.overlayTag !== overlayTag)
    )
      upgradeUndo = null;
    const failed =
      isStatusOperation(operation) &&
      operation.state === "failed-before-commit";
    const verifying =
      isStatusOperation(operation) &&
      operation.state === "committed-unverified";
    box.hidden = !failed && !verifying && !upgradeMessage;
    box.innerHTML = failed
      ? `<p>Progress was not saved. Your proposed change is retained.</p><button type="button" data-dash-upgrade-action="export">Export unsaved</button><button type="button" data-dash-upgrade-action="retry"${busy ? " disabled" : ""}>Retry save</button><button type="button" data-dash-upgrade-action="reload"${busy ? " disabled" : ""}>Reload saved</button>`
      : verifying
        ? '<p>Progress save needs verification. Do not repeat the change.</p><button type="button" data-dash-upgrade-action="verify">Verify saved update</button>'
        : `<p>${e(upgradeMessage)}</p>${upgradeUndo ? `<button type="button" data-dash-upgrade-action="undo"${busy ? " disabled" : ""}>Undo ${e(upgradeUndo.displayName)}</button>` : ""}`;
  }
  async function saveUpgrade(op) {
    if (busy || weaponWidget?.dirty()) {
      status("Finish the current saved operation before changing an upgrade.");
      return;
    }
    const token = generation;
    lock(true);
    upgradeFeedback();
    try {
      const [current, overlay] = await Promise.all([
        readDashboardProfile(op.packId),
        readDashboardOverlay(op.packId),
      ]);
      if (token !== generation || document.visibilityState === "hidden")
        throw Error(
          "Upgrade change paused by navigation. Review and retry the retained change.",
        );
      if (
        pack.id !== op.packId ||
        pack.contentVersion !== op.version ||
        !current ||
        current.revision !== op.expectedRevision ||
        overlay.tag !== op.overlayTag
      )
        throw Error(
          "Another page or catalog changed this profile. Export the proposal or reload saved progress.",
        );
      await commitFoundOperation(op);
      await verify();
    } catch (reason) {
      if (op.state !== "committed-unverified" && op.state !== "confirmed")
        op.state = "failed-before-commit";
      if (token === generation && document.visibilityState !== "hidden")
        status(reason.message);
    } finally {
      lock(false);
      if (document.visibilityState !== "hidden") upgradeFeedback();
    }
  }
  function changeUpgrade(control) {
    const row = model?.upgrades?.find(
      (r) => r.id === control.dataset.dashUpgradeComplete,
    );
    const wanted = control.checked;
    if (row) control.checked = !!row.ownComplete || row.complete;
    if (!row || control.disabled || model.status !== "ready") return;
    if (dirty()) {
      status(
        "Save or clear your current drafts before changing upgrade progress.",
      );
      return;
    }
    statusKind = "upgrade";
    operation = createUpgradeOperation(
      pack,
      profile,
      row.id,
      wanted ? "completed" : "incomplete",
      { familyId: row.familyId, overlayTag, displayName: row.currentName },
    );
    operation.intent = upgradeIntent;
    operation.control = control;
    operation.activeElement = document.activeElement;
    void saveUpgrade(operation);
  }
  function changeBlueprint(control) {
    const row = model?.recipes?.find(
        (r) => r.id === control.dataset.dashBlueprintOwned,
      ),
      wanted = control.checked;
    if (row) control.checked = row.owned;
    if (!row || row.automatic || control.disabled || model.status !== "ready")
      return;
    if (dirty()) {
      status("Finish or clear current drafts before changing blueprints.");
      return;
    }
    statusKind = "blueprint";
    operation = createBlueprintOperation(pack, profile, row.id, wanted, {
      overlayTag,
      displayName: row.name,
    });
    operation.intent = upgradeIntent;
    operation.control = control;
    operation.activeElement = document.activeElement;
    operation.section = row.section;
    void saveUpgrade(operation);
  }
  function changeOrder(control) {
    const key = control.dataset.orderComplete,
      wanted = control.checked;
    const page = model.orders.find((r) => r.set + "-" + r.page === key);
    const mission = model.orders
      .flatMap((r) => r.rows)
      .find((r) => r.id === key);
    control.checked = page
      ? page.total > 0 && page.done === page.total
      : !!mission?.done;
    control.indeterminate = !!page && page.done > 0 && page.done < page.total;
    if (control.disabled || model.status !== "ready" || dirty()) {
      status("Finish or clear current drafts before changing Orders.");
      return;
    }
    const ids = page ? page.rows.map((r) => r.id) : mission ? [mission.id] : [];
    if (!ids.length) return;
    statusKind = "order";
    operation = createOrderOperation(pack, profile, ids, wanted, {
      key,
      overlayTag,
      displayName: page?.label || mission.name,
    });
    operation.intent = upgradeIntent;
    operation.control = control;
    operation.activeElement = document.activeElement;
    void saveUpgrade(operation);
  }
  async function upgradeAction(action, control) {
    if (action === "verify") {
      await verify();
      return;
    }
    if (action === "export" && isStatusOperation(operation)) {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(operation.candidate)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `dmz-unsaved-${operation.kind}-progress.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    if (
      action === "retry" &&
      isStatusOperation(operation) &&
      operation.state === "failed-before-commit"
    ) {
      await saveUpgrade(operation);
      return;
    }
    if (
      action === "reload" &&
      isStatusOperation(operation) &&
      !busy &&
      operation.state === "failed-before-commit"
    ) {
      if (
        !window.confirm(
          "Discard the unsaved upgrade proposal and reload saved progress? Export it first if needed.",
        )
      )
        return;
      operation = null;
      upgradeUndo = null;
      upgradeMessage = "";
      upgradeFeedback();
      await refresh({ force: true });
      return;
    }
    if (action === "undo" && upgradeUndo && !dirty()) {
      const undo = upgradeUndo;
      if (
        undo.revision !== profile.revision ||
        undo.packId !== pack.id ||
        undo.version !== pack.contentVersion ||
        undo.overlayTag !== overlayTag
      ) {
        upgradeUndo = null;
        upgradeFeedback();
        return;
      }
      operation = createUpgradeOperation(
        pack,
        profile,
        undo.upgradeId,
        undo.before,
        { familyId: undo.familyId, overlayTag, displayName: undo.displayName },
      );
      operation.intent = upgradeIntent;
      operation.control = control;
      operation.activeElement = document.activeElement;
      await saveUpgrade(operation);
    }
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
      (isStatusOperation(operation) &&
        operation.state === "failed-before-commit") ||
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
    if (b.dataset.dashUpgradeAction) {
      void upgradeAction(b.dataset.dashUpgradeAction, b);
      return;
    }
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
    if (event.target.matches("[data-order-show-completed]")) {
      showCompletedOrders = event.target.checked;
      render();
      root
        .querySelector("[data-order-show-completed]")
        ?.focus({ preventScroll: true });
      return;
    }
    const blueprint = event.target.closest("[data-dash-blueprint-owned]");
    if (blueprint) {
      changeBlueprint(blueprint);
      return;
    }
    const order = event.target.closest("[data-order-complete]");
    if (order) {
      changeOrder(order);
      return;
    }
    const upgrade = event.target.closest("[data-dash-upgrade-complete]");
    if (upgrade) {
      changeUpgrade(upgrade);
      return;
    }
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
    upgradeFeedback();
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
        weaponMetadata = validateCamoCatalog(
          await readPublicJSON(
            "/assets/src/ui/weapon-camos.json",
            2097152,
            owner.signal,
          ),
          weapons,
        );
      } catch {
        weapons = [];
        weaponMetadata = null;
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
import { weaponURL } from "../domain/weapon-routes.mjs";
