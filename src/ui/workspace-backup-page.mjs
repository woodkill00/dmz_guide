import { weaponURL } from "../domain/weapon-routes.mjs";
export function featurePages() {
  return [
    {
      path: "/workspace-backup/",
      title: "Workspace backup",
      page: "workspace-backup",
      scripts: ["/assets/src/client/workspace-backup.mjs"],
      body: `<header class="page-heading"><p class="eyebrow">PRIVATE RECOVERY</p><h1>Workspace backup</h1><p>Gather exports from the guide, map and armory into one checked bundle. Each tool restores its own data after its own preview.</p></header>
<p><a href="/settings/">Profile</a> · <a href="/field-desk/#field-backups">Field photos</a> · <a href="/missions/audit/">Mission audit</a> · <a href="/run-plan/">Run plans</a> · <a href="/map/" target="_blank" rel="noopener noreferrer">Map</a> · <a href="${weaponURL("", "backups")}">Armory</a></p>
<section class="panel" aria-labelledby="saved-backup-title"><h2 id="saved-backup-title">Back up saved progress</h2><p>Preview existing guide and armory records directly. No restore or new profile is created. Choose current records or the automatically retained previous saved snapshots.</p><div class="site-filter-bar"><label>Catalog identity<input id="saved-backup-pack" maxlength="100" value="official:mw4-dmz-starter"></label><label>Snapshot<select id="saved-backup-snapshot"><option value="current">Current saved data</option><option value="previous">Previous saved snapshots</option></select></label></div><label><input type="checkbox" id="saved-backup-profile" checked>Guide profile · quantities and progress (photo files excluded)</label><label><input type="checkbox" id="saved-backup-armory" checked>Armory · acquisition, camos, builds and recorded pictures</label><button id="saved-backup-preview" type="button">Preview saved data</button><p id="saved-backup-status" role="status"></p><div id="saved-backup-details"></div><button id="saved-backup-download" type="button" hidden>Download previewed bundle</button><p>Map workspace, field photo bytes, mission audit, Content quality notes and run-plan exports remain separate. Add their files below to make a broader bundle. Every restored module still requires its owning tool's preview.</p></section>
<section class="panel"><h2>Create a bundle</h2><p>Export each module in its own tool first, then choose those JSON files here. The bundle includes their private contents, including possible spoilers and photos.</p><label>Workspace exports (up to seven)<input id="workspace-files" type="file" accept="application/json,.json" multiple></label><button id="workspace-create" type="button">Preview selected exports</button><div id="workspace-create-preview" role="status"></div><button id="workspace-download" type="button" hidden>Download checked bundle</button></section>
<section class="panel"><h2>Inspect a bundle</h2><label>Workspace bundle JSON<input id="workspace-import" type="file" accept="application/json,.json"></label><div id="workspace-import-preview" role="status"></div><div id="workspace-modules"></div></section>
<p class="notice">Map source captures, external background images and other files omitted by their owner exports are not reconstructed here. A download request does not prove your browser saved the file. No module is restored by this page.</p>`,
    },
  ];
}
