import { loadProfile, saveProfile, readRecord } from "../storage/store.mjs";
import { newProfile, validateProfile } from "../domain/profile.mjs";
import { setBuildTarget } from "../domain/build-targets.mjs";
import {
  createCatalogLoader,
  parseCatalogManifest,
} from "../content/catalog-loader.mjs";
import { validatePack } from "../content/validate.mjs";
let loader = null;
async function catalog(id) {
  loader ??= Promise.all([
    fetch("/assets/schemas/pack.schema.json").then((r) => {
      if (!r.ok) throw new Error("Catalog schema unavailable.");
      return r.json();
    }),
    fetch("/assets/content/manifest.json").then((r) => {
      if (!r.ok) throw new Error("Catalog index unavailable.");
      return r.text();
    }),
  ]).then(([schema, text]) => ({
    schema,
    reader: createCatalogLoader({
      schema,
      manifest: parseCatalogManifest(text),
      fetcher: (p) => fetch(p),
    }),
  }));
  const { schema, reader } = await loader,
    stored = await readRecord("content", id);
  if (stored?.value?.pack) {
    validatePack(stored.value.pack, schema);
    if (stored.value.pack.id !== id)
      throw new Error("Stored catalog identity mismatch.");
    return stored.value.pack;
  }
  return reader.getPublished(id);
}
const owners = new WeakMap();
function sync(root, packId, profile) {
  for (const control of root.querySelectorAll("[data-build-control]"))
    if (control.dataset.buildPack === packId) {
      const id = control.dataset.buildItem,
        selected = Object.hasOwn(profile?.buildTargets || {}, id);
      control.querySelector("[data-build-select]").checked = selected;
      control.querySelector("[data-build-select]").disabled = false;
      control.querySelector("[data-build-quantity]").value =
        profile?.buildTargets?.[id] ?? 1;
      control.querySelector("[data-build-quantity]").disabled = !selected;
      control.querySelector("[data-build-status]").textContent =
        "Saved locally";
    }
}
export async function mountBuildTargets(root, context = null) {
  owners.get(root)?.abort();
  const controller = new AbortController();
  owners.set(root, controller);
  let busy = false;
  const known = new Map();
  const controls = [...root.querySelectorAll("[data-build-auto]")];
  if (!controls.length) return;
  for (const id of new Set(controls.map((c) => c.dataset.buildPack))) {
    try {
      const profile = context
        ? context.profile()
        : (await loadProfile(id))?.value;
      if (profile) validateProfile(profile);
      known.set(id, profile);
    } catch (reason) {
      for (const c of controls.filter((c) => c.dataset.buildPack === id))
        c.querySelector("[data-build-status]").textContent = reason.message;
    }
  }
  if (controller.signal.aborted) return;
  for (const [id, profile] of known) sync(root, id, profile);
  const observer = new MutationObserver((records) => {
    const added = records
      .flatMap((r) => [...r.addedNodes])
      .filter(
        (n) =>
          n.nodeType === 1 &&
          (n.matches?.("[data-build-auto]") ||
            n.querySelector?.("[data-build-auto]")),
      );
    if (!added.length) return;
    for (const node of added)
      for (const c of [
        node,
        ...node.querySelectorAll("[data-build-auto]"),
      ].filter((n) => n.matches("[data-build-auto]"))) {
        const id = c.dataset.buildPack;
        if (known.has(id)) sync(root, id, known.get(id));
        else
          loadProfile(id)
            .then((record) => {
              if (controller.signal.aborted) return;
              if (record?.value) validateProfile(record.value);
              known.set(id, record?.value);
              sync(root, id, record?.value);
            })
            .catch(
              (reason) =>
                (c.querySelector("[data-build-status]").textContent =
                  reason.message),
            );
      }
  });
  observer.observe(root, { childList: true, subtree: true });
  controller.signal.addEventListener("abort", () => observer.disconnect(), {
    once: true,
  });
  root.addEventListener(
    "change",
    async (event) => {
      const input = event.target.closest(
          "[data-build-select],[data-build-quantity]",
        ),
        control = input?.closest("[data-build-auto]");
      if (!control || busy) return;
      const id = control.dataset.buildItem,
        packId = control.dataset.buildPack,
        selected = control.querySelector("[data-build-select]").checked,
        q = Number(control.querySelector("[data-build-quantity]").value);
      busy = true;
      for (const c of root.querySelectorAll("[data-build-auto]"))
        for (const n of c.querySelectorAll("input")) n.disabled = true;
      try {
        const pack = context ? context.pack() : await catalog(packId);
        if (!pack) throw new Error("Catalog unavailable.");
        const record = context ? null : await loadProfile(packId),
          profile = context
            ? context.profile()
            : record?.value || newProfile(pack);
        const candidate = setBuildTarget(
          pack,
          profile,
          id,
          selected ? q : null,
        );
        const saved = context
          ? await context.save(candidate)
          : await saveProfile(candidate, record?.value?.revision ?? 0);
        if (saved === false)
          throw new Error("Target was not saved. Review the page error.");
        sync(root, packId, context ? context.profile() : saved);
        known.set(packId, context ? context.profile() : saved);
        if (context?.onSaved) await context.onSaved();
      } catch (reason) {
        sync(root, packId, known.get(packId));
        control.querySelector("[data-build-status]").textContent =
          reason.message + " Open Quick collect to review tracking if needed.";
      } finally {
        busy = false;
        for (const c of root.querySelectorAll("[data-build-auto]")) {
          c.querySelector("[data-build-select]").disabled = false;
          c.querySelector("[data-build-quantity]").disabled = !c.querySelector(
            "[data-build-select]",
          ).checked;
        }
      }
    },
    { signal: controller.signal },
  );
}
if (document.querySelector("[data-build-auto]")) mountBuildTargets(document);
