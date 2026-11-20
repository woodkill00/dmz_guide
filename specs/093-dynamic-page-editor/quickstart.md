# Acceptance journeys

Implemented local author workbench; see [usage](../../docs/page-editor.md) and acceptance.md for executed checks and limits. Run npm run author explicitly; normal reader updates require npm run build.

1. Start the local author service explicitly. From a Hajin or X01 Order page choose Edit; verify exact catalog/record identity and destination. Missing server shows startup help without data changes.
2. Add a section, place a picture between paragraphs, move it with drag and then Move controls, preview and Save to repository. Reopen saved preview; rebuild and compare the reader. No inventory/progress changes.
3. Verify pictures between Order task steps and exact audit links first; then repeat for an item, then an upgrade. Edit a known canonical quantity and validate the dependency impact. After explicit normal version rebind, inventory/Needed/Quick collect calculate consistently.
4. Reload an unsaved draft with a prepared image; restore/undo/export it. Inject stale revision, quota, corrupt/future document, invalid reference, upload failure and interrupted transaction; retain valid old content and recover exact draft/assets.
5. Refresh the underlying source: unchanged custom sections survive; overlapping factual edits require comparison. Test linked/removed sections and shared image usage.
6. Exercise all registered adapters and read-only explanations, no-JS default reader fallback,320–1920px/200% text, three browser engines, keyboard/non-drag controls, light/dark, spoiler settings and private-state preservation.
