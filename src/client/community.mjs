import { init, state, $, esc, error, download } from "./common.mjs";
import { allRecords, publicTitle } from "../ui/render.mjs";
import {
  validateCorrection,
  parseCorrection,
  validateReview,
  discordURL,
} from "../domain/corrections.mjs";
let draft = null,
  review = null,
  generation = 0;
const get = (id) => $("#" + id).value;
function current() {
  const record = allRecords([state.pack]).find(
    (r) => r.id === get("correction-record"),
  );
  const value = record?.[get("correction-field")];
  $("#correction-current").value = record?.spoiler
    ? "Spoiler-protected value: review privately before proposing a change."
    : value === undefined
      ? "Unknown"
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
}
function clear() {
  draft = null;
  review = null;
  $("#correction-preview").hidden = true;
  $("#review-stage").hidden = true;
}
function render() {
  generation++;
  clear();
  $("#correction-record").innerHTML = allRecords([state.pack])
    .map((r) => `<option value="${esc(r.id)}">${esc(publicTitle(r))}</option>`)
    .join("");
  current();
}
$("#correction-record").addEventListener("change", current);
$("#correction-field").addEventListener("change", current);
$("#correction-form").addEventListener("input", () => {
  draft = null;
  $("#correction-preview").hidden = true;
});
$("#correction-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    draft = validateCorrection({
      schemaVersion: 1,
      packId: state.pack.id,
      contentVersion: state.pack.contentVersion,
      entityId: get("correction-record"),
      field: get("correction-field"),
      currentValue: get("correction-current"),
      proposedValue: get("correction-proposed"),
      reason: get("correction-reason"),
      evidenceUrl: get("correction-evidence"),
      attribution: get("correction-attribution"),
      rights: get("correction-rights"),
    });
    $("#correction-json").textContent = JSON.stringify(draft, null, 2);
    $("#correction-preview").hidden = false;
    $("#export-correction").focus();
  } catch (reason) {
    error(reason);
  }
});
$("#export-correction").addEventListener("click", () => {
  try {
    if (
      !draft ||
      draft.packId !== state.pack.id ||
      draft.contentVersion !== state.pack.contentVersion
    )
      throw new Error("Preview expired. Review again.");
    download("dmz-correction.json", validateCorrection(draft));
  } catch (reason) {
    error(reason);
  }
});
$("#cancel-correction").addEventListener("click", () => {
  draft = null;
  $("#correction-preview").hidden = true;
  $("#correction-proposed").focus();
});
$("#review-file").addEventListener("change", async (event) => {
  const token = ++generation;
  review = null;
  $("#review-stage").hidden = true;
  $("#error").hidden = true;
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 262144) throw new Error("Correction exceeds 256 KiB");
    const candidate = parseCorrection(await file.text());
    if (token !== generation) return;
    review = candidate;
    $("#review-decision").value = "needs-evidence";
    $("#review-notes").value = "";
    const record = allRecords([state.pack]).find(
      (r) => r.id === candidate.entityId,
    );
    const actual = record?.[candidate.field];
    const mismatch =
      candidate.packId !== state.pack.id ||
      candidate.contentVersion !== state.pack.contentVersion ||
      !record;
    $("#review-context").textContent =
      (mismatch
        ? "MISMATCH: selected pack/version/record differs. No automatic apply. "
        : "Matching selected pack/version. ") +
      `Current selected field: ${record?.spoiler ? "Spoiler-protected" : actual === undefined ? "Unknown" : JSON.stringify(actual)}. Compare the proposed packet below.`;
    $("#review-json").textContent = JSON.stringify(candidate, null, 2);
    $("#review-stage").hidden = false;
    $("#review-decision").focus();
  } catch (reason) {
    if (token === generation) error(reason);
  }
});
$("#review-form").addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    if (!review) throw new Error("Import a correction first");
    download(
      "dmz-reviewed-correction.json",
      validateReview({
        schemaVersion: 1,
        correction: review,
        decision: get("review-decision"),
        reviewer: get("reviewer"),
        notes: get("review-notes"),
      }),
    );
  } catch (reason) {
    error(reason);
  }
});
$("#cancel-review").addEventListener("click", () => {
  generation++;
  review = null;
  $("#review-stage").hidden = true;
  $("#review-file").value = "";
  $("#review-file").focus();
});
document.addEventListener("pack-changing", () => {
  generation++;
  clear();
});
init(render)
  .then(async () => {
    try {
      const response = await fetch("/assets/content/site.json");
      if (!response.ok) throw new Error("Community configuration unavailable");
      const config = await response.json();
      const url = discordURL(config.discordInvite);
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.rel = "noopener noreferrer";
        a.textContent = "Open owner-configured Discord invite";
        $("#discord-status").replaceChildren(a);
      }
    } catch (reason) {
      $("#discord-status").textContent =
        "Discord unavailable: " + reason.message;
    }
  })
  .catch(error);
