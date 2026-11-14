export function featurePages() {
  return [
    {
      path: "/workspace-backup/",
      title: "Workspace backup",
      page: "workspace-backup",
      scripts: ["/assets/src/client/workspace-backup.mjs"],
      body: `<header class="page-heading"><p class="eyebrow">PRIVATE RECOVERY</p><h1>Workspace backup</h1><p>Gather exports from the guide, map and armory into one checked bundle. Each tool restores its own data after its own preview.</p></header>
<p><a href="/settings/">Profile</a> · <a href="/field-desk/#field-backups">Field photos</a> · <a href="/missions/audit/">Mission audit</a> · <a href="/run-plan/">Run plans</a> · <a href="http://127.0.0.1:5175/" target="_blank" rel="noopener noreferrer">Map</a> · <a href="/armory/workbench/#backups">Armory</a></p>
<section class="panel"><h2>Create a bundle</h2><p>Export each module in its own tool first, then choose those JSON files here. The bundle includes their private contents, including possible spoilers and photos.</p><label>Workspace exports (up to six)<input id="workspace-files" type="file" accept="application/json,.json" multiple></label><button id="workspace-create" type="button">Preview selected exports</button><div id="workspace-create-preview" role="status"></div><button id="workspace-download" type="button" hidden>Download checked bundle</button></section>
<section class="panel"><h2>Inspect a bundle</h2><label>Workspace bundle JSON<input id="workspace-import" type="file" accept="application/json,.json"></label><div id="workspace-import-preview" role="status"></div><div id="workspace-modules"></div></section>
<p class="notice">Map source captures, external background images and other files omitted by their owner exports are not reconstructed here. A download request does not prove your browser saved the file. No module is restored by this page.</p>`,
    },
  ];
}
