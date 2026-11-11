export function featurePages() {
  return [
    {
      path: "/local/",
      title: "Private content preview",
      page: "local",
      body: '<header class="page-heading" data-local-library-heading><p class="eyebrow">PRIVATE / NOT PUBLISHED</p><h1>Your local content library.</h1><p>These records come from your selected private pack. Public static pages remain the published snapshot.</p></header><p class="actions" data-local-library-actions><a class="button secondary" href="/editor/">Edit private content</a><a class="button secondary" href="/settings/">Profile backups &amp; recovery</a></p><noscript><p class="notice">Private content needs JavaScript to read this browser\'s saved records. <a href="/catalog/">Open the published catalog</a>. This page does not publish or synchronize content.</p></noscript><label>Content pack<select id="pack-select"></select></label><p id="pack-note" class="notice"></p><p id="save-status" role="status"></p><p id="error" role="alert" tabindex="-1" hidden></p><div id="local-records" role="region" aria-label="Saved private content" tabindex="-1"></div>',
      scripts: ["/assets/src/client/local.mjs"],
    },
  ];
}
