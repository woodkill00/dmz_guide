// Each suite owns disposable source checkouts and closes its browsers/server.
// No saved inventory, real repository content or existing browser profile is edited.
await import("./page-editor-visual.mjs");
await import("./page-editor-media.mjs");
await import("./page-editor-adverse.mjs");
await import("./page-editor-adapters.mjs");
