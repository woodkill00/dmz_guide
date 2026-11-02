import {
  emptyKeyWorkspace,
  validateKeyWorkspace,
  keyStock,
  changeKeyStock,
  toggleKeyList,
  keyReadiness,
  keyTripPlan,
  archivedKeyState,
  parseKeyBackup,
  keyBackup,
} from "../domain/key-workspace.mjs";
import {
  readKeyWorkspace,
  readKeyWorkspaceRecord,
  saveKeyWorkspace,
  recoverKeyWorkspace,
  keyRecordText,
  readKeyQuarantine,
} from "../storage/key-store.mjs";
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function mountKeyWorkspace(onChange = () => {}) {
  const payload = document.querySelector("#key-planner-data"),
    panel = document.querySelector("#key-workspace");
  if (!payload || !panel) return null;
  const catalog = JSON.parse(payload.textContent),
    keys = new Map(catalog.keys.map((k) => [k.id, k])),
    uses = new Map(catalog.uses.map((u) => [u.id, u]));
  const $ = (id) => document.getElementById(id);
  let state = emptyKeyWorkspace(),
    lastSaved = structuredClone(state),
    previous = null,
    savedRevision = 0,
    epoch = 0,
    readToken = 0,
    previewToken = 0,
    preview = null,
    saving = null,
    ready = false,
    mode = "loading",
    blocked = false,
    dirty = false,
    disposed = false,
    restoring = false,
    rawRecord = null,
    rawReference = null,
    rawExported = false;
  const invalidInputs = new Set(),
    urls = new Set();
  const message = (text) => {
    $("key-action-status").textContent = text;
  };
  function error(reason) {
    $("key-workspace-error").hidden = false;
    $("key-workspace-error").textContent = reason.message || String(reason);
  }
  function invalidatePreview() {
    previewToken++;
    preview = null;
    $("key-restore-preview").hidden = true;
    $("key-restore-review").checked = false;
  }
  function canEdit() {
    return ready && mode !== "corrupt" && !restoring && !disposed;
  }
  function download(name, raw, type = "application/json") {
    const url = URL.createObjectURL(new Blob([raw], { type }));
    urls.add(url);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
    }, 30000);
  }
  function status() {
    const text = restoring
      ? "Applying reviewed key backup…"
      : !ready
        ? "Opening private storage…"
        : mode === "corrupt"
          ? "Saved data needs recovery. Nothing was overwritten."
          : mode === "session"
            ? "Temporary session only. Changes are not saved; export a backup before leaving."
            : blocked
              ? "Unsaved draft retained. Export it, then reload saved keys before continuing."
              : invalidInputs.size
                ? "Finish the invalid private field before saving or exporting."
                : saving || dirty
                  ? "Saving private key changes…"
                  : "Saved on this device.";
    $("key-save-status").textContent = text;
    panel.dataset.storageMode = mode;
    panel.dataset.dirty = String(dirty);
    panel.dataset.saving = String(!!saving);
    $("key-restore-apply").disabled =
      !preview ||
      !$("key-restore-review").checked ||
      dirty ||
      !!saving ||
      restoring ||
      preview.epoch !== epoch ||
      preview.revision !== savedRevision ||
      (mode === "corrupt" && !rawExported) ||
      blocked;
    $("key-export").disabled =
      !ready || invalidInputs.size > 0 || mode === "corrupt";
    $("key-previous").disabled =
      !ready || !!saving || dirty || !(previous || rawRecord?.previous);
    $("key-import").disabled = !ready || restoring;
    $("key-restore-cancel").disabled = restoring;
    $("key-reload").disabled = restoring || !!saving || !ready;
    $("key-view")?.toggleAttribute("disabled", !ready || mode === "corrupt");
    $("key-density")?.toggleAttribute("disabled", !canEdit());
    document.querySelector("main").dataset.keyWorkspaceReady = String(ready);
  }
  function tripText() {
    const plan = keyTripPlan(state, catalog),
      lines = [
        "DMZ key trip packing list",
        `Selected targets: ${state.targetUseIds.length}`,
        "",
        "Visit / unlock order:",
        ...plan.ordered.map(
          (u, i) =>
            `${i + 1}. ${keys.get(u.keyId)?.name || u.keyId} — ${u.locationName} ${u.grid}`,
        ),
        "",
        "Key types:",
        ...plan.keyNeeds.map(
          (n) =>
            `${n.packed ? "[x]" : "[ ]"} ${n.name}: owned ${n.stock.quantity}; total uses ${n.stock.remainingUses ?? "unknown"}; ${n.useIds.length} selected use location(s)${n.optional ? "; key necessity unverified" : ""}`,
        ),
        "",
        "Recorded missing / exhausted types:",
        ...plan.missing.map((n) => "- " + n.name),
        "",
        "Other requirements / hazards:",
        ...plan.ordered.flatMap((u) =>
          (keys.get(u.keyId)?.requirements || []).map(
            (r) => `- ${u.locationName}: ${r}`,
          ),
        ),
        "",
        "Access uncertainties:",
        ...plan.warnings.map((w) => "- " + w),
        ...plan.unavailableTargets.map((id) => "Unavailable target: " + id),
        "",
        "Location counts are not key-consumption estimates. Private notes are omitted.",
      ];
    return lines.join("\n");
  }
  function paintTrip() {
    const plan = keyTripPlan(state, catalog),
      content = $("key-trip-content"),
      active = document.activeElement,
      focus = content.contains(active)
        ? active.dataset.packKey || active.dataset.removeTarget || null
        : null;
    $("key-trip-count").textContent = `(${state.targetUseIds.length})`;
    $("key-clear-trip").disabled =
      !canEdit() || (!state.targetUseIds.length && !state.packedKeyIds.length);
    content.innerHTML = state.targetUseIds.length
      ? `<p>${plan.keyNeeds.length} key types · ${plan.missing.length} missing/exhausted in your record. Selected location counts do not establish how many copies will be consumed.</p><h4>Selected destinations</h4><ul>${state.targetUseIds
          .map((id) => {
            const u = uses.get(id);
            return `<li>${u ? `<a href="/keys/${u.keyId}/">${esc(keys.get(u.keyId)?.name || u.keyId)}</a> · ${esc(u.locationName)} ${esc(u.grid)}` : `Unavailable target: ${esc(id)}`} <button type="button" data-remove-target="${esc(id)}" aria-label="Remove target ${esc(u ? keys.get(u.keyId)?.name || u.keyId : id)}">Remove</button></li>`;
          })
          .join(
            "",
          )}</ul><h4>Recorded access order</h4><ol>${plan.ordered.map((u) => `<li><a href="/keys/${u.keyId}/">${esc(keys.get(u.keyId)?.name || u.keyId)}</a> · ${esc(u.locationName)} ${esc(u.grid)}</li>`).join("")}</ol><h4>Pack these key types</h4><ul class="key-packing-list">${plan.keyNeeds.map((n) => `<li><label><input type="checkbox" data-pack-key="${n.keyId}"${n.packed ? " checked" : ""}> ${esc(n.name)}</label><span>Owned ${n.stock.quantity} · total recorded uses ${n.stock.remainingUses ?? "unknown"} · ${n.useIds.length} selected use location(s)${n.optional ? " · key necessity unverified" : !n.stock.quantity || n.stock.remainingUses === 0 ? " · MISSING / EXHAUSTED" : ""}</span></li>`).join("")}</ul><h4>Other requirements and hazards</h4>${
          plan.ordered
            .map((u) => {
              const requirements = keys.get(u.keyId)?.requirements || [];
              return requirements.length
                ? `<p><strong>${esc(u.locationName)}</strong></p><ul>${requirements.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
                : "";
            })
            .join("") ||
          "<p>No other requirements recorded; this does not establish that none exist.</p>"
        }<h4>Review before travelling</h4><ul>${plan.warnings.map((w) => `<li>${esc(w)}</li>`).join("") || "<li>Check current room conditions and enough usable copies.</li>"}</ul>`
      : "<p>Select Add to trip beside a use location. Recorded prerequisite keys will be added to the packing list.</p>";
    for (const control of content.querySelectorAll("button,input"))
      control.disabled = !canEdit();
    if (focus) {
      const next = [
        ...content.querySelectorAll("[data-pack-key],[data-remove-target]"),
      ].find(
        (n) => n.dataset.packKey === focus || n.dataset.removeTarget === focus,
      );
      (next || $("key-trip-title")).focus({ preventScroll: true });
    }
  }
  function paint() {
    if (disposed) return;
    panel.hidden = false;
    document.documentElement.dataset.keyDensity = state.density;
    for (const el of document.querySelectorAll("[data-private-key]")) {
      el.hidden = !ready;
      for (const control of el.querySelectorAll("button,input,textarea"))
        control.disabled = !canEdit();
    }
    for (const el of document.querySelectorAll("[data-private-field]")) {
      const s = keyStock(state, el.dataset.keyId);
      if (document.activeElement !== el && !invalidInputs.has(el))
        el.value = s[el.dataset.privateField] ?? "";
    }
    for (const button of document.querySelectorAll(
      '[data-key-action="favorite"]',
    )) {
      const selected = state.favorites.includes(button.dataset.keyId);
      button.textContent = selected ? "★" : "☆";
      button.setAttribute("aria-pressed", String(selected));
    }
    for (const box of document.querySelectorAll("[data-target-use]")) {
      box.checked = state.targetUseIds.includes(box.dataset.targetUse);
      box.disabled = !canEdit();
      box.closest("[data-private-use]").hidden = !ready;
    }
    for (const box of document.querySelectorAll("[data-opened-use]")) {
      box.checked = state.openedUseIds.includes(box.dataset.openedUse);
      box.disabled = !canEdit();
    }
    for (const span of document.querySelectorAll("[data-ready-use]")) {
      const r = keyReadiness(state, uses.get(span.dataset.readyUse), catalog);
      span.textContent =
        mode === "corrupt"
          ? "Saved data needs recovery"
          : r.state === "recorded-ready"
            ? `Recorded keys ready${r.uncertainties.length ? " · access / uses unverified" : ""}`
            : r.state === "unverified"
              ? "Key necessity unverified"
              : `${r.missingIds.length} recorded key type(s) missing / exhausted`;
      span.dataset.readiness = r.state;
    }
    if ($("key-density") && document.activeElement !== $("key-density"))
      $("key-density").value = state.density;
    const archived = archivedKeyState(state, catalog);
    $("key-archive").hidden = !archived.keys.length && !archived.uses.length;
    $("key-archive-summary").textContent =
      `${archived.keys.length} unavailable key IDs and ${archived.uses.length} unavailable use IDs retained: ${[...archived.keys, ...archived.uses].join(", ")}`;
    paintTrip();
    status();
    onChange();
  }
  async function flush() {
    if (
      disposed ||
      saving ||
      !dirty ||
      invalidInputs.size ||
      !ready ||
      mode !== "persistent" ||
      blocked ||
      restoring
    )
      return saving;
    const captured = epoch,
      snapshot = structuredClone(state),
      before = structuredClone(lastSaved);
    saving = saveKeyWorkspace(snapshot, savedRevision);
    status();
    try {
      const saved = await saving;
      if (disposed) return;
      savedRevision = saved.revision;
      previous = before;
      lastSaved = structuredClone(saved);
      if (epoch === captured) {
        state = saved;
        dirty = false;
      } else {
        state.revision = saved.revision;
        dirty = true;
      }
    } catch (reason) {
      if (!disposed) {
        blocked = true;
        error(reason);
      }
    } finally {
      saving = null;
      if (!disposed) {
        paint();
        if (dirty && !blocked && !invalidInputs.size && mode === "persistent")
          void flush();
      }
    }
  }
  function mutate(change) {
    if (!canEdit()) return false;
    try {
      const candidate = change(structuredClone(state));
      validateKeyWorkspace(candidate);
      if (JSON.stringify(candidate) === JSON.stringify(state)) {
        paint();
        void flush();
        return true;
      }
      state = candidate;
      epoch++;
      dirty = true;
      invalidatePreview();
      $("key-workspace-error").hidden = true;
      paint();
      void flush();
      return true;
    } catch (reason) {
      error(reason);
      paint();
      return false;
    }
  }
  async function settled() {
    await flush();
    while (saving) await saving.catch(() => {});
    return !dirty && !invalidInputs.size && !blocked;
  }
  async function load(deliberate = false) {
    if (disposed || restoring || (deliberate && saving)) return;
    if (
      deliberate &&
      (dirty || invalidInputs.size) &&
      !confirm(
        "Reloading discards your unsaved or temporary key changes. Export them first. Continue?",
      )
    )
      return;
    const token = ++readToken;
    invalidatePreview();
    const captured = ++epoch;
    if (deliberate) {
      invalidInputs.clear();
      dirty = false;
    }
    ready = false;
    paint();
    try {
      const record = await readKeyWorkspace();
      if (disposed || token !== readToken || captured !== epoch) return;
      state = structuredClone(record.value);
      lastSaved = structuredClone(state);
      savedRevision = state.revision;
      previous = record.previous;
      mode = "persistent";
      blocked = false;
      dirty = false;
      rawRecord = null;
      rawReference = null;
      rawExported = false;
      $("key-workspace-error").hidden = true;
    } catch (reason) {
      if (disposed || token !== readToken || captured !== epoch) return;
      if (reason.code === "KEY_CORRUPT") {
        mode = "corrupt";
        blocked = false;
        try {
          rawRecord = await readKeyWorkspaceRecord();
          if (disposed || token !== readToken || captured !== epoch) return;
          rawReference = keyRecordText(rawRecord);
          try {
            validateKeyWorkspace(rawRecord?.previous);
            previous = rawRecord.previous;
          } catch {
            previous = null;
          }
        } catch (rawError) {
          if (disposed || token !== readToken || captured !== epoch) return;
          error(rawError);
          rawReference = null;
        }
        error(reason);
      } else {
        mode = "session";
        blocked = false;
        if (deliberate) state = emptyKeyWorkspace();
        error(
          Error(
            "Private storage could not be read. Existing saved data was not overwritten. Temporary edits need an exported backup.",
          ),
        );
      }
    } finally {
      if (!disposed && token === readToken && captured === epoch) {
        ready = true;
        paint();
      }
    }
  }
  async function previewCandidate(getCandidate) {
    if (dirty || saving || invalidInputs.size || blocked) {
      message(
        "Finish saving or export and reload the unsaved draft before restoring.",
      );
      return;
    }
    const token = ++previewToken,
      captured = epoch,
      revision = savedRevision;
    $("key-restore-preview").hidden = true;
    $("key-restore-review").checked = false;
    try {
      const candidate = await getCandidate();
      validateKeyWorkspace(candidate);
      if (
        disposed ||
        token !== previewToken ||
        captured !== epoch ||
        revision !== savedRevision
      )
        return;
      preview = {
        value: structuredClone(candidate),
        epoch: captured,
        revision,
        token,
        rawReference,
      };
      $("key-restore-summary").textContent =
        `Replace this private key workspace with ${Object.keys(candidate.stock).length} stock entries, ${candidate.favorites.length} favorites and ${candidate.targetUseIds.length} targets. Valid unavailable IDs will be kept as archived records.${mode === "corrupt" ? " Export the damaged record before applying recovery." : ""}`;
      $("key-restore-preview").hidden = false;
      status();
    } catch (reason) {
      if (!disposed && token === previewToken) error(reason);
    }
  }
  async function applyPreview() {
    if (
      !preview ||
      !$("key-restore-review").checked ||
      dirty ||
      saving ||
      blocked ||
      invalidInputs.size ||
      preview.epoch !== epoch ||
      preview.revision !== savedRevision ||
      (mode === "corrupt" && !rawExported)
    )
      return;
    const current = preview,
      captured = epoch,
      token = previewToken,
      before = structuredClone(state),
      recoveryPrevious = previous;
    restoring = true;
    paint();
    try {
      let result;
      if (mode === "corrupt")
        result = await recoverKeyWorkspace(current.value, current.rawReference);
      else if (mode === "session") {
        result = structuredClone(current.value);
        result.revision = savedRevision;
      } else result = await saveKeyWorkspace(current.value, savedRevision);
      if (disposed || epoch !== captured || token !== previewToken) return;
      previous =
        mode === "corrupt" ? recoveryPrevious || emptyKeyWorkspace() : before;
      state = result;
      savedRevision = result.revision;
      lastSaved = structuredClone(result);
      epoch++;
      dirty = mode === "session";
      if (mode !== "session") mode = "persistent";
      rawRecord = null;
      rawReference = null;
      rawExported = false;
      invalidatePreview();
      message(
        mode === "session"
          ? "Backup loaded into this temporary session; export before leaving."
          : "Reviewed key backup applied; previous data retained.",
      );
    } catch (reason) {
      if (!disposed && epoch === captured && token === previewToken)
        error(reason);
    } finally {
      restoring = false;
      if (!disposed) paint();
    }
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-key-action],[data-remove-target]",
    );
    if (!button) return;
    if (button.dataset.removeTarget) {
      mutate((v) =>
        toggleKeyList(v, "targetUseIds", button.dataset.removeTarget),
      );
      return;
    }
    const id = button.dataset.keyId;
    if (!keys.has(id)) return;
    if (button.dataset.keyAction === "favorite")
      mutate((v) => toggleKeyList(v, "favorites", id));
    else {
      const delta = button.dataset.keyAction === "add" ? 1 : -1;
      mutate((v) =>
        changeKeyStock(
          v,
          id,
          Math.max(0, Math.min(999, keyStock(v, id).quantity + delta)),
        ),
      );
    }
  });
  document.addEventListener("input", (event) => {
    const el = event.target;
    if (!el.matches("[data-private-field]") || !canEdit()) return;
    const field = el.dataset.privateField,
      id = el.dataset.keyId;
    if (!keys.has(id)) return;
    const value =
      field === "notes"
        ? el.value
        : field === "remainingUses" && el.value === ""
          ? null
          : el.value === ""
            ? NaN
            : Number(el.value);
    const valid =
      !el.validity.badInput &&
      (field === "notes"
        ? value.length <= 1000
        : value === null ||
          (Number.isInteger(value) && value >= 0 && value <= 999));
    if (!valid) {
      invalidInputs.add(el);
      epoch++;
      dirty = true;
      invalidatePreview();
      status();
      return;
    }
    invalidInputs.delete(el);
    const accepted =
      field === "quantity"
        ? mutate((v) => changeKeyStock(v, id, value))
        : mutate((v) => {
            const old = keyStock(v, id);
            v.stock[id] = { ...old, [field]: value };
            return v;
          });
    if (!accepted) {
      invalidInputs.add(el);
      epoch++;
      dirty = true;
      status();
    }
  });
  document.addEventListener("change", (event) => {
    const el = event.target;
    if (el.matches("[data-target-use]") && uses.has(el.dataset.targetUse))
      mutate((v) => toggleKeyList(v, "targetUseIds", el.dataset.targetUse));
    else if (el.matches("[data-opened-use]") && uses.has(el.dataset.openedUse))
      mutate((v) => toggleKeyList(v, "openedUseIds", el.dataset.openedUse));
    else if (el.matches("[data-pack-key]") && keys.has(el.dataset.packKey))
      mutate((v) => toggleKeyList(v, "packedKeyIds", el.dataset.packKey));
    else if (el.id === "key-density")
      mutate((v) => {
        v.density = el.value;
        return v;
      });
  });
  $("key-toggle-trip").addEventListener("click", () => {
    const open = $("key-trip-panel").hidden;
    $("key-trip-panel").hidden = !open;
    $("key-toggle-trip").setAttribute("aria-expanded", String(open));
    if (open) $("key-trip-title").focus({ preventScroll: true });
  });
  $("key-export").addEventListener("click", () => {
    try {
      if (invalidInputs.size)
        throw Error("Finish the invalid private field before exporting");
      download("dmz-key-backup.json", keyBackup(state));
      message(
        dirty
          ? "Exported current unsaved key draft."
          : "Exported private key backup.",
      );
    } catch (reason) {
      error(reason);
    }
  });
  $("key-import").addEventListener("change", () => {
    const file = $("key-import").files?.[0];
    $("key-import").value = "";
    invalidatePreview();
    if (!file) return;
    void previewCandidate(async () => {
      if (file.size > 1048576) throw Error("Key backup exceeds1MiB");
      return parseKeyBackup(await file.text());
    });
  });
  $("key-restore-review").addEventListener("change", status);
  $("key-restore-apply").addEventListener("click", () => void applyPreview());
  $("key-restore-cancel").addEventListener("click", () => {
    if (restoring) return;
    invalidatePreview();
    $("key-import").value = "";
    message("Backup preview cancelled; current keys retained.");
  });
  $("key-reload").addEventListener("click", () => void load(true));
  $("key-previous").addEventListener(
    "click",
    () =>
      void previewCandidate(async () => {
        if (!previous) throw Error("No valid previous snapshot available");
        return structuredClone(previous);
      }),
  );
  $("key-raw-export").addEventListener("click", async () => {
    const captured = epoch,
      reference = rawReference;
    try {
      const history = await readKeyQuarantine();
      if (disposed || epoch !== captured || reference !== rawReference) return;
      if (rawReference === null && history === undefined)
        throw Error("No damaged or quarantined record to export");
      const raw = JSON.stringify({
        kind: "dmz-key-recovery",
        version: 1,
        current: rawRecord,
        history: history ?? [],
      });
      if (new TextEncoder().encode(raw).length > 18 * 1048576)
        throw Error("Recovery export exceeds18MiB");
      download("dmz-key-recovery.json", raw);
      rawExported = true;
      message(
        "Recovery record exported. Review a valid backup or previous snapshot before applying recovery.",
      );
      status();
    } catch (reason) {
      if (!disposed && epoch === captured && reference === rawReference)
        error(reason);
    }
  });
  $("key-clear-trip").addEventListener("click", () => {
    if (
      confirm(
        "Clear selected trip targets and packing checks? Owned keys, notes and opened history will remain.",
      )
    )
      mutate((v) => {
        v.targetUseIds = [];
        v.packedKeyIds = [];
        return v;
      });
  });
  $("key-download-trip").addEventListener("click", () => {
    try {
      download(
        "dmz-key-packing-list.txt",
        tripText(),
        "text/plain;charset=utf-8",
      );
      message("Packing list downloaded; private notes omitted.");
    } catch (reason) {
      error(reason);
    }
  });
  $("key-copy-trip").addEventListener("click", async () => {
    const captured = epoch,
      text = tripText();
    try {
      if (!navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      if (!disposed)
        message(
          epoch === captured
            ? "Packing list copied; private notes omitted."
            : "Copied the earlier packing snapshot; your trip has changed.",
        );
    } catch {
      if (disposed) return;
      $("key-copy-fallback").hidden = false;
      $("key-copy-fallback").value = text;
      $("key-copy-fallback").focus();
      $("key-copy-fallback").select();
      message("Select and copy this packing list, or use Download.");
    }
  });
  document.addEventListener("click", async (event) => {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const a = event.target.closest("a[href]");
    if (a?.hasAttribute("download")) return;
    if (restoring && a && a.target !== "_blank") {
      event.preventDefault();
      message("Backup apply is running; wait for its recorded result.");
      return;
    }
    if (!a || a.target === "_blank" || !dirty || event.defaultPrevented) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname)
      return;
    event.preventDefault();
    const captured = epoch;
    if ((await settled()) && !disposed && epoch === captured)
      location.assign(a.href);
    else {
      message(
        "Unsaved key draft retained. Stay here to export it or reload saved keys before leaving.",
      );
      $("key-backup-tools")?.setAttribute("open", "");
    }
  });
  window.addEventListener("beforeunload", (event) => {
    if (dirty || invalidInputs.size || restoring || saving) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    disposed = false;
    if (dirty || invalidInputs.size || saving || restoring) {
      blocked = true;
      error(
        Error(
          "Returned to an unsaved key draft. Export it, then reload saved keys before continuing.",
        ),
      );
      paint();
    } else void load();
  });
  window.addEventListener("pagehide", () => {
    disposed = true;
    readToken++;
    previewToken++;
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  });
  const action = document.createElement("p");
  action.id = "key-action-status";
  action.setAttribute("role", "status");
  $("key-save-status").after(action);
  void load();
  return {
    getState: () => state,
    isReady: () => ready && mode !== "corrupt",
    readiness: (id) => keyReadiness(state, uses.get(id), catalog),
  };
}
