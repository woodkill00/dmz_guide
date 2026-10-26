import {
  createCatalogLoader,
  parseCatalogManifest,
} from "../content/catalog-loader.mjs";
import { ID } from "../content/limits.mjs";
import { validatePack } from "../content/validate.mjs";
import {
  newProfile,
  validateProfile,
  validateInventoryForPack,
} from "../domain/profile.mjs";
import {
  loadProfile,
  saveProfile,
  readRecord,
  listRecords,
} from "../storage/store.mjs";
export const $ = (selector) => document.querySelector(selector);
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const state = {
  pack: null,
  profile: null,
  revision: 0,
  packs: [],
  loading: true,
  saving: false,
};
export function error(reason) {
  const element = $("#error");
  if (element) {
    element.hidden = false;
    element.textContent = reason.message || String(reason);
    element.focus();
  } else console.error(reason);
}
let statusRevision = 0;
export function status(text) {
  statusRevision++;
  if ($("#save-status")) $("#save-status").textContent = text;
}
export function download(name, data, type = "application/json") {
  const blob = new Blob(
    [typeof data === "string" ? data : JSON.stringify(data)],
    { type },
  );
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
let draftGuard = null;
let departurePending = false;
let leaving = false;
export function registerDraftGuard(guard) {
  draftGuard = guard;
}
export function hasUnsavedDraft() {
  return Boolean(draftGuard?.isDirty());
}
export function exportProfile() {
  try {
    if (state.loading || !state.pack || !state.profile)
      throw new Error("Wait for the selected pack to load.");
    validateProfile(state.profile);
    validateInventoryForPack(state.profile, state.pack);
    if (state.profile.packId !== state.pack.id)
      throw new Error("Profile and selected pack do not match.");
    const safe = (value, length) =>
      String(value)
        .replace(/[^a-zA-Z0-9_.-]/g, "-")
        .slice(0, length);
    const name = `dmz-${safe(state.pack.id, 48)}-${safe(state.profile.contentVersion, 80)}-r${state.profile.revision}-${new Date().toISOString().replace(/[:]/g, "-")}.json`;
    download(name, state.profile);
    status(
      `${hasUnsavedDraft() ? "Unsaved edits remain · " : ""}Backup download requested. Check your browser downloads; this does not save the profile locally.`,
    );
  } catch (reason) {
    error(reason);
    draftGuard?.revealInvalid?.();
  }
}
async function requestDeparture(proceed, origin, documentNavigation = false) {
  if (departurePending || state.loading || state.saving) return;
  if (!hasUnsavedDraft()) return proceed();
  departurePending = true;
  let dialog = $("#draft-navigation");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "draft-navigation";
    dialog.setAttribute("aria-labelledby", "draft-navigation-title");
    dialog.innerHTML = `<h2 id="draft-navigation-title">Keep your unsaved inventory?</h2><p>Save locally before leaving, discard these edits, or stay on this page.</p><div class="draft-actions"><button id="draft-save" type="button">Save</button><button id="draft-discard" type="button" class="secondary">Discard</button><button id="draft-stay" type="button" autofocus>Stay</button></div>`;
    document.body.append(dialog);
  }
  const decision = await new Promise((resolve) => {
    const choose = (value) => {
      dialog.oncancel = null;
      dialog.close();
      resolve(value);
    };
    $("#draft-save").onclick = () => choose("save");
    $("#draft-discard").onclick = () => choose("discard");
    $("#draft-stay").onclick = () => choose("stay");
    dialog.oncancel = (event) => {
      event.preventDefault();
      choose("stay");
    };
    dialog.showModal();
  });
  try {
    if (decision === "stay") {
      origin?.focus();
      return;
    }
    if (decision === "save" && !(await persist())) return;
    leaving = true;
    try {
      await proceed();
    } finally {
      if (documentNavigation)
        setTimeout(() => {
          leaving = false;
        }, 1000);
      else leaving = false;
    }
  } finally {
    departurePending = false;
  }
}
window.addEventListener("pageshow", () => {
  leaving = false;
});
for (const type of ["pointerdown", "keydown"])
  document.addEventListener(
    type,
    (event) => {
      if (event.isTrusted) leaving = false;
    },
    true,
  );
window.addEventListener("beforeunload", (event) => {
  if (leaving) {
    leaving = false;
    return;
  }
  if (hasUnsavedDraft()) {
    event.preventDefault();
    event.returnValue = "";
  }
});
document.addEventListener("click", (event) => {
  const anchor = event.target.closest?.("a[href]");
  if (
    !anchor ||
    event.defaultPrevented ||
    event.button !== 0 ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.hasAttribute("download") ||
    (anchor.target && anchor.target !== "_self")
  )
    return;
  const target = new URL(anchor.href, location.href);
  if (
    !["http:", "https:"].includes(target.protocol) ||
    (target.origin === location.origin &&
      target.pathname === location.pathname &&
      target.search === location.search &&
      target.hash)
  )
    return;
  if (!hasUnsavedDraft()) return;
  event.preventDefault();
  requestDeparture(() => location.assign(target.href), anchor, true).catch(
    error,
  );
});
let catalogLoader = null;
export async function getCatalog(id, { publishedOnly = false } = {}) {
  if (!publishedOnly) {
    const cached = state.packs.find((pack) => pack.id === id);
    if (cached) return cached;
  }
  if (!catalogLoader?.has(id)) return null;
  const pack = await catalogLoader.getPublished(id);
  if (!state.packs.some((entry) => entry.id === id)) state.packs.push(pack);
  return pack;
}
let generation = 0;
let disabledControls = [];
export async function init(
  render,
  { requestedPack, opaqueContext = false } = {},
) {
  disabledControls = [
    ...document.querySelectorAll("main button, main input, main select"),
  ].map((node) => [
    node,
    node.hasAttribute("data-startup-disabled") ? false : node.disabled,
  ]);
  for (const [node] of disabledControls) node.disabled = true;
  document.querySelector("main").setAttribute("aria-busy", "true");
  for (const id of ["export-current-profile", "export-profile"])
    $(`#${id}`)?.addEventListener("click", exportProfile);
  const schemaResponse = await fetch("/assets/schemas/pack.schema.json");
  if (!schemaResponse.ok) throw new Error("Content schema unavailable.");
  const schema = await schemaResponse.json();
  const manifestResponse = await fetch("/assets/content/manifest.json");
  if (!manifestResponse.ok) throw new Error("Content manifest unavailable.");
  catalogLoader = createCatalogLoader({
    manifest: parseCatalogManifest(await manifestResponse.text()),
    schema,
  });
  state.packs = [];
  const choices = [...catalogLoader.catalogs].sort(
    (a, b) =>
      Number(b.id === "official:mw4-dmz-starter") -
      Number(a.id === "official:mw4-dmz-starter"),
  );
  const requested =
    requestedPack ?? new URL(location.href).searchParams.get("pack");
  const select = $("#pack-select");
  function refreshChoices(selected) {
    for (const pack of state.packs) {
      if (!choices.some((entry) => entry.id === pack.id))
        choices.push({ id: pack.id, title: pack.title });
    }
    select.innerHTML =
      '<option value="">Choose an available catalog</option>' +
      choices
        .map(
          (pack) =>
            `<option value="${esc(pack.id)}">${esc(pack.title)}</option>`,
        )
        .join("");
    select.value = choices.some((pack) => pack.id === selected) ? selected : "";
  }
  refreshChoices(requested || choices[0]?.id);
  async function selectedCatalog(id) {
    if (typeof id !== "string" || id.length > 200 || !ID.test(id))
      throw new Error(
        "Selected catalog unavailable. Choose a known catalog; no different catalog was substituted.",
      );
    let warning = null,
      storageFailure = null;
    try {
      const overlay = await readRecord("content", id);
      if (overlay?.value?.pack) {
        try {
          validatePack(overlay.value.pack, schema);
          if (overlay.value.pack.id !== id)
            throw new Error("Stored catalog identity mismatch");
          return { pack: overlay.value.pack, warning, storageFailure };
        } catch {
          warning = new Error(
            "Local content invalid; using published baseline. Stored data retained. Restore the original exported bundle in the editor.",
          );
        }
      }
    } catch (reason) {
      storageFailure = reason;
      warning = new Error(
        "Local content storage unavailable; using published baseline. Stored data retained.",
      );
    }
    const pack = await getCatalog(id, { publishedOnly: true });
    if (!pack)
      throw new Error(
        "Selected catalog unavailable. Stored data retained. Choose a known catalog; no different catalog was substituted.",
      );
    return { pack, warning, storageFailure };
  }
  async function change(id) {
    const token = ++generation;
    const previous = state.pack;
    if (!state.loading && state.pack) {
      disabledControls = [
        ...document.querySelectorAll("main button, main input, main select"),
      ]
        .filter((node) => node !== select)
        .map((node) => [node, node.disabled]);
      for (const [node] of disabledControls) node.disabled = true;
    }
    state.loading = true;
    select.disabled = true;
    document.querySelector("main").setAttribute("aria-busy", "true");
    status("Loading selected catalog…");
    let activated = false;
    try {
      if (opaqueContext && !id)
        throw new Error(
          "Private navigation context unavailable. Return to the planner; no different pack was substituted.",
        );
      let { pack, warning, storageFailure } = await selectedCatalog(id);
      if (token !== generation) return;
      let profile = newProfile(pack),
        revision = 0;
      try {
        const record = await loadProfile(pack.id);
        storageFailure = null;
        if (token !== generation) return;
        if (record?.value) {
          try {
            validateProfile(record.value);
            if (record.value.packId !== pack.id)
              throw new Error("Stored profile identity mismatch");
            profile = record.value;
            revision = profile.revision;
          } catch {
            warning = new Error(
              "Stored profile invalid and retained. Restore a validated backup before saving new changes.",
            );
          }
        }
      } catch (reason) {
        if (token !== generation) return;
        storageFailure = reason;
        warning = reason;
      }
      if (token !== generation) return;
      // No draft/checkpoint-clearing event until the exact new identity is ready.
      document.dispatchEvent(new Event("pack-changing"));
      state.pack = pack;
      state.profile = profile;
      state.revision = revision;
      activated = true;
      if (!state.packs.some((entry) => entry.id === pack.id))
        state.packs.push(pack);
      if (!choices.some((entry) => entry.id === pack.id))
        choices.push({ id: pack.id, title: pack.title });
      refreshChoices(pack.id);
      status(
        storageFailure
          ? "Unsaved: browser storage unavailable. Export a backup to keep edits."
          : warning
            ? "Browser storage available · content warning; stored data retained."
            : "Saved locally · no account or sync",
      );
      $("#error").hidden = true;
      $("#pack-note").textContent =
        `${pack.title} · ${pack.contentVersion}. ${pack.coverage.note}`;
      const url = new URL(location.href);
      if (!opaqueContext) {
        url.searchParams.set("pack", pack.id);
        history.replaceState(null, "", url);
      }
      for (const anchor of document.querySelectorAll("a[href]")) {
        const target = new URL(anchor.href, location.href);
        if (
          !opaqueContext &&
          target.origin === location.origin &&
          [
            "/planner/",
            "/inventory/",
            "/settings/",
            "/editor/",
            "/maps/",
            "/progression/",
            "/community/",
            "/local/",
          ].includes(target.pathname)
        ) {
          target.searchParams.set("pack", pack.id);
          anchor.href = target.href;
        }
      }
      await render();
      if (token === generation && warning) error(warning);
    } catch (reason) {
      if (token !== generation) return;
      if (!activated) {
        refreshChoices(previous?.id);
        status(
          previous
            ? "Catalog switch failed. Previous catalog and edits remain active."
            : "Selected catalog unavailable. Choose an available catalog to continue.",
        );
        error(
          new Error(
            previous
              ? `No catalog switch occurred. Your previous edits remain. ${reason.message}`
              : reason.message,
          ),
        );
      } else error(reason);
    } finally {
      if (token === generation) {
        state.loading = false;
        if (state.pack) {
          for (const [node, disabled] of disabledControls)
            node.disabled = disabled;
          disabledControls = [];
        }
        select.disabled = false;
        document.querySelector("main").setAttribute("aria-busy", "false");
      }
    }
  }
  select.addEventListener("change", () => {
    const selected = select.value;
    select.value = state.pack?.id || "";
    if (!selected || state.loading) return;
    if (!state.pack) {
      void change(selected);
      return;
    }
    requestDeparture(() => change(selected), select).catch(error);
  });
  await change(requested ?? (opaqueContext ? null : choices[0]?.id));
  // Discovery is informative and never delays selected readiness or rerenders drafts.
  const discoveryGeneration = generation;
  const discoveryStatusRevision = statusRevision;
  const discoveryStartedHealthy =
    $("#save-status")?.textContent === "Saved locally · no account or sync";
  void (async () => {
    let warning = null,
      contentWarning = false;
    try {
      const records = await listRecords("content");
      for (const record of records.slice(0, 32)) {
        const pack = record.value?.pack;
        if (!pack || choices.some((entry) => entry.id === pack.id)) continue;
        try {
          validatePack(pack, schema);
          choices.push({ id: pack.id, title: pack.title });
        } catch {
          contentWarning = true;
          warning = new Error(
            "An invalid local catalog was retained but not listed. Restore its original exported bundle in the editor; no stored data was deleted.",
          );
        }
      }
      if (records.length > 32) {
        contentWarning = true;
        warning = new Error(
          "Only the first 32 saved local catalogs are listed. Other stored data was retained; an exact catalog link can still open it.",
        );
      }
      refreshChoices(state.pack?.id);
    } catch {
      warning = new Error(
        state.pack
          ? "Some local catalogs could not be listed; the current catalog remains available. Stored data retained."
          : "Some local catalogs could not be listed. No catalog is active; choose an available published catalog. Stored data retained.",
      );
    }
    if (warning && !state.loading && $("#error").hidden) {
      if (
        contentWarning &&
        discoveryStartedHealthy &&
        state.pack &&
        generation === discoveryGeneration &&
        statusRevision === discoveryStatusRevision &&
        !state.saving &&
        !hasUnsavedDraft()
      )
        status(
          "Browser storage available · content warning; stored data retained.",
        );
      // This is background discovery, not a user-triggered failed operation.
      // Announce through the existing alert without forcing focus/blur side effects.
      const alert = $("#error");
      alert.textContent = warning.message;
      alert.hidden = false;
    }
  })();
  return state;
}
export async function persist(candidate = state.profile) {
  if (state.saving) {
    error(new Error("A save is already in progress. Wait for it to finish."));
    return false;
  }
  const controls = [
    ...document.querySelectorAll("main button, main input, main select"),
  ].map((n) => [n, n.disabled]);
  state.saving = true;
  for (const [n] of controls) n.disabled = true;
  try {
    if (state.loading) throw new Error("Wait for the selected pack to load.");
    validateProfile(candidate);
    validateInventoryForPack(candidate, state.pack);
    if (candidate.packId !== state.pack.id)
      throw new Error("Profile pack changed. Preview again before applying.");
    const packId = state.pack.id,
      token = generation;
    const saved = await saveProfile(candidate, state.revision);
    if (token !== generation || state.pack.id !== packId) return false;
    state.profile = saved;
    state.revision = saved.revision;
    document.dispatchEvent(new Event("profile-saved"));
    status(`Saved locally · revision ${saved.revision}`);
    $("#error").hidden = true;
    return true;
  } catch (reason) {
    status("Unsaved changes remain in this page. Export before reload.");
    error(reason);
    if (candidate === state.profile) draftGuard?.revealInvalid?.();
    return false;
  } finally {
    state.saving = false;
    for (const [n, disabled] of controls) n.disabled = disabled;
  }
}
