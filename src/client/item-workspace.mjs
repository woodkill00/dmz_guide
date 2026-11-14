import { upgradeNeeds } from "../domain/upgrade-needs.mjs";
import { collectionNeedsValues } from "./upgrade-needs-view.mjs";
import { itemUses } from "../domain/item-uses.mjs";
import {
  automaticIngredientBlueprint,
  inventoryBlueprintAvailable,
} from "../domain/inventory-presentation.mjs";
import {
  hydrateInventoryIcons,
  releaseInventoryIcons,
} from "./inventory-icons.mjs";
import { loadProfile } from "../storage/store.mjs";
import { newProfile, validateProfile } from "../domain/profile.mjs";
import {
  createCatalogLoader,
  parseCatalogManifest,
} from "../content/catalog-loader.mjs";

let reader;
let active = true;
window.addEventListener("pagehide", () => {
  active = false;
});
window.addEventListener("pageshow", () => {
  active = true;
});
// Abort in the originating document before a native link navigation commits.
// WebKit otherwise reports in-flight local image fetches as access-control errors.
document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const link = event.target.closest?.("a[href]");
  if (
    !link ||
    link.hasAttribute("download") ||
    (link.target && link.target !== "_self")
  )
    return;
  const destination = new URL(link.href, location.href);
  if (
    !["http:", "https:"].includes(destination.protocol) ||
    (destination.origin === location.origin &&
      destination.pathname === location.pathname &&
      destination.search === location.search)
  )
    return;
  active = false;
  releaseInventoryIcons();
});

async function publishedPack(id) {
  reader ??= Promise.all([
    fetch("/assets/schemas/pack.schema.json").then((r) => {
      if (!r.ok) throw Error("Catalog schema unavailable");
      return r.json();
    }),
    fetch("/assets/content/manifest.json").then((r) => {
      if (!r.ok) throw Error("Catalog index unavailable");
      return r.text();
    }),
  ]).then(([schema, text]) =>
    createCatalogLoader({
      schema,
      manifest: parseCatalogManifest(text),
      // Directory icon lookups may outlive a fast native navigation in WebKit.
      // A bodyless GET can finish without surfacing a cancelled request as a page error.
      fetcher: (path) => fetch(path, { keepalive: true }),
    }),
  );
  return (await reader).getPublished(id);
}
export async function enhanceItemWorkspace(pack, profile) {
  if (!active) return;
  const workspace = document.querySelector("[data-item-workspace]");
  if (workspace) {
    const host = workspace.querySelector("[data-item-collection]");
    if (host) {
      const id = workspace.dataset.itemId;
      const owned = profile?.inventory?.[id];
      const text = document.createElement("p");
      text.className = "item-owned";
      text.textContent =
        owned == null
          ? "Owned: not entered"
          : `Owned: ${owned.toLocaleString("en-US")}`;
      const scope = document.createElement("small");
      scope.textContent =
        profile && profile.contentVersion !== pack.contentVersion
          ? "Saved catalog version differs. Review it in Inventory before changing quantities."
          : "Saved inventory · quantities and blueprints are edited in Inventory.";
      host.replaceChildren(text, scope);
      const current = profile || newProfile(pack);
      const needs = upgradeNeeds(pack, current);
      const uses = itemUses(pack, current).get(id);
      const values = collectionNeedsValues(needs.listedCollection, id, uses);
      const counts = document.createElement("dl");
      counts.className = "item-collection-counts";
      counts.setAttribute(
        "aria-label",
        "Known unfinished upgrade and mission needs",
      );
      for (const [label, value] of [
        ["Needed", values.required],
        ["Missing", values.missing],
      ]) {
        const term = document.createElement("dt"),
          number = document.createElement("dd");
        term.textContent = label;
        number.className = "needed-number";
        number.dataset.neededNumber = values.state;
        number.textContent = value;
        counts.append(term, number);
      }
      const note = document.createElement("small");
      note.textContent = values.note;
      host.append(counts, note);
      const item = pack.items.find((item) => item.id === id);
      if (item && inventoryBlueprintAvailable(item, uses)) {
        const blueprint = document.createElement("p");
        blueprint.className = "item-blueprint-state";
        const granted = automaticIngredientBlueprint(pack, current, item);
        blueprint.textContent = granted
          ? `Blueprint: granted by ${granted.name}`
          : current.itemBlueprints?.[id]
            ? "Blueprint: owned"
            : "Blueprint: not marked owned";
        host.append(blueprint);
      }
    }
  }
  await hydrateInventoryIcons(pack);
}

// Private item pages pass their already validated selection/profile explicitly.
if (document.body.dataset.page !== "local") {
  const icon = document.querySelector("[data-item-workspace] [data-icon-pack]");
  if (icon) {
    (async () => {
      const pack = await publishedPack(icon.dataset.iconPack);
      const profile = (await loadProfile(pack.id))?.value;
      if (!active) return;
      if (profile) validateProfile(profile);
      await enhanceItemWorkspace(pack, profile);
    })().catch((reason) => {
      if (!active) return;
      const host = document.querySelector("[data-item-collection]");
      if (host)
        host.textContent = `Saved collection unavailable: ${reason.message}. Open Inventory for recovery.`;
    });
  }
}

// The catalog owns row filtering/paging. Hydrate only displayed, exact-pack rows.
const directoryForm = document.querySelector("#catalog-filters");
if (directoryForm && document.body.dataset.page === "items") {
  let queued = false,
    running = false,
    again = false;
  const packs = new Map();
  async function refreshDirectoryIcons() {
    if (!active) return;
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      const ids = new Set(
        [...document.querySelectorAll(".item-row [data-icon-pack]")]
          .filter((node) => !node.closest("[hidden]"))
          .map((node) => node.dataset.iconPack),
      );
      for (const id of ids) {
        try {
          if (!packs.has(id)) packs.set(id, publishedPack(id));
          const pack = await packs.get(id);
          if (!active) return;
          await hydrateInventoryIcons(pack, {
            retain: true,
            visibleOnly: true,
          });
        } catch {
          /* Explicit image-needed fallback remains. Catalog errors have their own owner. */
        }
      }
    } finally {
      running = false;
      if (again) {
        again = false;
        schedule();
      }
    }
  }
  function schedule() {
    if (queued || !active) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      if (active) void refreshDirectoryIcons();
    }, 0);
  }
  directoryForm.addEventListener("input", schedule);
  directoryForm.addEventListener("change", schedule);
  directoryForm.addEventListener("submit", schedule);
  document.addEventListener("click", (event) => {
    if (event.target.closest("#catalog-pagination")) schedule();
  });
  window.addEventListener("popstate", schedule);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) schedule();
  });
  schedule();
}
