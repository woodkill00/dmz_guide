import { keyGuide, keyImages, KEY_TYPES } from "../content/keys.mjs";
import { e, pageHeading } from "./render.mjs";
const source = (key) =>
  keyGuide.sourceURL + (key ? "#" + key.sourceAnchor : "#hl_2");
const external = (url, label) =>
  `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;
const notice = `<p class="notice">${keyGuide.keys.length} keys reported by Game8 on ${e(keyGuide.sourceDate)}; checked ${e(keyGuide.checkedAt)}. Source reports, not a verified complete in-game catalog. ${external(source(), "Game8 key guide")}</p>`;
const locations = (key) =>
  key.locations
    .map((l) => `${e(l.name)} <strong class="key-grid">${e(l.grid)}</strong>`)
    .join("<br>");
const searchText = (key) =>
  [
    key.name,
    ...key.aliases,
    key.acquisition,
    ...key.locations.flatMap((l) => [l.name, l.grid]),
    ...key.steps,
    ...key.requirements,
  ].join(" ");
export function featurePages() {
  const directory = `${pageHeading("HAJIN FIELD GUIDE", "Keys", "Find how to obtain a key and where to use it.")}${notice}<form id="key-filters" class="key-filters" hidden role="search"><label>Search keys, places or grid<input id="key-search" type="search" maxlength="200" placeholder="Name, F4, casino, battery…"></label><label>How to get<select id="key-type"><option value="">All acquisition types</option>${Object.entries(
    KEY_TYPES,
  )
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join(
      "",
    )}</select></label><button type="reset">Clear filters</button></form><p id="key-count" role="status" aria-live="polite">${keyGuide.keys.length} keys</p><p id="key-empty" hidden>No keys match these filters. Try another name, place or grid, or clear the filters.</p><div class="armory-table-wrap" role="region" aria-label="Key directory" tabindex="0"><table class="armory-table key-directory"><thead><tr><th scope="col">Key</th><th scope="col">How to get</th><th scope="col">Where to use / grid</th></tr></thead><tbody>${[
    ...keyGuide.keys,
  ]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (k) =>
        `<tr data-key-row data-category="${k.category}" data-search="${e(searchText(k))}"><th scope="row"><a href="/keys/${k.id}/">${e(k.name)}</a><small>${KEY_TYPES[k.category]}</small></th><td>${e(k.acquisition)}</td><td>${locations(k)}</td></tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><noscript><p>All keys and detail links are available without JavaScript. Enable JavaScript to filter this list.</p></noscript><script type="module" src="/assets/src/client/keys.mjs"></script>`;
  return [
    { path: "/keys/", page: "keys", title: "Keys", body: directory },
    ...keyGuide.keys.map((k) => {
      const image = keyImages[k.id],
        local = `/local-key-images/${k.id}.webp`;
      return {
        path: `/keys/${k.id}/`,
        page: "keys",
        title: k.name,
        body: `${pageHeading("HAJIN · KEY GUIDE", k.name, KEY_TYPES[k.category])}<p><a href="/keys/">← All keys</a></p>${notice}<div class="key-facts"><section class="panel"><h2>How to get</h2><p>${e(k.acquisition)}</p></section><section class="panel"><h2>Where to use</h2><p>${locations(k)}</p></section></div><section class="panel"><h2>Access directions</h2><ol>${k.steps.map((s) => `<li>${e(s)}</li>`).join("")}</ol>${k.requirements.length ? `<h3>Requirements and hazards</h3><ul>${k.requirements.map((s) => `<li>${e(s)}</li>`).join("")}</ul>` : ""}<p>Loot contents and key durability are not established by this source report.</p></section><section><h2>Location screenshot</h2><figure class="key-screenshot"><a href="${local}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size ${e(k.name)} screenshot in a new tab"><img src="${local}" alt="${e(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy"></a><figcaption>Game8 location/access image · underlying game artwork © Activision. <a href="${local}" target="_blank" rel="noopener noreferrer">Open full-size screenshot ↗</a>. Local source checkout only; if unavailable, ${external(image.url, "view the source image")}. No screenshots are bundled with static exports.</figcaption></figure></section><section class="panel"><h2>Source and status</h2><p>${external(source(k), "View this key on Game8")} · updated ${e(keyGuide.sourceDate)} · checked ${e(keyGuide.checkedAt)}. Directions are a concise factual summary; confirm them during gameplay.</p></section>`,
      };
    }),
  ];
}
