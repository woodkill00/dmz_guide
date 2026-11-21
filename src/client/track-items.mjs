import "./quick-tracker.mjs";
import { hydrateInventoryIcons } from "./inventory-icons.mjs";
import {
  createCatalogLoader,
  parseCatalogManifest,
} from "../content/catalog-loader.mjs";
const root = document.querySelector(".track-items-directory");
if (root) {
  const query = root.querySelector("#track-items-query"),
    select = root.querySelector("#track-items-pack"),
    sections = [...root.querySelectorAll("[data-track-items-pack]")],
    count = root.querySelector("#track-items-count");
  let loader,
    priorSearch = false;
  const openBeforeSearch = new Map();
  function filter(write = true) {
    const tokens = query.value
      .toLowerCase()
      .trim()
      .slice(0, 200)
      .split(/\s+/)
      .filter(Boolean);
    let shown = 0,
      total = 0;
    for (const section of sections) {
      const selected = section.dataset.trackItemsPack === select.value;
      section.hidden = !selected;
      for (const group of section.querySelectorAll("[data-track-rarity]")) {
        if (tokens.length && !priorSearch)
          openBeforeSearch.set(group, group.open);
        if (!tokens.length && priorSearch && openBeforeSearch.has(group))
          group.open = openBeforeSearch.get(group);
        let matching = 0;
        for (const row of group.querySelectorAll("[data-track-item]")) {
          const visible = tokens.every((token) =>
            row.dataset.trackSearch.includes(token),
          );
          row.hidden = !visible;
          if (visible) matching++;
          if (selected) total++;
        }
        group.hidden = !matching;
        if (selected) {
          shown += matching;
          if (tokens.length && matching) group.open = true;
        }
        group.querySelector("[data-track-rarity-count]").textContent =
          `${matching} item${matching === 1 ? "" : "s"}`;
      }
    }
    for (const column of root.querySelectorAll("[data-track-item-column]")) {
      const rows = [...column.querySelectorAll("[data-track-item]")];
      const matching = rows.filter((row) => !row.hidden).length;
      column.querySelector("[data-track-column-count]").textContent =
        `${matching} of ${rows.length}`;
      column.querySelector("[data-track-column-empty]").hidden = matching !== 0;
    }
    priorSearch = !!tokens.length;
    count.textContent = `${shown} of ${total} catalog items`;
    root.querySelector("#track-items-empty").hidden = shown !== 0;
    for (const link of root.querySelectorAll("[data-track-inventory-link]")) {
      const url = new URL(link.href);
      url.searchParams.set("pack", select.value);
      link.href = url.pathname + url.search + url.hash;
    }
    if (write) {
      const url = new URL(location.href);
      url.searchParams.set("pack", select.value);
      if (query.value.trim())
        url.searchParams.set("q", query.value.trim().slice(0, 200));
      else url.searchParams.delete("q");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }
  async function icons() {
    const id = select.value;
    try {
      loader ??= Promise.all([
        fetch("/assets/schemas/pack.schema.json").then((r) => {
          if (!r.ok) throw Error("Schema unavailable");
          return r.json();
        }),
        fetch("/assets/content/manifest.json").then((r) => {
          if (!r.ok) throw Error("Catalog unavailable");
          return r.text();
        }),
      ]).then(([schema, text]) =>
        createCatalogLoader({ schema, manifest: parseCatalogManifest(text) }),
      );
      const pack = await (await loader).getPublished(id);
      if (select.value === id)
        await hydrateInventoryIcons(pack, {
          root,
          readOnly: true,
          visibleOnly: true,
        });
    } catch {
      root.dataset.images = "unavailable";
    }
  }
  function readURL() {
    const params = new URL(location.href).searchParams;
    const value = params.get("pack");
    select.value = sections.some(
      (section) => section.dataset.trackItemsPack === value,
    )
      ? value
      : root.dataset.defaultPack;
    query.value = (params.get("q") || "").slice(0, 200);
    filter(false);
    void icons();
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
  let imageTimer;
  query.addEventListener("input", () => {
    filter();
    clearTimeout(imageTimer);
    imageTimer = setTimeout(() => void icons(), 150);
  });
  root.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    filter();
  });
  select.addEventListener("change", () => {
    filter();
    void icons();
  });
  for (const [selector, open] of [
    ["[data-track-items-expand]", true],
    ["[data-track-items-collapse]", false],
  ])
    root.querySelector(selector).addEventListener("click", () => {
      for (const section of sections.filter((section) => !section.hidden))
        for (const group of section.querySelectorAll("[data-track-rarity]"))
          group.open = open;
    });
  window.addEventListener("popstate", readURL);
  readURL();
  root.dataset.ready = "true";
}
