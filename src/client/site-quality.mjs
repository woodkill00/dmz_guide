import {
  readQualityReviews,
  saveQualityReviews,
} from "../storage/quality-review-store.mjs";
import {
  validateQualityIndex,
  validateQualityLog,
  editQualityReview,
  qualityReviewKey,
  qualityState,
} from "../domain/site-quality.mjs";
import { qualityRow } from "../ui/site-quality-row.mjs";
const $ = (id) => document.getElementById(id),
  key = qualityReviewKey;
const index = validateQualityIndex(JSON.parse($("quality-data").textContent));
let log = { version: 1, entries: [] },
  raw = null,
  offset = 0,
  writable = true,
  staged = null,
  pending = false,
  revision = 0,
  loading = false;
function fail(error) {
  $("quality-error").textContent = error.message || String(error);
  $("quality-error").hidden = false;
}
async function load() {
  if (pending || loading) return;
  loading = true;
  writable = false;
  render();
  try {
    const record = await readQualityReviews();
    raw = null;
    if (record) {
      log = record.value;
      revision = record.revision;
    } else {
      revision = 0;
      raw = localStorage.getItem(key);
      log = raw
        ? validateQualityLog(JSON.parse(raw))
        : { version: 1, entries: [] };
    }
    writable = true;
    $("quality-error").hidden = true;
  } catch (error) {
    writable = false;
    fail(error);
  } finally {
    loading = false;
    render();
  }
}
async function save(candidate) {
  validateQualityLog(candidate);
  if (!writable || pending)
    throw Error("Reviews unavailable or saving. Wait or reload reviews.");
  const expectedRevision = revision;
  pending = true;
  const controls = () =>
    document.querySelectorAll(
      "[data-quality-state],#quality-refresh,#quality-import,#quality-import-apply",
    );
  for (const control of controls()) control.disabled = true;
  try {
    const commit = () => saveQualityReviews(candidate, expectedRevision);
    const saved = navigator.locks?.request
      ? await navigator.locks.request(key, commit)
      : await commit();
    revision = saved.revision;
    log = saved.value;
    raw = null;
  } finally {
    pending = false;
    for (const control of controls()) control.disabled = !writable;
  }
}
function render() {
  const query = $("quality-query").value.trim().toLowerCase();
  const rows = index.entries.filter(
    (row) =>
      (!$("quality-type").value || row.kind === $("quality-type").value) &&
      (!$("quality-field").value || row.field === $("quality-field").value) &&
      (!$("quality-filter").value ||
        qualityState(log, row).state === $("quality-filter").value) &&
      (row.title + " " + row.message + " " + row.packId)
        .toLowerCase()
        .includes(query),
  );
  offset = Math.min(
    offset,
    Math.max(0, Math.ceil(rows.length / 100) - 1) * 100,
  );
  $("quality-rows").innerHTML = rows
    .slice(offset, offset + 100)
    .map(qualityRow)
    .join("");
  for (const row of rows.slice(offset, offset + 100)) {
    const tr = [...$("quality-rows").children].find(
        (n) => n.dataset.qualityId === row.id,
      ),
      review = qualityState(log, row);
    tr.querySelector("select").value = review.state;
    tr.querySelector("select").disabled = !writable || pending;
    tr.querySelector("[data-review-stale]").hidden = !review.stale;
  }
  $("quality-range").textContent =
    `${rows.length ? offset + 1 : 0}–${Math.min(offset + 100, rows.length)} of ${rows.length}`;
  $("quality-prev").disabled = offset === 0;
  $("quality-next").disabled = offset + 100 >= rows.length;
  $("quality-status").textContent =
    `${rows.length} matching gaps · ${index.entries.length} indexed${index.limited ? ` of ${index.eligibleCount} eligible; limited report` : ""}. Checks are editorial, not completed player goals.`;
}
$("quality-rows").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-quality-state]");
  if (!select) return;
  const row = index.entries.find(
    (r) => r.id === select.closest("tr").dataset.qualityId,
  );
  try {
    await save(editQualityReview(log, row, select.value));
  } catch (error) {
    fail(error);
    select.value = qualityState(log, row).state;
  }
});
for (const event of ["input", "change"])
  $("quality-filters").addEventListener(event, () => {
    offset = 0;
    render();
  });
$("quality-filters").addEventListener("submit", (event) => {
  event.preventDefault();
  offset = 0;
  render();
});
$("quality-filters").addEventListener("reset", () =>
  setTimeout(() => {
    offset = 0;
    render();
  }, 0),
);
$("quality-prev").onclick = () => {
  offset = Math.max(0, offset - 100);
  render();
};
$("quality-next").onclick = () => {
  offset += 100;
  render();
};
$("quality-refresh").onclick = load;
$("quality-export").onclick = () => {
  const blob = new Blob([JSON.stringify(log, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "editorial-reviews.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
let importEpoch = 0;
$("quality-import").onchange = async (event) => {
  if (pending) return;
  const epoch = ++importEpoch;
  staged = null;
  $("quality-import-apply").hidden = true;
  try {
    const file = event.target.files[0];
    if (!file || file.size > 524288)
      throw Error("Choose a review log up to512KiB");
    const candidate = validateQualityLog(JSON.parse(await file.text()));
    if (epoch !== importEpoch || pending) return;
    let current = 0,
      stale = 0;
    for (const row of index.entries) {
      const s = qualityState(candidate, row);
      if (s.stale) stale++;
      else if (s.state !== "pending") current++;
    }
    staged = { candidate, raw, revision };
    $("quality-import-status").textContent =
      `Preview: ${current} current checks, ${stale} stale checks; ${candidate.entries.length} notes total. Applying replaces editorial notes only.`;
    $("quality-import-apply").hidden = false;
  } catch (error) {
    if (epoch === importEpoch && !pending) fail(error);
  }
};
$("quality-import-apply").onclick = async () => {
  try {
    if (!staged || staged.raw !== raw || staged.revision !== revision)
      throw Error("Review state changed; preview again");
    const selected = staged;
    await save(selected.candidate);
    if (staged !== selected) return;
    staged = null;
    $("quality-import-apply").hidden = true;
    render();
  } catch (error) {
    fail(error);
  }
};
load();
