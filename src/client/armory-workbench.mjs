import {
  emptyArmory,
  validateArmory,
  validateBuild,
  validateObservation,
  buildIssues,
  attachmentAdvice,
  slotKey,
  baseComparison,
  comparePrivateObservations,
  parseArmoryBackup,
  parseSharedBuild,
} from "../domain/armory-workspace.mjs";
import { readArmory, saveArmory } from "../storage/armory-store.mjs";
import { normalizeRaster, decodeRaster } from "./raster-editor.mjs";
import {
  base64FromBytes,
  bytesFromBase64,
  hashBytes,
} from "../content/portable.mjs";
const { db, refs, metrics } = JSON.parse(
  document.querySelector("#armory-public-data").textContent,
);
const $ = (s) => document.querySelector(s),
  e = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const today = () => new Date().toISOString().slice(0, 10),
  newId = () => crypto.randomUUID();
const name = (id) =>
  db.weapons.find((w) => w.id === id)?.name || `Archived weapon: ${id}`;
let workspace = emptyArmory(),
  previous = null,
  unsaved = null,
  ready = false,
  pending = false,
  loading = false,
  loadEpoch = 0,
  loadJob = null,
  restoreReading = false,
  generation = 0,
  activeBuildId = newId(),
  selectedAttachments = [],
  sharedPreview = null,
  sharedGeneration = 0,
  corruptStored = null,
  restorePreview = null,
  restoreJob = null,
  pictureJob = null;
const dirtyForms = new Set();
const status = (message) => {
  $("#armory-status").textContent = message;
};
const failure = (error) => {
  $("#armory-error").hidden = false;
  $("#armory-error").textContent = error.message || String(error);
};
function controls() {
  document.querySelector("main").dataset.armoryBusy = String(
    pending || loading,
  );
  document.querySelector("main").dataset.armoryRevision = String(
    workspace.revision,
  );
  document.querySelectorAll("[data-private-controls]").forEach((n) => {
    n.disabled = !ready || pending || loading;
  });
}
function invalidatePreview() {
  generation++;
  if (restorePreview) {
    $("#workspace-preview").textContent =
      "Draft changed. Prepare a fresh restore preview before applying.";
    $("#workspace-import-apply").hidden = true;
    restorePreview = null;
  }
}
document.addEventListener("input", (event) => {
  if (event.target.closest("#build-form,#evidence-form,#acquisition"))
    invalidatePreview();
  const form = event.target.closest("#build-form,#evidence-form");
  if (form) dirtyForms.add(form.id);
});
function download(filename, value) {
  const bytes = JSON.stringify(value, null, 2),
    blob = new Blob([bytes], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function mutate(change) {
  if (!ready || pending || loading)
    throw new Error("Wait for private storage to finish.");
  if (unsaved)
    throw new Error(
      "An unsaved candidate is retained. Export it, then retry or reload from Backups before another write.",
    );
  const candidate = structuredClone(workspace);
  change(candidate);
  validateArmory(candidate);
  unsaved = candidate;
  pending = true;
  controls();
  try {
    const saved = await saveArmory(candidate, workspace.revision);
    previous = workspace;
    workspace = saved;
    unsaved = null;
    invalidatePreview();
    status(`Saved privately · revision ${workspace.revision}. No upload.`);
    $("#armory-error").hidden = true;
    renderPrivate();
    return saved;
  } finally {
    pending = false;
    controls();
  }
}
async function inspectImages(value, signal) {
  const deadline = performance.now() + 20000;
  for (const o of value.observations) {
    if (signal.aborted || performance.now() >= deadline)
      throw new Error("Restore preparation cancelled or timed out");
    if (o.image) {
      const bytes = bytesFromBase64(o.image.base64);
      await decodeRaster(bytes, "image/png", signal, deadline);
      if ((await hashBytes(bytes)) !== o.image.sha256)
        throw new Error("Evidence picture hash mismatch");
    }
  }
  if (signal.aborted || performance.now() >= deadline)
    throw new Error("Restore preparation cancelled or timed out");
}
async function prepareRestore(candidate) {
  if (pending || loading)
    throw new Error(
      "Wait for the current private operation before preparing a restore.",
    );
  if (unsaved)
    throw new Error(
      "Export/retry/reload the retained unsaved candidate before preparing a restore.",
    );
  validateArmory(candidate);
  cancelRestore();
  const controller = new AbortController(),
    token = ++generation,
    revision = workspace.revision;
  restoreJob = controller;
  $("#workspace-import-cancel").hidden = false;
  status("Validating private backup and image pixels…");
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    await Promise.race([
      inspectImages(candidate, controller.signal),
      new Promise((_, reject) =>
        controller.signal.addEventListener(
          "abort",
          () => reject(new Error("Restore preparation cancelled or timed out")),
          { once: true },
        ),
      ),
    ]);
    if (
      controller.signal.aborted ||
      token !== generation ||
      revision !== workspace.revision
    )
      throw new Error("Restore preview became stale; prepare it again.");
    restorePreview = { candidate, revision, token };
    $("#workspace-preview").hidden = false;
    $("#workspace-preview").textContent =
      `Review restore: ${candidate.builds.length} builds, ${candidate.observations.length} observations, ${Object.keys(candidate.acquisition).length} tracked weapons. This replaces this private workspace; its previous snapshot is retained. Captured revision ${revision}.`;
    $("#workspace-import-apply").hidden = false;
    status("Backup validated. Review the counts and apply explicitly.");
  } finally {
    clearTimeout(timer);
    if (restoreJob === controller) restoreJob = null;
  }
}
function cancelRestore() {
  restoreJob?.abort();
  restoreJob = null;
  restorePreview = null;
  restoreReading = false;
  generation++;
  $("#workspace-import-apply").hidden = true;
  $("#workspace-preview").hidden = true;
  $("#workspace-import-cancel").hidden = true;
}
window.addEventListener("pagehide", () => {
  generation++;
  sharedGeneration++;
  loadEpoch++;
  loadJob?.abort();
  restoreJob?.abort();
  pictureJob?.abort();
});
window.addEventListener("beforeunload", (event) => {
  if (
    unsaved ||
    pending ||
    pictureJob ||
    restoreJob ||
    restoreReading ||
    dirtyForms.size
  ) {
    event.preventDefault();
    event.returnValue = "";
  }
});

function table(headers, rows) {
  return `<div class="armory-table-wrap" role="region" aria-label="Weapon comparison" tabindex="0"><table class="armory-table"><thead><tr>${headers.map((h) => `<th scope="col">${e(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, i) => (i ? `<td>${cell}</td>` : `<th scope="row">${cell}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function compare() {
  const ids = [
      ...document.querySelectorAll("#comparison-weapons input:checked"),
    ].map((n) => n.value),
    mode = $("#compare-mode").value,
    metric = $("#compare-metric").value;
  if (ids.length < 2 || ids.length > 4) {
    $("#comparison-result").textContent =
      "Choose two to four different weapons.";
    $("#comparison-observations").replaceChildren();
    return;
  }
  if (mode === "dmz") {
    const old = Object.fromEntries(
      [...document.querySelectorAll("[data-observation-choice]")].map((n) => [
        n.dataset.observationChoice,
        n.value,
      ]),
    );
    $("#comparison-observations").innerHTML = ids
      .map(
        (id) =>
          `<label>${e(name(id))} observation<select data-observation-choice="${e(id)}"><option value="">Choose explicitly</option>${workspace.observations
            .filter(
              (o) => o.weapon === id && o.metric === metric && o.mode === "dmz",
            )
            .map(
              (o) =>
                `<option value="${e(o.id)}" ${old[id] === o.id ? "selected" : ""}>${e(o.date + " · " + o.build + " · " + o.target + " · " + o.value + " " + o.unit)}</option>`,
            )
            .join("")}</select></label>`,
      )
      .join("");
    const selected = Object.fromEntries(
        [...document.querySelectorAll("[data-observation-choice]")].map((n) => [
          n.dataset.observationChoice,
          n.value,
        ]),
      ),
      result = comparePrivateObservations(workspace, ids, metric, selected);
    $("#comparison-result").innerHTML =
      `<p class="notice">${e(result.reason)}</p>` +
      (result.comparable
        ? table(
            ["Metric", ...ids.map(name)],
            [
              [
                e(metrics.find((m) => m.id === metric)?.name || metric),
                ...result.rows.map(
                  (o) => `${e(o.value)} ${e(o.unit)} · ${e(o.status)}`,
                ),
              ],
            ],
          )
        : result.rows
            .map(
              (o) =>
                `<p>${e(name(o.weapon))}: individual evidence ${e(o.value)} ${e(o.unit)} · ${e(o.build)} · ${e(o.target)} · ${e(o.armor)} · ${e(o.rangeMeters ?? "unknown")} m · ${e(o.firingMode)} · ${e(o.loadoutContext)} · ${e(o.method)}</p>`,
            )
            .join(""));
    return;
  }
  $("#comparison-observations").replaceChildren();
  const rows = baseComparison(db, ids, mode);
  $("#comparison-result").innerHTML =
    `<p class="notice">${mode === "launch" ? "Official shared launch sheet · " + e(db.sources["official-launch"].date) : "Community Multiplayer measurements · unverified · " + e(db.sources["community-stats"].date)}. Different units remain explicit; no winner or combined-build prediction.</p>` +
    table(
      ["Metric", ...ids.map(name)],
      rows.map((r) => [
        e(r.label),
        ...r.cells.map((c) =>
          c.value === null
            ? e(c.status)
            : `${e(c.value)} ${e(c.unit)}<br><small>${e(c.status)}</small>`,
        ),
      ]),
    );
}
$("#compare-mode").addEventListener("change", compare);
$("#compare-metric").addEventListener("change", compare);
$("#comparison-weapons").addEventListener("change", compare);
$("#comparison-observations").addEventListener("change", compare);
function formBuild() {
  const form = $("#build-form");
  return {
    id: activeBuildId,
    name: form.elements.namedItem("name").value.trim() || "Untitled build",
    weapon: form.elements.namedItem("weapon").value,
    attachments: [...selectedAttachments],
    notes: form.elements.namedItem("notes").value.trim(),
    updatedAt: today(),
  };
}
function buildPickers() {
  const weapon = $("#build-weapon").value,
    choices = db.attachments.filter((a) => a.weapons.includes(weapon)),
    owned = workspace.acquisition[weapon]?.attachments || [];
  const slots = [...new Set(choices.map((a) => a.slot))].sort();
  $("#build-pickers").innerHTML = slots
    .map(
      (slot) =>
        `<label>${e(slot)}<select data-build-slot="${e(slot)}"><option value="">None</option>${choices
          .filter((a) => a.slot === slot)
          .map(
            (a) =>
              `<option value="${e(a.id)}" ${selectedAttachments.includes(a.id) ? "selected" : ""}>${e(a.name)}${owned.includes(a.id) ? " · acquired" : ""}</option>`,
          )
          .join("")}</select></label>`,
    )
    .join("");
  const missing = selectedAttachments.filter(
    (id) => !choices.some((a) => a.id === id),
  );
  if (missing.length)
    $("#build-pickers").insertAdjacentHTML(
      "beforeend",
      missing
        .map(
          (id) =>
            `<p>Archived/incompatible attachment: ${e(id)} <button type="button" data-remove-build-attachment="${e(id)}">Remove</button></p>`,
        )
        .join(""),
    );
  buildAdvice();
}
function buildAdvice() {
  const build = formBuild(),
    issues = buildIssues(db, build);
  $("#build-validation").textContent = issues.length
    ? issues.join(" ")
    : `Legal planning template · ${selectedAttachments.length} selected. Verify current in-game rules.`;
  $("#build-advice").innerHTML =
    selectedAttachments
      .map((id) => {
        const a = db.attachments.find((a) => a.id === id);
        if (!a)
          return `<p>Archived attachment ${e(id)}: no current report.</p>`;
        const advice = attachmentAdvice(db, build.weapon, id);
        return `<article class="panel compact-armory-card"><h4>${e(a.name)}</h4><p>${e(a.about || "Reported attachment")} · ${e(a.slot)} · ${e(a.kind)}</p><p>${e(a.unlock)}</p><ul>${advice.length ? advice.map((v) => `<li>${e(v.text)}</li>`).join("") : "<li>No quantified effect reported; this is not zero effect.</li>"}</ul><p>Per-weapon community multipliers · uncertain mode · no verified stacking. ${a.sources.map((s) => `<a href="${e(db.sources[s].url)}" target="_blank" rel="noopener noreferrer">${e(s)}</a>`).join(" · ")}</p></article>`;
      })
      .join("") ||
    "<p>Select an attachment to see its sourced benefits and tradeoffs.</p>";
}
$("#build-pickers").addEventListener("change", (event) => {
  const select = event.target.closest("[data-build-slot]");
  if (!select) return;
  const old = selectedAttachments.filter(
    (id) =>
      db.attachments.find((a) => a.id === id)?.slot !==
      select.dataset.buildSlot,
  );
  selectedAttachments = select.value ? [...old, select.value] : old;
  buildAdvice();
});
$("#build-pickers").addEventListener("click", (event) => {
  const b = event.target.closest("[data-remove-build-attachment]");
  if (b) {
    selectedAttachments = selectedAttachments.filter(
      (id) => id !== b.dataset.removeBuildAttachment,
    );
    invalidatePreview();
    buildPickers();
  }
});
let previousWeapon = $("#build-weapon").value;
$("#build-weapon").addEventListener("change", () => {
  if (
    selectedAttachments.length &&
    !confirm(
      "Changing weapon clears the unsaved attachment selection. Continue?",
    )
  ) {
    $("#build-weapon").value = previousWeapon;
    return;
  }
  selectedAttachments = [];
  previousWeapon = $("#build-weapon").value;
  buildPickers();
});
function loadBuild(build) {
  activeBuildId = build.id;
  const select = $("#build-weapon");
  if (![...select.options].some((o) => o.value === build.weapon)) {
    const option = new Option(`Archived weapon: ${build.weapon}`, build.weapon);
    select.add(option);
  }
  select.value = build.weapon;
  previousWeapon = build.weapon;
  $("#build-form [name=name]").value = build.name;
  $("#build-form [name=notes]").value = build.notes;
  selectedAttachments = [...build.attachments];
  invalidatePreview();
  buildPickers();
}
$("#build-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const build = validateBuild(formBuild()),
      issues = buildIssues(db, build);
    if (issues.length) throw new Error(issues.join(" "));
    await mutate((v) => {
      const i = v.builds.findIndex((b) => b.id === build.id);
      if (i < 0) v.builds.push(build);
      else v.builds[i] = build;
    });
    dirtyForms.delete("build-form");
  } catch (error) {
    failure(error);
  }
});
$("#build-new").addEventListener("click", () =>
  loadBuild({
    id: newId(),
    weapon: db.weapons[0].id,
    name: "",
    notes: "",
    attachments: [],
  }),
);
$("#build-export").addEventListener("click", () => {
  try {
    download("armory-build.json", {
      format: "dmz-armory-build",
      version: 1,
      build: validateBuild(formBuild()),
    });
  } catch (error) {
    failure(error);
  }
});
$("#build-import").addEventListener("change", async (event) => {
  const token = ++sharedGeneration;
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 16384) throw new Error("Shared build exceeds16KiB");
    const imported = parseSharedBuild(await file.text());
    if (token !== sharedGeneration) return;
    sharedPreview = imported;
    $("#build-import-preview").hidden = false;
    $("#build-import-preview").textContent =
      `Review ${sharedPreview.name}: ${name(sharedPreview.weapon)}, ${sharedPreview.attachments.length} attachments. ${buildIssues(db, sharedPreview).join(" ") || "Legal template."} Use as an unsaved draft; existing records are retained.`;
    $("#build-import-use").hidden = false;
    $("#build-import-cancel").hidden = false;
  } catch (error) {
    if (token !== sharedGeneration) return;
    sharedPreview = null;
    failure(error);
  }
});
$("#build-import-use").addEventListener("click", () => {
  if (sharedPreview) {
    loadBuild({ ...sharedPreview, id: newId() });
    dirtyForms.add("build-form");
    sharedPreview = null;
    $("#build-import-preview").hidden = true;
    $("#build-import-use").hidden = true;
    $("#build-import-cancel").hidden = true;
  }
});
$("#build-import-cancel").addEventListener("click", () => {
  sharedGeneration++;
  sharedPreview = null;
  $("#build-import-preview").hidden = true;
  $("#build-import-use").hidden = true;
  $("#build-import-cancel").hidden = true;
});
$("#saved-builds").addEventListener("click", async (event) => {
  const b = event.target.closest("[data-build-action]");
  if (!b) return;
  const build = workspace.builds.find((v) => v.id === b.dataset.id);
  if (!build) return;
  if (b.dataset.buildAction === "load") loadBuild(build);
  else if (
    confirm(`Delete saved build ${build.name}? The prior snapshot is retained.`)
  ) {
    try {
      await mutate((v) => {
        v.builds = v.builds.filter((x) => x.id !== build.id);
      });
    } catch (error) {
      failure(error);
    }
  }
});

$("#evidence-form [name=date]").value = today();
$("#evidence-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (pictureJob) return;
  const capturedGeneration = generation,
    capturedRevision = workspace.revision,
    f = new FormData(event.target),
    metric = metrics.find((m) => m.id === f.get("metric")),
    controller = new AbortController();
  pictureJob = controller;
  $("#cancel-evidence").hidden = false;
  try {
    let image = null;
    const file = f.get("picture");
    if (file?.size) {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Screenshot exceeds2MiB");
      status("Preparing private screenshot; original metadata is removed…");
      const normalized = await normalizeRaster(
        new Uint8Array(await file.arrayBuffer()),
        { signal: controller.signal, maxDimension: 1024 },
      );
      image = {
        base64: base64FromBytes(normalized.bytes),
        mime: "image/png",
        width: normalized.width,
        height: normalized.height,
        sha256: normalized.sha256,
      };
    }
    if (
      controller.signal.aborted ||
      capturedGeneration !== generation ||
      capturedRevision !== workspace.revision
    )
      throw new Error(
        "Picture preparation cancelled or draft changed; retry with current fields",
      );
    const o = validateObservation({
      id: newId(),
      weapon: String(f.get("weapon")),
      metric: metric.id,
      unit: metric.unit,
      value: Number(f.get("value")),
      mode: String(f.get("mode")),
      build: String(f.get("build")).trim(),
      date: String(f.get("date")),
      target: String(f.get("target")).trim(),
      armor: String(f.get("armor")).trim(),
      rangeMeters:
        f.get("rangeMeters") === "" ? null : Number(f.get("rangeMeters")),
      method: String(f.get("method")).trim(),
      firingMode: String(f.get("firingMode")).trim(),
      loadoutContext: String(f.get("loadoutContext")).trim(),
      status: String(f.get("status")),
      image,
    });
    await mutate((v) => v.observations.push(o));
    dirtyForms.delete("evidence-form");
    $("#evidence-form [name=picture]").value = "";
  } catch (error) {
    failure(error);
  } finally {
    pictureJob = null;
    $("#cancel-evidence").hidden = true;
  }
});
$("#cancel-evidence").addEventListener("click", () => pictureJob?.abort());
$("#observation-list").addEventListener("click", async (event) => {
  const b = event.target.closest("[data-remove-observation]");
  if (
    b &&
    confirm(
      "Remove this private observation? The previous workspace snapshot is retained.",
    )
  )
    try {
      await mutate((v) => {
        v.observations = v.observations.filter(
          (o) => o.id !== b.dataset.removeObservation,
        );
      });
    } catch (error) {
      failure(error);
    }
});

const tracked = () =>
  workspace.acquisition[$("#tracker-weapon").value] || {
    manual: false,
    attachments: [],
    blueprints: [],
  };
function tracker() {
  const weapon = $("#tracker-weapon").value,
    entry = tracked(),
    term = $("#tracker-search").value.trim().toLowerCase(),
    all = db.attachments.filter((a) => a.weapons.includes(weapon)),
    matches = all.filter((a) =>
      (a.name + " " + a.slot).toLowerCase().includes(term),
    );
  $("#tracker-manual").checked = entry.manual;
  $("#tracker-attachments").innerHTML = matches
    .map(
      (a) =>
        `<label><input type="checkbox" data-owned-attachment="${e(a.id)}" ${entry.attachments.includes(a.id) ? "checked" : ""}>${e(a.name)} <small>${e(a.slot)}</small></label>`,
    )
    .join("");
  $("#tracker-count").textContent =
    `${entry.attachments.length} acquired records · ${matches.length} of ${all.length} attachments shown`;
  $("#blueprint-list").innerHTML = entry.blueprints
    .map(
      (b, i) =>
        `<p>${e(b)} <button type="button" data-blueprint-remove="${i}">Remove blueprint</button></p>`,
    )
    .join("");
  const weaponName = name(weapon),
    related = refs.filter(
      (r) =>
        r.text.includes("mw4:" + weapon) ||
        new RegExp(
          "(^|[^a-z0-9])" +
            weaponName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            "([^a-z0-9]|$)",
          "i",
        ).test(r.text),
    );
  $("#acquisition-links").innerHTML =
    `<p><a href="https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide" target="_blank" rel="noopener noreferrer">Official DMZ acquisition / Gunsmith guide</a> · <a href="/maps/">Map references</a></p>${related.length ? `<ul>${related.map((r) => `<li><a href="${e(r.url)}">${e(r.name)}</a> · ${e(r.type)} · ${e(r.scope)}</li>`).join("")}</ul>` : "<p>No sourced weapon-specific mission or location link is established in this checkout. Generic map access does not promise a manual drop.</p>"}`;
  const archived = Object.keys(workspace.acquisition).filter(
      (id) => !db.weapons.some((w) => w.id === id),
    ),
    missing = entry.attachments.filter((id) => !all.some((a) => a.id === id));
  $("#archived-references").textContent = [
    archived.length
      ? `Archived tracked weapons retained in backup: ${archived.join(", ")}`
      : "",
    missing.length
      ? `Archived owned attachments retained: ${missing.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
$("#tracker-weapon").addEventListener("change", tracker);
$("#tracker-search").addEventListener("input", tracker);
$("#tracker-manual").addEventListener("change", async (event) => {
  const weapon = $("#tracker-weapon").value,
    manual = event.target.checked;
  try {
    await mutate((v) => {
      v.acquisition[weapon] = { ...tracked(), manual };
    });
  } catch (error) {
    failure(error);
    event.target.checked = !manual;
  }
});
$("#tracker-attachments").addEventListener("change", async (event) => {
  const c = event.target.closest("[data-owned-attachment]");
  if (!c) return;
  const weapon = $("#tracker-weapon").value,
    id = c.dataset.ownedAttachment,
    checked = c.checked;
  try {
    await mutate((v) => {
      const entry = structuredClone(tracked());
      entry.attachments = checked
        ? [...new Set([...entry.attachments, id])]
        : entry.attachments.filter((x) => x !== id);
      v.acquisition[weapon] = entry;
    });
  } catch (error) {
    failure(error);
    c.checked = !checked;
  }
});
$("#blueprint-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = event.target.elements.blueprint,
    value = input.value.trim(),
    weapon = $("#tracker-weapon").value;
  try {
    await mutate((v) => {
      const entry = structuredClone(tracked());
      if (
        !entry.blueprints.some((b) => b.toLowerCase() === value.toLowerCase())
      )
        entry.blueprints.push(value);
      v.acquisition[weapon] = entry;
    });
    input.value = "";
  } catch (error) {
    failure(error);
  }
});
$("#blueprint-list").addEventListener("click", async (event) => {
  const b = event.target.closest("[data-blueprint-remove]");
  if (b)
    try {
      const weapon = $("#tracker-weapon").value,
        index = Number(b.dataset.blueprintRemove);
      await mutate((v) => {
        const entry = structuredClone(tracked());
        entry.blueprints.splice(index, 1);
        v.acquisition[weapon] = entry;
      });
    } catch (error) {
      failure(error);
    }
});

function resetDraftForms() {
  $("#build-form").reset();
  $("#evidence-form").reset();
  $("#evidence-form [name=date]").value = today();
  activeBuildId = newId();
  selectedAttachments = [];
  previousWeapon = $("#build-weapon").value;
  dirtyForms.clear();
  buildPickers();
}
function renderPrivate() {
  const focus = document.activeElement?.dataset.ownedAttachment;
  $("#saved-builds").innerHTML =
    workspace.builds
      .map(
        (b) =>
          `<article class="compact-armory-card"><strong>${e(b.name)}</strong> · ${e(name(b.weapon))} · ${b.attachments.length} attachments ${buildIssues(db, b).length ? "<span>Needs compatibility review</span>" : ""}<div class="armory-actions"><button type="button" data-build-action="load" data-id="${e(b.id)}">Load / rename</button><button type="button" data-build-action="delete" data-id="${e(b.id)}">Delete</button></div></article>`,
      )
      .join("") || "<p>No saved builds yet.</p>";
  $("#observation-list").innerHTML =
    workspace.observations
      .map(
        (o) =>
          `<article class="panel compact-armory-card"><h3>${e(name(o.weapon))} · ${e(metrics.find((m) => m.id === o.metric)?.name || o.metric)}</h3><p>${e(o.value)} ${e(o.unit)} · ${e(o.mode)} · ${e(o.build)} · ${e(o.date)} · ${e(o.status)} (user reported)</p><p>${e(o.target)} · armor: ${e(o.armor || "not recorded")} · range: ${e(o.rangeMeters ?? "unknown")} m · ${e(o.firingMode)} · ${e(o.loadoutContext)}</p><p>${e(o.method)}</p>${o.image ? `<img class="armory-evidence-picture" src="data:image/png;base64,${e(o.image.base64)}" width="${o.image.width}" height="${o.image.height}" alt="Private measurement evidence for ${e(name(o.weapon))}">` : ""}<button type="button" data-remove-observation="${e(o.id)}">Remove observation</button></article>`,
      )
      .join("") ||
    "<p>No private observations. Nothing here claims an in-game test was performed.</p>";
  tracker();
  buildAdvice();
  compare();
  if (focus)
    document
      .querySelector(`[data-owned-attachment="${CSS.escape(focus)}"]`)
      ?.focus({ preventScroll: true });
}
$("#workspace-export").addEventListener("click", () =>
  download("private-armory-backup.json", {
    format: "dmz-armory-backup",
    version: 1,
    workspace: corruptStored || workspace,
  }),
);
$("#workspace-unsaved").addEventListener("click", () =>
  download("private-armory-unsaved.json", {
    format: "dmz-armory-backup",
    version: 1,
    workspace: unsaved || workspace,
  }),
);
async function load() {
  if (pending || loading)
    throw new Error("Wait for the current private operation before reload.");
  loading = true;
  controls();
  const epoch = ++loadEpoch,
    capturedGeneration = generation,
    capturedRevision = workspace.revision,
    controller = new AbortController();
  loadJob = controller;
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const record = await readArmory();
    if (
      epoch !== loadEpoch ||
      capturedGeneration !== generation ||
      capturedRevision !== workspace.revision
    )
      throw new Error("Reload became stale; saved data was not replaced.");
    previous = record.previous;
    try {
      validateArmory(record.value);
      await Promise.race([
        inspectImages(record.value, controller.signal),
        new Promise((_, reject) =>
          controller.signal.addEventListener(
            "abort",
            () =>
              reject(
                new Error("Stored evidence validation cancelled or timed out"),
              ),
            { once: true },
          ),
        ),
      ]);
    } catch (error) {
      if (epoch === loadEpoch && capturedGeneration === generation) {
        corruptStored = record.value;
        if (Number.isSafeInteger(record.value?.revision))
          workspace.revision = record.value.revision;
        ready = false;
      }
      throw error;
    }
    if (
      epoch !== loadEpoch ||
      capturedGeneration !== generation ||
      capturedRevision !== workspace.revision ||
      controller.signal.aborted
    )
      throw new Error("Reload became stale; saved data was not replaced.");
    workspace = record.value;
    resetDraftForms();
    corruptStored = null;
    ready = true;
    unsaved = null;
    dirtyForms.clear();
    renderPrivate();
    status(`Private workspace ready · revision ${workspace.revision}.`);
  } finally {
    clearTimeout(timer);
    if (loadJob === controller) loadJob = null;
    loading = false;
    controls();
  }
}
$("#workspace-retry").addEventListener("click", async () => {
  try {
    if (!unsaved || pending || loading)
      throw new Error("No failed candidate is available to retry");
    pending = true;
    controls();
    const saved = await saveArmory(unsaved, workspace.revision);
    previous = workspace;
    workspace = saved;
    unsaved = null;
    invalidatePreview();
    renderPrivate();
    status(`Retried private save · revision ${workspace.revision}.`);
  } catch (error) {
    failure(error);
  } finally {
    pending = false;
    controls();
  }
});
$("#workspace-reload").addEventListener("click", async () => {
  if (
    confirm(
      "Discard unsaved local edits and reload the saved workspace? Export unsaved work first.",
    )
  )
    try {
      cancelRestore();
      await load();
    } catch (error) {
      failure(error);
    }
});
$("#workspace-previous").addEventListener("click", async () => {
  try {
    if (!previous) throw new Error("No prior snapshot is available");
    await prepareRestore(structuredClone(previous));
  } catch (error) {
    failure(error);
  }
});
$("#workspace-import").addEventListener("change", async (event) => {
  cancelRestore();
  const token = ++generation,
    revision = workspace.revision,
    file = event.target.files[0];
  if (!file) return;
  restoreReading = true;
  $("#workspace-import-cancel").hidden = false;
  try {
    if (pending || loading || unsaved)
      throw new Error(
        "Finish or recover the current private operation before restore.",
      );
    if (file.size > 12 * 1024 * 1024 + 65536)
      throw new Error("Private backup exceeds the file limit");
    const raw = await file.text();
    if (
      token !== generation ||
      revision !== workspace.revision ||
      !restoreReading
    )
      return;
    restoreReading = false;
    const preparation = prepareRestore(parseArmoryBackup(raw));
    const preparedGeneration = generation;
    try {
      await preparation;
    } catch (error) {
      if (preparedGeneration === generation) failure(error);
    }
  } catch (error) {
    if (token === generation) {
      restoreReading = false;
      failure(error);
    }
  }
});
$("#workspace-import-cancel").addEventListener("click", cancelRestore);
$("#workspace-import-apply").addEventListener("click", async () => {
  try {
    if (pending || loading || unsaved)
      throw new Error(
        "Finish or recover the current private operation before restore.",
      );
    const p = restorePreview;
    if (!p || p.token !== generation || p.revision !== workspace.revision)
      throw new Error("Restore preview changed; prepare it again.");
    const candidate = structuredClone(p.candidate);
    candidate.revision = p.revision;
    unsaved = candidate;
    pending = true;
    controls();
    const saved = await saveArmory(candidate, p.revision);
    previous = workspace;
    workspace = saved;
    corruptStored = null;
    ready = true;
    unsaved = null;
    cancelRestore();
    resetDraftForms();
    renderPrivate();
    status(`Private backup restored · revision ${workspace.revision}.`);
  } catch (error) {
    failure(error);
  } finally {
    pending = false;
    controls();
  }
});
function tabs() {
  const id = location.hash.slice(1),
    target = [
      "compare",
      "builder",
      "evidence",
      "acquisition",
      "backups",
    ].includes(id)
      ? id
      : "compare";
  document.querySelectorAll("[data-workbench-panel]").forEach((n) => {
    n.hidden = n.id !== target;
  });
  document.querySelectorAll('.armory-tabs a[href^="#"]').forEach((a) => {
    if (a.hash === "#" + target) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", () => {
  sharedGeneration++;
  sharedPreview = null;
  cancelRestore();
  pictureJob?.abort();
  tabs();
});
controls();
buildPickers();
compare();
tabs();
load()
  .then(() => {
    document.querySelector("main").dataset.armoryReady = "true";
  })
  .catch((error) => {
    failure(error);
    status(
      "Private storage could not open. Public comparison remains available; no data was replaced.",
    );
  });
