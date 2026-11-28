import { siteTopics, workflowLink } from "../domain/site-workflows.mjs";
import { projectSiteQuality } from "../domain/site-quality.mjs";
import { readWeaponAcquisition } from "../content/weapon-acquisition.mjs";
import { readWeaponIntel } from "../content/weapon-intel.mjs";
import { readWeaponCamos } from "../content/weapon-camos.mjs";
import { keyGuide } from "../content/keys.mjs";
import icons from "../content/item-icons.json" with { type: "json" };
import { authorPath } from "../content/author-target.mjs";
import { servicePath } from "../domain/local-services.mjs";
import { e, recordUrl } from "./render.mjs";
const json = (v) => JSON.stringify(v).replaceAll("<", "\\u003c");
export { qualityRow } from "./site-quality-row.mjs";
import { qualityRow } from "./site-quality-row.mjs";
export async function featurePages(packs, { catalog } = {}) {
  const acquisition = await readWeaponAcquisition(),
    intel = await readWeaponIntel();
  const index = await projectSiteQuality(packs, {
    icons: icons.items,
    weaponAcquisition: acquisition,
    weaponIntel: intel,
    weaponCamos: await readWeaponCamos(),
    keys: keyGuide,
    readerURL: (pack, record, kind) =>
      recordUrl({ ...record, recordType: kind, pack }),
    editorURL: (pack, record) => {
      const entry = catalog?.entries.find((entry) => entry.pack.id === pack.id);
      if (!entry)
        throw Error("Quality editor links require the admitted catalog key");
      return servicePath(
        "author",
        authorPath({
          packKey: entry.key,
          packId: pack.id,
          id: record.id,
          intent: "compose",
        }),
      );
    },
    specialEditorURL: (adapter, id) =>
      servicePath(
        "author",
        "/?" +
          new URLSearchParams({
            adapter,
            catalogId: adapter === "key-reference" ? "keys" : adapter,
            id,
            intent: "compose",
          }),
      ),
  });
  return [
    {
      path: workflowLink("help"),
      page: "help",
      title: "Help & instructions",
      scripts: ["/assets/src/client/site-help.mjs"],
      body: `<header class="page-heading"><h1>Help & instructions</h1><p>How the guide, trackers, maps and editing tools connect.</p></header><form class="site-filter-bar" id="help-search" hidden><label>Find instructions<input type="search" id="help-query" maxlength="200" placeholder="Backups, camos, Orders, photos…"></label><button type="reset">Clear</button></form><p id="help-count" role="status">${siteTopics.length} topics</p><div class="site-help-topics">${siteTopics.map((topic) => `<details class="site-help-topic" id="${topic.id}" data-help-topic="${topic.id}" data-help-search="${e((topic.title + " " + topic.text).toLowerCase())}"><summary>${e(topic.title)}</summary><p>${e(topic.text)}</p><div class="workspace-tool-links">${topic.links.map(([id, label, hash]) => `<a href="${e(workflowLink(id, hash))}">${e(label)}</a>`).join("")}</div></details>`).join("")}</div><noscript><p>Expand any topic to read its instructions. Search needs JavaScript.</p></noscript>`,
    },
    {
      path: workflowLink("quality"),
      page: "quality",
      title: "Content quality",
      scripts: ["/assets/src/client/site-quality.mjs"],
      body: `<header class="page-heading"><h1>Content quality</h1><p>Specific gaps in the published reference. Editorial checks do not change player progress or certify game accuracy.</p><p><a href="${workflowLink("mission-audit")}">Mission section audit</a> · <a href="${workflowLink("data-review")}">Source changes & plan impact</a> · <a href="${workflowLink("help", "quality")}">How review works</a></p></header><form id="quality-filters" class="site-filter-bar"><label>Find record<input id="quality-query" type="search" maxlength="200"></label><label>Type<select id="quality-type"><option value="">All types</option>${[
        ...new Set(index.entries.map((r) => r.kind)),
      ]
        .sort()
        .map((kind) => `<option value="${kind}">${kind}</option>`)
        .join(
          "",
        )}</select></label><label>Field<select id="quality-field"><option value="">All fields</option>${[
        ...new Set(index.entries.map((r) => r.field)),
      ]
        .sort()
        .map((field) => `<option value="${field}">${field}</option>`)
        .join(
          "",
        )}</select></label><label>Review<select id="quality-filter"><option value="">All reviews</option><option value="pending">Not checked / changed</option><option value="later">Fill later</option><option value="checked">Checked</option></select></label><button type="reset">Clear filters</button></form><p id="quality-status" role="status">${index.entries.length} listed gaps${index.limited ? ` of ${index.eligibleCount} eligible gaps; bounded report` : ""}. Missing information stays missing after a review check.</p><p id="quality-error" role="alert" hidden></p><div class="site-pagination"><button id="quality-prev" type="button" disabled>Previous</button><span id="quality-range"></span><button id="quality-next" type="button" disabled>Next</button><button id="quality-refresh" type="button">Reload reviews</button></div><div class="site-quality-table" role="region" aria-label="Reference gaps" tabindex="0"><table><thead><tr><th scope="col">Record</th><th scope="col">Information gap</th><th scope="col">Editorial status</th><th scope="col">Action</th></tr></thead><tbody id="quality-rows">${index.entries.slice(0, 100).map(qualityRow).join("")}</tbody></table></div><details class="panel"><summary>Export or restore review notes</summary><button id="quality-export" type="button">Export editorial reviews</button><label>Review log JSON · up to512KiB<input id="quality-import" type="file" accept="application/json,.json"></label><p id="quality-import-status" role="status"></p><button id="quality-import-apply" type="button" hidden>Apply reviewed log</button></details><noscript><p>First100 public gaps shown. Filtering and local review changes need JavaScript; reader/editor links remain usable.</p></noscript><script type="application/json" id="quality-data">${json(index)}</script>`,
    },
  ];
}
