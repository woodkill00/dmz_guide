# Repair: dedicated Safe Run map entry and presentation

Assessment: /safes.html is already an independent Safe Run map with selected-safe subset, spawn/manual start, reorder/optimize, locked-room evidence and a separate road worker/preferences. It is hard to discover under Tools; the modern generic Guide main sizing also unnecessarily insets its map. Live read-only check found44 positioned source candidates and11 reported spawns; this is captured-data scope, not verified current game coverage.

Requirements (FR-001/002/004/012/024): permanent native Safe Run map link in the main map toolbar, Home quick tools and companion startup page. Open the separate map without changing the main-map draft/profile. Make the dedicated page recognizable and allocate the full viewport width to its independent planner/terrain; retain responsive Map/Plan views. Preserve safe-only markers, select/deselect, start/order/road/access/source behavior and separate storage/worker. No duplicated main-map page/controller, collection, invented routing accuracy or automatic road sharing.

Plan/analysis: reuse existing safe-runs registry/URL /safes.html (no new feature ID, migration or backend). Modern scoped page title/header and full-width layout override; native toolbar link opens a new tab. Guide quick link uses the existing trusted map service origin. Test actual link opening + isolated page route features and responsive width, then full existing Safe Run browser/domain tests, root render/navigation and production builds. Default rollout/manual gates unchanged.

- [x] S1 Promote native links and dedicated page identity/full-width layout.
- [x] S2 Verify actual entry, route selection/start/order, source scope and workspace separation.
- [x] S3 Run owning Safe Run/browser/build/root regressions and record exact evidence.


## Executed verification / convergence

Actual native entry passes Chromium, Firefox and WebKit: the toolbar link opens /safes.html in a new tab, full-width dedicated terrain, correct page identity/Main map return, safe-only markers, spawn selection, real route paths, subset changes and responsive Map/Plan views. The main-map original dirty form/value and exact saved DB record remain unchanged (`tools/hajin-map/.local/071-safe-entry-link-final.log`). The first new fixture used Leaflet's interactive class to find routes; production deliberately uses noninteractive route lines. The corrected assertion checks the actual route SVG path instead of changing production interaction semantics.

The full unchanged modern Safe Run browser suite passes all three engines (`071-safe-entry-browser.log`): locked/key/puzzle/unknown evidence, exact key/grid links, spawn/manual/right-click, selection/search, optimize/manual drag/keyboard, persistence/corruption/quota, partial roads and failures, reload races/caps/deadlines, worker bootstrap/retry and15 total popup/responsive/text-size axe scans. Zero main-map/IDB writes, remote requests or page errors in that fixture.

All214 Map runtime tests and TypeScript/modern production build pass (`071-safe-entry-runtime.log`, `071-safe-entry-build.log`); the original21 main-map geometry cases pass with the added toolbar link (`071-safe-entry-main-layout.log`). Root's selected navigation/Home/feature admission suites and new native entry assertions pass24 tests (`.local/071-safe-entry-guide-runtime.log`), and Guide builds899 routes plus404 (`071-safe-entry-guide-build-final.log`). Repository validator reports0 failures; whitespace check passes. Existing bundle advisory remains unchanged.

Live smoke checks verified port5175's Safe Run page and ready terrain, with44 currently loaded source candidates/11 reported spawns, plus the Home quick link on4173. No complete/current-game claim is implied by those captured counts. The final page title is Safe Run route map; its full-width main rectangle is1440px at a1440px viewport. Private original screenshots are ignored under.local. No new provider data, shared road store, domain migration, default promotion or remote publication.
