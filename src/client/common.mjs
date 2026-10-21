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
  loading: false,
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
let generation = 0;
let disabledControls = [];
export async function init(render) {
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
      validatePack(pack, schema);
      return pack;
    }),
  );
  state.packs.sort(
    (a, b) =>
      Number(b.id === "official:mw4-dmz-starter") -
      Number(a.id === "official:mw4-dmz-starter"),
  );
  let contentWarning = null;
  $("#export-current-profile")?.addEventListener("click", () => {
    try {
      if (state.loading) throw new Error("Wait for the selected pack to load.");
      validateProfile(state.profile);
      download("dmz-private-profile.json", state.profile);
    } catch (reason) {
      error(reason);
    }
  });
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
  select.addEventListener("change", () => change().catch(error));
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
