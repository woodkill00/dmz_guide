import { validatePageRecovery } from "../domain/page-recovery.mjs";
import { createGuidedEditor } from "./guided-editor.mjs";
import { installEditorExperience } from "./page-editor-experience.mjs";
import {
  newPageId,
  validatePageDocument,
  semanticFingerprint,
  restorePageDocument,
  pageAssets,
  stableJSON,
} from "../domain/page-editor-utils.mjs";
import { renderPageComposition } from "../ui/page-composition.mjs";
import { normalizeRaster } from "./raster-editor.mjs";
import { base64FromBytes, bytesFromBase64 } from "../content/portable.mjs";
import { parseBounded, safeURL } from "../content/limits.mjs";
const $ = (s) => document.querySelector(s),
  node = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
let state,
  token,
  selected,
  selectedBlock,
  dirty = false,
  busy = false,
  loading = true,
  blocked = false,
  generation = 0,
  intent = 0,
  preview = null,
  history = [],
  future = [],
  recoverySequence = 0,
  pendingOperation = null,
  availableRecovery = null,
  imported = null;
const uploads = new Map(),
  urls = new Map();
let guided,
  experience,
  assetIntent = 0,
  importIntent = 0,
  mediaBusy = false,
  mediaOwner = new AbortController();
let owner = new AbortController(),
  saveTimer,
  writing = Promise.resolve();
const status = (text) => ($("#pe-status").textContent = text);
const fail = (reason) => {
  $("#pe-error").hidden = false;
  $("#pe-error").textContent = reason.message || String(reason);
  experience?.error(reason);
};
const clear = () => {
  $("#pe-error").hidden = true;
  experience?.clearErrors();
};
async function api(path, body, signal) {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "x-author-token": token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = Error(data.message || "Local editor request failed");
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}
function locks() {
  for (const n of document.querySelectorAll(
    "#pe-fields input,#pe-fields textarea,#pe-fields select,#pe-fields button,#pe-record-fields input,#pe-record-fields textarea,#pe-record-fields select,#pe-record-fields button,#pe-photos input,#pe-photos button,#pe-add-section,#pe-upload,#pe-apply-import,#pe-version",
  ))
    n.disabled =
      busy ||
      blocked ||
      loading ||
      (mediaBusy && !!n.closest("#pe-photos")) ||
      n.dataset.pageReadOnly === "true";
  $("#pe-validate").disabled =
    !state || busy || blocked || loading || mediaBusy;
  $("#pe-save").disabled = !preview || busy || blocked || loading || mediaBusy;
  $("#pe-undo").disabled = !history.length || busy || blocked || loading;
  $("#pe-redo").disabled = !future.length || busy || blocked || loading;
  $("#pe-apply-import").disabled = !imported || busy || blocked || loading;
  experience?.locks();
}
const imageURL = (id) =>
  urls.get(id) ||
  `/api/media?packKey=${encodeURIComponent(state.mediaPackKey || state.target.scope.packKey)}&assetId=${encodeURIComponent(id)}`;
function paintPreview() {
  if (!state) return;
  if (Array.isArray(state.record.steps))
    for (const [index, text] of state.record.steps.entries())
      state.projections[`step:${index}`] = {
        title: `Step ${index + 1}`,
        html: `<p>${String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])}</p>`,
      };
  try {
    $("#pe-preview").innerHTML = renderPageComposition(state.document, {
      projections: state.projections,
      imageURL,
      referenceURL: (t) =>
        t.adapter === "catalog"
          ? `/preview?packKey=${encodeURIComponent(t.scope.packKey)}&id=${encodeURIComponent(t.recordId)}`
          : null,
      editorMarkers: true,
    });
    experience?.paint();
  } catch (e) {
    $("#pe-preview").textContent =
      "Complete the selected fields to preview: " + e.message;
  }
}
function snapshot() {
  return {
    document: structuredClone(state.document),
    record: structuredClone(state.record),
    contentVersion: $("#pe-version").value,
  };
}
function checkpoint() {
  history.push(snapshot());
  if (history.length > 40) history.shift();
  future = [];
}
function changed() {
  if (Array.isArray(state.record.steps)) {
    const count = state.record.steps.length,
      seen = new Set();
    const sync = (blocks) => {
      const retained = blocks.filter((b) => {
        const match = b.type === "managed" && /^step:(\d+)$/.exec(b.projection);
        if (match) {
          if (Number(match[1]) >= count) return false;
          seen.add(Number(match[1]));
        }
        if (b.type === "group") {
          b.children = sync(b.children);
          if (!b.children.length)
            b.children = [{ id: newPageId("b"), type: "paragraph", text: "" }];
        }
        return true;
      });
      // Field controls retain this array between text-only preview updates.
      // Keep its identity so later insertions still edit the live document.
      blocks.splice(0, blocks.length, ...retained);
      return blocks;
    };
    const taskSection = state.document.sections.find(
      (s) => s.slot === "detail:mission-tasks",
    );
    for (const s of state.document.sections) s.blocks = sync(s.blocks);
    if (taskSection)
      for (let index = 0; index < count; index++)
        if (!seen.has(index)) {
          const block = {
              id: newPageId("b"),
              type: "managed",
              projection: `step:${index}`,
            },
            position = taskSection.blocks.findIndex(
              (b) =>
                b.type === "managed" &&
                b.projection === "detail:mission-context",
            );
          taskSection.blocks.splice(
            position < 0 ? taskSection.blocks.length : position,
            0,
            block,
          );
        }
  }
  generation++;
  experience?.changed();
  preview = null;
  if (imported) {
    imported = null;
    $("#pe-import").value = "";
    $("#pe-import-review").textContent =
      "Import review expired after editing. Select the bundle again to review it against this draft.";
  }
  dirty = true;
  clear();
  status("Unsaved changes · local repository destination");
  paintPreview();
  locks();
  clearTimeout(saveTimer);
  const epoch = generation;
  saveTimer = setTimeout(() => {
    if (epoch === generation)
      void persist().catch((e) => {
        status("Unsaved changes · recovery unavailable");
        fail(e);
      });
  }, 500);
}
function mutate(fn, { rerender = true } = {}) {
  if (busy || blocked || loading) return;
  const active = document.activeElement,
    activeRecordFields = !!active?.closest("#pe-record-fields"),
    activeBlock = active?.closest("[data-block-id]")?.dataset.blockId,
    activeLabel = active?.tagName === "BUTTON" ? active.textContent : null;
  const previous = snapshot(),
    oldHistory = history.slice(),
    oldFuture = future.slice();
  checkpoint();
  try {
    fn();
  } catch (error) {
    state.document = previous.document;
    state.record = previous.record;
    $("#pe-version").value = previous.contentVersion;
    history = oldHistory;
    future = oldFuture;
    outline();
    fields();
    recordFields();
    fail(error);
    return;
  }
  changed();
  if (rerender) {
    outline();
    fields();
    if (activeLabel) {
      const host = activeRecordFields
        ? $("#pe-record-fields")
        : activeBlock
          ? [...document.querySelectorAll("[data-block-id]")].find(
              (n) => n.dataset.blockId === activeBlock,
            )
          : $("#pe-fields");
      const next =
        host &&
        [...host.querySelectorAll("button")].find(
          (n) => n.textContent === activeLabel,
        );
      (next || $("#pe-fields input"))?.focus({ preventScroll: true });
    }
  }
}
function useSnapshot(value) {
  state.document = structuredClone(value.document);
  state.record = structuredClone(value.record);
  $("#pe-version").value = value.contentVersion;
  selected = state.document.sections.some((s) => s.id === selected)
    ? selected
    : state.document.sections[0]?.id;
  changed();
  outline();
  fields();
  recordFields();
}
async function database() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("dmz-page-editor-recovery", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("drafts");
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
    r.onblocked = () =>
      reject(Error("Recovery storage is blocked; export your draft"));
  });
}
const recoveryKey = () => `${state.checkoutId}:${state.key}`;
async function readRecovery() {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readonly"),
        r = tx.objectStore("drafts").get(recoveryKey());
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
function draftValue() {
  return {
    version: 1,
    dirty,
    target: state.target,
    checkoutId: state.checkoutId,
    baseRevision: state.repositoryRevision,
    baseDocumentRevision: state.document.revision,
    fingerprint: state.fingerprint,
    ...snapshot(),
    uploads: [...uploads.values()],
    operation: pendingOperation,
  };
}
async function persist() {
  const epoch = generation,
    key = recoveryKey(),
    value = draftValue();
  if (new TextEncoder().encode(JSON.stringify(value)).length > 20 * 1024 * 1024)
    throw Error("Recovery draft exceeds20MiB; export a smaller picture batch");
  const task = writing
    .catch(() => {})
    .then(async () => {
      if (epoch !== generation) return { written: false };
      const db = await database();
      try {
        const result = await new Promise((resolve, reject) => {
          const tx = db.transaction("drafts", "readwrite"),
            store = tx.objectStore("drafts"),
            r = store.get(key);
          let next, failure;
          r.onsuccess = () => {
            const old = r.result;
            if ((old?.sequence || 0) !== recoverySequence) {
              tx.abort();
              return;
            }
            next = {
              sequence: recoverySequence + 1,
              value,
              previous: old?.value || null,
            };
            try {
              store.put(next, key);
            } catch (error) {
              failure = error;
              tx.abort();
            }
          };
          tx.oncomplete = () => resolve(next);
          tx.onerror = tx.onabort = () =>
            reject(
              failure ||
                tx.error ||
                Error(
                  "Another editor changed this recovery draft; export before reloading",
                ),
            );
        });
        recoverySequence = result.sequence;
        if (epoch === generation && dirty && !pendingOperation)
          status("Recovery draft stored · not saved to repository");
        return {
          written: true,
          key,
          sequence: result.sequence,
          operationId: value.operation?.operationId || null,
        };
      } finally {
        db.close();
      }
    });
  writing = task;
  return task;
}
function section() {
  return state.document.sections.find((s) => s.id === selected);
}
function button(label, fn) {
  const b = node("button", label);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function field(
  parent,
  label,
  value,
  onchange,
  { type = "text", options, max = 2000 } = {},
) {
  const wrap = node("label", label),
    input = node(
      options ? "select" : type === "textarea" ? "textarea" : "input",
    );
  if (options) {
    for (const [v, t] of options) {
      const o = node("option", t);
      o.value = v;
      input.append(o);
    }
  } else if (type !== "textarea") input.type = type;
  input.maxLength = max;
  if (type === "checkbox") input.checked = !!value;
  else input.value = value ?? "";
  wrap.append(input);
  parent.append(wrap);
  input.addEventListener(
    options || type === "checkbox" ? "change" : "input",
    () => {
      if (busy || blocked || loading) return;
      mutate(
        () => onchange(type === "checkbox" ? input.checked : input.value),
        { rerender: false },
      );
    },
  );
  return input;
}
function moveSection(id, offset) {
  mutate(() => {
    const a = state.document.sections,
      i = a.findIndex((s) => s.id === id),
      j = i + offset;
    if (j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]];
  });
}
function outline() {
  const list = $("#pe-sections");
  list.replaceChildren();
  state.document.sections.forEach((s, i) => {
    const li = node("li"),
      b = button(s.title || "Untitled section", () => {
        selected = s.id;
        outline();
        fields();
      });
    b.dataset.sectionId = s.id;
    b.setAttribute("aria-pressed", String(s.id === selected));
    li.draggable = true;
    li.addEventListener("dragstart", (e) => {
      if (busy || blocked) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData("text/plain", s.id);
    });
    li.addEventListener("dragover", (e) => e.preventDefault());
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      mutate(() => {
        const a = state.document.sections,
          from = a.findIndex((s) => s.id === id),
          to = a.findIndex((t) => t.id === s.id);
        if (from < 0 || to < 0) return;
        const [moved] = a.splice(from, 1);
        a.splice(to, 0, moved);
      });
    });
    li.append(b);
    list.append(li);
  });
  experience?.outline();
}
const attach = (id) => {
  const ids = [state.record.assetId, ...(state.record.assetIds || [])].filter(
    Boolean,
  );
  if (ids.includes(id)) return;
  if (ids.length >= 9) throw Error("This record already has nine pictures");
  if (!state.record.assetId) state.record.assetId = id;
  else state.record.assetIds = [...(state.record.assetIds || []), id];
};
function makeBlock(type) {
  const b = { id: newPageId("b"), type };
  switch (type) {
    case "paragraph":
      return { ...b, text: "" };
    case "heading":
      return { ...b, text: "Heading", level: 3 };
    case "list":
      return { ...b, ordered: false, entries: [""] };
    case "steps":
      return { ...b, entries: [{ id: newPageId("t"), text: "" }] };
    case "callout":
      return { ...b, tone: "tip", text: "" };
    case "image": {
      const a = state.pack.assets[0];
      if (!a)
        throw Error("Upload a picture or choose one in Content Studio first");
      attach(a.id);
      return {
        ...b,
        assetId: a.id,
        alt: "Reference picture",
        decorative: false,
        caption: "",
        fit: "contain",
        focalX: 0.5,
        focalY: 0.5,
      };
    }
    case "gallery":
      return { ...b, entries: [] };
    case "table":
      return { ...b, columns: ["Name", "Information"], rows: [["", ""]] };
    case "reference":
      return {
        ...b,
        target:
          state.target.adapter === "catalog"
            ? structuredClone(state.target)
            : {
                adapter: "catalog",
                scope: { packKey: state.mediaPackKey, packId: state.pack.id },
                recordId:
                  state.pack.items.find((r) => !r.spoiler)?.id ||
                  state.pack.guides.find((r) => !r.spoiler)?.id,
              },
        label: "Related record",
      };
    case "group":
      return {
        ...b,
        columns: 2,
        children: [{ id: newPageId("b"), type: "paragraph", text: "" }],
      };
    case "managed":
      return { ...b, projection: Object.keys(state.projections)[0] };
    default:
      throw Error("Unknown block type");
  }
}
function addControls(parent, blocks, index) {
  const box = node("div");
  box.className = "pe-actions";
  const select = node("select");
  select.setAttribute("aria-label", "Block to insert");
  for (const type of [
    "paragraph",
    "heading",
    "list",
    "steps",
    "callout",
    "image",
    "gallery",
    "table",
    "reference",
    "group",
    "managed",
  ]) {
    const o = node("option", type);
    o.value = type;
    select.append(o);
  }
  box.append(
    select,
    button("Insert here", () => {
      try {
        mutate(() => {
          const block = makeBlock(select.value);
          blocks.splice(index, 0, block);
          selectedBlock = block.id;
        });
      } catch (e) {
        fail(e);
      }
    }),
  );
  parent.append(box);
}
function blockFields(parent, b, blocks, index, nested = false) {
  const box = node("details");
  box.className = "pe-block";
  box.dataset.blockId = b.id;
  box.open = b.id === selectedBlock;
  box.append(node("summary", `${index + 1}. ${b.type}`));
  box.addEventListener("toggle", () => {
    if (!box.open || !box.isConnected) return;
    selectedBlock = b.id;
    for (const other of $("#pe-fields").querySelectorAll("details.pe-block"))
      if (other !== box && !other.contains(box) && !box.contains(other))
        other.open = false;
  });
  const actions = node("div");
  actions.className = "pe-actions";
  actions.append(
    button("Move up", () =>
      mutate(() => {
        if (index > 0)
          [blocks[index - 1], blocks[index]] = [
            blocks[index],
            blocks[index - 1],
          ];
      }),
    ),
    button("Move down", () =>
      mutate(() => {
        if (index < blocks.length - 1)
          [blocks[index], blocks[index + 1]] = [
            blocks[index + 1],
            blocks[index],
          ];
      }),
    ),
    button("Remove block", () => mutate(() => blocks.splice(index, 1))),
  );
  box.append(actions);
  if (["paragraph", "heading", "callout"].includes(b.type))
    field(box, "Text", b.text, (v) => (b.text = v), {
      type: "textarea",
      max: b.type === "heading" ? 120 : 2000,
    });
  if (b.type === "heading")
    field(box, "Heading level", b.level, (v) => (b.level = Number(v)), {
      options: [
        [2, "Heading2"],
        [3, "Heading3"],
      ],
    });
  if (b.type === "callout")
    field(box, "Callout style", b.tone, (v) => (b.tone = v), {
      options: ["info", "tip", "warning"].map((v) => [v, v]),
    });
  if (b.type === "list" || b.type === "steps")
    field(
      box,
      "One entry per line",
      b.entries.map((e) => (typeof e === "string" ? e : e.text)).join("\n"),
      (v) =>
        (b.entries = v
          .split("\n")
          .map((text, i) =>
            b.type === "list"
              ? text
              : { id: b.entries[i]?.id || newPageId("t"), text },
          )),
      { type: "textarea" },
    );
  if (b.type === "list")
    field(box, "Numbered list", b.ordered, (v) => (b.ordered = v), {
      type: "checkbox",
    });
  if (b.type === "image") {
    field(
      box,
      "Picture",
      b.assetId,
      (v) => {
        attach(v);
        b.assetId = v;
      },
      {
        options: state.pack.assets.map((a) => [
          a.id,
          `${a.id} · ${a.width}×${a.height}`,
        ]),
      },
    );
    field(box, "Image description", b.alt, (v) => (b.alt = v));
    field(box, "Caption", b.caption, (v) => (b.caption = v));
    field(
      box,
      "Decorative picture",
      b.decorative,
      (v) => {
        b.decorative = v;
        if (v) b.alt = "";
      },
      { type: "checkbox" },
    );
    field(box, "Fit", b.fit, (v) => (b.fit = v), {
      options: [
        ["contain", "Show full picture"],
        ["cover", "Fill frame / crop"],
      ],
    });
    for (const axis of ["X", "Y"])
      field(
        box,
        `Focal ${axis} (0–1)`,
        b[`focal${axis}`],
        (v) => (b[`focal${axis}`] = Number(v)),
        { type: "number" },
      );
  }
  if (b.type === "gallery") {
    box.append(
      button("Add library picture", () => {
        try {
          mutate(() => {
            const image = makeBlock("image");
            delete image.id;
            delete image.type;
            b.entries.push(image);
          });
        } catch (e) {
          fail(e);
        }
      }),
    );
    b.entries.forEach((entry, i) => {
      const slot = node("div");
      field(
        slot,
        `Picture ${i + 1}`,
        entry.assetId,
        (v) => {
          attach(v);
          entry.assetId = v;
        },
        { options: state.pack.assets.map((a) => [a.id, a.id]) },
      );
      field(slot, "Description", entry.alt, (v) => (entry.alt = v));
      field(slot, "Caption", entry.caption, (v) => (entry.caption = v));
      field(
        slot,
        "Decorative picture",
        entry.decorative,
        (v) => {
          entry.decorative = v;
          if (v) entry.alt = "";
        },
        { type: "checkbox" },
      );
      field(slot, "Fit", entry.fit, (v) => (entry.fit = v), {
        options: [
          ["contain", "Show full picture"],
          ["cover", "Fill frame / crop"],
        ],
      });
      for (const axis of ["X", "Y"])
        field(
          slot,
          `Focal ${axis} (0–1)`,
          entry[`focal${axis}`],
          (v) => (entry[`focal${axis}`] = Number(v)),
          { type: "number" },
        );
      slot.append(
        button("Remove picture placement", () =>
          mutate(() => b.entries.splice(i, 1)),
        ),
      );
      box.append(slot);
    });
  }
  if (b.type === "table") {
    field(
      box,
      "Columns (one per line)",
      b.columns.join("\n"),
      (v) => (b.columns = v.split("\n")),
      { type: "textarea" },
    );
    field(
      box,
      "Rows (tab-separated columns)",
      b.rows.map((r) => r.join("\t")).join("\n"),
      (v) => (b.rows = v.split("\n").map((r) => r.split("\t"))),
      { type: "textarea" },
    );
  }
  if (b.type === "reference") {
    field(box, "Label", b.label, (v) => (b.label = v), { max: 120 });
    field(
      box,
      "Catalog record ID",
      b.target.recordId,
      (v) => (b.target.recordId = v),
      { max: 100 },
    );
  }
  if (b.type === "managed") {
    field(
      box,
      "Canonical section",
      b.projection,
      (v) => {
        b.projection = v;
      },
      {
        options: Object.entries(state.projections).map(([key, p]) => [
          key,
          p.title,
        ]),
      },
    );
    box.append(
      node(
        "p",
        "Reads current canonical data. Edit its facts under Data & requirements; this block does not copy them.",
      ),
    );
  }
  if (b.type === "group") {
    b.children.forEach((child, i) =>
      blockFields(box, child, b.children, i, true),
    );
    if (!nested) addControls(box, b.children, b.children.length);
  }
  // Move to a different section without dragging.
  const destination = node("select");
  destination.setAttribute("aria-label", "Move block to section");
  for (const s of state.document.sections) {
    const o = node("option", s.title);
    o.value = s.id;
    o.selected = s.id === selected;
    destination.append(o);
  }
  box.append(
    destination,
    button("Move to section", () =>
      mutate(() => {
        const target = state.document.sections.find(
          (s) => s.id === destination.value,
        );
        if (target && target.id !== selected) {
          blocks.splice(index, 1);
          target.blocks.push(b);
        }
      }),
    ),
  );
  parent.append(box);
  addControls(parent, blocks, index + 1);
}
function fields() {
  const panel = $("#pe-fields"),
    s = section();
  panel.replaceChildren();
  if (!s) {
    panel.append(node("p", "Add or select a section."));
    return;
  }
  const ids = [];
  const collect = (blocks) =>
    blocks.forEach((b) => {
      ids.push(b.id);
      if (b.type === "group") collect(b.children);
    });
  collect(s.blocks);
  if (!ids.includes(selectedBlock)) selectedBlock = s.blocks[0]?.id;
  field(
    panel,
    "Section title",
    s.title,
    (v) => {
      s.title = v;
      outline();
    },
    { max: 120 },
  );
  field(panel, "Layout", s.layout, (v) => (s.layout = v), {
    options: [
      ["stacked", "Stacked"],
      ["two-column", "Two columns"],
    ],
  });
  field(panel, "Start collapsed", s.collapsed, (v) => (s.collapsed = v), {
    type: "checkbox",
  });
  const actions = node("div");
  actions.className = "pe-actions";
  actions.append(
    button("Section up", () => moveSection(s.id, -1)),
    button("Section down", () => moveSection(s.id, 1)),
    button("Duplicate section", () =>
      mutate(() => {
        const copy = structuredClone(s);
        copy.id = newPageId("s");
        const renew = (b) => {
          b.id = newPageId("b");
          if (b.type === "steps")
            b.entries.forEach((e) => (e.id = newPageId("t")));
          if (b.type === "group") b.children.forEach(renew);
        };
        copy.blocks.forEach(renew);
        state.document.sections.push(copy);
        selected = copy.id;
      }),
    ),
    button("Remove section", () => {
      if (
        confirm(
          "Remove this section from the page? Shared pictures and canonical requirements will remain.",
        )
      )
        mutate(() => {
          state.document.sections = state.document.sections.filter(
            (v) => v.id !== s.id,
          );
          state.document.deletedAnchors = [
            ...new Set([...state.document.deletedAnchors, s.id]),
          ];
          selected = state.document.sections[0]?.id;
        });
    }),
  );
  panel.append(actions);
  addControls(panel, s.blocks, 0);
  s.blocks.forEach((b, i) => blockFields(panel, b, s.blocks, i));
  locks();
  experience?.fieldHints();
}
function providerFields(panel) {
  const text = node(
    "p",
    "Source fields use their own strict schema. Stable identities and downloaded image registrations stay read-only. Private ownership, extraction counts and camo completion are separate.",
  );
  panel.append(text);
  function walk(parent, obj, path = [], depth = 0) {
    for (const [key, value] of Object.entries(obj)) {
      if (["assetId", "assetIds", "imageDescriptions"].includes(key)) continue;
      const title = key.replace(/([A-Z])/g, " $1");
      if (value && typeof value === "object") {
        const details = node("details");
        details.append(node("summary", title));
        if (depth < 7) {
          if (Array.isArray(value))
            value.slice(0, 32).forEach((entry, index) => {
              const row = node("details");
              row.append(node("summary", entry?.name || `Entry ${index + 1}`));
              if (entry && typeof entry === "object")
                walk(row, entry, [...path, key, index], depth + 1);
              else
                field(
                  row,
                  title,
                  entry,
                  (v) =>
                    (obj[key][index] =
                      typeof entry === "number" ? Number(v) : v),
                );
              details.append(row);
            });
          else walk(details, value, [...path, key], depth + 1);
        } else
          details.append(
            node("p", "This nested source field is read-only here."),
          );
        parent.append(details);
      } else {
        const input = field(
          parent,
          title,
          value,
          (v) =>
            (obj[key] =
              typeof value === "number" || value === null
                ? v === ""
                  ? null
                  : Number(v)
                : v),
          {
            type:
              typeof value === "boolean"
                ? "checkbox"
                : typeof value === "number" || value === null
                  ? "number"
                  : "text",
            max: 2000,
          },
        );
        if (
          key === "id" ||
          ["image", "images"].some((part) => path.includes(part))
        ) {
          input.disabled = true;
          input.dataset.pageReadOnly = "true";
        }
        const joinedRoster =
          ["weapon-acquisition", "weapon-camos"].includes(
            state.target.adapter,
          ) &&
          path.length === 0 &&
          ["name", "category"].includes(key);
        const joinedAccess =
          state.target.adapter === "key-reference" &&
          path.length === 2 &&
          path[0] === "locations" &&
          ["name", "grid"].includes(key);
        if (joinedRoster || joinedAccess) {
          input.disabled = true;
          input.dataset.pageReadOnly = "true";
          input.parentElement.append(
            node(
              "small",
              joinedRoster
                ? "Read-only shared roster. Update content/weapon-acquisition.json and src/ui/weapon-camos.json together in the repository; this page does not coordinate those identities."
                : "Read-only shared access location. Update the key source and src/ui/key-access.json together in the repository; other key fields remain editable here.",
            ),
          );
        }
      }
    }
  }
  walk(panel, state.record);
}
function recordFields() {
  const panel = $("#pe-record-fields");
  panel.replaceChildren();
  if (state.group === "special") {
    providerFields(panel);
    experience?.fieldHints();
    return;
  }

  for (const key of [
    "name",
    "title",
    "description",
    "body",
    "category",
    "rarity",
    "grid",
  ]) {
    if (typeof state.record[key] === "string")
      field(panel, key, state.record[key], (v) => (state.record[key] = v), {
        type: ["description", "body"].includes(key) ? "textarea" : "text",
        max: ["description", "body"].includes(key) ? 4000 : 200,
      });
  }
  if (Array.isArray(state.record.steps)) {
    panel.append(node("h3", "Mission tasks"));
    let bulk;
    state.record.steps.forEach((step, index) => {
      const row = node("div");
      row.className = "pe-task-row";
      field(
        row,
        `Task ${index + 1}`,
        step,
        (value) => {
          state.record.steps[index] = value;
          if (bulk) bulk.value = state.record.steps.join("\n");
        },
        { type: "textarea", max: 2000 },
      );
      row.append(
        button(`Move task ${index + 1} up`, () =>
          mutate(() => {
            if (index > 0)
              [state.record.steps[index - 1], state.record.steps[index]] = [
                state.record.steps[index],
                state.record.steps[index - 1],
              ];
            recordFields();
          }),
        ),
        button(`Remove task ${index + 1}`, () =>
          mutate(() => {
            state.record.steps.splice(index, 1);
            recordFields();
          }),
        ),
      );
      panel.append(row);
    });
    panel.append(
      button("Add mission task", () =>
        mutate(() => {
          if (state.record.steps.length >= 100)
            throw Error("Mission task limit reached");
          state.record.steps.push("");
          recordFields();
        }),
      ),
    );
    const details = node("details");
    details.append(node("summary", "Edit tasks as text"));
    bulk = field(
      details,
      "Canonical mission steps (one per line)",
      state.record.steps.join("\n"),
      (v) => (state.record.steps = v.split("\n").filter(Boolean)),
      { type: "textarea", max: 16000 },
    );
    details.append(button("Update task controls", () => recordFields()));
    panel.append(details);
  }
  for (const key of ["requirementsKnown", "ingredientsKnown"])
    if (typeof state.record[key] === "boolean")
      field(panel, key, state.record[key], (v) => (state.record[key] = v), {
        type: "checkbox",
      });
  const requirements = state.record.requirements || state.record.inputs;
  if (requirements) {
    panel.append(node("h3", "Canonical required items"));
    const items = state.pack.items.map((i) => [i.id, i.name]);
    requirements.forEach((r, i) => {
      const box = node("div");
      box.className = "pe-block";
      field(box, `Item ${i + 1}`, r.itemId, (v) => (r.itemId = v), {
        options: items,
      });
      field(
        box,
        "Quantity",
        r.quantity,
        (v) => (r.quantity = v === "" ? null : Number(v)),
        { type: "number" },
      );
      if (Object.hasOwn(r, "consumption"))
        field(box, "Consumption", r.consumption, (v) => (r.consumption = v), {
          options: [
            ["consumed", "Consumed"],
            ["retained", "Retained"],
            ["unknown", "Unknown"],
          ],
        });
      else if (Object.hasOwn(r, "consumed"))
        field(box, "Consumed", r.consumed, (v) => (r.consumed = v), {
          type: "checkbox",
        });
      box.append(
        button("Remove requirement", () =>
          mutate(() => {
            requirements.splice(i, 1);
            recordFields();
          }),
        ),
      );
      panel.append(box);
    });
    panel.append(
      button("Add required item", () =>
        mutate(() => {
          requirements.push({
            itemId: state.pack.items[0].id,
            quantity: 1,
            ...(state.pack.schemaVersion === 1
              ? { consumed: true }
              : {
                  consumption: "unknown",
                  status:
                    state.record.status === "fictional"
                      ? "fictional"
                      : "unknown",
                  sourceIds: [],
                }),
          });
          recordFields();
        }),
      ),
    );
  }
  if (state.record.prerequisites)
    field(
      panel,
      "Prerequisite IDs (one per line)",
      state.record.prerequisites.join("\n"),
      (v) => (state.record.prerequisites = v.split("\n").filter(Boolean)),
      { type: "textarea" },
    );
  const attached = [
    state.record.assetId,
    ...(state.record.assetIds || []),
  ].filter(Boolean);
  if (attached.length) {
    panel.append(node("h3", "Attached pictures"));
    for (const id of attached)
      panel.append(
        button(`Detach ${id}`, () =>
          mutate(() => {
            if (state.record.assetId === id) {
              delete state.record.assetId;
              const next = state.record.assetIds?.shift();
              if (next) state.record.assetId = next;
            } else
              state.record.assetIds = state.record.assetIds.filter(
                (a) => a !== id,
              );
            if (state.record.imageDescriptions)
              state.record.imageDescriptions =
                state.record.imageDescriptions.filter((a) => a.assetId !== id);
            recordFields();
          }),
        ),
      );
  }
  const compact = node("div");
  compact.append(...panel.childNodes);
  panel.append(compact);
  const advanced = node("details"),
    summary = node("summary", "All structured record fields");
  advanced.append(summary);
  const host = node("div");
  host.innerHTML =
    '<select id="editor-section" hidden></select><label id="record-picker-label" hidden><select id="editor-record"></select></label><button id="add-record" hidden></button><button id="remove-record" hidden></button><div id="editor-fields"></div>';
  const group = state.group,
    index = state.pack[group].findIndex((r) => r.id === state.record.id),
    option = node("option", group);
  option.value = group;
  host.querySelector("#editor-section").append(option);
  const recordOption = node("option", state.record.name || state.record.title);
  recordOption.value = index;
  host.querySelector("#editor-record").append(recordOption);
  let editPack = structuredClone(state.pack);
  guided = createGuidedEditor({
    root: host,
    schema: state.schema,
    getDraft: () => {
      editPack[group][index] = state.record;
      return editPack;
    },
    mutateDraft: (fn) => {
      mutate(
        () => {
          editPack[group][index] = state.record;
          fn(editPack);
          state.record = editPack[group][index];
        },
        { rerender: false },
      );
    },
    isIdentityReadOnly: (path) => path.length === 3 && path.at(-1) === "id",
    onRender: () => {
      for (const input of host.querySelectorAll(
        "input[disabled],select[disabled],textarea[disabled]",
      ))
        input.dataset.pageReadOnly = "true";
      locks();
    },
    onError: fail,
    searchPlaceholder: "Search this catalog",
  });
  advanced.addEventListener("toggle", () => {
    if (!advanced.isConnected) return;
    compact.hidden = advanced.open;
    if (advanced.open) {
      editPack = structuredClone(state.pack);
      guided.renderFields();
    } else {
      recordFields();
      $("#pe-data summary").focus({ preventScroll: true });
    }
  });
  advanced.append(host);
  panel.append(advanced);
  panel.append(
    node(
      "p",
      "Chapter rewards and imported supplemental reports are owned by their source/chapter, not copied into this mission. Use the owning editor; they are read-only here.",
    ),
  );
  experience?.fieldHints();
}
async function restoreValue(v) {
  const epoch = generation,
    key = state.key;
  await validatePageRecovery(v);
  if (epoch !== generation || key !== state.key)
    throw Error("Recovery target changed; retained current draft");
  if (
    v.version !== 1 ||
    v.checkoutId !== state.checkoutId ||
    stableJSON(v.target) !== stableJSON(state.target)
  )
    throw Error("Recovery draft belongs to another checkout or record");
  if (v.baseRevision !== state.repositoryRevision)
    throw Error(
      "Recovery base differs from repository; export and compare before replacing this draft",
    );
  uploads.clear();
  for (const u of v.uploads || []) {
    uploads.set(u.asset.id, u);
    if (!state.pack.assets.some((a) => a.id === u.asset.id))
      state.pack.assets.push(u.asset);
  }
  pendingOperation = v.operation || null;
  blocked = !!pendingOperation;
  useSnapshot(v);
  refreshURLs();
}
function refreshURLs() {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  for (const u of uploads.values())
    urls.set(
      u.asset.id,
      URL.createObjectURL(
        new Blob([bytesFromBase64(u.base64)], { type: u.asset.mime }),
      ),
    );
  paintPreview();
}
async function upload() {
  const file = $("#pe-picture-file").files[0],
    s = section(),
    epoch = generation,
    target = state.key,
    baseRevision = state.repositoryRevision,
    mediaToken = ++assetIntent;
  mediaOwner.abort();
  mediaOwner = new AbortController();
  let prepared;
  try {
    if (!file || !s) throw Error("Choose a section and picture first");
    if (!$("#pe-rights").checked)
      throw Error("Confirm picture rights and privacy review first");
    if (file.size > 2097152) throw Error("Picture exceeds2MiB");
    const capture = {
      holder: $("#pe-holder").value.trim(),
      license: $("#pe-license").value.trim(),
      source: $("#pe-source").value.trim(),
      attribution: $("#pe-attribution").value.trim(),
    };
    if (
      !capture.holder ||
      !capture.license ||
      !capture.attribution ||
      !safeURL(capture.source)
    )
      throw Error(
        "Complete rights holder, license, attribution and safe source URL",
      );
    mediaBusy = true;
    locks();
    $("#pe-picture-status").textContent = "Normalizing picture…";
    prepared = await normalizeRaster(new Uint8Array(await file.arrayBuffer()), {
      signal: mediaOwner.signal,
      maxDimension: Number($("#pe-max-dimension")?.value || 1600),
      crop: $("#pe-crop-width")?.value
        ? {
            x: Number($("#pe-crop-x").value || 0),
            y: Number($("#pe-crop-y").value || 0),
            width: Number($("#pe-crop-width").value),
            height: Number($("#pe-crop-height").value),
          }
        : undefined,
    });
    if (
      generation !== epoch ||
      target !== state.key ||
      baseRevision !== state.repositoryRevision ||
      mediaToken !== assetIntent ||
      !state.document.sections.some((x) => x.id === s.id)
    )
      return;
    const identical = state.pack.assets.find(
      (a) => a.sha256 === prepared.sha256,
    );
    const id = identical?.id || `page:picture-${newPageId("b").slice(2)}`;
    const asset = identical || {
      id,
      path: `assets/${id.replace(":", "_")}.png`,
      mime: prepared.mime,
      sha256: prepared.sha256,
      bytes: prepared.bytes.length,
      width: prepared.width,
      height: prepared.height,
      rightsHolder: capture.holder,
      license: capture.license,
      sourceUrl: capture.source,
      attribution: capture.attribution,
      redistributionAllowed: true,
    };
    if (
      [...uploads.values()].reduce((n, u) => n + u.asset.bytes, 0) +
        (identical ? 0 : asset.bytes) >
      8388608
    )
      throw Error("Picture batch exceeds8MiB; save this batch first");
    mutate(() => {
      attach(id);
      if (!identical) {
        const u = { asset, base64: base64FromBytes(prepared.bytes) };
        uploads.set(id, u);
        state.pack.assets.push(asset);
      }
      const pictureBlock = {
        id: newPageId("b"),
        type: "image",
        assetId: id,
        alt: `Reference for ${state.record.name || state.record.title}`,
        decorative: false,
        caption: "",
        fit: "contain",
        focalX: 0.5,
        focalY: 0.5,
      };
      s.blocks.push(pictureBlock);
      selectedBlock = pictureBlock.id;
    });
    refreshURLs();
    experience?.mediaChanged();
    $("#pe-picture-status").textContent =
      "Picture added to draft; repository unchanged";
  } catch (e) {
    fail(e);
    if (mediaToken === assetIntent)
      $("#pe-picture-status").textContent = "Previous pictures retained";
  } finally {
    if (mediaToken === assetIntent) {
      mediaBusy = false;
      locks();
    }
  }
}
async function review() {
  if (experience && !experience.validate()) return;
  if (state?.baseChanged) {
    if (!$("#pe-base-review").checked) {
      fail(
        Error(
          "Compare the refreshed source and check the baseline review before continuing",
        ),
      );
      return;
    }
    if (state.document.baseFingerprint !== state.fingerprint)
      mutate(
        () => {
          state.document.baseFingerprint = state.fingerprint;
        },
        { rerender: false },
      );
  }
  busy = true;
  locks();
  const epoch = generation;
  try {
    await persist();
    const result = await api(
      "/api/page-edits/preview",
      {
        target: state.target,
        record: state.record,
        contentVersion: $("#pe-version").value,
        document: state.document,
        uploads: [...uploads.values()].filter((u) =>
          [state.record.assetId, ...(state.record.assetIds || [])].includes(
            u.asset.id,
          ),
        ),
        repositoryRevision: state.repositoryRevision,
        pageRevision: state.pageRevision,
      },
      owner.signal,
    );
    if (epoch !== generation) return;
    preview = result;
    state.projections = result.projections;
    paintPreview();
    $("#pe-review").hidden = false;
    $("#pe-impact").textContent =
      `${result.semanticChange ? "Canonical facts changed; normal explicit profile version rebind may be needed." : "Layout / presentation change."} Verification: ${result.record.status || "source-specific"}. ${result.canonicalMetadataChange ? "Canonical catalog metadata/version changed; review profile binding." : ""} Content version: ${result.contentVersion}. ${result.review}`;
    $("#pe-affected").replaceChildren(
      ...result.affected.map((r) => node("li", `${r.name} · ${r.id}`)),
    );
    status("Reviewed · ready to save to repository");
    experience?.reviewed(result);
  } catch (e) {
    fail(e);
  } finally {
    busy = false;
    locks();
  }
}
async function reconcile() {
  if (!pendingOperation) return;
  const epoch = generation,
    targetKey = state.key;
  busy = true;
  locks();
  try {
    const result = await api(
      `/api/page-edits/operations/${pendingOperation.operationId}`,
    );
    if (result.state === "committed") {
      if (epoch !== generation || targetKey !== state.key) return result;
      const latest = await api(
        "/api/page-edits/record?" + new URLSearchParams(location.search),
      );
      if (epoch !== generation || targetKey !== state.key) return result;
      state = latest;
      $("#pe-version").value = state.pack.contentVersion;
      uploads.clear();
      refreshURLs();
      history = [];
      future = [];
      selected = state.document.sections.some((s) => s.id === selected)
        ? selected
        : state.document.sections[0]?.id;
      outline();
      fields();
      recordFields();
      pendingOperation = null;
      blocked = false;
      dirty = false;
      preview = null;
      status("Saved to repository · rebuild reader to update public pages");
      $("#pe-saved-preview").hidden = false;
      $("#pe-saved-preview").href =
        state.group === "special"
          ? "/page-preview" + location.search
          : `/preview?packKey=${encodeURIComponent(state.target.scope.packKey)}&id=${encodeURIComponent(state.target.recordId)}`;
      await persist();
      experience?.saved(result);
    } else if (result.state === "not-committed") {
      pendingOperation = null;
      blocked = false;
      preview = null;
      status(
        "Save cancelled or rejected · draft retained; reload repository before reviewing again",
      );
      await persist();
    } else {
      blocked = true;
      fail(
        Error(
          "Save outcome unresolved. Keep this draft; check status, or resolve the author recovery journal before cancellation.",
        ),
      );
    }
    return result;
  } catch (e) {
    blocked = true;
    fail(e);
  } finally {
    busy = false;
    locks();
  }
}
async function save() {
  if (!preview || busy || blocked) return;
  const captured = preview;
  pendingOperation = {
    operationId: newPageId("o").slice(2),
    target: state.target,
    expectedRevision: captured.expectedRevision,
    expectedDocumentRevision: captured.expectedDocumentRevision,
    previewDigest: captured.previewDigest,
  };
  busy = true;
  locks();
  const epoch = generation,
    target = state.key,
    operation = pendingOperation;
  try {
    const stored = await persist();
    if (
      !stored?.written ||
      stored.operationId !== operation.operationId ||
      epoch !== generation ||
      target !== state.key ||
      pendingOperation !== operation ||
      !owner.signal ||
      owner.signal.aborted
    )
      throw Error(
        "Save cancelled before submission: retain this draft and check its operation status before retrying",
      );
    await api("/api/page-edits/commit", operation);
    return await reconcile();
  } catch (e) {
    blocked = true;
    fail(e);
    $("#pe-recovery").hidden = false;
    status("Save outcome unresolved · draft and operation retained");
  } finally {
    busy = false;
    locks();
  }
}
function download(value, name) {
  const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    ),
    a = node("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function exportBundle(mode) {
  try {
    const { makePageBundle } = await import("../domain/page-bundle.mjs");
    const bundle = await makePageBundle({
      state,
      document: state.document,
      mode,
      bytes: async (id) =>
        uploads.has(id)
          ? bytesFromBase64(uploads.get(id).base64)
          : new Uint8Array(await (await fetch(imageURL(id))).arrayBuffer()),
    });
    download(bundle, `guide-page-${mode}.json`);
  } catch (e) {
    fail(e);
  }
}
async function load() {
  loading = true;
  const epoch = ++generation;
  owner.abort();
  owner = new AbortController();
  const t = new URLSearchParams(location.search);
  const loaded = await api(
    "/api/page-edits/record?" + t,
    undefined,
    owner.signal,
  );
  if (epoch !== generation) return;
  state = loaded;
  $("#pe-title").textContent =
    `Edit ${state.record.name || state.record.title || state.target.recordId}`;
  $("#pe-identity").textContent =
    `${state.mediaPackKey || state.target.scope.packKey} · ${state.target.recordId} · saves to this repository`;
  $("#pe-version").value = state.pack.contentVersion;
  $("#pe-return").href =
    state.group === "special"
      ? "/page-preview" + location.search
      : `/preview?packKey=${encodeURIComponent(state.target.scope.packKey)}&id=${encodeURIComponent(state.target.recordId)}`;
  $("#pe-structured").hidden = state.group === "special";
  $("#pe-structured").href =
    "/?" + new URLSearchParams({ ...Object.fromEntries(t), intent: "edit" });
  selected = state.document.sections[0]?.id;
  outline();
  fields();
  recordFields();
  paintPreview();
  $("#pe-base-review-label").hidden = !state.baseChanged;
  if (state.baseChanged)
    fail(
      Error(
        "Source changed since this page was customized. Compare all managed sections before reviewing and saving.",
      ),
    );
  try {
    availableRecovery = await readRecovery();
    if (epoch !== generation) return;
    if (
      availableRecovery &&
      (!Number.isSafeInteger(availableRecovery.sequence) ||
        availableRecovery.sequence < 1 ||
        availableRecovery.value?.version !== 1)
    ) {
      blocked = true;
      $("#pe-recovery").hidden = false;
      throw Error(
        "Recovery storage contains unsupported data. Original retained; export it before changing this record.",
      );
    }
    if (availableRecovery?.value)
      await validatePageRecovery(availableRecovery.value);
    if (epoch !== generation) return;
    recoverySequence = availableRecovery?.sequence || 0;
    if (
      availableRecovery?.value &&
      (availableRecovery.value.dirty || availableRecovery.value.operation)
    ) {
      $("#pe-recovery").hidden = false;
      if (availableRecovery.value.operation) {
        pendingOperation = availableRecovery.value.operation;
        blocked = true;
        await reconcile();
      }
    }
  } catch (e) {
    blocked = true;
    fail(e);
  }
  status(
    blocked
      ? "Resolve previous save operation first"
      : "Ready · no repository changes",
  );
  loading = false;
  locks();
  experience?.loaded();
}
$("#pe-add-section").addEventListener("click", () =>
  mutate(() => {
    const s = {
      id: newPageId("s"),
      title: "New section",
      kind: "custom",
      slot: null,
      layout: "stacked",
      collapsed: false,
      blocks: [{ id: newPageId("b"), type: "paragraph", text: "" }],
    };
    state.document.sections.push(s);
    selected = s.id;
  }),
);
$("#pe-undo").addEventListener("click", () => {
  if (!history.length || busy || blocked) return;
  future.push(snapshot());
  useSnapshot(history.pop());
});
$("#pe-redo").addEventListener("click", () => {
  if (!future.length || busy || blocked) return;
  history.push(snapshot());
  useSnapshot(future.pop());
});
$("#pe-version").addEventListener("input", () => {
  if (!busy && !blocked) changed();
});
$("#pe-validate").addEventListener("click", () => void review());
$("#pe-save").addEventListener("click", () => void save());
$("#pe-upload").addEventListener("click", () => void upload());
$("#pe-restore").addEventListener("click", async () => {
  try {
    if (!availableRecovery?.value || busy || pendingOperation) return;
    checkpoint();
    await restoreValue(availableRecovery.value);
    $("#pe-recovery").hidden = true;
  } catch (e) {
    fail(e);
  }
});
$("#pe-discard-recovery").addEventListener("click", () => {
  if (!pendingOperation) $("#pe-recovery").hidden = true;
});
$("#pe-check-operation").addEventListener("click", () => void reconcile());
$("#pe-cancel-operation").addEventListener("click", async () => {
  if (!pendingOperation || busy) return;
  try {
    await api(
      `/api/page-edits/operations/${pendingOperation.operationId}/cancel`,
      {},
    );
    await reconcile();
  } catch (e) {
    fail(e);
  }
});
$("#pe-export-original-recovery").addEventListener("click", () => {
  if (availableRecovery)
    download(availableRecovery, "original-page-editor-recovery.json");
});
$("#pe-export-recovery").addEventListener("click", () =>
  download(
    { format: "dmz-page-editor-recovery", version: 1, value: draftValue() },
    "private-page-editor-recovery.json",
  ),
);
$("#pe-export").addEventListener(
  "click",
  () => void exportBundle("self-contained"),
);
$("#pe-export-refs").addEventListener(
  "click",
  () => void exportBundle("references-only"),
);
$("#pe-picture-file").addEventListener("change", () => {
  assetIntent++;
  mediaOwner.abort();
  mediaBusy = false;
  locks();
});
$("#pe-import").addEventListener("change", async (event) => {
  const file = event.target.files[0],
    epoch = generation,
    current = state.key,
    base = state.repositoryRevision,
    request = ++importIntent;
  try {
    if (!file || file.size > 20971520) throw Error("Page import exceeds20MiB");
    const text = await file.text();
    if (epoch !== generation || request !== importIntent) return;
    const raw = parseBounded(text, 20971520, {
      depth: 20,
      nodes: 40000,
      string: 2796204,
    });
    if (raw.format === "dmz-page-editor-recovery") {
      if (
        raw.version !== 1 ||
        Object.keys(raw).sort().join() !== "format,value,version" ||
        raw.value?.version !== 1
      )
        throw Error("Unsupported recovery draft");
      if (JSON.stringify(raw.value.target) !== JSON.stringify(state.target))
        throw Error("Recovery draft belongs to another record");
      if (raw.value.baseRevision !== state.repositoryRevision)
        throw Error(
          "Recovery base changed; keep original and compare it with current source before restoring",
        );
      if (raw.value.checkoutId !== state.checkoutId && raw.value.operation)
        throw Error(
          "A pending operation belongs to its original checkout; do not replay it here",
        );
      imported = { mode: "recovery-draft", value: raw.value };
      $("#pe-import-review").textContent =
        "Unfinished draft with canonical fields and prepared pictures. Apply only after reviewing its original base and destination.";
      locks();
      return;
    }
    const { validatePageBundle } = await import("../domain/page-bundle.mjs");
    const bundle = await validatePageBundle(raw);
    const { preparePageImport } = await import("./page-editor-media.mjs");
    const prepared = await preparePageImport(bundle, state.pack.assets, {
      signal: owner.signal,
    });
    if (
      epoch !== generation ||
      current !== state.key ||
      base !== state.repositoryRevision ||
      request !== importIntent
    )
      return;
    imported = { ...bundle, prepared };
    $("#pe-import-review").textContent =
      `${bundle.mode} · ${bundle.document.sections.length} sections · ${bundle.assets.length} pictures. ${prepared.missing.length ? "Missing pictures: " + prepared.missing.join(", ") + ". Application blocked until resolved." : "Pictures admitted for a draft preview."} ${prepared.mapping.map((m) => m.from + " → " + m.to + (m.normalized ? " (normalized)" : "")).join("; ")} ${JSON.stringify(bundle.target) !== JSON.stringify(state.target) ? "Different target; open its exact editor." : bundle.base.semanticFingerprint !== state.fingerprint ? "Different source base: current canonical facts will be retained; review all managed sections." : "Original target and source base match."}`;
    locks();
  } catch (e) {
    imported = null;
    locks();
    fail(e);
  }
});
$("#pe-apply-import").addEventListener("click", async () => {
  try {
    if (!imported || busy || blocked) return;
    if (imported.mode === "recovery-draft") {
      if (
        !confirm(
          "Restore this unfinished draft? Repository files will remain unchanged.",
        )
      )
        return;
      checkpoint();
      await restoreValue({ ...imported.value, checkoutId: state.checkoutId });
      imported = null;
      locks();
      return;
    }
    if (JSON.stringify(imported.target) !== JSON.stringify(state.target))
      throw Error("Bundle belongs to another record");
    if (imported.prepared.missing.length)
      throw Error(
        "Resolve missing picture IDs before importing; saved placements retained",
      );
    if (imported.prepared.uploads.length && !$("#pe-rights").checked)
      throw Error(
        "Review imported picture privacy/rights and check the picture confirmation before applying",
      );
    const added = imported.prepared.uploads,
      total =
        [...uploads.values()].reduce((n, u) => n + u.asset.bytes, 0) +
        added.reduce((n, u) => n + u.asset.bytes, 0);
    if (total > 8388608)
      throw Error("Prepared pictures exceed8MiB; import a smaller batch");
    const next = restorePageDocument(
      state.document,
      imported.prepared.document,
    );
    next.revision = state.document.revision;
    const incoming = pageAssets(next),
      current = [state.record.assetId, ...(state.record.assetIds || [])].filter(
        Boolean,
      );
    if (new Set([...current, ...incoming]).size > 9)
      throw Error(
        "Detach unused picture references under Data & requirements before importing more than nine",
      );
    mutate(() => {
      for (const u of added) {
        uploads.set(u.asset.id, u);
        if (!state.pack.assets.some((a) => a.id === u.asset.id))
          state.pack.assets.push(u.asset);
      }
      incoming.forEach(attach);
      state.document = next;
    });
    if (next.baseFingerprint !== state.fingerprint) {
      state.baseChanged = true;
      $("#pe-base-review-label").hidden = false;
      $("#pe-base-review").checked = false;
    }
    refreshURLs();
    imported = null;
    $("#pe-import-review").textContent =
      "Imported layout applied to this draft. Review and save to commit it.";
    locks();
  } catch (e) {
    fail(e);
  }
});
document.querySelectorAll("[data-pe-tab]").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll("[data-pe-tab]")
      .forEach((n) => n.setAttribute("aria-pressed", String(n === b)));
    document
      .querySelectorAll("[data-pe-panel]")
      .forEach((n) =>
        n.classList.toggle("pe-active", n.dataset.pePanel === b.dataset.peTab),
      );
  }),
);
$("[data-pe-panel=preview]").classList.add("pe-active");
const comparison = node("details"),
  comparisonTitle = node(
    "summary",
    "Compare current repository with this draft",
  ),
  comparisonContent = node("div");
comparison.className = "panel pe-comparison";
comparison.append(
  comparisonTitle,
  button("Load current comparison", async () => {
    if (!state || loading || busy) return;
    const epoch = generation,
      target = state.key;
    try {
      const latest = await api(
        "/api/page-edits/record?" + new URLSearchParams(location.search),
        undefined,
        owner.signal,
      );
      if (epoch !== generation || target !== state.key) return;
      comparisonContent.replaceChildren(
        node(
          "p",
          "Comparison only. Nothing is merged or saved. Export an unfinished draft before reloading; source removal or unresolved conflicts require a separate decision.",
        ),
      );
      for (const [title, record] of [
        ["Current repository", latest.record],
        ["Your retained draft", state.record],
      ]) {
        const section = node("section"),
          pre = node("pre", JSON.stringify(record, null, 2));
        section.append(node("h3", title), pre);
        comparisonContent.append(section);
      }
      const changes = node(
        "p",
        latest.fingerprint === state.fingerprint
          ? "Source fingerprint matches the draft baseline."
          : "Source fingerprint changed. Keep the draft export and compare the current fields before accepting a new baseline.",
      );
      comparisonContent.prepend(changes);
    } catch (error) {
      fail(
        Error(
          "Current source unavailable or removed. Your draft is retained. " +
            error.message,
        ),
      );
    }
  }),
  comparisonContent,
);
$("#pe-error").after(comparison);
document.addEventListener("pointerdown", () => intent++, true);
document.addEventListener("keydown", () => intent++, true);
window.addEventListener("beforeunload", (event) => {
  if (dirty || pendingOperation) {
    event.preventDefault();
    event.returnValue = "";
  }
});
window.addEventListener("pagehide", () => {
  generation++;
  owner.abort();
  mediaOwner.abort();
  assetIntent++;
  importIntent++;
  clearTimeout(saveTimer);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    owner = new AbortController();
    busy = false;
    if (pendingOperation) void reconcile();
    else {
      preview = null;
      locks();
    }
  }
});
experience = installEditorExperience({
  state: () => state,
  generation: () => generation,
  locked: () => busy || blocked || loading || mediaBusy,
  hasReview: () => !!preview,
  selection: () => ({ sectionId: selected, blockId: selectedBlock }),
  select: (sectionId, blockId) => {
    selected = sectionId;
    selectedBlock = blockId;
    outline();
    fields();
  },
  mutate,
  outline,
  attach,
  imageURL,
  api,
  fail,
  save,
  review,
  draft: draftValue,
  download,
  checkOperation: async (operation) => {
    if (busy) return;
    pendingOperation = operation;
    blocked = true;
    $("#pe-recovery").hidden = false;
    return reconcile();
  },
  restore: async (value) => {
    if (busy || blocked || loading || pendingOperation)
      throw Error(
        "Resolve the current operation before restoring another draft",
      );
    const epoch = generation,
      key = state.key,
      next = structuredClone(value);
    await validatePageRecovery(next);
    if (epoch !== generation || key !== state.key)
      throw Error(
        "Draft changed while reading this snapshot; compare it again",
      );
    if (next.operation)
      throw Error("Check the interrupted Save before applying this checkpoint");
    const mapping = new Map();
    for (const upload of next.uploads) {
      const current = state.pack.assets.find((a) => a.id === upload.asset.id);
      if (current && current.sha256 !== upload.asset.sha256) {
        const replacement = `page:picture-${newPageId("b").slice(2)}`;
        mapping.set(upload.asset.id, replacement);
        upload.asset.id = replacement;
        upload.asset.path = `assets/${replacement.replace(":", "_")}.png`;
      }
    }
    const remap = (id) => mapping.get(id) || id;
    const walk = (b) => {
      if (b.type === "image") b.assetId = remap(b.assetId);
      if (b.type === "gallery")
        b.entries.forEach((p) => (p.assetId = remap(p.assetId)));
      if (b.type === "group") b.children.forEach(walk);
    };
    next.document.sections.forEach((s) => s.blocks.forEach(walk));
    if (next.record.assetId) next.record.assetId = remap(next.record.assetId);
    if (next.record.assetIds)
      next.record.assetIds = next.record.assetIds.map(remap);
    if (next.record.imageDescriptions)
      next.record.imageDescriptions.forEach(
        (p) => (p.assetId = remap(p.assetId)),
      );
    const available = new Set([
      ...state.pack.assets.map((a) => a.id),
      ...next.uploads.map((u) => u.asset.id),
    ]);
    for (const id of [
      ...pageAssets(next.document),
      next.record.assetId,
      ...(next.record.assetIds || []),
    ].filter(Boolean))
      if (!available.has(id))
        throw Error(
          "Snapshot picture is missing from the current library: " + id,
        );
    const retained = new Map([...uploads]);
    for (const u of next.uploads) retained.set(u.asset.id, u);
    if ([...retained.values()].reduce((n, u) => n + u.asset.bytes, 0) > 8388608)
      throw Error(
        "Restoring while retaining current prepared pictures would exceed8MiB. Export/save the current draft first.",
      );
    const oldFingerprint = next.document.baseFingerprint;
    const facts = (record) => {
      const { assetId, assetIds, imageDescriptions, ...value } = record;
      return stableJSON(value);
    };
    if (
      ["verified", "observed"].includes(next.record.status) &&
      facts(next.record) !== facts(state.record)
    )
      next.record.status = "unknown";
    next.document = restorePageDocument(state.document, next.document);
    next.document.revision = state.document.revision;
    next.baseRevision = state.repositoryRevision;
    next.baseDocumentRevision = state.document.revision;
    next.fingerprint = state.fingerprint;
    next.contentVersion = state.pack.contentVersion;
    checkpoint();
    await restoreValue(next);
    for (const [id, u] of retained) if (!uploads.has(id)) uploads.set(id, u);
    if (oldFingerprint !== state.fingerprint) {
      state.baseChanged = true;
      $("#pe-base-review-label").hidden = false;
      $("#pe-base-review").checked = false;
    }
    refreshURLs();
    recordFields();
    experience?.mediaChanged();
  },
});
try {
  token = (await (await fetch("/api/session")).json()).token;
  await load();
} catch (e) {
  fail(e);
  status("Editor unavailable · saved repository retained");
}
