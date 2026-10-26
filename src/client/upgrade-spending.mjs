import { state, $, esc, error, persist, download, status } from "./common.mjs";
import { closeDialog } from "./dialog-focus.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
import {
  recordUpgradePurchase,
  recordSpendingReversal,
  spendingView,
} from "../domain/upgrade-spending.mjs";

const PAGE_SIZE = 50;
let installed = false,
  saving = false,
  pending = null,
  retained = null,
  navigation = 0,
  dialogGeneration = 0,
  historyOffset = 0,
  itemsOffset = 0,
  summaryPack = null,
  hooks = { onSaved: () => {}, isDirty: () => false };
const settingsURL = (pack) => `/settings/?pack=${encodeURIComponent(pack.id)}`;
// Pack objects are immutable admitted snapshots. Cache display indexes rather
// than rebuilding the complete spoiler dictionary for every inventory row.
const displayIndexes = new WeakMap();
function displayIndex(pack) {
  if (!displayIndexes.has(pack))
    displayIndexes.set(pack, {
      objectives: new Map(pack.objectives.map((r) => [r.id, r])),
      guards: new Map(),
    });
  return displayIndexes.get(pack);
}
function guardFor(pack = state.pack, profile = state.profile) {
  const index = displayIndex(pack);
  if (!index.guards.has(profile.spoilers))
    index.guards.set(profile.spoilers, spoilerGuard(pack, profile.spoilers));
  return index.guards.get(profile.spoilers);
}
const safeMessage = (reason) => {
  const message = reason.message || String(reason);
  return state.pack && state.profile ? guardFor().text(message) : message;
};
const report = (reason) => error(new Error(safeMessage(reason)));
const pageStart = (offset, length) =>
  Math.min(
    Math.max(0, offset),
    Math.max(0, Math.ceil(length / PAGE_SIZE) - 1) * PAGE_SIZE,
  );
const amount = (value) => esc(value);
const rowKey = (row) => JSON.stringify([row.itemId, row.kind, row.unit]);

export function spendingActions(pack, profile, upgradeId) {
  const upgrade = displayIndex(pack).objectives.get(upgradeId);
  if (!upgrade || upgrade.track !== "dmz-upgrade") return "";
  if (
    (!profile.spoilers && upgrade.spoiler) ||
    guardFor(pack, profile).contains(upgradeId)
  )
    return "<p>Reveal spoilers to inspect purchase recording for protected content.</p>";
  if (profile.schemaVersion !== 3)
    return `<p>Spending is not recorded in this older profile. <a href="${esc(settingsURL(pack))}">Preview and confirm spending-history migration in Settings</a>. Historical completion will not invent past spending.</p>`;
  return `<button type="button" data-upgrade-spend="${esc(upgradeId)}">Record in-game purchase…</button><p>Preview a one-time deduction from saved pre-purchase stock. If stock was already adjusted, use the manual completion control for a status-only correction (no spending recorded).</p>`;
}

function pager(kind, offset, total, noun) {
  return `<p id="spend-${kind}-status" tabindex="-1" role="status">Showing ${total ? offset + 1 : 0}–${Math.min(offset + PAGE_SIZE, total)} of ${total} visible ${noun}.</p><div class="draft-actions"><button type="button" id="spend-${kind}-previous"${offset === 0 ? " disabled" : ""}>Previous ${noun}</button><button type="button" id="spend-${kind}-next"${offset + PAGE_SIZE >= total ? " disabled" : ""}>Next ${noun}</button></div>`;
}
function totalsMarkup(view) {
  return `<dl><dt>Net recorded material units (non-currency count)</dt><dd data-spend-metric="materials-net">${amount(view.materials.net)}</dd><dt>Gross recorded material units</dt><dd data-spend-metric="materials-gross">${amount(view.materials.gross)}</dd><dt>Reversed recorded material units</dt><dd data-spend-metric="materials-reversed">${amount(view.materials.reversed)}</dd></dl>`;
}

function recoveryMarkup() {
  return retained
    ? '<section id="upgrade-spend-recovery" class="notice" tabindex="-1"><h3>Spending candidate retained for reconciliation</h3><p>The old preview cannot be applied after navigation or another saved change. Check the current saved history before replacing or recording anything; a save interrupted by navigation may already have committed. Export its private candidate for explicit reconciliation, or discard it. Nothing is retried automatically.</p><button type="button" data-spend-recovery-export>Export unsaved spending candidate</button><button type="button" data-spend-recovery-discard>Discard unsaved spending candidate</button></section>'
    : "";
}

export function renderSpendingSummary() {
  const root = $("#upgrade-spending-summary");
  if (!root || !state.pack || !state.profile) return;
  if (pending && !saving && !isCurrent(pending)) invalidate();
  if (summaryPack !== state.pack.id) {
    summaryPack = state.pack.id;
    historyOffset = itemsOffset = 0;
  }
  const view = spendingView(state.pack, state.profile),
    guard = guardFor();
  const rows = [...view.items, ...view.currencies];
  const history = [...view.history].reverse();
  itemsOffset = pageStart(itemsOffset, rows.length);
  historyOffset = pageStart(historyOffset, history.length);
  root.setAttribute("tabindex", "-1");
  if (!history.length && !rows.length) {
    root.innerHTML = `<h2 id="upgrade-spending-title" tabindex="-1">Recorded usage / spending</h2><p>No visible spending recorded. Earlier spending is not recorded. Older completions and manual stock edits do not reconstruct lifetime gameplay spending.</p><dl><dt>Net recorded item units</dt><dd data-spend-metric="materials-net">0</dd><dt>Gross recorded item units</dt><dd data-spend-metric="materials-gross">0</dd><dt>Reversed item units</dt><dd data-spend-metric="materials-reversed">0</dd></dl><p>Count-unit materials only; currencies stay separate. Net = gross − reversed.</p>${view.partial ? '<p class="notice">Some private history is omitted to protect spoilers. Zero here covers visible records only; reveal spoilers to inspect the full private history.</p>' : ""}${state.profile.schemaVersion !== 3 ? `<p><a href="${esc(settingsURL(state.pack))}">Preview spending-history migration in Settings</a>. Past spending remains unrecorded.</p>` : ""}${recoveryMarkup()}`;
    return;
  }
  root.innerHTML = `<h2 id="upgrade-spending-title" tabindex="-1">Recorded usage / spending</h2><p>Net = gross recorded purchases − recorded reversals. These are private guide records, not lifetime gameplay totals. Zero recorded usage does not mean nothing was spent in the game. Old or manually completed upgrades and gaps in imported backups are spending not recorded; inventory edits never add spending.</p>${view.partial ? '<p class="notice">Some private history is omitted to protect spoilers. These totals cover visible records only; reveal spoilers to inspect the full private history.</p>' : ""}${state.profile.schemaVersion !== 3 ? `<p><a href="${esc(settingsURL(state.pack))}">Preview spending-history migration in Settings</a>. Migration creates no historical purchases.</p>` : ""}${totalsMarkup(view)}<h3>Per-item and separate currency totals</h3><p>Only non-currency count units enter the overall material counter. Each currency identity and every other resource unit stays separate; amounts with different units are never added together.</p><ul class="source-list">${
    rows
      .slice(itemsOffset, itemsOffset + PAGE_SIZE)
      .map(
        (row) =>
          `<li ${row.kind === "currency" ? "data-spend-currency" : "data-spend-item"}="${esc(row.itemId)}"><h4>${esc(row.name)}</h4><p>${row.kind === "currency" ? "Separate currency" : "Material / resource"} · ${esc(row.kind)} · ${esc(row.unit)}</p><dl><dt>Net recorded</dt><dd data-spend-amount="net">${amount(row.net)}</dd><dt>Gross recorded</dt><dd data-spend-amount="gross">${amount(row.gross)}</dd><dt>Reversed recorded</dt><dd data-spend-amount="reversed">${amount(row.reversed)}</dd></dl></li>`,
      )
      .join("") ||
    "<li>No visible recorded usage. This does not reconstruct past gameplay spending.</li>"
  }</ul>${pager("items", itemsOffset, rows.length, "item / currency identities")}<h3>Private recorded history</h3><p>Newest guide entries first; dates are recording times, not gameplay capture times. A reversal corrects this guide, not the game. Only the latest unreversed purchase can be considered, and its affected stock and progress must still match.</p><ol class="source-list">${
    history
      .slice(historyOffset, historyOffset + PAGE_SIZE)
      .map(
        (entry) =>
          `<li data-spend-event="${esc(entry.id)}"><h4>${esc(entry.upgradeName)}</h4><p>${entry.kind === "purchase" ? (entry.reversed ? "Recorded purchase · reversed in the guide" : "Recorded purchase") : "Bookkeeping reversal · not a game refund"} · <time datetime="${esc(entry.recordedAt)}">${esc(entry.recordedAt)}</time></p>${entry.kind === "purchase" ? `<p>Recorded content version: ${esc(guard.text(entry.contentVersion))}</p>${entry.id === view.latestPurchaseId && !entry.reversed ? `<button type="button" data-upgrade-reverse="${esc(entry.id)}">Reverse latest guide entry…</button>` : ""}` : ""}</li>`,
      )
      .join("") || "<li>No visible spending history recorded.</li>"
  }</ol>${pager("history", historyOffset, history.length, "history entries")}${recoveryMarkup()}`;
}

function ensureDialog() {
  let dialog = $("#upgrade-spend-confirm");
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.id = "upgrade-spend-confirm";
  dialog.className = "panel";
  dialog.setAttribute("aria-labelledby", "upgrade-spend-title");
  dialog.setAttribute("aria-describedby", "upgrade-spend-purpose");
  dialog.innerHTML = `<h2 id="upgrade-spend-title" tabindex="-1"></h2><p id="upgrade-spend-purpose"></p><div id="upgrade-spend-details"></div><label id="upgrade-spend-ack-label"><input id="upgrade-spend-ack" type="checkbox">My saved stock is from before this purchase; these costs have not already been deducted.</label><p id="upgrade-spend-result" role="alert"></p><div class="draft-actions"><button type="button" id="upgrade-spend-apply">Confirm purchase record</button><button type="button" id="upgrade-spend-cancel" class="secondary">Cancel</button><button type="button" id="upgrade-spend-status-only" class="secondary">Use status-only correction (no spending recorded)</button><button type="button" id="upgrade-spend-export" class="secondary" hidden>Export unsaved spending candidate</button></div>`;
  document.querySelector("main").append(dialog);
  return dialog;
}
function setBusy(value) {
  for (const id of [
    "upgrade-spend-apply",
    "upgrade-spend-cancel",
    "upgrade-spend-status-only",
    "upgrade-spend-export",
    "upgrade-spend-ack",
  ])
    $(`#${id}`).disabled = value;
  if (!value)
    $("#upgrade-spend-apply").disabled =
      !pending ||
      (pending.kind === "purchase" && !$("#upgrade-spend-ack").checked);
}
function isCurrent(target) {
  return (
    !state.loading &&
    target.navigation === navigation &&
    target.pack === state.pack &&
    target.packId === state.pack?.id &&
    target.contentVersion === state.pack.contentVersion &&
    target.revision === state.revision &&
    target.revision === state.profile.revision &&
    target.baseline === JSON.stringify(state.profile)
  );
}
function focusTarget(target, correction = false) {
  const selector = correction
    ? `[data-upgrade-id="${CSS.escape(target.upgradeId)}"][data-upgrade-field="completion"]`
    : target.kind === "purchase"
      ? `[data-upgrade-spend="${CSS.escape(target.upgradeId)}"]`
      : `[data-upgrade-reverse="${CSS.escape(target.purchaseId)}"]`;
  const origin = document.querySelector(selector);
  (origin && !origin.disabled
    ? origin
    : $("#upgrade-spending-title") || $("#upgrade-spending-summary")
  )?.focus();
}
function dismiss({
  restoreFocus = true,
  correction = false,
  retainFailure = false,
} = {}) {
  const target = pending,
    revision = state.revision,
    token = ++dialogGeneration;
  if (retainFailure && target?.failed) retained = target.candidate;
  pending = null;
  closeDialog(
    ensureDialog(),
    restoreFocus && target
      ? () => {
          if (
            token === dialogGeneration &&
            !pending &&
            target.navigation === navigation &&
            state.pack?.id === target.packId &&
            state.pack.contentVersion === target.contentVersion &&
            state.revision === revision &&
            !state.loading
          )
            focusTarget(target, correction);
        }
      : undefined,
  );
  $("#upgrade-spend-details").textContent = "";
  $("#upgrade-spend-purpose").textContent = "";
  $("#upgrade-spend-title").textContent = "";
  $("#upgrade-spend-result").textContent = "";
  $("#upgrade-spend-ack").checked = false;
  $("#upgrade-spend-export").hidden = true;
  setBusy(saving);
}
function invalidate() {
  navigation++;
  dismiss({ restoreFocus: false, retainFailure: true });
}
function changeTotals(before, after) {
  const current = new Map(
    [...before.items, ...before.currencies].map((row) => [rowKey(row), row]),
  );
  const changed = [...after.items, ...after.currencies].filter((row) => {
    const old = current.get(rowKey(row));
    return (
      !old ||
      old.net !== row.net ||
      old.gross !== row.gross ||
      old.reversed !== row.reversed
    );
  });
  return `<h3>Recorded counter change</h3><p>Material count units: net ${amount(before.materials.net)} → ${amount(after.materials.net)}; gross ${amount(before.materials.gross)} → ${amount(after.materials.gross)}; reversed ${amount(before.materials.reversed)} → ${amount(after.materials.reversed)}.</p><ul>${changed
    .map((row) => {
      const old = current.get(rowKey(row)) || { net: 0, gross: 0, reversed: 0 };
      return `<li>${esc(row.name)} (${esc(row.kind)}, ${esc(row.unit)}): net ${amount(old.net)} → ${amount(row.net)}; gross ${amount(old.gross)} → ${amount(row.gross)}; reversed ${amount(old.reversed)} → ${amount(row.reversed)}.</li>`;
    })
    .join("")}</ul>`;
}
function showPreview(target) {
  const purchase = target.kind === "purchase",
    snapshot = target.snapshot,
    guard = guardFor();
  const before = spendingView(state.pack, state.profile),
    after = spendingView(state.pack, target.candidate);
  $("#upgrade-spend-title").textContent = purchase
    ? "Record an in-game upgrade purchase"
    : "Reverse the latest guide purchase entry";
  $("#upgrade-spend-purpose").textContent = purchase
    ? "This records a purchase you say already occurred in the game. Confirm only against saved pre-purchase stock. It does not buy, unlock, synchronize with or verify anything in the game."
    : "This corrects the guide only; it is not a refund in the game. It restores the original recorded stock and progress only while the affected current values still match. Matching values do not prove there was no intervening gameplay.";
  const progress = purchase ? snapshot.afterProgress : snapshot.beforeProgress;
  $("#upgrade-spend-details").innerHTML =
    `<h3>${esc(guard.text(snapshot.upgradeName))}</h3><p>Selected catalog: ${esc(guard.text(state.pack.title))}. Saved revision ${target.revision}. Original recorded costs are shown below${purchase ? "" : "; current catalog costs are not used"}.</p><ul class="source-list">${snapshot.costs.map((row) => `<li data-spend-preview-item="${esc(row.itemId)}"><h4>${esc(guard.text(row.name))}</h4><p>${esc(row.kind)} · ${esc(row.unit)}</p><dl><dt>${purchase ? "Saved stock before" : "Matching current stock"}</dt><dd>${amount(purchase ? row.before : row.after)}</dd><dt>${purchase ? "Deduct from saved stock" : "Restore in the guide only"}</dt><dd>${amount(row.consumed)}</dd><dt>${purchase ? "Stock after recording" : "Original stock restored"}</dt><dd>${amount(purchase ? row.after : row.before)}</dd><dt>Retained floor in the purchase snapshot</dt><dd>${amount(row.retained)}</dd><dt>Protected reserve in the purchase snapshot</dt><dd>${amount(row.reserve)}</dd></dl></li>`).join("")}</ul><p>Resulting upgrade progress: ${progress ? `${esc(progress.completion)} / availability ${esc(progress.availability)}${progress.reviewRequired ? " · review required" : ""}` : "No saved entry (unknown); original absence is restored"}. Reserves, goals, routes and watch pins stay unchanged.</p>${target.warnings.length ? `<ul class="notice">${target.warnings.map((warning) => `<li>${esc(guard.text(warning))}</li>`).join("")}</ul>` : ""}${before.partial || after.partial ? '<p class="notice">Counter changes cover visible private records only. Some history is omitted to protect spoilers; no hidden amounts are included.</p>' : ""}${changeTotals(before, after)}<p>${purchase ? "Reserves cannot be overridden here. Cancel, edit and save stock or reserves separately, then make a new preview. If these costs were already deducted, choose status-only correction instead." : "If stock or progress no longer matches, cancel and reconcile those fields manually. An ordinary status correction never refunds items."}</p>`;
  $("#upgrade-spend-ack-label").hidden = !purchase;
  $("#upgrade-spend-ack").checked = false;
  $("#upgrade-spend-status-only").hidden = !purchase;
  $("#upgrade-spend-apply").textContent = purchase
    ? "Confirm purchase record"
    : "Confirm guide reversal";
  $("#upgrade-spend-result").textContent = "";
  $("#upgrade-spend-export").hidden = true;
  setBusy(false);
  dialogGeneration++;
  const dialog = ensureDialog();
  dialog.showModal();
  $("#upgrade-spend-title").focus();
  dialog.scrollTop = 0;
}
function stage(kind, id) {
  if (saving || state.saving || state.loading || pending) return;
  if (retained) {
    report(
      new Error(
        "Export or discard the retained unsaved spending candidate before another preview.",
      ),
    );
    $("#upgrade-spend-recovery")?.focus();
    return;
  }
  if (hooks.isDirty()) {
    report(
      new Error(
        "Unsaved inventory edits: save or cancel them before recording spending. They have not been saved by this action.",
      ),
    );
    return;
  }
  try {
    if (state.profile.schemaVersion !== 3)
      throw new Error(
        "Preview and confirm spending-history migration in Settings before recording purchases.",
      );
    const options = {
      operationId: `spend:${crypto.randomUUID()}`,
      recordedAt: new Date().toISOString(),
      expectedRevision: state.revision,
    };
    let snapshot;
    if (kind === "reversal") {
      const view = spendingView(state.pack, state.profile);
      snapshot = view.history.find(
        (entry) => entry.kind === "purchase" && entry.id === id,
      );
      if (!snapshot || view.latestPurchaseId !== id)
        throw new Error(
          "The latest purchase is unavailable in this protected view. Reveal spoilers or review the current history before reversing a guide entry.",
        );
    }
    const transition =
      kind === "purchase"
        ? recordUpgradePurchase(state.pack, state.profile, id, options)
        : recordSpendingReversal(state.profile, id, options);
    if (!transition.changed) {
      status(
        "This operation is already recorded. No stock or history was changed.",
      );
      return;
    }
    pending = {
      kind,
      options,
      pack: state.pack,
      packId: state.pack.id,
      contentVersion: state.pack.contentVersion,
      revision: state.revision,
      navigation,
      baseline: JSON.stringify(state.profile),
      candidate: transition.candidate,
      candidateJSON: JSON.stringify(transition.candidate),
      warnings: transition.warnings || [],
      snapshot: snapshot || transition.event,
      upgradeId: kind === "purchase" ? id : snapshot.upgradeId,
      purchaseId: kind === "reversal" ? id : transition.event.id,
      failed: false,
    };
    showPreview(pending);
  } catch (reason) {
    if (pending) dismiss({ restoreFocus: false });
    report(reason);
  }
}
async function apply() {
  if (saving || state.saving || !pending) return;
  const target = pending;
  if (target.kind === "purchase" && !$("#upgrade-spend-ack").checked) {
    $("#upgrade-spend-result").textContent =
      "Acknowledge that saved stock predates this purchase, or use status-only correction instead.";
    $("#upgrade-spend-ack").focus();
    return;
  }
  if (!isCurrent(target) || hooks.isDirty()) {
    dismiss({ retainFailure: true });
    renderSpendingSummary();
    report(
      new Error(
        "Spending preview expired or inventory edits changed. Review the current saved stock and make a new preview; no operation was retried.",
      ),
    );
    return;
  }
  try {
    const checked =
      target.kind === "purchase"
        ? recordUpgradePurchase(
            state.pack,
            state.profile,
            target.upgradeId,
            target.options,
          )
        : recordSpendingReversal(
            state.profile,
            target.purchaseId,
            target.options,
          );
    if (JSON.stringify(checked.candidate) !== target.candidateJSON)
      throw new Error(
        "Spending preview changed. Cancel and inspect a new preview before confirming.",
      );
    saving = true;
    setBusy(true);
    const saved = await persist(target.candidate);
    if (pending !== target || target.navigation !== navigation) {
      saving = false;
      if (!saved) retained = target.candidate;
      renderSpendingSummary();
      return;
    }
    if (saved) {
      try {
        await hooks.onSaved();
        renderSpendingSummary();
      } finally {
        saving = false;
        dismiss();
      }
    } else {
      saving = false;
      setBusy(false);
      target.failed = true;
      $("#upgrade-spend-result").textContent =
        `Not saved. ${safeMessage($("#error")?.textContent || "Storage did not accept the change.")} Committed stock, completion, history and the previous snapshot are unchanged. Export this separate candidate before cancelling or leaving. Nothing will retry automatically; a retry here uses the same operation ID and revision.`;
      $("#upgrade-spend-export").hidden = false;
      $("#upgrade-spend-export").focus();
    }
  } catch (reason) {
    saving = false;
    setBusy(false);
    if (pending === target)
      $("#upgrade-spend-result").textContent = safeMessage(reason);
    else report(reason);
  }
}

export function installSpending({
  onSaved = () => {},
  isDirty = () => false,
} = {}) {
  hooks = { onSaved, isDirty };
  if (installed) return;
  installed = true;
  const dialog = ensureDialog();
  $("#upgrade-spend-ack").addEventListener("change", () => {
    if (!saving && !state.saving) setBusy(false);
  });
  $("#upgrade-spend-apply").addEventListener("click", apply);
  $("#upgrade-spend-cancel").addEventListener("click", () => {
    if (!saving && !state.saving) dismiss();
  });
  $("#upgrade-spend-status-only").addEventListener("click", () => {
    if (!saving && !state.saving) dismiss({ correction: true });
  });
  $("#upgrade-spend-export").addEventListener("click", () => {
    if (!saving && !state.saving && pending?.failed)
      download("dmz-unsaved-spending-candidate.json", pending.candidate);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (!saving && !state.saving) dismiss();
  });
  dialog.addEventListener("close", () => {
    if (pending && !saving && !dialog.open) dismiss();
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("button");
    if (!button || button.disabled || saving || state.saving) return;
    if (button.hasAttribute("data-upgrade-spend"))
      stage("purchase", button.dataset.upgradeSpend);
    else if (button.hasAttribute("data-upgrade-reverse"))
      stage("reversal", button.dataset.upgradeReverse);
    else if (button.hasAttribute("data-spend-recovery-export") && retained)
      download("dmz-unsaved-spending-candidate.json", retained);
    else if (button.hasAttribute("data-spend-recovery-discard")) {
      retained = null;
      renderSpendingSummary();
      $("#upgrade-spending-title")?.focus();
    } else if (/^spend-(items|history)-(previous|next)$/.test(button.id)) {
      const [, kind, direction] = button.id.match(
        /^spend-(items|history)-(previous|next)$/,
      );
      const change = direction === "next" ? PAGE_SIZE : -PAGE_SIZE;
      if (kind === "items") itemsOffset += change;
      else historyOffset += change;
      renderSpendingSummary();
      $(`#spend-${kind}-status`)?.focus();
    }
  });
  document.addEventListener("pack-changing", invalidate);
  document.addEventListener("profile-saved", () => {
    if (pending && !saving) {
      invalidate();
      renderSpendingSummary();
    }
  });
  $("#pack-select")?.addEventListener(
    "change",
    () => {
      if (
        !saving &&
        !state.saving &&
        $("#pack-select").value !== state.pack?.id
      )
        invalidate();
    },
    true,
  );
  window.addEventListener("popstate", invalidate);
  window.addEventListener("pagehide", invalidate);
  window.addEventListener("pageshow", () => {
    if (!state.loading) renderSpendingSummary();
  });
  window.addEventListener("beforeunload", (event) => {
    if (retained || pending?.failed) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
}
