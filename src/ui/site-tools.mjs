import { features, featureURL } from "./feature-registry.mjs";
import { mapWorkflows } from "../domain/site-workflows.mjs";
const e = (v) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function renderWorkspaceTools({ surface = "guide", mapBase } = {}) {
  const link = (id, label) => {
    const f = features.find((f) => f.id === id);
    return `<a data-workspace-feature="${id}" href="${e(featureURL(f, surface, { mapBase }))}">${e(label || f.label)}</a>`;
  };
  return `<details class="workspace-tools" data-workspace-tools data-workspace-surface="${surface}"><summary>Workspace <span data-workspace-save-mark aria-hidden="true"></span></summary><div class="workspace-tools-panel"><p data-workspace-save role="status">Guide and armory save notices</p><p data-workspace-remote hidden>Another tab saved progress. Finish or export your edits before reviewing saved data.</p><div class="workspace-tool-links">${link("home", "Home")}${link("search", "Search")}${link("workspace-backup", "Back up / recover")}${link("quality", "Content quality")}${link("help", "Help")}</div><button type="button" data-workspace-density aria-pressed="false">Compact spacing</button><div><strong>Recent work</strong><div data-workspace-recent class="workspace-tool-links">${link("features", "Find or pin a feature")}</div></div><div><strong>Maps and runs</strong><div class="workspace-tool-links">${mapWorkflows.map((id) => link(id)).join("")}</div></div><p class="workspace-tools-note">Progress stays in this browser and address. Save notices never overwrite drafts.</p></div></details>`;
}
