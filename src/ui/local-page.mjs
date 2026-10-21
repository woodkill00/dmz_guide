export function featurePages() {
  return [
    {
      path: "/local/",
      title: "Private content preview",
      page: "local",
      body: '<header class="page-heading"><p class="eyebrow">PRIVATE / NOT PUBLISHED</p><h1>Your local content library.</h1><p>These records come from your selected private pack. Public static pages remain the published snapshot.</p></header><label>Content pack<select id="pack-select"></select></label><p id="pack-note" class="notice"></p><p id="save-status" role="status"></p><p id="error" role="alert" tabindex="-1" hidden></p><div id="local-records"></div>',
      scripts: ["/assets/src/client/local.mjs"],
    },
  ];
}
