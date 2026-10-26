# Local Hajin Map Workspace

Opt-in local map viewer, integrated from the owner's original workspace commit `84b793c`. It is separate from the native guide's `/maps/` page and private content packs. Original project code inherits the repository MIT license; game resources are not covered.

From repository root run `npm run map:install`, then `npm run map:dev` and open the printed loopback address (normally http://127.0.0.1:5175/). Use Map key directly for icons and individual/all/none selection; Sources & Layers provides website/category grouping. Selections share browser-local state. Keyboard: arrows pan, +/− zoom, Reset fits the image. Physical-device behavior is not certified.

No game imagery, icons or complete point snapshot are distributed. A fresh checkout intentionally shows recoverable missing-file states. Existing owner-local inputs can be copied into `public/maps/hajin/v1/background.webp` and `public/maps/hajin/official/`. They remain ignored and must not be force-added. Unknown public redistribution permission is not resolved by attribution or local retrieval.

Research acquisition helpers from the original workspace are deliberately not included or run here. This integration reads only owner-supplied local inputs and does not scrape or download source sites. Prepare/review local resources separately and keep them out of public history. Public acquisition tooling, if desired later, requires its own bounded/transactional import design and review.

`npm test` discovers every `tests/*.test.ts` file, including coordinates, bounded inputs and workspace foundation tests. `npm run build` checks types and builds this local viewer. `npm run test:browser` starts an owned local server and uses labeled synthetic records/original pixels, including missing-data and transactional storage recovery. Set `CHROMIUM_PATH` for installed Chromium/Edge or install the package's pinned Playwright Chromium. No real source assets are needed for these tests.

Feature020 implementation has started on a separate branch. Its foundation modules validate immutable source snapshots, maintain an isolated revision-checked IndexedDB workspace and stage one-time source-mask migration. These modules are not yet connected to user-facing editing/import controls. `npm run test:capacity` (root alias `npm run map:test:capacity`) validates a synthetic four-source/20,000-record input; it explicitly does not certify the future comparison/rendering performance criteria. See the [020 task status and evidence](../../specs/020-map-source-fusion/verification.md).

See the repository's [workspace guide](../../docs/local-map-workspace.md) for boundaries and the [019 specification](../../specs/019-local-map-workspace/spec.md) for integration requirements.
