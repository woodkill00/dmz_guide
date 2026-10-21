import { loadBundledPayloads } from "../content/bundled-assets.mjs";
import { $, state, init, error, status, download } from "./common.mjs";
import { readRecord, commitRecord } from "../storage/store.mjs";
import { LIMITS, assert, clone, parseBounded } from "../content/limits.mjs";
import { validatePack } from "../content/validate.mjs";
import {
  GROUPS,
  TRANSFER_LIMITS,
  defaultFieldValue,
  parseTransfer,
  buildTransfer,
  exportContent,
  validatePayloads,
  diffPacks,
  profileImpact,
  imageInfo,
  hashBytes,
  base64FromBytes,
  bytesFromBase64,
} from "../content/portable.mjs";
let schema,
  draft,
  baseline,
  payloads = [],
  baselinePayloads = [],
  revision = 0,
  previous = null,
  stage = null,
  dirty = false,
  generation = 0,
  controller = new AbortController(),
  activeId = "",
  saving = false,
  urls = [];
const node = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
const arrayPages = new Map();
const label = (k) =>
  k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (s) => s.toUpperCase());
const help = {
  id: "Stable namespaced ID, such as my-pack:wire. References use this exact ID.",
  contentVersion:
    "Change this whenever facts change. Existing profiles must explicitly rebind; historical references are retained.",
  scope:
    "Optional fact-specific game, mode and build. Omit to inherit the pack scope.",
  status:
    "Unknown is not verified. Fictional training records must stay fictional. Evidence is required for factual verification.",
  sourceIds:
    "IDs of sources already listed in Sources and evidence. Numeric stats need their own source.",
  sourceId: "Source ID supporting this particular claim.",
  consumed:
    "Checked: quantity is spent. Unchecked: retained tool or possession requirement, not consumed.",
  prerequisites:
    "Objective IDs that gate this recipe or objective. Unknown gates are not automatically unlocked.",
  ingredientsKnown:
    "Unchecked means the complete ingredient list is unknown, not free.",
  requirementsKnown: "Unchecked means requirements are incomplete or unknown.",
  unit: "Use count for items/weapons, resource-unit for resources, dmz-cash for currency. Statistic units must match the selected metric.",
  value:
    "Use null for an unknown statistic; never invent zero. Choose the type explicitly for claims/effects.",
  context:
    "State measurement conditions, attachments, range, target and method. Do not compare unlike measurements.",
  spoiler:
    "Mark story-sensitive material. Reader spoiler preferences control disclosure.",
  extent:
    "Canonical [minimum x, minimum y, maximum x, maximum y]. Null means an unknown map extent.",
  coordinates:
    "Null means location geometry is unknown. Numeric coordinates must fit the map extent and floor.",
  spawnKind: "Possible or event spawns are not guaranteed.",
  assetId:
    "ID of attached picture metadata. Picture bundles require actual bytes, not only a URL.",
  redistributionAllowed:
    "Must be true only with actual redistribution permission. This field does not prove ownership.",
  body: "Plain text only. HTML and Markdown are displayed inertly, never executed.",
  reviewedAt:
    "Date this evidence was reviewed; do not confuse with capture date.",
  sourceUrl: "Recorded attribution only, never fetched automatically.",
};
function resolve(s) {
  while (s.$ref)
    s = s.$ref
      .slice(2)
      .split("/")
      .reduce((o, k) => o[k], schema);
  return s;
}
function defaultValue(s, key = "") {
  return defaultFieldValue(
    schema,
    s,
    { fictional: draft?.game?.id === "fictional-training" },
    key,
  );
}
function cancelWork() {
  assert(
    !saving,
    "A local atomic save is in progress; wait for its result before changing workspace",
  );
  generation++;
  controller.abort();
  controller = new AbortController();
  stage = null;
  $("#content-stage").hidden = true;
  $("#apply-content").disabled = false;
}
function markDirty() {
  cancelWork();
  $("#export-rights").checked = false;
  dirty = true;
  status("Unsaved private draft · validate and preview before applying");
}
function setAt(path, value) {
  assert(!saving, "Wait for the atomic save to finish");
  let o = draft;
  for (const key of path.slice(0, -1)) o = o[key];
  if (value === undefined) delete o[path.at(-1)];
  else o[path.at(-1)] = value;
  markDirty();
}
function getAt(path) {
  return path.reduce((o, k) => o?.[k], draft);
}
const entryNames = {
  items: "Item or weapon",
  recipes: "Recipe",
  objectives: "Objective",
  sources: "Source",
  guides: "Guide",
  maps: "Map",
  locations: "Location",
  claims: "Claim",
  assets: "Picture",
  stats: "Statistic",
  inputs: "Ingredient",
  requirements: "Requirement",
  prerequisites: "Prerequisite",
  sourceIds: "Source",
  itemIds: "Item",
  relatedIds: "Related record",
  aliases: "Alias",
  effects: "Effect",
  floors: "Floor",
  extent: "Extent coordinate",
};
function fieldTitle(path, value) {
  const key = path.at(-1);
  if (typeof key !== "number") return label(String(key));
  const group = path.at(-2),
    name =
      value && typeof value === "object"
        ? value.name || value.title || value.label || value.id
        : "";
  return `${entryNames[group] || "Entry"} ${key + 1}${name ? " · " + name : ""}`;
}
function referenceGroup(path) {
  const key = typeof path.at(-1) === "number" ? path.at(-2) : path.at(-1);
  return {
    itemId: "items",
    itemIds: "items",
    sourceId: "sources",
    sourceIds: "sources",
    prerequisites: "objectives",
    mapId: "maps",
    assetId: "assets",
    entityId: "all",
    relatedIds: "all",
  }[key];
}
function referencePicker(path, title, input) {
  const group = referenceGroup(path);
  if (!group) return null;
  const container = node("div"),
    searchLabel = node("label", `Find ${title.toLowerCase()} by name or ID `),
    search = node("input"),
    pickLabel = node("label", `Choose existing ${title.toLowerCase()} `),
    picker = node("select"),
    summary = node("small");
  search.type = "search";
  search.autocomplete = "off";
  search.placeholder = "Search this private pack";
  search.dataset.refSearch = path.join(".");
  picker.dataset.refPicker = path.join(".");
  searchLabel.append(search);
  pickLabel.append(picker);
  container.append(searchLabel, pickLabel, summary);
  const records = (
    group === "all" ? GROUPS.flatMap((k) => draft[k]) : draft[group]
  ).filter((r) => r.id);
  function populate() {
    const query = search.value.trim().toLowerCase(),
      matches = records.filter((r) =>
        `${r.name || r.title || r.label || ""} ${r.id}`
          .toLowerCase()
          .includes(query),
      ),
      visible = matches.slice(0, 50);
    picker.replaceChildren();
    const placeholder = node(
      "option",
      matches.length ? "Select a matching record…" : "No matching records",
    );
    placeholder.value = "";
    picker.append(placeholder);
    for (const record of visible) {
      const option = node(
        "option",
        `${record.name || record.title || record.label || record.id} · ${record.id}`,
      );
      option.value = record.id;
      picker.append(option);
    }
    picker.value = visible.some((r) => r.id === input.value) ? input.value : "";
    summary.textContent = `${matches.length} matching ${group === "all" ? "records" : group}; showing ${visible.length}. Search more specifically if needed. Exact IDs remain editable below.`;
  }
  search.addEventListener("input", populate);
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      picker.focus();
    }
  });
  picker.addEventListener("change", () => {
    if (!picker.value) return;
    setAt(path, picker.value);
    input.value = picker.value;
  });
  input.addEventListener("input", populate);
  populate();
  return container;
}
function control(s, path, required = true) {
  s = resolve(s);
  const key = path.at(-1),
    value = getAt(path),
    box = node("div");
  box.className = "field";
  const title = fieldTitle(path, value);
  if (!required) {
    const l = node("label"),
      check = node("input");
    check.type = "checkbox";
    check.checked = value !== undefined;
    check.dataset.path = path.join(".") + ".included";
    l.append(check, document.createTextNode(` Include ${title} (optional)`));
    box.append(l);
    check.addEventListener("change", () => {
      setAt(path, check.checked ? defaultValue(s, key) : undefined);
      renderFields();
    });
    if (value === undefined) return box;
  }
  if (s.anyOf || Array.isArray(s.type)) {
    const variants = s.anyOf || s.type.map((type) => ({ ...s, type })),
      type =
        value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    let idx = variants.findIndex(
      (v) =>
        resolve(v).type === type ||
        (type === "number" && resolve(v).type === "integer"),
    );
    if (idx < 0) idx = 0;
    const l = node("label", `${title} type `),
      select = node("select");
    select.dataset.path = path.join(".") + ".type";
    variants.forEach((v, i) => {
      const option = node(
        "option",
        resolve(v).type === "null" ? "Unknown / null" : label(resolve(v).type),
      );
      option.value = String(i);
      select.append(option);
    });
    select.value = String(idx);
    l.append(select);
    box.append(l);
    select.addEventListener("change", () => {
      setAt(path, defaultValue(variants[Number(select.value)], key));
      renderFields();
    });
    if (resolve(variants[idx]).type === "null") return box;
    box.append(control(variants[idx], path, true));
    return box;
  }
  if (s.type === "object") {
    const fieldset = node("fieldset"),
      legend = node("legend", title);
    fieldset.append(legend);
    if (help[key]) fieldset.append(node("p", help[key]));
    for (const [k, v] of Object.entries(s.properties || {}))
      fieldset.append(control(v, [...path, k], (s.required || []).includes(k)));
    box.append(fieldset);
    return box;
  }
  if (s.type === "array") {
    const fieldset = node("fieldset");
    fieldset.append(node("legend", title));
    if (help[key]) fieldset.append(node("p", help[key]));
    const pageKey = path.join("."),
      pageSize = 20,
      start = Math.min(
        arrayPages.get(pageKey) || 0,
        Math.max(
          0,
          Math.floor(((value?.length || 1) - 1) / pageSize) * pageSize,
        ),
      );
    fieldset.append(
      node(
        "p",
        `${value?.length || 0} entries · showing ${value?.length ? start + 1 : 0}–${Math.min(start + pageSize, value?.length || 0)}`,
      ),
    );
    if (start > 0) {
      const previous = node("button", `Previous ${title} entries`);
      previous.type = "button";
      previous.onclick = () => {
        arrayPages.set(pageKey, Math.max(0, start - pageSize));
        renderFields();
      };
      fieldset.append(previous);
    }
    if (start + pageSize < (value?.length || 0)) {
      const next = node("button", `Next ${title} entries`);
      next.type = "button";
      next.onclick = () => {
        arrayPages.set(pageKey, start + pageSize);
        renderFields();
      };
      fieldset.append(next);
    }
    (value || []).slice(start, start + pageSize).forEach((_, offset) => {
      const i = start + offset,
        row = node("div");
      row.append(control(s.items, [...path, i], true));
      const remove = node("button", `Remove ${title} entry ${i + 1}`);
      remove.type = "button";
      remove.onclick = () => {
        assert(!saving, "Wait for the atomic save to finish");
        getAt(path).splice(i, 1);
        markDirty();
        renderFields();
      };
      row.append(remove);
      fieldset.append(row);
    });
    const add = node("button", `Add ${title} entry`);
    add.type = "button";
    add.onclick = () => {
      assert(!saving, "Wait for the atomic save to finish");
      assert(
        (getAt(path) || []).length < (s.maxItems || LIMITS.records),
        "Entry limit reached",
      );
      getAt(path).push(defaultValue(s.items, key));
      arrayPages.set(
        pageKey,
        Math.floor((getAt(path).length - 1) / pageSize) * pageSize,
      );
      markDirty();
      renderFields();
    };
    fieldset.append(add);
    box.append(fieldset);
    return box;
  }
  const l = node("label", title + " ");
  let input;
  if (s.enum || "const" in s) {
    input = node("select");
    for (const choice of s.enum || [s.const]) {
      const opt = node("option", String(choice));
      opt.value = String(choice);
      input.append(opt);
    }
    input.value = String(value);
    input.disabled = "const" in s;
  } else if (s.type === "boolean") {
    input = node("input");
    input.type = "checkbox";
    input.checked = !!value;
  } else {
    input = node(s.maxLength > 1000 ? "textarea" : "input");
    if (input.tagName === "INPUT")
      input.type = ["integer", "number"].includes(s.type) ? "number" : "text";
    if (["number", "integer"].includes(s.type)) {
      input.step = s.type === "integer" ? "1" : "any";
      if (s.minimum !== undefined) input.min = s.minimum;
      if (s.maximum !== undefined) input.max = s.maximum;
    }
    if (s.maxLength) input.maxLength = s.maxLength;
    input.value = value ?? "";
  }
  input.dataset.path = path.join(".");
  if (path.length === 1 && key === "id") input.disabled = true;
  input.addEventListener("input", () => {
    setAt(
      path,
      s.type === "boolean"
        ? input.checked
        : ["number", "integer"].includes(s.type)
          ? input.value === ""
            ? NaN
            : Number(input.value)
          : input.value,
    );
  });
  l.append(input);
  const picker = referencePicker(path, title, input);
  if (picker) {
    box.append(picker);
    l.firstChild.textContent = `Exact ${title.toLowerCase()} ID (advanced) `;
  }
  box.append(l);
  if (help[key]) box.append(node("small", help[key]));
  return box;
}
function renderFields() {
  const root = $("#editor-fields");
  root.replaceChildren();
  if (!draft) return;
  const group = $("#editor-section").value;
  $("#record-picker-label").hidden = group === "metadata";
  $("#add-record").hidden = group === "metadata";
  $("#remove-record").hidden = group === "metadata";
  if (group === "metadata") {
    for (const [k, s] of Object.entries(schema.properties))
      if (!GROUPS.includes(k)) root.append(control(s, [k]));
  } else {
    const index = Number($("#editor-record").value || 0);
    if (draft[group][index])
      root.append(control(schema.properties[group].items, [group, index]));
    else root.append(node("p", "No records yet. Add one to start."));
  }
  renderPictures();
}
function renderRecords() {
  const group = $("#editor-section").value,
    select = $("#editor-record"),
    old = select.value;
  select.replaceChildren();
  if (group !== "metadata")
    draft[group].forEach((r, i) => {
      const option = node(
        "option",
        `${r.name || r.title || r.id || "New record"}`,
      );
      option.value = String(i);
      select.append(option);
    });
  if ([...select.options].some((o) => o.value === old)) select.value = old;
  renderFields();
}
function renderPictures() {
  for (const u of urls) URL.revokeObjectURL(u);
  urls = [];
  const root = $("#picture-preview");
  root.replaceChildren();
  for (const a of draft?.assets || []) {
    const p = payloads.find((x) => x.assetId === a.id);
    const row = node("div");
    row.append(
      node(
        "p",
        `${a.id} · ${a.width} × ${a.height} · ${a.bytes} bytes · Rights: ${a.rightsHolder} · ${a.license} · ${a.attribution} · SHA-256 ${a.sha256}`,
      ),
    );
    if (p) {
      try {
        const raw = bytesFromBase64(p.base64),
          info = imageInfo(raw);
        assert(info.mime === a.mime, "Invalid picture MIME");
        const u = URL.createObjectURL(new Blob([raw], { type: info.mime }));
        urls.push(u);
        const img = node("img");
        img.src = u;
        img.alt = `Private picture ${a.id}`;
        img.width = Math.min(a.width, 240);
        row.append(img);
      } catch {
        row.append(
          node("p", "Picture bytes unavailable; validation required."),
        );
      }
    } else row.append(node("p", "Reference only: no picture bytes stored."));
    root.append(row);
  }
}
async function decodeBitmap(bytes, mime, signal) {
  assert(!signal?.aborted, "Import cancelled");
  let timer, abort;
  const work = createImageBitmap(new Blob([bytes], { type: mime }));
  let expired = false;
  const result = await Promise.race([
    work,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        reject(new Error("Picture decode timed out; no changes saved"));
      }, TRANSFER_LIMITS.decodeMs);
      abort = () => {
        expired = true;
        reject(new Error("Import cancelled"));
      };
      signal?.addEventListener("abort", abort, { once: true });
    }),
  ]).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    work.then(
      (bitmap) => {
        if (expired) bitmap.close();
      },
      () => {},
    );
  });
  return result;
}
async function decodeRaster(bytes, mime, signal) {
  const result = await decodeBitmap(bytes, mime, signal);
  try {
    return { width: result.width, height: result.height };
  } finally {
    result.close();
  }
}
const options = () => ({ decodeRaster, signal: controller.signal });
async function loadWorkspace() {
  const token = generation,
    id = state.pack.id;
  activeId = id;
  arrayPages.clear();
  $("#export-rights").checked = false;
  baseline = clone(state.pack);
  draft = clone(state.pack);
  revision = 0;
  previous = null;
  payloads = [];
  baselinePayloads = [];
  dirty = false;
  try {
    const record = await readRecord("content", id);
    if (token !== generation || state.pack.id !== id) return;
    if (record?.value) {
      baseline = clone(record.value.pack);
      draft = clone(baseline);
      revision = record.value.revision;
      payloads = clone(record.value.payloads || []);
      previous = record.previous;
    }
    status(
      `Private content loaded · revision ${revision}. Public pages unchanged.`,
    );
  } catch (e) {
    status("Storage unavailable · draft stays exportable on this page");
    error(e);
  }
  if (token !== generation) return;
  const missing = baseline.assets
    .filter((a) => !payloads.some((p) => p.assetId === a.id))
    .map((a) => a.id);
  if (missing.length) {
    try {
      const bundled = await loadBundledPayloads(baseline, {
        assetIds: missing,
        ...options(),
      });
      if (token !== generation) return;
      payloads.push(...bundled);
    } catch (reason) {
      if (token !== generation) return;
      status(
        "Some picture bytes unavailable; content remains editable and exportable.",
      );
      error(reason);
    }
  }
  if (token !== generation) return;
  baselinePayloads = clone(payloads);
  $("#private-reader").href = `/local/?pack=${encodeURIComponent(id)}`;
  renderRecords();
}
function showDiff(diff) {
  const root = $("#stage-diff");
  root.replaceChildren();
  for (const kind of ["manifest", "added", "changed", "removed"]) {
    const entries = diff[kind],
      details = node("details"),
      content = node("div");
    details.open = entries.length > 0;
    details.append(
      node("summary", `${label(kind)}: ${entries.length}`),
      content,
    );
    let start = 0;
    function render() {
      content.replaceChildren();
      content.append(
        node(
          "p",
          `${entries.length} changes · showing ${entries.length ? start + 1 : 0}–${Math.min(start + 20, entries.length)}`,
        ),
      );
      if (start > 0) {
        const previous = node("button", `Previous ${kind} changes`);
        previous.type = "button";
        previous.onclick = () => {
          start -= 20;
          render();
        };
        content.append(previous);
      }
      if (start + 20 < entries.length) {
        const next = node("button", `Next ${kind} changes`);
        next.type = "button";
        next.onclick = () => {
          start += 20;
          render();
        };
        content.append(next);
      }
      for (const entry of entries.slice(start, start + 20)) {
        const title = node("h3", entry.id || entry.field),
          before = node("pre", JSON.stringify(entry.before ?? null, null, 2)),
          after = node("pre", JSON.stringify(entry.after ?? null, null, 2));
        content.append(
          title,
          node("p", "Before"),
          before,
          node("p", "After"),
          after,
        );
      }
    }
    render();
    root.append(details);
  }
}
async function stageCandidate(
  candidate,
  candidatePayloads,
  {
    targetBaseline = baseline,
    expectedRevision = revision,
    rollback = false,
  } = {},
) {
  const token = generation;
  exportContent(candidate, schema);
  candidate = clone(candidate);
  candidatePayloads = clone(candidatePayloads);
  validatePack(candidate, schema);
  await validatePayloads(candidate, candidatePayloads, {
    ...options(),
    complete: false,
  });
  if (token !== generation) return;
  assert(
    candidate.id === targetBaseline?.id || !targetBaseline,
    "Pack identity cannot change in an existing draft",
  );
  const diff = diffPacks(targetBaseline, candidate);
  if (
    targetBaseline &&
    !rollback &&
    JSON.stringify(candidate) !== JSON.stringify(targetBaseline)
  )
    assert(
      candidate.contentVersion !== targetBaseline.contentVersion,
      "Change Content version in Pack metadata before saving changed facts.",
    );
  let profile,
    profileUnavailable = false;
  try {
    profile = (await readRecord("profiles", candidate.id))?.value;
  } catch {
    profile = null;
    profileUnavailable = true;
  }
  if (token !== generation) return;
  const impact = profileImpact(profile, targetBaseline, candidate);
  let originalPayloads = [];
  if (targetBaseline?.assets.length) {
    const sameActive =
      targetBaseline.id === baseline?.id &&
      targetBaseline.contentVersion === baseline?.contentVersion;
    originalPayloads = sameActive
      ? baselinePayloads.filter((p) =>
          targetBaseline.assets.some((a) => a.id === p.assetId),
        )
      : [];
    const missing = targetBaseline.assets
      .filter((a) => !originalPayloads.some((p) => p.assetId === a.id))
      .map((a) => a.id);
    if (missing.length) {
      try {
        originalPayloads.push(
          ...(await loadBundledPayloads(targetBaseline, {
            assetIds: missing,
            ...options(),
          })),
        );
      } catch {
        /* Reference-only original remains explicitly incomplete. */
      }
    }
    if (token !== generation) return;
  }
  stage = {
    pack: clone(candidate),
    payloads: clone(candidatePayloads),
    targetId: candidate.id,
    expectedRevision,
    generation: token,
    rollback,
    initialPrevious: targetBaseline
      ? {
          pack: clone(targetBaseline),
          payloads: clone(originalPayloads),
          revision: 0,
        }
      : null,
  };
  $("#stage-target").textContent =
    `${targetBaseline ? "Replace" : "Create"} private pack ${candidate.id} at expected revision ${expectedRevision}. Published pages and all profiles remain unchanged.`;
  const warnings = [];
  if (profileUnavailable)
    warnings.push(
      "Profile storage could not be inspected. Binding/reference impact is unknown; export a profile backup before proceeding.",
    );
  if (impact.rebindRequired)
    warnings.push(
      "Profile rebind required. Export your profile and use Settings to explicitly reconcile the new content version.",
    );
  if (impact.unresolved.length)
    warnings.push(
      `Historical references retained, not deleted: ${impact.unresolved.join(", ")}`,
    );
  if (impact.affectedGoals.length)
    warnings.push(`Affected saved goals: ${impact.affectedGoals.join(", ")}`);
  if (candidate.assets.length !== candidatePayloads.length)
    warnings.push(
      "Reference-only pictures: some actual bytes are missing. A self-contained picture export is blocked until supplied.",
    );
  if (rollback)
    warnings.push(
      "Rollback restores the previous content snapshot as a new revision. Profile content binding may need explicit rebind.",
    );
  $("#stage-warnings").textContent =
    warnings.join("\n") ||
    "No known profile binding conflict. Verify all changes and evidence before applying.";
  showDiff(diff);
  $("#content-stage").hidden = false;
  $("#stage-title").focus();
}
function action(selector, fn) {
  $(selector).addEventListener("click", () =>
    Promise.resolve()
      .then(fn)
      .catch((e) => {
        status(
          "No replacement saved. Your draft remains available for recovery export.",
        );
        error(e);
      }),
  );
}
async function attachPicture() {
  cancelWork();
  const token = generation,
    signal = controller.signal;
  assert(
    $("#picture-rights").checked && $("#picture-private").checked,
    "Confirm redistribution rights and absence of personal picture data first",
  );
  const file = $("#picture-file").files[0];
  assert(
    file && file.size <= LIMITS.assetBytes,
    "Choose a raster file up to 2 MiB",
  );
  assert(draft.assets.length < LIMITS.assets, "32-picture limit reached");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (token !== generation) return;
  const info = imageInfo(bytes);
  const bitmap = await decodeBitmap(bytes, info.mime, signal);
  let blob;
  try {
    assert(
      bitmap.width === info.width && bitmap.height === info.height,
      "Decoded picture dimensions mismatch",
    );
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Picture normalization failed")),
        "image/png",
      ),
    );
    canvas.width = canvas.height = 0;
  } finally {
    bitmap.close();
  }
  if (token !== generation) return;
  assert(
    blob.size <= LIMITS.assetBytes,
    "Normalized picture exceeds 2 MiB; resize it before attaching",
  );
  const normalized = new Uint8Array(await blob.arrayBuffer()),
    id = $("#picture-id").value.trim(),
    sum = await hashBytes(normalized);
  if (token !== generation) return;
  const asset = {
    id,
    path: `assets/${sum}.png`,
    mime: "image/png",
    sha256: sum,
    bytes: normalized.length,
    width: info.width,
    height: info.height,
    rightsHolder: $("#picture-holder").value.trim(),
    license: $("#picture-license").value.trim(),
    sourceUrl: $("#picture-source").value.trim(),
    attribution: $("#picture-attribution").value.trim(),
    redistributionAllowed: true,
  };
  assert(
    !draft.assets.some((a) => a.id === id),
    "Picture ID already exists; remove its metadata and references deliberately before replacement",
  );
  const next = clone(draft);
  next.assets.push(asset);
  validatePack(next, schema);
  const nextPayloads = [
    ...payloads,
    { assetId: id, base64: base64FromBytes(normalized) },
  ];
  await validatePayloads(next, nextPayloads, {
    decodeRaster,
    signal,
    complete: false,
  });
  if (token !== generation) return;
  draft = next;
  payloads = nextPayloads;
  markDirty();
  renderRecords();
  status(
    `Picture ${id} attached to unsaved draft. Set an Asset ID on a record and change content version before applying.`,
  );
}
async function importFile() {
  const file = $("#import-content").files[0];
  if (!file) return;
  assert(!saving, "Wait for the atomic save to finish");
  if (
    dirty &&
    !confirm(
      "Discard the current unsaved draft and load this import? Export your draft first if needed.",
    )
  ) {
    $("#import-content").value = "";
    return;
  }
  cancelWork();
  const token = generation;
  assert(
    file.size <= TRANSFER_LIMITS.envelopeBytes,
    "Import exceeds 20 MiB envelope limit",
  );
  status("Validating private import. Cancel remains available.");
  const validationOptions = options(),
    text = await file.text();
  if (token !== generation) return;
  const parsed = await parseTransfer(text, schema, validationOptions);
  if (token !== generation) return;
  const record = await readRecord("content", parsed.pack.id);
  if (token !== generation) return;
  const existing =
    record?.value?.pack ||
    state.packs.find((p) => p.id === parsed.pack.id) ||
    null;
  const targetPayloads = parsed.selfContained
    ? parsed.payloads
    : (record?.value?.payloads || []).filter((p) =>
        parsed.pack.assets.some(
          (a) =>
            a.id === p.assetId &&
            existing?.assets.some(
              (old) => old.id === a.id && old.sha256 === a.sha256,
            ),
        ),
      );
  $("#export-rights").checked = false;
  baselinePayloads = record?.value
    ? clone(record.value.payloads || [])
    : existing?.id === baseline?.id &&
        existing?.contentVersion === baseline?.contentVersion
      ? clone(baselinePayloads)
      : [];
  baseline = existing ? clone(existing) : null;
  revision = record?.value?.revision || 0;
  previous = record?.previous || null;
  draft = clone(parsed.pack);
  payloads = clone(targetPayloads);
  dirty = true;
  renderRecords();
  await stageCandidate(draft, payloads, {
    targetBaseline: existing,
    expectedRevision: record?.value?.revision || 0,
  });
}
async function start() {
  const response = await fetch("/assets/schemas/pack.schema.json");
  assert(
    response.ok,
    "Content schema unavailable. Retry when the local site is available.",
  );
  schema = await response.json();
  $("#pack-select").addEventListener(
    "change",
    (event) => {
      if (saving) {
        event.stopImmediatePropagation();
        $("#pack-select").value = activeId;
        return;
      }
      if (
        dirty &&
        !confirm(
          "Discard the unsaved private draft and switch packs? Export it first if needed.",
        )
      ) {
        event.stopImmediatePropagation();
        $("#pack-select").value = activeId;
        return;
      }
      cancelWork();
    },
    true,
  );
  document.addEventListener("pack-changing", () => cancelWork());
  window.addEventListener("beforeunload", (event) => {
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  $("#editor-section").addEventListener("change", renderRecords);
  $("#editor-record").addEventListener("change", renderFields);
  action("#add-record", () => {
    assert(!saving, "Wait for the atomic save to finish");
    const group = $("#editor-section").value;
    if (!GROUPS.includes(group)) return;
    assert(draft[group].length < LIMITS.records, "Record limit reached");
    draft[group].push(defaultValue(schema.properties[group].items));
    markDirty();
    renderRecords();
    $("#editor-record").value = String(draft[group].length - 1);
    renderFields();
  });
  action("#remove-record", () => {
    assert(!saving, "Wait for the atomic save to finish");
    const group = $("#editor-section").value;
    if (!GROUPS.includes(group)) return;
    const i = Number($("#editor-record").value);
    assert(draft[group][i], "Select a record");
    const id = draft[group][i].id;
    draft[group].splice(i, 1);
    if (group === "assets") payloads = payloads.filter((p) => p.assetId !== id);
    markDirty();
    renderRecords();
  });
  $("#guided-form").addEventListener("submit", (event) => {
    event.preventDefault();
    cancelWork();
    stageCandidate(draft, payloads).catch(error);
  });
  action("#discard-draft", async () => {
    if (dirty && !confirm("Discard all unsaved draft changes?")) return;
    cancelWork();
    await loadWorkspace();
  });
  for (const id of [
    "picture-file",
    "picture-id",
    "picture-holder",
    "picture-license",
    "picture-source",
    "picture-attribution",
  ])
    $("#" + id).addEventListener("input", () => {
      $("#picture-rights").checked = false;
      $("#picture-private").checked = false;
    });
  action("#attach-picture", attachPicture);
  action("#export-content", () =>
    download("dmz-content-reference-only.json", exportContent(draft, schema)),
  );
  action("#export-draft", () => {
    assert(draft, "No draft loaded");
    download("dmz-UNSAVED-recovery.json", {
      format: "dmz-unsaved-recovery",
      version: 1,
      warning:
        "Unvalidated recovery draft, not an importable content pack. Use the advanced panel to recover pack fields and reattach pictures after validation.",
      pack: draft,
      payloads,
    });
  });
  action("#export-pictures", async () => {
    assert(
      $("#export-rights").checked,
      "Confirm rights and privacy for every exported picture first",
    );
    download(
      "dmz-picture-pack.json",
      await buildTransfer(draft, payloads, schema, options()),
    );
  });
  $("#import-content").addEventListener("change", () =>
    importFile().catch((e) => {
      status(
        "Import rejected; no replacement saved. Draft remains exportable.",
      );
      error(e);
    }),
  );
  action("#cancel-import", () => {
    cancelWork();
    status("Pending import cancelled. Stored content and profiles unchanged.");
  });
  action("#cancel-content", () => {
    cancelWork();
    status(
      "Replacement cancelled. Stored content unchanged; unsaved draft remains available.",
    );
  });
  action("#rollback-content", async () => {
    cancelWork();
    assert(previous?.pack, "No previous private snapshot exists yet");
    await stageCandidate(previous.pack, previous.payloads || [], {
      rollback: true,
    });
  });
  action("#apply-content", async () => {
    const candidate = stage;
    assert(
      candidate && candidate.generation === generation,
      "Preview expired. Validate again.",
    );
    $("#apply-content").disabled = true;
    saving = true;
    const controls = [
      ...document.querySelectorAll(
        "#guided-form input,#guided-form select,#guided-form textarea,#guided-form button,#add-record,#remove-record,#attach-picture,#import-content,#load-json",
      ),
    ].map((n) => [n, n.disabled]);
    for (const [n] of controls) n.disabled = true;
    status("Applying private replacement atomically…");
    try {
      const saved = await commitRecord(
        "content",
        candidate.targetId,
        {
          pack: candidate.pack,
          payloads: candidate.payloads,
          revision: candidate.expectedRevision,
        },
        candidate.expectedRevision,
        { initialPrevious: candidate.initialPrevious },
      );
      if (candidate.generation !== generation) return;
      dirty = false;
      stage = null;
      $("#export-rights").checked = false;
      $("#content-stage").hidden = true;
      revision = saved.revision;
      draft = clone(saved.pack);
      payloads = clone(saved.payloads);
      baseline = clone(saved.pack);
      baselinePayloads = clone(saved.payloads);
      activeId = saved.pack.id;
      state.pack = clone(saved.pack);
      const record = await readRecord("content", saved.pack.id);
      previous = record?.previous;
      const known = state.packs.findIndex((p) => p.id === saved.pack.id);
      if (known >= 0) state.packs[known] = clone(saved.pack);
      else {
        state.packs.push(clone(saved.pack));
        const opt = node("option", saved.pack.title);
        opt.value = saved.pack.id;
        $("#pack-select").append(opt);
      }
      $("#pack-select").value = saved.pack.id;
      const url = new URL(location.href);
      url.searchParams.set("pack", saved.pack.id);
      history.replaceState(null, "", url);
      $("#private-reader").href =
        `/local/?pack=${encodeURIComponent(saved.pack.id)}`;
      for (const a of document.querySelectorAll("a[href]")) {
        const target = new URL(a.href, location.href);
        if (
          target.origin === location.origin &&
          [
            "/local/",
            "/planner/",
            "/inventory/",
            "/settings/",
            "/editor/",
            "/maps/",
            "/progression/",
          ].includes(target.pathname)
        ) {
          target.searchParams.set("pack", saved.pack.id);
          a.href = target.href;
        }
      }
      $("#pack-note").textContent =
        `PRIVATE: ${saved.pack.title} · ${saved.pack.contentVersion}`;
      status(
        `Private content saved · revision ${saved.revision}. Published pages and profiles unchanged.`,
      );
      $("#error").hidden = true;
      renderRecords();
    } finally {
      saving = false;
      for (const [n, disabled] of controls) n.disabled = disabled;
      $("#apply-content").disabled = false;
    }
  });
  action("#refresh-json", () => {
    $("#advanced-json").value = JSON.stringify(draft, null, 2);
  });
  action("#load-json", () => {
    assert(!saving, "Wait for the atomic save to finish");
    const next = parseBounded($("#advanced-json").value);
    assert(
      next.id === draft.id && next.schemaVersion === 1,
      "Existing pack identity/schemaVersion cannot change in the advanced draft",
    );
    validatePack(next, schema);
    draft = next;
    markDirty();
    renderRecords();
  });
  await init(() => loadWorkspace().catch(error));
}
start().catch(error);
