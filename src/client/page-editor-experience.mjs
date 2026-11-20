import {
  editorChanges,
  workspacePreferences,
  friendlyLabel,
  templateSection,
  freshSection,
  validatePattern,
  instantiatePattern,
  parsePatterns,
  pageIssues,
} from "../domain/editor-experience.mjs";
import {
  newPageId,
  pageAssets,
  stableJSON,
  restorePageDocument,
  validatePageDocument,
} from "../domain/page-document.mjs";
import { validatePageRecovery } from "../domain/page-recovery.mjs";
import { decodeBitmap } from "./raster-editor.mjs";
import { imageInfo } from "../content/portable.mjs";

const $ = (selector) => document.querySelector(selector),
  el = (tag, text) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  },
  uid = () => newPageId("o").slice(2);
const action = (label, fn) => {
  const b = el("button", label);
  b.type = "button";
  b.addEventListener("click", () =>
    Promise.resolve()
      .then(fn)
      .catch((e) =>
        window.dispatchEvent(
          new CustomEvent("page-editor-tool-error", { detail: e }),
        ),
      ),
  );
  return b;
};
const valueText = (value) =>
  value === null
    ? "Unknown / not recorded"
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

export function installEditorExperience(ctx) {
  let preferences;
  try {
    preferences = workspacePreferences(
      JSON.parse(localStorage.getItem("dmz-editor-workspace-v1") || "null"),
    );
  } catch {
    preferences = workspacePreferences(null);
  }
  let baseline = null,
    loadedKey = null,
    lastSection = null,
    chosen = new Set(),
    patterns = [],
    originalPatterns = null,
    invalidPatterns = false,
    pendingPatterns = null,
    restore = null,
    diskRevision = null,
    diskMetadata = null,
    diskReady = false,
    diskConflict = false,
    diskWriting = false,
    diskQueued = false,
    diskTimer = null,
    diskOwner = 0,
    patternIntent = 0,
    restoreIntent = 0,
    historyIntent = 0,
    loadedOwner = 0,
    stopped = false,
    writerId;
  let refreshJob = null,
    refreshEpoch = 0,
    bitmap = null,
    bitmapEpoch = 0,
    bitmapOwner = new AbortController(),
    toolsOwner = new AbortController(),
    cropStart = null;
  try {
    writerId = sessionStorage.getItem("dmz-editor-writer-v1") || uid();
    sessionStorage.setItem("dmz-editor-writer-v1", writerId);
  } catch {
    writerId = uid();
  }
  const patternKey = "dmz-editor-patterns-v1",
    prefKey = "dmz-editor-workspace-v1";
  const savePreferences = () => {
    try {
      localStorage.setItem(prefKey, JSON.stringify(preferences));
    } catch {
      $("#pe-disk-status").textContent =
        "Workspace preference storage is unavailable; page recovery is separate.";
    }
  };
  const tools = (
    action,
    target = ctx.state()?.target,
    id,
    signal = toolsOwner.signal,
  ) =>
    ctx.api(
      "/api/page-edits/tools?" +
        new URLSearchParams({
          action,
          ...(target ? { target: JSON.stringify(target) } : {}),
          ...(id ? { id } : {}),
        }),
      undefined,
      signal,
    );
  const post = (action, args) =>
    ctx.api("/api/page-edits/tools", { action, ...args }, toolsOwner.signal);
  function tab(name) {
    document.querySelector(`[data-pe-tab="${name}"]`)?.click();
  }
  function applyWorkspace() {
    const grid = $(".pe-grid");
    grid.style.setProperty(
      "--pe-outline-width",
      preferences.outlineWidth + "px",
    );
    grid.style.setProperty(
      "--pe-inspector-width",
      preferences.inspectorWidth + "px",
    );
    grid.dataset.outlineCollapsed = String(preferences.outlineCollapsed);
    grid.dataset.inspectorCollapsed = String(preferences.inspectorCollapsed);
    for (const type of ["outline", "inspector"]) {
      const button = $("#pe-toggle-" + type),
        collapsed = preferences[type + "Collapsed"];
      button.textContent =
        (collapsed ? "Show " : "Hide ") +
        (type === "outline" ? "outline" : "controls");
      button.setAttribute("aria-pressed", String(collapsed));
      $("#pe-" + type + "-width").value = preferences[type + "Width"];
    }
    for (const handle of document.querySelectorAll("[data-pe-resize]")) {
      handle.setAttribute("aria-valuemin", "180");
      handle.setAttribute("aria-valuemax", "520");
      handle.setAttribute(
        "aria-valuenow",
        String(preferences[handle.dataset.peResize + "Width"]),
      );
    }
  }
  function mode(name, { focus = false } = {}) {
    preferences.mode = name;
    $(".pe-inspector").dataset.mode = name;
    document
      .querySelectorAll("[data-pe-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.peMode === name)),
      );
    $("#pe-controls-title").textContent = {
      content: "Page content",
      layout: "Selected section",
      photos: "Pictures & captions",
    }[name];
    if (name === "content") $("#pe-data").open = true;
    if (name === "layout") $("#pe-data").open = false;
    if (name === "photos") $("#pe-photos").open = true;
    savePreferences();
    if (focus) {
      preferences.inspectorCollapsed = false;
      applyWorkspace();
      tab("fields");
      (name === "photos"
        ? $("#pe-picture-file")
        : name === "content"
          ? $("#pe-record-fields input,#pe-record-fields textarea")
          : $("#pe-fields input")
      )?.focus({ preventScroll: true });
    }
  }
  function showErrors(issues) {
    clearErrors();
    const list = $("#pe-errors ul");
    for (const issue of issues) {
      const li = el("li"),
        button = action(issue.message, () => {
          if (issue.sectionId) ctx.select(issue.sectionId, issue.blockId);
          const content = !issue.sectionId;
          mode(content ? "content" : "layout");
          preferences.inspectorCollapsed = false;
          applyWorkspace();
          tab("fields");
          let control = [
            ...document.querySelectorAll(
              content ? "#pe-record-fields label" : "#pe-fields label",
            ),
          ]
            .find((label) => label.dataset.peLabel === issue.field)
            ?.querySelector("input,textarea,select");
          if (!control && issue.field === "Content version") {
            control = $("#pe-version");
            $("#pe-advanced").open = true;
          }
          if (control) {
            for (let p = control.parentElement; p; p = p.parentElement)
              if (p.tagName === "DETAILS") p.open = true;
            control.setAttribute("aria-invalid", "true");
            control.focus();
            control.scrollIntoView({ block: "center" });
          } else {
            $("#pe-data").open = true;
            $("#pe-data summary").focus();
          }
        });
      li.append(button);
      list.append(li);
      const labels = [
        ...document.querySelectorAll(
          issue.sectionId ? "#pe-fields label" : "#pe-record-fields label",
        ),
      ].filter((n) => n.dataset.peLabel === issue.field);
      for (const label of labels) {
        if (
          issue.sectionId &&
          issue.blockId &&
          label.closest("[data-block-id]")?.dataset.blockId !== issue.blockId
        )
          continue;
        const input = label.querySelector("input,select,textarea"),
          message = el("small", "Error: " + issue.message);
        message.className = "pe-inline-error";
        message.id = "pe-issue-" + uid();
        label.append(message);
        input?.setAttribute("aria-invalid", "true");
        input?.setAttribute("aria-describedby", message.id);
      }
    }
    $("#pe-errors").hidden = false;
    $("#pe-errors").focus({ preventScroll: true });
  }
  function clearErrors() {
    $("#pe-errors").hidden = true;
    $("#pe-errors ul").replaceChildren();
    document.querySelectorAll(".pe-inline-error").forEach((n) => n.remove());
    document.querySelectorAll('[aria-invalid="true"]').forEach((n) => {
      n.removeAttribute("aria-invalid");
      n.removeAttribute("aria-describedby");
    });
  }
  function error(reason) {
    const message = reason.message || String(reason);
    let field = "Data & requirements";
    if (/version/i.test(message)) field = "Content version";
    else if (/quantity/i.test(message)) field = "Quantity";
    showErrors([{ sectionId: null, blockId: null, field, message }]);
  }
  function validate() {
    const state = ctx.state();
    if (!state) return false;
    const issues = pageIssues(state.document, state.record);
    if (issues.length) {
      showErrors(issues);
      return false;
    }
    return true;
  }
  function renderDiff(host, before, after) {
    host.replaceChildren();
    const result = editorChanges(before, after);
    if (!result.changes.length) {
      host.append(el("p", "No differences in this comparison."));
      return;
    }
    const table = el("table"),
      caption = el("caption", "Before and after"),
      head = el("thead"),
      tr = el("tr");
    for (const label of ["Field / section", "Before", "After"]) {
      const th = el("th", label);
      th.scope = "col";
      tr.append(th);
    }
    head.append(tr);
    table.append(caption, head);
    const body = el("tbody");
    for (const change of result.changes) {
      const row = el("tr"),
        th = el("th", change.label);
      th.scope = "row";
      row.append(
        th,
        el(
          "td",
          change.beforePresent
            ? valueText(change.before)
            : "Not previously recorded",
        ),
        el("td", change.afterPresent ? valueText(change.after) : "Removed"),
      );
      body.append(row);
    }
    table.append(body);
    const scroll = el("div");
    scroll.className = "page-table";
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute("aria-label", "Changes to this page");
    scroll.append(table);
    host.append(scroll);
    if (result.omitted)
      host.append(
        el(
          "p",
          `${result.omitted} additional changes are not shown. Export the draft for the complete content.`,
        ),
      );
  }
  function reviewed(result) {
    if (baseline)
      renderDiff($("#pe-readable-diff"), baseline, {
        record: result.record,
        sections: result.document.sections,
      });
  }
  function paint() {
    const state = ctx.state();
    if (!state) return;
    $("#pe-preview")
      .querySelectorAll("[data-pe-block]")
      .forEach((block) => {
        block.tabIndex = 0;
        block.setAttribute("role", "group");
        block.setAttribute(
          "aria-label",
          "Edit " + block.dataset.peType + " block",
        );
        block.dataset.selected = String(
          block.dataset.peBlock === ctx.selection().blockId,
        );
      });
    $("#pe-preview")
      .querySelectorAll(".page-section")
      .forEach(
        (section) =>
          (section.dataset.selected = String(
            section.id === ctx.selection().sectionId,
          )),
      );
  }
  function outline() {
    const state = ctx.state();
    if (!state) return;
    const active = new Set(state.document.sections.map((s) => s.id));
    chosen = new Set([...chosen].filter((id) => active.has(id)));
    const query = $("#pe-outline-search").value.toLocaleLowerCase();
    for (const li of $("#pe-sections").children) {
      const button = li.querySelector("button[data-section-id]"),
        id = button?.dataset.sectionId;
      if (!id) continue;
      li.hidden =
        !!query && !button.textContent.toLocaleLowerCase().includes(query);
      for (const old of li.querySelectorAll(':scope > input[type="checkbox"]'))
        old.remove();
      const check = el("input");
      check.type = "checkbox";
      check.checked = chosen.has(id);
      check.setAttribute("aria-label", "Select section " + button.textContent);
      check.addEventListener("change", () => {
        if (check.checked) chosen.add(id);
        else chosen.delete(id);
        $("#pe-selection-count").textContent = `${chosen.size} selected`;
      });
      li.prepend(check);
    }
    $("#pe-selection-count").textContent = `${chosen.size} selected`;
    paint();
  }
  function batch(kind) {
    if (ctx.locked()) return;
    const ids = new Set(chosen),
      state = ctx.state();
    if (!ids.size) throw Error("Select at least one section.");
    if (
      kind === "duplicate" &&
      state.document.sections.some((s) => ids.has(s.id) && s.kind !== "custom")
    )
      throw Error(
        "Duplicate custom sections. Canonical sections can be moved instead.",
      );
    if (
      kind === "remove" &&
      !confirm(
        "Remove selected sections? Canonical facts and shared pictures stay in their owning records.",
      )
    )
      return;
    ctx.mutate(() => {
      const sections = state.document.sections;
      if (kind === "duplicate") {
        const next = sections.flatMap((s) =>
          ids.has(s.id) ? [s, freshSection(s)] : [s],
        );
        if (next.length > 32)
          throw Error("This page can contain at most32 sections.");
        state.document.sections = next;
      }
      if (kind === "remove") {
        if (ids.size === sections.length)
          throw Error("Keep at least one page section.");
        state.document.deletedAnchors = [
          ...new Set([...state.document.deletedAnchors, ...ids]),
        ];
        state.document.sections = sections.filter((s) => !ids.has(s.id));
      }
      if (kind === "up")
        for (let i = 1; i < sections.length; i++)
          if (ids.has(sections[i].id) && !ids.has(sections[i - 1].id))
            [sections[i - 1], sections[i]] = [sections[i], sections[i - 1]];
      if (kind === "down")
        for (let i = sections.length - 2; i >= 0; i--)
          if (ids.has(sections[i].id) && !ids.has(sections[i + 1].id))
            [sections[i + 1], sections[i]] = [sections[i], sections[i + 1]];
      validatePageDocument(state.document);
    });
  }
  function patternList() {
    const select = $("#pe-patterns");
    select.replaceChildren();
    patterns.forEach((p, i) => {
      const option = el("option", p.name);
      option.value = i;
      select.append(option);
    });
  }
  function writePatterns() {
    if (invalidPatterns)
      throw Error(
        "Export the retained layout library and explicitly reset it before replacing unsupported data.",
      );
    if (localStorage.getItem(patternKey) !== originalPatterns)
      throw Error(
        "Another tab changed the reusable library. Export this draft library and reload before replacing it.",
      );
    const value = { version: 1, patterns };
    if (new TextEncoder().encode(JSON.stringify(value)).length > 524288)
      throw Error(
        "Reusable layouts exceed512KiB. Export or remove old layouts.",
      );
    const encoded = JSON.stringify(value);
    localStorage.setItem(patternKey, encoded);
    originalPatterns = encoded;
    patternList();
  }
  function fieldHints() {
    const state = ctx.state();
    if (!state) return;
    for (const label of document.querySelectorAll(
      "#pe-record-fields label,#pe-fields label",
    )) {
      if (!label.dataset.peLabel)
        label.dataset.peLabel = label.firstChild?.textContent?.trim() || "";
      const input = label.querySelector("input,textarea,select");
      if (!input) continue;
      if (!input.id) input.id = "pe-field-" + uid();
      if (label.firstChild?.nodeType === Node.TEXT_NODE)
        label.firstChild.textContent = friendlyLabel(label.dataset.peLabel);
      if (
        input.tagName === "SELECT" &&
        input.options.length > 12 &&
        !label.previousElementSibling?.matches("[data-pe-reference-search]")
      ) {
        const search = el("input");
        search.type = "search";
        search.placeholder = "Find an option…";
        search.dataset.peReferenceSearch = "true";
        search.setAttribute(
          "aria-label",
          "Find " + friendlyLabel(label.dataset.peLabel),
        );
        search.addEventListener("input", () => {
          const query = search.value.toLocaleLowerCase();
          for (const option of input.options)
            option.hidden =
              option.value !== input.value &&
              !option.textContent.toLocaleLowerCase().includes(query);
        });
        label.before(search);
      }
    }
    $("#pe-page-type-help").textContent =
      state.group === "special"
        ? "Edit the selected source reference. Shared identities remain read-only; your ownership and counters stay separate."
        : state.record.steps
          ? "Edit mission tasks, requirements and prerequisites here. Walkthrough sections and photos live under Layout and Photos."
          : state.record.track === "dmz-upgrade"
            ? "Edit upgrade costs, prerequisites and descriptions. This never checks off an upgrade or spends inventory."
            : state.record.inputs
              ? "Edit recipe ingredients and quantities here. Layout notes do not change crafting calculations."
              : "Edit this reference's name, description and relationships. Your saved collection stays separate.";
  }
  function changed() {
    restoreIntent++;
    patternIntent++;
    if (pendingPatterns) {
      pendingPatterns = null;
      $("#pe-pattern-apply").disabled = true;
      $("#pe-pattern-status").textContent =
        "Layout import review expired after editing. Select the file again.";
    }
    restore = null;
    $("#pe-restore-apply").disabled = true;
    $("#pe-restore-review").hidden = true;
    $("#pe-restore-confirm").checked = false;
    clearTimeout(diskTimer);
    if (!stopped) diskTimer = setTimeout(() => void checkpointDisk(), 2200);
    const current = ctx.selection().sectionId;
    if (lastSection !== current && ctx.state()) {
      lastSection = current;
      mode("layout");
    }
  }
  // Persistence/media implementations below use the same exact-target core hooks.
  async function diskLoad() {
    const state = ctx.state();
    if (!state || stopped || document.visibilityState === "hidden") return;
    const owner = ++loadedOwner,
      key = state.key;
    try {
      const meta = await tools("checkpoint", state.target);
      if (stopped || owner !== loadedOwner || ctx.state()?.key !== key) return;
      diskMetadata = meta;
      diskRevision = meta.revision;
      diskReady = true;
      diskConflict =
        !!meta.previous?.invalid ||
        (!!meta.current &&
          (meta.current.invalid ||
            (meta.current.dirty && meta.current.writerId !== writerId)));
      $("#pe-disk-status").textContent = meta.current?.invalid
        ? "A retained checkpoint needs inspection. Export it before clearing; automatic disk writes are paused."
        : diskConflict
          ? "Another browser/tab has an unfinished disk checkpoint. Compare it before replacing it."
          : meta.current
            ? "Disk checkpoint: " + meta.current.updatedAt
            : "No disk checkpoint yet. Browser recovery remains separate.";
      $("#pe-disk-replace").hidden =
        !diskConflict || !!meta.current?.invalid || !!meta.previous?.invalid;
      diskActions();
    } catch (e) {
      if (stopped || owner !== loadedOwner || ctx.state()?.key !== key) return;
      diskReady = false;
      $("#pe-disk-status").textContent =
        "Disk checkpoint unavailable: " +
        e.message +
        " Browser recovery still works.";
      diskActions();
    }
  }
  async function checkpointDisk() {
    if (
      document.visibilityState === "hidden" ||
      stopped ||
      !diskReady ||
      diskConflict ||
      !$("#pe-disk-enabled").checked ||
      !ctx.state()
    )
      return;
    if (diskWriting) {
      diskQueued = true;
      return;
    }
    if (ctx.locked()) return;
    diskWriting = true;
    const state = ctx.state(),
      owner = diskOwner,
      epoch = ctx.generation(),
      key = state.key,
      value = ctx.draft();
    try {
      const saved = await post("checkpoint-save", {
        target: state.target,
        expectedRevision: diskRevision,
        writerId,
        value,
      });
      if (stopped || owner !== diskOwner || key !== ctx.state()?.key) return;
      diskRevision = saved.revision;
      diskMetadata = {
        revision: saved.revision,
        previous: diskMetadata?.current || null,
        current: {
          revision: saved.revision,
          writerId,
          updatedAt: saved.updatedAt,
          dirty: value.dirty,
          invalid: false,
        },
      };
      if (!stopped && key === ctx.state()?.key) diskActions();
      if (!stopped && key === ctx.state()?.key && epoch === ctx.generation())
        $("#pe-disk-status").textContent =
          "Disk checkpoint saved · " + saved.updatedAt;
      else diskQueued = true;
    } catch (e) {
      if (stopped || owner !== diskOwner || key !== ctx.state()?.key) return;
      diskConflict = true;
      $("#pe-disk-status").textContent =
        "Disk writes paused: " + e.message + " Browser draft retained.";
      $("#pe-disk-replace").hidden = false;
    } finally {
      diskWriting = false;
      if (diskQueued && !stopped) {
        diskQueued = false;
        void checkpointDisk();
      }
    }
  }
  function diskActions() {
    const host = $("#pe-disk-actions");
    host.replaceChildren();
    host.append(action("Reload checkpoint status", () => diskLoad()));
    for (const [label, entry] of [
      ["Current", diskMetadata?.current],
      ["Previous", diskMetadata?.previous],
    ])
      if (entry) {
        host.append(
          action("Export " + label.toLowerCase() + " checkpoint", async () => {
            const result = await tools(
              "checkpoint-export",
              ctx.state().target,
              entry.revision,
            );
            ctx.download(
              {
                format: "dmz-original-disk-checkpoint",
                version: 1,
                text: result.text,
              },
              "original-disk-checkpoint.json",
            );
          }),
        );
        if (!entry.invalid)
          host.append(
            action(
              "Compare " + label.toLowerCase() + " checkpoint",
              async () => {
                await compareSnapshot(
                  "checkpoint",
                  ctx.state().target,
                  entry.revision,
                  label + " disk checkpoint",
                );
              },
            ),
          );
      }
  }
  async function historyList() {
    const state = ctx.state();
    if (!state || stopped || document.visibilityState === "hidden") return;
    const key = state.key,
      request = ++historyIntent,
      host = $("#pe-history-list");
    try {
      const result = await tools("history", state.target);
      if (stopped || request !== historyIntent || ctx.state()?.key !== key)
        return;
      host.replaceChildren();
      for (const row of [...result.snapshots].reverse()) {
        const article = el("div");
        article.className = "pe-history-row";
        article.append(
          el(
            "span",
            `${row.kind === "before" ? "Original" : "Saved"} revision ${row.revision} · ${row.createdAt}`,
          ),
          action("Compare revision " + row.revision, async () => {
            await compareSnapshot(
              "history",
              state.target,
              row.id,
              "Saved revision " + row.revision,
            );
          }),
          action("Delete revision " + row.revision, async () => {
            if (
              confirm(
                "Delete this local history snapshot? Current page content stays unchanged.",
              )
            ) {
              await post("history-prune", {
                target: state.target,
                ids: [row.id],
                confirmed: true,
              });
              await historyList();
            }
          }),
        );
        host.append(article);
      }
      if (!result.snapshots.length)
        host.append(
          el(
            "p",
            "Saved revisions will appear after the next repository save.",
          ),
        );
    } catch (e) {
      if (stopped || request !== historyIntent || ctx.state()?.key !== key)
        return;
      host.replaceChildren(el("p", "History unavailable: " + e.message));
    }
  }
  async function compareSnapshot(action, target, id, label) {
    const intent = ++restoreIntent,
      epoch = ctx.generation(),
      key = ctx.state()?.key,
      current = () =>
        !stopped &&
        intent === restoreIntent &&
        epoch === ctx.generation() &&
        key === ctx.state()?.key;
    // A newly requested comparison invalidates the previous Apply immediately.
    restore = null;
    $("#pe-restore-apply").disabled = true;
    $("#pe-restore-confirm").checked = false;
    try {
      const result = await tools(action, target, id);
      if (current())
        stageRestore(result.value, result.referencedAssets || [], label);
    } catch (e) {
      if (current()) ctx.fail(e);
    }
  }
  function stageRestore(value, referencedAssets, label) {
    const state = ctx.state();
    if (
      stableJSON(value.target) !== stableJSON(state.target) ||
      value.checkoutId !== state.checkoutId
    )
      throw Error("Snapshot belongs to another page or checkout.");
    const missing = referencedAssets.filter(
      (r) =>
        !r.sha256 ||
        !state.pack.assets.some((a) => a.id === r.id && a.sha256 === r.sha256),
    );
    restore = {
      value: structuredClone(value),
      referencedAssets,
      epoch: ctx.generation(),
      key: state.key,
      missing,
    };
    $("#pe-restore-review").hidden = false;
    $("#pe-history").open = true;
    $("#pe-restore-confirm").checked = false;
    $("#pe-restore-apply").disabled = true;
    $("#pe-restore-description").textContent =
      label +
      ". Restores into a draft only." +
      (missing.length
        ? " Missing/unverified referenced pictures: " +
          missing.map((r) => r.id).join(", ")
        : "") +
      (value.operation
        ? " This checkpoint includes an interrupted Save; check its status first."
        : "");
    $("#pe-restore-operation").hidden = !value.operation;
    renderDiff(
      $("#pe-restore-diff"),
      { record: state.record, sections: state.document.sections },
      { record: value.record, sections: value.document.sections },
    );
  }
  async function applyRestore() {
    const captured = restore;
    if (
      !captured ||
      !$("#pe-restore-confirm").checked ||
      captured.missing.length ||
      captured.value.operation ||
      ctx.locked()
    )
      return;
    if (
      captured.epoch !== ctx.generation() ||
      captured.key !== ctx.state()?.key
    )
      throw Error(
        "Draft changed since comparison. Compare the snapshot again.",
      );
    await ctx.restore(captured.value);
    $("#pe-restore-review").hidden = true;
    $("#pe-disk-status").textContent =
      "Snapshot restored into this draft. Review facts, source baseline and version before saving.";
  }
  function library() {
    const state = ctx.state(),
      host = $("#pe-library");
    if (!state) return;
    host.replaceChildren();
    const q = $("#pe-library-search").value.toLocaleLowerCase();
    for (const asset of state.pack.assets
      .filter(
        (a) =>
          a.mime === "image/png" &&
          a.width <= 2048 &&
          a.height <= 2048 &&
          a.bytes <= 2097152 &&
          /^[a-f0-9]{64}$/.test(a.sha256 || "") &&
          a.redistributionAllowed === true &&
          a.rightsHolder &&
          a.license &&
          a.attribution &&
          (a.id + " " + a.attribution).toLocaleLowerCase().includes(q),
      )
      .slice(0, 30)) {
      const button = action("", () => {
        if (ctx.locked()) return;
        ctx.mutate(() => {
          let s = ctx
            .state()
            .document.sections.find((s) => s.id === ctx.selection().sectionId);
          if (!s) {
            s = templateSection("location");
            ctx.state().document.sections.push(s);
            ctx.select(s.id);
          }
          ctx.attach(asset.id);
          const picture = {
            id: newPageId("b"),
            type: "image",
            assetId: asset.id,
            alt: "Reference picture",
            decorative: false,
            caption: "",
            fit: "contain",
            focalX: 0.5,
            focalY: 0.5,
          };
          s.blocks.push(picture);
          ctx.select(s.id, picture.id);
          validatePageDocument(ctx.state().document);
        });
        mode("layout");
      });
      const image = el("img");
      image.src = ctx.imageURL(asset.id);
      image.alt = "";
      image.loading = "lazy";
      button.append(
        image,
        el(
          "span",
          asset.attribution + " · " + asset.width + "×" + asset.height,
        ),
      );
      button.setAttribute("aria-label", "Insert " + button.textContent);
      host.append(button);
    }
    if (!host.children.length)
      host.append(
        el("p", "No eligible pictures match. Upload your picture above."),
      );
  }
  async function cropFile(reset = true) {
    const file = $("#pe-picture-file").files[0],
      epoch = ++bitmapEpoch;
    bitmapOwner.abort();
    bitmapOwner = new AbortController();
    bitmap?.close();
    bitmap = null;
    $("#pe-crop-preview").hidden = true;
    $("#pe-crop-help").hidden = true;
    if (!file) return;
    try {
      if (file.size > 20971520) throw Error("Picture exceeds20MiB input limit");
      const bytes = new Uint8Array(await file.arrayBuffer()),
        info = imageInfo(bytes),
        decoded = await decodeBitmap(bytes, info.mime, bitmapOwner.signal);
      if (stopped || epoch !== bitmapEpoch) {
        decoded.close();
        return;
      }
      bitmap = decoded;
      if (reset) {
        $("#pe-crop-x").value = 0;
        $("#pe-crop-y").value = 0;
        $("#pe-crop-width").value = "";
        $("#pe-crop-height").value = "";
      }
      $("#pe-crop-preview").hidden = false;
      $("#pe-crop-help").hidden = false;
      $("#pe-picture-quality").textContent =
        `Original ${bitmap.width}×${bitmap.height}. Smaller images may look blurry when enlarged. Normalization keeps the configured output limit.`;
      drawCrop();
    } catch (e) {
      if (epoch === bitmapEpoch && !bitmapOwner.signal.aborted)
        $("#pe-picture-quality").textContent = e.message;
    }
  }
  function drawCrop() {
    if (!bitmap) return;
    const canvas = $("#pe-crop-preview"),
      scale = Math.min(640 / bitmap.width, 400 / bitmap.height, 1);
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const c = canvas.getContext("2d");
    c.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if ($("#pe-crop-width").value) {
      const x = Number($("#pe-crop-x").value),
        y = Number($("#pe-crop-y").value),
        w = Number($("#pe-crop-width").value),
        h = Number($("#pe-crop-height").value);
      c.strokeStyle = "#ffdf82";
      c.lineWidth = 3;
      c.strokeRect(x * scale, y * scale, w * scale, h * scale);
    }
  }
  async function refresh(operationId) {
    if (stopped) return;
    const epoch = ++refreshEpoch,
      key = ctx.state()?.key,
      requestId = uid();
    try {
      sessionStorage.setItem(
        "dmz-editor-refresh-v1",
        JSON.stringify({ id: requestId, key }),
      );
    } catch {}
    try {
      const result = await post("refresh", {
        savedOperationId: operationId,
        requestId,
      });
      if (stopped || epoch !== refreshEpoch || ctx.state()?.key !== key) return;
      refreshJob = result;
      try {
        sessionStorage.setItem(
          "dmz-editor-refresh-v1",
          JSON.stringify({ id: result.id, key }),
        );
      } catch {}
      await pollRefresh(result.id, epoch, key);
    } catch (e) {
      if (stopped || epoch !== refreshEpoch || ctx.state()?.key !== key) return;
      $("#pe-refresh-status").textContent =
        "Repository save status is unchanged. Reader refresh unavailable: " +
        e.message;
    }
  }
  async function pollRefresh(id, epoch, key) {
    while (!stopped && epoch === refreshEpoch && ctx.state()?.key === key) {
      const job = await readRefresh(id, epoch, key);
      if (stopped || epoch !== refreshEpoch || ctx.state()?.key !== key) return;
      refreshJob = job;
      $("#pe-refresh-status").textContent = job.message;
      if (job.state !== "running") return;
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }
  async function readRefresh(id, epoch, key) {
    const deadline = Date.now() + 15000,
      controller = new AbortController(),
      parent = toolsOwner.signal,
      abort = () => controller.abort(),
      timer = setTimeout(abort, 15000),
      timedOut = () =>
        Error(
          "Reader refresh status timed out. The saved page is unchanged; use Check refresh status to check again.",
        );
    parent.addEventListener("abort", abort, { once: true });
    if (parent.aborted) abort();
    try {
      while (!stopped && epoch === refreshEpoch && ctx.state()?.key === key) {
        if (Date.now() >= deadline || controller.signal.aborted)
          throw timedOut();
        try {
          return await tools("refresh", undefined, id, controller.signal);
        } catch (error) {
          if (stopped || epoch !== refreshEpoch || ctx.state()?.key !== key)
            return;
          if (controller.signal.aborted || Date.now() >= deadline)
            throw timedOut();
          if (error.status !== 409 || error.code !== "REPOSITORY_BUSY")
            throw error;
          $("#pe-refresh-status").textContent =
            "Reader refresh is capturing repository files. Checking again…";
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(700, deadline - Date.now())),
          );
        }
      }
    } finally {
      clearTimeout(timer);
      parent.removeEventListener("abort", abort);
    }
  }
  async function checkRefresh() {
    const epoch = ++refreshEpoch,
      key = ctx.state()?.key;
    try {
      let cached;
      try {
        cached = JSON.parse(
          sessionStorage.getItem("dmz-editor-refresh-v1") || "null",
        );
      } catch {}
      const job = await readRefresh(
        cached?.key === key ? cached.id : undefined,
        epoch,
        key,
      );
      if (stopped || epoch !== refreshEpoch || ctx.state()?.key !== key) return;
      if (!job) {
        $("#pe-refresh-status").textContent =
          "No reader refresh has been recorded for this checkout.";
        return;
      }
      await pollRefresh(job.id, epoch, key);
    } catch (e) {
      if (!stopped && epoch === refreshEpoch && ctx.state()?.key === key)
        $("#pe-refresh-status").textContent = e.message;
    }
  }
  async function loaded() {
    const state = ctx.state();
    if (!state || stopped) return;
    diskOwner++;
    restoreIntent++;
    diskReady = false;
    diskRevision = null;
    diskMetadata = null;
    diskConflict = false;
    baseline = {
      record: structuredClone(state.record),
      sections: structuredClone(state.document.sections),
    };
    lastSection = ctx.selection().sectionId;
    loadedKey = state.key;
    chosen.clear();
    fieldHints();
    applyWorkspace();
    mode(preferences.mode);
    library();
    outline();
    try {
      originalPatterns = localStorage.getItem(patternKey);
      patterns = parsePatterns(
        originalPatterns || '{"version":1,"patterns":[]}',
        state.target,
      ).patterns;
    } catch (e) {
      patterns = [];
      invalidPatterns = true;
      $("#pe-pattern-status").textContent =
        "Retained layout library unavailable: " + e.message;
      const reset = action("Reset retained layout library…", () => {
        if (
          confirm(
            "Reset this retained reusable library? Export the original first. Existing pages stay unchanged.",
          )
        ) {
          localStorage.removeItem(patternKey);
          originalPatterns = null;
          invalidPatterns = false;
          patterns = [];
          patternList();
          reset.remove();
        }
      });
      $("#pe-pattern-status").after(reset);
    }
    patternList();
    void diskLoad();
    void historyList();
    try {
      const prior = JSON.parse(
        sessionStorage.getItem("dmz-editor-refresh-v1") || "null",
      );
      if (prior?.key === state.key) void checkRefresh();
    } catch {}
  }
  async function saved(receipt) {
    if (stopped) return receipt;
    diskOwner++;
    restoreIntent++;
    diskReady = false;
    void diskLoad();
    baseline = {
      record: structuredClone(ctx.state().record),
      sections: structuredClone(ctx.state().document.sections),
    };
    void historyList();
    library();
    clearTimeout(diskTimer);
    diskTimer = setTimeout(() => void checkpointDisk(), 350);
    return receipt;
  }
  function locks() {
    const disabled = ctx.locked() || !ctx.hasReview();
    $("#pe-save-refresh").disabled = disabled;
    for (const button of document.querySelectorAll(
      "#pe-add-template,#pe-pattern-insert,#pe-next-version,[data-pe-batch]",
    ))
      button.disabled = ctx.locked();
  }

  window.addEventListener("page-editor-tool-error", (event) =>
    ctx.fail(event.detail),
  );
  document
    .querySelectorAll("[data-pe-mode]")
    .forEach((b) => b.addEventListener("click", () => mode(b.dataset.peMode)));
  for (const type of ["outline", "inspector"]) {
    $("#pe-toggle-" + type).addEventListener("click", () => {
      preferences[type + "Collapsed"] = !preferences[type + "Collapsed"];
      applyWorkspace();
      savePreferences();
    });
    $("#pe-" + type + "-width").addEventListener("input", (e) => {
      preferences[type + "Width"] = Number(e.target.value);
      applyWorkspace();
      savePreferences();
    });
  }
  document.querySelectorAll("[data-pe-resize]").forEach((handle) => {
    handle.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const key = handle.dataset.peResize + "Width",
        direction =
          (event.key === "ArrowRight" ? 1 : -1) *
          (handle.dataset.peResize === "outline" ? 1 : -1);
      preferences[key] = Math.max(
        180,
        Math.min(520, preferences[key] + direction * 10),
      );
      applyWorkspace();
      savePreferences();
    });
    handle.addEventListener("pointerdown", (event) => {
      const start = event.clientX,
        type = handle.dataset.peResize,
        width = preferences[type + "Width"];
      handle.setPointerCapture(event.pointerId);
      const move = (e) => {
        preferences[type + "Width"] = Math.max(
          180,
          Math.min(
            520,
            width + (e.clientX - start) * (type === "outline" ? 1 : -1),
          ),
        );
        applyWorkspace();
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        savePreferences();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up, { once: true });
    });
  });
  $("#pe-preview").addEventListener("click", (event) => {
    if (event.target.closest("a") && $("#pe-follow-links").checked) return;
    event.preventDefault();
    const section = event.target.closest(".page-section"),
      block = event.target.closest("[data-pe-block]");
    if (
      !section ||
      !ctx.state()?.document.sections.some((s) => s.id === section.id)
    )
      return;
    ctx.select(section.id, block?.dataset.peBlock);
    mode(block?.dataset.peType === "managed" ? "content" : "layout", {
      focus: true,
    });
    paint();
  });
  $("#pe-preview").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("[data-pe-block]")) {
      event.preventDefault();
      event.target.click();
    }
  });
  $("#pe-outline-search").addEventListener("input", () => ctx.outline());
  $("#pe-select-all").addEventListener("click", () => {
    chosen = new Set(
      [...$("#pe-sections").children]
        .filter((li) => !li.hidden)
        .map((li) => li.querySelector("[data-section-id]").dataset.sectionId),
    );
    ctx.outline();
  });
  $("#pe-select-none").addEventListener("click", () => {
    chosen.clear();
    ctx.outline();
  });
  document.querySelectorAll("[data-pe-batch]").forEach((b) =>
    b.addEventListener("click", () => {
      try {
        batch(b.dataset.peBatch);
      } catch (e) {
        ctx.fail(e);
      }
    }),
  );
  $("#pe-add-template").addEventListener("click", () => {
    if (ctx.locked()) return;
    ctx.mutate(() => {
      if (ctx.state().document.sections.length >= 32)
        throw Error("This page already has32 sections");
      const s = templateSection($("#pe-template").value);
      ctx.state().document.sections.push(s);
      ctx.select(s.id);
    });
    mode("layout");
  });
  $("#pe-pattern-save").addEventListener("click", () => {
    try {
      const state = ctx.state(),
        ids = chosen.size ? chosen : new Set([ctx.selection().sectionId]),
        pattern = {
          version: 1,
          name: $("#pe-pattern-name").value.trim(),
          sections: state.document.sections
            .filter((s) => ids.has(s.id))
            .map(freshSection),
        };
      validatePattern(pattern, state.target);
      if (patterns.length >= 12)
        throw Error("Remove a saved layout before adding more than12");
      patterns.push(pattern);
      writePatterns();
      $("#pe-pattern-status").textContent = "Reusable layout saved locally.";
    } catch (e) {
      ctx.fail(e);
    }
  });
  $("#pe-pattern-insert").addEventListener("click", () => {
    try {
      if (ctx.locked()) return;
      const state = ctx.state(),
        pattern = patterns[Number($("#pe-patterns").value)],
        sections = instantiatePattern(
          pattern,
          state.target,
          state.pack.assets.map((a) => a.id),
        );
      if (state.document.sections.length + sections.length > 32)
        throw Error("Inserted layout would exceed32 sections");
      ctx.mutate(() => {
        state.document.sections.push(...sections);
        validatePageDocument(state.document);
      });
      mode("layout");
    } catch (e) {
      ctx.fail(e);
    }
  });
  $("#pe-pattern-delete").addEventListener("click", () => {
    if (
      confirm(
        "Delete this saved reusable layout? Existing pages stay unchanged.",
      )
    ) {
      patterns.splice(Number($("#pe-patterns").value), 1);
      try {
        writePatterns();
      } catch (e) {
        ctx.fail(e);
      }
    }
  });
  $("#pe-pattern-export").addEventListener("click", () =>
    ctx.download(
      invalidPatterns
        ? {
            format: "dmz-original-pattern-library",
            version: 1,
            text: originalPatterns,
          }
        : { version: 1, patterns },
      "reusable-page-layouts.json",
    ),
  );
  $("#pe-pattern-import").addEventListener("change", async (event) => {
    const request = ++patternIntent,
      epoch = ctx.generation(),
      key = ctx.state()?.key;
    pendingPatterns = null;
    $("#pe-pattern-apply").disabled = true;
    try {
      const file = event.target.files[0];
      if (!file || file.size > 524288)
        throw Error("Pattern library exceeds512KiB");
      const text = await file.text();
      if (
        stopped ||
        request !== patternIntent ||
        epoch !== ctx.generation() ||
        key !== ctx.state()?.key
      )
        return;
      pendingPatterns = parsePatterns(text, ctx.state().target);
      $("#pe-pattern-status").textContent =
        `Reviewed ${pendingPatterns.patterns.length} custom layouts. Apply replaces this browser's reusable library; current page stays unchanged.`;
      $("#pe-pattern-apply").disabled = false;
    } catch (e) {
      if (
        stopped ||
        request !== patternIntent ||
        epoch !== ctx.generation() ||
        key !== ctx.state()?.key
      )
        return;
      pendingPatterns = null;
      ctx.fail(e);
    }
  });
  $("#pe-pattern-apply").addEventListener("click", () => {
    if (pendingPatterns) {
      patterns = pendingPatterns.patterns;
      pendingPatterns = null;
      try {
        writePatterns();
        $("#pe-pattern-apply").disabled = true;
        $("#pe-pattern-status").textContent =
          "Reusable library applied. Current page unchanged.";
      } catch (e) {
        ctx.fail(e);
      }
    }
  });
  $("#pe-next-version").addEventListener("click", () => {
    if (ctx.locked()) return;
    const input = $("#pe-version");
    input.value =
      ctx.state().pack.contentVersion.slice(0, 65) +
      ".local." +
      new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  $("#pe-history-refresh").addEventListener("click", () => void historyList());
  $("#pe-show-history").addEventListener("click", () => {
    $("#pe-history").open = !$("#pe-history").open;
    if ($("#pe-history").open)
      $("#pe-history").scrollIntoView({ block: "start" });
  });
  $("#pe-disk-replace").addEventListener("click", async () => {
    const owner = diskOwner,
      key = ctx.state()?.key,
      epoch = ctx.generation();
    if (
      confirm(
        "Replace the current disk checkpoint with this draft? Its previous version remains available.",
      )
    ) {
      if (
        stopped ||
        owner !== diskOwner ||
        key !== ctx.state()?.key ||
        epoch !== ctx.generation() ||
        diskMetadata?.current?.invalid ||
        diskMetadata?.previous?.invalid
      )
        return;
      diskConflict = false;
      void checkpointDisk();
    }
  });
  $("#pe-disk-clear").addEventListener("click", async () => {
    const owner = diskOwner,
      key = ctx.state()?.key;
    try {
      if (
        !confirm(
          "Clear both disk checkpoints? Canonical content and browser recovery stay unchanged.",
        )
      )
        return;
      await post("checkpoint-clear", {
        target: ctx.state().target,
        expectedRevision: diskRevision,
        confirmed: true,
      });
      if (!stopped && owner === diskOwner && key === ctx.state()?.key)
        await diskLoad();
    } catch (e) {
      if (stopped || owner !== diskOwner || key !== ctx.state()?.key) return;
      $("#pe-disk-status").textContent = e.message;
    }
  });
  $("#pe-restore-confirm").addEventListener("change", () => {
    $("#pe-restore-apply").disabled =
      !restore ||
      restore.missing.length > 0 ||
      !!restore.value.operation ||
      !$("#pe-restore-confirm").checked;
  });
  $("#pe-restore-apply").addEventListener(
    "click",
    () => void applyRestore().catch(ctx.fail),
  );
  $("#pe-restore-cancel").addEventListener("click", () => {
    restoreIntent++;
    restore = null;
    $("#pe-restore-review").hidden = true;
  });
  $("#pe-restore-export").addEventListener("click", () => {
    if (restore)
      ctx.download(
        {
          format: "dmz-page-editor-recovery",
          version: 1,
          value: restore.value,
        },
        "retained-page-snapshot.json",
      );
  });
  $("#pe-restore-operation").addEventListener("click", () => {
    if (restore?.value.operation)
      void ctx.checkOperation(restore.value.operation);
  });
  $("#pe-save-refresh").addEventListener("click", async () => {
    if (ctx.locked() || !ctx.hasReview()) return;
    const receipt = await ctx.save();
    if (receipt?.state === "committed") await refresh(receipt.operationId);
  });
  $("#pe-refresh-retry").addEventListener("click", () => void refresh(null));
  $("#pe-refresh-retry").after(action("Check refresh status", checkRefresh));
  $("#pe-library-search").addEventListener("input", library);
  $("#pe-picture-file").addEventListener("change", () => void cropFile());
  const drop = $("#pe-picture-drop");
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.dataset.drag = "true";
  });
  drop.addEventListener("dragleave", () => delete drop.dataset.drag);
  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    delete drop.dataset.drag;
    if (ctx.locked()) return;
    const files = event.dataTransfer.files;
    if (files.length !== 1) {
      ctx.fail(Error("Drop one picture at a time."));
      return;
    }
    const data = new DataTransfer();
    data.items.add(files[0]);
    $("#pe-picture-file").files = data.files;
    $("#pe-picture-file").dispatchEvent(new Event("change", { bubbles: true }));
    mode("photos");
  });
  const canvas = $("#pe-crop-preview");
  const point = (event) => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(
          bitmap.width - 1,
          Math.round(
            ((event.clientX - bounds.left) / bounds.width) * bitmap.width,
          ),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          bitmap.height - 1,
          Math.round(
            ((event.clientY - bounds.top) / bounds.height) * bitmap.height,
          ),
        ),
      ),
    };
  };
  canvas.addEventListener("pointerdown", (event) => {
    if (!bitmap || ctx.locked()) return;
    cropStart = point(event);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!bitmap || !cropStart) return;
    const p = point(event);
    $("#pe-crop-x").value = Math.min(p.x, cropStart.x);
    $("#pe-crop-y").value = Math.min(p.y, cropStart.y);
    $("#pe-crop-width").value = Math.max(1, Math.abs(p.x - cropStart.x));
    $("#pe-crop-height").value = Math.max(1, Math.abs(p.y - cropStart.y));
    drawCrop();
  });
  canvas.addEventListener("pointerup", () => (cropStart = null));
  ["x", "y", "width", "height"].forEach((key) =>
    $("#pe-crop-" + key).addEventListener("input", drawCrop),
  );
  $("#pe-reset-crop").addEventListener("click", () => {
    $("#pe-crop-x").value = 0;
    $("#pe-crop-y").value = 0;
    $("#pe-crop-width").value = "";
    $("#pe-crop-height").value = "";
    drawCrop();
  });
  document.addEventListener("keydown", (event) => {
    const typing = event.target.matches(
      "input,textarea,select,[contenteditable=true]",
    );
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (ctx.hasReview()) void ctx.save();
      else void ctx.review();
    }
    if (
      !typing &&
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "z"
    ) {
      event.preventDefault();
      $(event.shiftKey ? "#pe-redo" : "#pe-undo").click();
    }
  });
  // WebKit can run timers while an anchor navigation is already leaving the
  // document, before pagehide arrives. Do not start a background disk POST in
  // that interval. Browser recovery and explicit Save remain independent.
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (
      !event.defaultPrevented &&
      link &&
      !link.download &&
      (!link.target || link.target === "_self") &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey &&
      new URL(link.href).pathname !== location.pathname
    )
      clearTimeout(diskTimer);
  });
  window.addEventListener("beforeunload", () => {
    clearTimeout(diskTimer);
    // Abort optional reads before WebKit changes the document's security
    // context. A fresh owner also permits retry if the user cancels leaving.
    toolsOwner.abort();
    toolsOwner = new AbortController();
  });
  window.addEventListener("pagehide", () => {
    stopped = true;
    restoreIntent++;
    historyIntent++;
    toolsOwner.abort();
    diskOwner++;
    patternIntent++;
    pendingPatterns = null;
    $("#pe-pattern-apply").disabled = true;
    loadedOwner++;
    refreshEpoch++;
    bitmapEpoch++;
    bitmapOwner.abort();
    bitmap?.close();
    bitmap = null;
    $("#pe-crop-preview").hidden = true;
    clearTimeout(diskTimer);
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      stopped = false;
      toolsOwner = new AbortController();
      void diskLoad();
      if ($("#pe-picture-file").files[0]) void cropFile(false);
    }
  });
  applyWorkspace();
  patternList();
  locks();
  return {
    loaded,
    saved,
    changed,
    paint,
    outline,
    fieldHints,
    mediaChanged: library,
    error,
    clearErrors,
    validate,
    reviewed,
    locks,
    mode,
  };
}
