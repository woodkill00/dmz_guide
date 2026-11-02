import {
  keyWorkspacePanel,
  privateKeyControls,
  keyRoomFacts,
  keyWorkspaceData,
} from "./key-workspace-view.mjs";
import { allKeys } from "../content/key-access.mjs";
import {
  keyCoverageNotice,
  renderKeyDirectory,
  renderAccessDetails,
  renderKeySources,
} from "./key-access-view.mjs";
import { keyGuide, keyImages, KEY_TYPES } from "../content/keys.mjs";
import { e, pageHeading } from "./render.mjs";
const external = (url, label) =>
  `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`;
const notice = keyCoverageNotice;
const locations = (key) =>
  key.locations
    .map((l) => `${e(l.name)} <strong class="key-grid">${e(l.grid)}</strong>`)
    .join("<br>");
export function featurePages() {
  const directory = renderKeyDirectory();
  return [
    { path: "/keys/", page: "keys", title: "Keys", body: directory },
    ...allKeys.map((k) => {
      const image = keyImages[k.id],
        local = `/local-key-images/${k.id}.webp`;
      return {
        path: `/keys/${k.id}/`,
        page: "keys",
        title: k.name,
        body: `${pageHeading("HAJIN · KEY GUIDE", k.name, KEY_TYPES[k.category])}<p><a href="/keys/">← All keys</a></p>${notice}${keyWorkspacePanel()}<section class="panel key-detail-stock"><h2>My copy of this key</h2>${privateKeyControls(k)}<noscript>Enable JavaScript for private key tracking.</noscript></section><div class="key-facts"><section class="panel"><h2>How to get</h2><p>${e(k.acquisition)}</p></section><section class="panel"><h2>Where to use</h2><p>${locations(k)}</p></section></div>${renderAccessDetails(k)}<section class="panel"><h2>Room details and reported loot</h2>${keyRoomFacts(k)}</section><section class="panel"><h2>Access directions</h2><ol>${k.steps.map((s) => `<li>${e(s)}</li>`).join("")}</ol>${k.requirements.length ? `<h3>Requirements and hazards</h3><ul>${k.requirements.map((s) => `<li>${e(s)}</li>`).join("")}</ul>` : ""}<p>Loot and key-durability reports remain unverified; contents can vary.</p></section>${image ? `<section><h2>Location screenshot</h2><figure class="key-screenshot"><a href="${local}" target="_blank" rel="noopener noreferrer" aria-label="Open full-size ${e(k.name)} screenshot in a new tab"><img src="${local}" alt="${e(image.alt)}" width="${image.width}" height="${image.height}" loading="lazy"></a><figcaption>Game8 location/access image · underlying game artwork © Activision. <a href="${local}" target="_blank" rel="noopener noreferrer">Open full-size screenshot ↗</a>. Local source checkout only; if unavailable, ${external(image.url, "view the source image")}. No screenshots are bundled with static exports.</figcaption></figure></section>` : "<section><h2>Location screenshot</h2><p>No source screenshot is registered for this key.</p></section>"}<section class="panel"><h2>Source and status</h2><p>${renderKeySources(k)} · checked ${e(keyGuide.checkedAt)}. Directions are a concise factual summary; confirm them during gameplay.</p></section>${keyWorkspaceData()}<script type="module" src="/assets/src/client/keys.mjs"></script>`,
      };
    }),
  ];
}
