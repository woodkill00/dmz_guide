import { validatePack } from "../content/validate.mjs";
import { newProfile, validateProfile } from "../domain/profile.mjs";
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
export function status(text) {
  if ($("#save-status")) $("#save-status").textContent = text;
}
export function download(name, data, type = "application/json") {
  const blob = new Blob(
    [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
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
let generation = 0;
let disabledControls = [];
export async function init(render) {
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
  const manifest = await manifestResponse.json();
  if (
    !Array.isArray(manifest.packs) ||
    manifest.packs.length > 32 ||
    manifest.packs.some(
      (path) =>
        typeof path !== "string" ||
        !/^\/assets\/content\/packs\/[a-z0-9-]+\.json$/.test(path),
    )
  )
    throw new Error("Invalid bundled content manifest");
  state.packs = await Promise.all(
    manifest.packs.map(async (path) => {
      const response = await fetch(path);
      if (!response.ok)
        throw new Error(
          "Content unavailable. Start the local server and retry.",
        );
      const pack = await response.json();
      validatePack(pack, schema, { profile: "published" });
      return pack;
    }),
  );
  state.packs.sort(
    (a, b) =>
      Number(b.id === "official:mw4-dmz-starter") -
      Number(a.id === "official:mw4-dmz-starter"),
  );
  let contentWarning = null;
  try {
    for (const record of await listRecords("content")) {
      const pack = record.value?.pack;
      if (pack && !state.packs.some((p) => p.id === pack.id)) {
        try {
          validatePack(pack, schema);
          state.packs.push(pack);
        } catch {
          contentWarning = new Error(
            "An invalid local pack was retained but not loaded. Restore its original exported bundle in the editor; no stored data was deleted.",
          );
        }
      }
    }
  } catch {}
  const requested = new URL(location.href).searchParams.get("pack"),
    select = $("#pack-select");
  select.innerHTML = state.packs
    .map(
      (pack) => `<option value="${esc(pack.id)}">${esc(pack.title)}</option>`,
    )
    .join("");
  if (requested && state.packs.some((pack) => pack.id === requested))
    select.value = requested;
  async function change() {
    const token = ++generation;
    document.dispatchEvent(new Event("pack-changing"));
    if (!state.loading) {
      disabledControls = [
        ...document.querySelectorAll("main button, main input, main select"),
      ]
        .filter((n) => n !== select)
        .map((n) => [n, n.disabled]);
      for (const [n] of disabledControls) n.disabled = true;
    }
    state.loading = true;
    document.querySelector("main").setAttribute("aria-busy", "true");
    status("Loading selected local pack…");
    let pack =
      state.packs.find((pack) => pack.id === select.value) || state.packs[0];
    let warning = contentWarning;
    try {
      const overlay = await readRecord("content", pack.id);
      if (token !== generation) return;
      if (overlay?.value?.pack) {
        validatePack(overlay.value.pack, schema);
        if (overlay.value.pack.id !== pack.id)
          throw new Error("Stored pack identity mismatch");
        pack = overlay.value.pack;
      }
    } catch (reason) {
      if (token !== generation) return;
      warning = new Error(
        "Local content unavailable or invalid; using published baseline. Stored data retained. " +
          reason.message,
      );
    }
    let profile = newProfile(pack),
      revision = 0;
    try {
      const record = await loadProfile(pack.id);
      if (token !== generation) return;
      if (record?.value) {
        validateProfile(record.value);
        profile = record.value;
        revision = profile.revision;
      }
    } catch (reason) {
      if (token !== generation) return;
      warning = reason;
    }
    if (token !== generation) return;
    state.pack = pack;
    state.profile = profile;
    state.revision = revision;
    status(
      warning
        ? "Unsaved: browser storage unavailable. Export a backup to keep edits."
        : "Saved locally · no account or sync",
    );
    $("#pack-note").textContent =
      `${pack.title} · ${pack.contentVersion}. ${pack.coverage.note}`;
    const url = new URL(location.href);
    url.searchParams.set("pack", pack.id);
    history.replaceState(null, "", url);
    for (const anchor of document.querySelectorAll("a[href]")) {
      const target = new URL(anchor.href, location.href);
      if (
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
    try {
      await render();
    } finally {
      if (token === generation) {
        state.loading = false;
        for (const [n, disabled] of disabledControls) n.disabled = disabled;
        disabledControls = [];
        document.querySelector("main").setAttribute("aria-busy", "false");
      }
    }
    if (token !== generation) return;
    if (warning) error(warning);
  }
  select.addEventListener("change", () => {
    const requestedPack = select.value;
    select.value = state.pack?.id || requestedPack;
    requestDeparture(async () => {
      select.value = requestedPack;
      await change();
    }, select).catch(error);
  });
  await change();
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
    return false;
  } finally {
    state.saving = false;
    for (const [n, disabled] of controls) n.disabled = disabled;
  }
}
