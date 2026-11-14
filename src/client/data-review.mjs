import { init, state, esc, error } from "./common.mjs";
import { dataReviewIssues } from "../domain/data-review.mjs";
import { previewSourceImpact } from "../domain/source-impact.mjs";
import { loadRunPlans } from "../domain/run-plans.mjs";
import { parseBounded, LIMITS } from "../content/limits.mjs";
import { validatePack } from "../content/validate.mjs";
import {
  missionAuditTargets,
  validateMissionAudit,
} from "../domain/mission-audit.mjs";
import { contentHealth } from "../domain/content-health.mjs";
import { sourceClaimChanges } from "../domain/source-change-review.mjs";

const query = document.querySelector("#review-query");
let renderedPack = null;
let claimQueue = [];
const rejectedClaims = new Set();
function renderClaimQueue() {
  const descriptor = state.catalogs.find((row) => row.id === state.pack.id);
  const packKey = descriptor?.path.match(/\/([a-z0-9-]+)\.json$/)?.[1];
  const visible = claimQueue.filter((row) => !rejectedClaims.has(row.id));
  document.querySelector("#source-change-status").textContent =
    `${visible.length} proposed claim changes · ${rejectedClaims.size} rejected in this preview. Catalog and private progress unchanged.`;
  document.querySelector("#source-change-results").innerHTML = visible.length
    ? `<ul>${visible
        .map((row) => {
          const oldValue = JSON.stringify(row.oldValue);
          const newValue = JSON.stringify(row.newValue);
          const edit =
            packKey && row.state !== "added"
              ? `http://127.0.0.1:4174/?${new URLSearchParams({ packKey, packId: state.pack.id, id: row.id, intent: "edit" })}`
              : "http://127.0.0.1:4174/";
          return `<li><strong>${esc(row.field)}</strong> · ${esc(row.state)} · ${esc(row.entityId)}<br>Current: ${esc(oldValue)} (${esc(row.oldStatus || "none")}) → proposed: ${esc(newValue)} (${esc(row.newStatus || "none")})<br>${esc(row.applicability)} · ${esc(row.sourceDate || "source date unknown")} ${row.citation ? `<a href="${esc(row.citation)}" target="_blank" rel="noopener noreferrer">Citation</a>` : "Citation unavailable"}<br><a href="${esc(edit)}" rel="noreferrer">Review and apply in Studio</a> <button type="button" data-reject-claim="${esc(row.id)}">Reject this proposal</button></li>`;
        })
        .join("")}</ul>`
    : "<p>No pending claim changes in this preview.</p>";
}
document
  .querySelector("#source-change-results")
  .addEventListener("click", (event) => {
    const button = event.target.closest("[data-reject-claim]");
    if (!button) return;
    rejectedClaims.add(button.dataset.rejectClaim);
    renderClaimQueue();
  });
function render() {
  if (renderedPack !== state.pack?.id) {
    renderedPack = state.pack?.id;
    document.querySelector("#source-impact-file").value = "";
    document.querySelector("#source-impact-status").textContent = "";
    document.querySelector("#source-impact-results").replaceChildren();
    claimQueue = [];
    rejectedClaims.clear();
    renderClaimQueue();
  }
  const result = dataReviewIssues(state.pack);
  const auditTargets = missionAuditTargets(state.pack);
  const unrecorded = auditTargets.filter(
    (target) => target.kind === "page" && !target.recorded,
  ).length;
  let auditText = `${unrecorded} of 24 scoped Orders pages unrecorded · ${auditTargets.filter((target) => target.kind === "mission").length / 9} recorded mission/story entries.`;
  let auditDoc = null;
  try {
    const raw = localStorage.getItem(`dmz:mission-audit:v1:${state.pack.id}`);
    if (raw) {
      const saved = validateMissionAudit(JSON.parse(raw), state.pack.id);
      auditDoc = saved;
      const current = new Map(
        auditTargets.map((target) => [target.id, target]),
      );
      const pending = saved.entries.filter(
        (entry) => entry.state === "fill-later" && current.has(entry.id),
      ).length;
      const stale = saved.entries.filter(
        (entry) =>
          current.get(entry.id)?.sourceFingerprint !== entry.sourceFingerprint,
      ).length;
      auditText += ` ${pending} sections marked Fill later · ${stale} stale review entries.`;
    } else auditText += " No local section review saved.";
  } catch {
    auditText += " Local audit unavailable; saved data was not changed.";
  }
  document.querySelector("#mission-audit-health").textContent = auditText;
  document.querySelector("#content-health-rows").innerHTML =
    `<ul>${contentHealth(state.pack, auditDoc)
      .map(
        (row) =>
          `<li>${esc(row.label)}: ${row.listed ? `<strong>${row.covered} / ${row.listed}</strong> listed · ${row.missing} not covered within listed records` : "None recorded in this catalog"}</li>`,
      )
      .join("")}</ul>`;
  const needle = query.value.trim().toLocaleLowerCase();
  const rows = result.issues.filter(
    (row) =>
      !needle ||
      `${row.name} ${row.reason} ${row.type}`
        .toLocaleLowerCase()
        .includes(needle),
  );
  document.querySelector("#review-count").textContent =
    `${rows.length} visible issues${result.truncated ? " · first 500 catalog issues only" : ""}`;
  const descriptor = state.catalogs.find((row) => row.id === state.pack.id);
  const packKey = descriptor?.path.match(/\/([a-z0-9-]+)\.json$/)?.[1];
  const edit = (row) =>
    packKey && row.type !== "claim"
      ? `<a href="${esc(`http://127.0.0.1:4174/?${new URLSearchParams({ packKey, packId: state.pack.id, id: row.id, intent: "edit" })}`)}" rel="noreferrer">Edit in Studio</a>`
      : "";
  document.querySelector("#review-list").innerHTML = rows.length
    ? `<ul>${rows.map((row) => `<li>${row.type === "claim" ? esc(row.name) : `<a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(row.id)}">${esc(row.name)}</a>`} · ${esc(row.reason)} · ${esc(row.type)} ${edit(row)}</li>`).join("")}</ul>`
    : "<p>No matching issues in this catalog. This does not certify complete game coverage.</p>";
}
query.addEventListener("input", render);
document
  .querySelector("#source-impact-check")
  .addEventListener("click", async () => {
    const status = document.querySelector("#source-impact-status");
    const results = document.querySelector("#source-impact-results");
    const selected = state.pack;
    results.replaceChildren();
    claimQueue = [];
    rejectedClaims.clear();
    renderClaimQueue();
    try {
      const file = document.querySelector("#source-impact-file").files?.[0];
      if (!file) throw Error("Choose a catalog JSON file first.");
      if (file.size > LIMITS.packBytes)
        throw Error("Catalog file exceeds the 8 MiB preview limit.");
      status.textContent = "Checking candidate catalog locally…";
      const candidate = parseBounded(await file.text(), LIMITS.packBytes);
      const schemaResponse = await fetch("/assets/schemas/pack.schema.json");
      if (!schemaResponse.ok) throw Error("Catalog schema unavailable.");
      validatePack(candidate, await schemaResponse.json());
      if (state.pack !== selected)
        throw Error("Selected catalog changed; choose the file again.");
      const plans = await loadRunPlans(selected);
      if (state.pack !== selected)
        throw Error("Selected catalog changed; choose the file again.");
      const impact = previewSourceImpact(selected, candidate, plans);
      claimQueue = sourceClaimChanges(selected, candidate).changes;
      renderClaimQueue();
      const affected = impact.filter((row) => row.changes.length);
      status.textContent = `${plans.plans.length} saved plans checked · ${affected.length} affected. No catalog or plan was changed.`;
      results.innerHTML = affected.length
        ? `<ul>${affected
            .map((row) => {
              const plan = plans.plans.find((item) => item.id === row.planId);
              return `<li><a href="/run-plan/?pack=${encodeURIComponent(selected.id)}&amp;plan=${encodeURIComponent(row.planId)}">${esc(plan?.name || row.planId)}</a><ul>${row.changes.map((change) => `<li>${esc(change.state)} · ${esc(change.id)}</li>`).join("")}</ul></li>`;
            })
            .join("")}</ul>`
        : "<p>No saved plan references differ between these catalogs. This does not verify the candidate's game facts.</p>";
    } catch (reason) {
      if (state.pack !== selected) return;
      status.textContent = reason.message || String(reason);
    }
  });
init(render).catch(error);
