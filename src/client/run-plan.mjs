import {
  init,
  state,
  error,
  esc,
  download,
  registerDraftGuard,
} from "./common.mjs";
import {
  addRunPlan,
  evaluateRunReadiness,
  loadRunPlans,
  moveRunPlan,
  saveRunPlans,
  validateRunPlans,
} from "../domain/run-plans.mjs";
import { parseBounded } from "../content/limits.mjs";
import {
  traceRunPrerequisites,
  keyPackingForUses,
  keyUsesForStops,
} from "../domain/run-prerequisites.mjs";
import keyGuide from "../ui/keys.json" with { type: "json" };
import supplementalKeys from "../ui/key-supplemental.json" with { type: "json" };
import keyAccess from "../ui/key-access.json" with { type: "json" };
import { validateRunPlanHandoff } from "../domain/collection-handoff.mjs";
const allKeys = [...keyGuide.keys, ...supplementalKeys.keys];

const $ = (selector) => document.querySelector(selector);
let doc = null;
let loadingFor = null;
let generation = 0;
let saving = false;
const pendingChanges = [];
let initialPlanFocusDone = false;
let importGeneration = 0;
let pendingImport = null;
function clearImport(message = "") {
  importGeneration++;
  pendingImport = null;
  $("#run-plan-restore").hidden = true;
  $("#run-plan-import-status").textContent = message;
}

function focusRequestedPlan() {
  if (initialPlanFocusDone) return;
  initialPlanFocusDone = true;
  const requested = new URL(location.href).searchParams.get("plan");
  if (!requested) return;
  const card = [...document.querySelectorAll("[data-plan-id]")].find(
    (node) => node.dataset.planId === requested,
  );
  card?.scrollIntoView({ block: "start" });
  card?.querySelector("h2")?.setAttribute("tabindex", "-1");
  card?.querySelector("h2")?.focus({ preventScroll: true });
}

function show(message) {
  $("#save-status").textContent = message;
}
function mapHandoff(plan) {
  return validateRunPlanHandoff({
    kind: "dmz-run-plan-handoff",
    version: 1,
    packId: state.pack.id,
    contentVersion: state.pack.contentVersion,
    planId: plan.id,
    name: plan.name,
    createdAt: new Date().toISOString(),
    objectiveIds: plan.objectives
      .filter(
        (ref) =>
          ref.type !== "key" &&
          state.pack.objectives.some(
            (row) => row.id === ref.id && !row.spoiler,
          ),
      )
      .map((ref) => ref.id),
    stops: plan.stops
      .map((id) => state.pack.locations.find((row) => row.id === id))
      .filter((row) => row && !row.spoiler)
      .map((row) => ({ id: row.id, name: row.name })),
  });
}
function sendPlanToMap(plan) {
  const payload = mapHandoff(plan);
  const nonce = crypto.randomUUID();
  const target = window.open(
    `http://127.0.0.1:5175/?tool=explore&run-plan=${nonce}`,
    "_blank",
  );
  if (!target)
    throw Error(
      "Map window blocked. Download the plan and import it on the local map.",
    );
  const handler = (event) => {
    if (
      event.origin !== "http://127.0.0.1:5175" ||
      event.source !== target ||
      event.data?.nonce !== nonce
    )
      return;
    if (event.data?.type === "dmz-run-plan-ready")
      target.postMessage(
        { type: "dmz-run-plan", nonce, plan: payload },
        event.origin,
      );
    if (event.data?.type === "dmz-run-plan-received") {
      window.removeEventListener("message", handler);
      clearTimeout(timeout);
      show(
        "Map received the plan for review. Nothing was applied automatically.",
      );
    }
  };
  window.addEventListener("message", handler);
  const timeout = setTimeout(() => {
    window.removeEventListener("message", handler);
    show(
      "Map handoff timed out. Download the plan and import it on the local map.",
    );
  }, 15000);
  show("Waiting for the local map to review this plan…");
}
function draw() {
  if (!doc || doc.packId !== state.pack?.id) return;
  const readiness = evaluateRunReadiness(
    doc,
    state.profile,
    state.pack.contentVersion,
  );
  const rows = doc.plans.map((plan, index) => {
    const prepared = readiness.rows[index];
    const stock = prepared.reservations
      .map((row) => {
        const item = state.pack.items.find((entry) => entry.id === row.id);
        const label = item?.spoiler
          ? "Spoiler-protected item"
          : item?.name || row.id;
        return `<li>${esc(label)}: ${row.requested.toLocaleString()} reserved · ${row.status === "unknown" ? "Stock unknown or catalog changed" : row.missing ? `${row.missing.toLocaleString()} short` : "Covered"} <button type="button" data-remove-reservation="${esc(row.id)}" aria-label="Remove reservation">Remove</button></li>`;
      })
      .join("");
    const objectiveOptions = state.pack.objectives
      .filter((row) => !row.spoiler)
      .map(
        (row) =>
          `<option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.track || "objective")}</option>`,
      )
      .join("");
    const objectives = plan.objectives
      .map((ref) => {
        const row = state.pack.objectives.find((entry) => entry.id === ref.id);
        const keyUse =
          ref.type === "key"
            ? keyAccess.uses.find((entry) => entry.id === ref.id)
            : null;
        const label =
          (row?.spoiler ? "Spoiler-protected objective" : row?.name) ||
          (keyUse
            ? `${allKeys.find((key) => key.id === keyUse.keyId)?.name || keyUse.keyId} · ${keyUse.locationName}`
            : null) ||
          ref.id;
        return `<li>${esc(label)}${row || keyUse ? "" : " · unavailable in selected catalog"} <button type="button" data-remove-objective="${esc(ref.id)}" aria-label="Remove ${esc(label)} objective">Remove</button></li>`;
      })
      .join("");
    const chain = traceRunPrerequisites(
      state.pack,
      plan.objectives.filter((ref) => ref.type !== "key"),
    );
    const selectedKeyUses = plan.objectives
      .filter((ref) => ref.type === "key")
      .map((ref) => ref.id);
    const stopKeyUses = keyUsesForStops(
      plan.stops.filter((id) =>
        state.pack.locations.some((row) => row.id === id && !row.spoiler),
      ),
      state.pack.locations,
      keyAccess.uses,
    );
    const packedKeys = keyPackingForUses(
      [...selectedKeyUses, ...stopKeyUses.matched],
      keyAccess.uses,
      allKeys,
    );
    const keyOptions =
      '<option value="">Choose a keyed location…</option>' +
      keyAccess.uses
        .map((use) => {
          const key = allKeys.find((row) => row.id === use.keyId);
          return `<option value="${esc(use.id)}">${esc(key?.name || use.keyId)} · ${esc(use.locationName)}</option>`;
        })
        .join("");
    const keyList = packedKeys.keys
      .map(
        (row) =>
          `<li>${esc(row.name)} · ${esc(row.locationNames.join(", "))} · ${esc(row.status)}</li>`,
      )
      .join("");
    const chainNames = new Map(chain.nodes.map((node) => [node.id, node.name]));
    const prerequisiteSummary = chain.nodes
      .filter((node) => node.depth > 0)
      .map(
        (node) =>
          `<li class="run-prerequisite" style="--depth:${Math.min(node.depth, 16)}">${node.quantity ? `${esc(node.quantity)} × ` : ""}${node.type === "item" ? `<a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(node.id)}">${esc(node.name)}</a>` : esc(node.name)} · ${node.type === "unresolved" ? "Catalog link unresolved" : node.type === "recipe" ? (node.ingredientsKnown ? "recorded recipe" : "recipe ingredients unrecorded") : node.type === "uncertain" ? "route choice needed" : node.consumption === "retained" ? "retained tool; availability needed, not consumed" : esc(node.type)}${node.parentId ? ` · for ${esc(chainNames.get(node.parentId) || "recorded prerequisite")}` : ""}</li>`,
      )
      .join("");
    const stopOptions = state.pack.locations
      .filter((row) => !row.spoiler)
      .map((row) => `<option value="${esc(row.id)}">${esc(row.name)}</option>`)
      .join("");
    const stops = plan.stops
      .map((id) => {
        const row = state.pack.locations.find((entry) => entry.id === id);
        const hidden = row?.spoiler;
        const label = hidden ? "Spoiler-protected location" : row?.name || id;
        const keyedRooms =
          row && !hidden
            ? keyAccess.uses.filter(
                (use) =>
                  use.locationName.toLocaleLowerCase() ===
                  row.name.toLocaleLowerCase(),
              ).length
            : 0;
        const mapLink =
          row && !hidden && row.name.length <= 120
            ? ` <a href="http://127.0.0.1:5175/?tool=explore&amp;area=${encodeURIComponent(row.name)}" target="_blank" rel="noopener noreferrer">Check area on map ↗</a>`
            : "";
        return `<li>${esc(label)}${row ? "" : " · unavailable in selected catalog"}${keyedRooms ? ` · ${keyedRooms} recorded keyed room${keyedRooms === 1 ? "" : "s"}; choose the exact room above` : ""} · floor / road access unconfirmed until checked on map${mapLink} <button type="button" data-remove-stop="${esc(id)}" aria-label="Remove stop">Remove</button></li>`;
      })
      .join("");
    return `<article class="panel run-plan-card" data-plan-id="${esc(plan.id)}"><div class="run-plan-heading"><h2>${esc(plan.name)}</h2><span>${esc(plan.date)}</span></div><details><summary>Edit plan name and date</summary><form data-edit-plan-form class="filter-bar"><label>Name<input name="name" maxlength="80" required value="${esc(plan.name)}"></label><label>Date<input name="date" type="date" required value="${esc(plan.date)}"></label><button type="submit">Save plan details</button></form></details><div class="actions"><button type="button" data-move="up" ${index === 0 ? "disabled" : ""}>Move up</button><button type="button" data-move="down" ${index === doc.plans.length - 1 ? "disabled" : ""}>Move down</button><button type="button" data-send-map>Review on map ↗</button><button type="button" data-export-map>Download map handoff</button><button type="button" data-remove-plan>Remove plan</button></div><div class="run-plan-sections"><section><h3>Objectives</h3>${objectives ? `<ul>${objectives}</ul>` : "<p>No objectives selected.</p>"}<form data-objective-form><label>Recorded objective<select name="objective" required>${objectiveOptions}</select></label><button type="submit" ${objectiveOptions ? "" : "disabled"}>Add objective</button></form>${prerequisiteSummary ? `<details><summary>Recorded prerequisites</summary><ul>${prerequisiteSummary}</ul>${chain.truncated ? "<p>More links exist; open the objective for the full record.</p>" : ""}</details>` : ""}<h3>Keys for selected access</h3><form data-key-form><label>Keyed location<select name="keyUse" required>${keyOptions}</select></label><button type="submit">Add key</button></form>${keyList ? `<ul>${keyList}</ul>` : "<p>No keyed access selected.</p>"}${packedKeys.unresolved.length ? "<p>Some key references are unresolved in this catalog.</p>" : ""}${stopKeyUses.ambiguous.length ? `<p>Several sourced key uses match ${esc(stopKeyUses.ambiguous.join(", "))}; select the exact room above.</p>` : ""}${stopKeyUses.unlinked.length ? `<p>No exact sourced key-use link for ${esc(stopKeyUses.unlinked.join(", "))}; select access manually if needed.</p>` : ""}</section><section><h3>Map stops</h3>${stops ? `<ol>${stops}</ol>` : "<p>No stops selected.</p>"}<form data-stop-form><label>Recorded location<select name="stop" required>${stopOptions}</select></label><button type="submit" ${stopOptions ? "" : "disabled"}>Add stop</button></form><p>Locations without verified coordinates remain list-only.</p></section></div><section><h3>Supplies</h3><form data-reservation-form><label>Reserve item<select name="item" required>${state.pack.items
      .filter((item) => !item.spoiler)
      .map(
        (item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Additional amount<input name="amount" type="number" min="1" max="2000000" required value="1"></label><button type="submit">Add reservation</button></form>${stock ? `<ul class="run-plan-reservations">${stock}</ul>` : "<p>No supplies reserved yet.</p>"}</section></article>`;
  });
  $("#run-plan-list").innerHTML =
    rows.join("") ||
    '<section class="panel"><p>No run plans yet. Create one above to start preparing.</p></section>';
  show(
    `${doc.plans.length} saved plan${doc.plans.length === 1 ? "" : "s"}${readiness.stale ? " · catalog changed; review plan references" : ""}`,
  );
}
async function load() {
  const pack = state.pack;
  if (!pack || (loadingFor === pack.id && doc)) return draw();
  const token = ++generation;
  clearImport();
  loadingFor = pack.id;
  doc = null;
  pendingChanges.length = 0;
  show("Loading plans…");
  try {
    const loaded = await loadRunPlans(pack);
    if (token !== generation || state.pack !== pack) return;
    doc = loaded;
    draw();
    focusRequestedPlan();
  } catch (cause) {
    if (token === generation) error(cause);
  }
}
$("#run-plan-export").addEventListener("click", () => {
  if (!doc || saving) return;
  try {
    validateRunPlans(doc);
    download("dmz-run-plans.json", doc);
    $("#run-plan-import-status").textContent =
      "Download requested. Check browser downloads; saved plans are unchanged.";
  } catch (cause) {
    error(cause);
  }
});
$("#run-plan-import").addEventListener("change", async () => {
  clearImport("Checking run-plan backup…");
  const token = importGeneration;
  const file = $("#run-plan-import").files?.[0];
  if (!file) return clearImport();
  try {
    if (file.size > 2_000_000) throw Error("Run-plan backup exceeds 2 MiB");
    const candidate = validateRunPlans(
      parseBounded(await file.text(), 2_000_000),
    );
    if (token !== importGeneration || !doc) return;
    if (
      candidate.packId !== state.pack.id ||
      candidate.contentVersion !== state.pack.contentVersion
    )
      throw Error(
        "Backup catalog or version differs; review and export it in its original catalog",
      );
    pendingImport = {
      candidate,
      packId: state.pack.id,
      revision: doc.revision,
    };
    $("#run-plan-import-status").textContent =
      `Replace ${doc.plans.length} saved plans with ${candidate.plans.length} imported plans? No inventory changes. Confirm explicitly.`;
    $("#run-plan-restore").hidden = false;
  } catch (cause) {
    if (token === importGeneration)
      clearImport(`${cause.message || cause}. Saved plans unchanged.`);
  }
});
$("#run-plan-cancel").addEventListener("click", () => {
  clearImport("Import cancelled. Saved plans unchanged.");
  $("#run-plan-import").value = "";
});
$("#run-plan-restore").addEventListener("click", async () => {
  const pending = pendingImport;
  if (
    !pending ||
    !doc ||
    pending.packId !== state.pack.id ||
    pending.revision !== doc.revision ||
    saving
  )
    return clearImport(
      "Plans changed. Select the backup again before restoring.",
    );
  await change((current) => ({
    ...current,
    plans: structuredClone(pending.candidate.plans),
  }));
  const saved = doc?.revision > pending.revision;
  clearImport(
    saved
      ? "Run plans restored locally; keep the original backup until you verify them."
      : "Restore was not saved. Existing plans retained or recovery is required.",
  );
  $("#run-plan-import").value = "";
});
async function change(transform) {
  if (!doc) return;
  if (saving) {
    if (pendingChanges.length >= 16) {
      show("Too many pending edits. Wait for this save to finish.");
      return;
    }
    pendingChanges.push(transform);
    show("Saving previous edit; next edit queued.");
    return;
  }
  const original = doc;
  let next;
  try {
    next = transform(original);
  } catch (cause) {
    error(cause);
    return;
  }
  saving = true;
  try {
    const saved = await saveRunPlans(next, original.revision);
    if (state.pack?.id !== saved.packId) return;
    doc = saved;
    draw();
  } catch (cause) {
    pendingChanges.length = 0;
    error(cause);
    show("Plan not saved. Reload saved plans before retrying.");
  } finally {
    saving = false;
    const queued = pendingChanges.shift();
    if (queued && state.pack?.id === original.packId) void change(queued);
  }
}
$("#run-plan-create").addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = $("#run-plan-name").value.trim();
  if (!name) return;
  await change((current) =>
    addRunPlan(current, {
      id: crypto.randomUUID(),
      name,
      date: new Date().toISOString().slice(0, 10),
      objectives: [],
      stops: [],
      reservations: {},
    }),
  );
  if (doc?.plans.some((plan) => plan.name === name))
    $("#run-plan-name").value = "";
});
$("#run-plan-list").addEventListener("click", (event) => {
  const card = event.target.closest("[data-plan-id]");
  if (!card) return;
  const id = card.dataset.planId;
  if (event.target.matches("[data-move]"))
    void change((current) =>
      moveRunPlan(current, id, event.target.dataset.move === "up" ? -1 : 1),
    );
  if (event.target.matches("[data-remove-plan]")) {
    const selected = doc?.plans.find((plan) => plan.id === id);
    if (
      selected &&
      confirm(
        `Remove the local plan “${selected.name}”? This does not change your inventory.`,
      )
    )
      void change((current) => ({
        ...current,
        plans: current.plans.filter((plan) => plan.id !== id),
      }));
  }
  if (event.target.matches("[data-send-map]")) {
    const selected = doc?.plans.find((plan) => plan.id === id);
    if (selected)
      try {
        sendPlanToMap(selected);
      } catch (cause) {
        error(cause);
      }
  }
  if (event.target.matches("[data-export-map]")) {
    const selected = doc?.plans.find((plan) => plan.id === id);
    if (selected)
      try {
        download("dmz-run-plan-map-handoff.json", mapHandoff(selected));
        show(
          "Map handoff download requested. Import it in the map and review before accepting.",
        );
      } catch (cause) {
        error(cause);
      }
  }
  if (event.target.matches("[data-remove-objective]")) {
    const target = event.target.dataset.removeObjective;
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === id
          ? {
              ...plan,
              objectives: plan.objectives.filter((ref) => ref.id !== target),
            }
          : plan,
      ),
    }));
  }
  if (event.target.matches("[data-remove-stop]")) {
    const target = event.target.dataset.removeStop;
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === id
          ? { ...plan, stops: plan.stops.filter((stop) => stop !== target) }
          : plan,
      ),
    }));
  }
  if (event.target.matches("[data-remove-reservation]")) {
    const target = event.target.dataset.removeReservation;
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== id) return plan;
        const reservations = { ...plan.reservations };
        delete reservations[target];
        return { ...plan, reservations };
      }),
    }));
  }
});
$("#run-plan-list").addEventListener("submit", (event) => {
  const editForm = event.target.closest("[data-edit-plan-form]");
  if (editForm) {
    event.preventDefault();
    const planId = editForm.closest("[data-plan-id]").dataset.planId;
    const name = editForm.elements.namedItem("name").value.trim();
    const date = editForm.elements.namedItem("date").value;
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId ? { ...plan, name, date } : plan,
      ),
    }));
    return;
  }
  const keyForm = event.target.closest("[data-key-form]");
  if (keyForm) {
    event.preventDefault();
    const id = keyForm.elements.namedItem("keyUse").value;
    if (!keyAccess.uses.some((use) => use.id === id)) return;
    const planId = keyForm.closest("[data-plan-id]").dataset.planId;
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId &&
        !plan.objectives.some((ref) => ref.type === "key" && ref.id === id)
          ? { ...plan, objectives: [...plan.objectives, { type: "key", id }] }
          : plan,
      ),
    }));
    return;
  }
  const objectiveForm = event.target.closest("[data-objective-form]");
  if (objectiveForm) {
    event.preventDefault();
    const id = objectiveForm.elements.namedItem("objective").value;
    const row = state.pack.objectives.find(
      (entry) => entry.id === id && !entry.spoiler,
    );
    if (!row) return;
    const planId = objectiveForm.closest("[data-plan-id]").dataset.planId;
    const type = row.track === "dmz-upgrade" ? "upgrade" : "objective";
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId &&
        !plan.objectives.some((ref) => ref.id === id && ref.type === type)
          ? { ...plan, objectives: [...plan.objectives, { type, id }] }
          : plan,
      ),
    }));
    return;
  }
  const stopForm = event.target.closest("[data-stop-form]");
  if (stopForm) {
    event.preventDefault();
    const id = stopForm.elements.namedItem("stop").value;
    if (!state.pack.locations.some((row) => row.id === id && !row.spoiler))
      return;
    const planId = stopForm.closest("[data-plan-id]").dataset.planId;
    void change((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId && !plan.stops.includes(id)
          ? { ...plan, stops: [...plan.stops, id] }
          : plan,
      ),
    }));
    return;
  }
  const form = event.target.closest("[data-reservation-form]");
  if (!form) return;
  event.preventDefault();
  const card = form.closest("[data-plan-id]");
  const item = form.elements.namedItem("item").value;
  const amount = Number(form.elements.namedItem("amount").value);
  if (
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 2000000 ||
    !state.pack.items.some((row) => row.id === item && !row.spoiler)
  )
    return;
  void change((current) => ({
    ...current,
    plans: current.plans.map((plan) =>
      plan.id === card.dataset.planId
        ? {
            ...plan,
            reservations: {
              ...plan.reservations,
              [item]: Math.min(
                2000000,
                (plan.reservations[item] || 0) + amount,
              ),
            },
          }
        : plan,
    ),
  }));
});
registerDraftGuard({
  isDirty: () => Boolean($("#run-plan-name")?.value.trim()),
});
init(load).catch(error);
