import { init, state, esc, error } from "./common.mjs";
import { dataReviewIssues } from "../domain/data-review.mjs";
import { previewSourceImpact } from "../domain/source-impact.mjs";
import { loadRunPlans } from "../domain/run-plans.mjs";
import { parseBounded, LIMITS } from "../content/limits.mjs";
import { validatePack } from "../content/validate.mjs";

const query = document.querySelector("#review-query");
let renderedPack = null;
function render() {
  if (renderedPack !== state.pack?.id) {
    renderedPack = state.pack?.id;
    document.querySelector("#source-impact-file").value = "";
    document.querySelector("#source-impact-status").textContent = "";
    document.querySelector("#source-impact-results").replaceChildren();
  }
  const result = dataReviewIssues(state.pack);
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
  document.querySelector("#review-list").innerHTML = rows.length
    ? `<ul>${rows.map((row) => `<li>${row.type === "claim" ? esc(row.name) : `<a href="/local/?pack=${encodeURIComponent(state.pack.id)}&amp;id=${encodeURIComponent(row.id)}">${esc(row.name)}</a>`} · ${esc(row.reason)} · ${esc(row.type)}</li>`).join("")}</ul>`
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
