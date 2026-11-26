# Route-family coverage and verification

This is a required coverage matrix, not an executed test report. T04 replaces examples with generated exact registry IDs/routes and assigns every remaining route/alias. Existing071 layout/lifecycle/workspace/rollout contracts and 105 sitewide ownership remain authoritative; this feature refines presentation, not write semantics or fallback capability.

## Family ownership

| Family | Representative paths/identities | Primary tasks | Important expanded states |
| --- | --- | --- | --- |
| Shell/search/hubs | Home, feature registry, global search, main/secondary navigation | T09,T23 | Long menu, overflow, active item, mobile retract, empty results |
| Dashboard | `/` and its six section anchors | T11 | Needed/build/blueprint/weapon/upgrade/order actions, options, all-pages and completed |
| Inventory/Items | `/inventory/`, `/track/items/`, item directory | T12 | Category/filter, large counts, raw invalid inputs, duplicate display rows and unsaved recovery |
| Needed/Quick Collect | Needed, Quick collect, build targets | T13 | Shared ingredients, unknown recipes, Add found/Undo, row removal and multiple builds |
| FOB/upgrades | FOB hub and `/upgrades/` | T14 | Current/other tiers, full costs, complete/Undo, derived printing grants |
| Orders/story | `/missions/`,24 Hajin and 5 X01 chapter readers, objective records | T14,T16 | Earliest incomplete, protected story, every instruction line, manual collapse and edit |
| Mission/content audit | Mission audit, quality directory/dashboard | T22 | Fill later, source changed, empty/partial results and exact record navigation |
| Weapons | `/armory/` and all generated weapon/detail/legacy aliases | T15,T16 | Manual +/- and ownership, independent camo/prestige, attachments, unknown stats |
| Keys | `/keys/`, generated details, Hajin/X01 sections | T16 | Locked-room dependencies, map links, search/sort, long guidance |
| Other references | Item/location/recipe/guide detail and local previews | T16 | Crafting/upgrade/mission/loot/location relationships; missing art and sources |
| Repository/private editors | Registry-generated editor/local-service destinations | T17 | Dirty text/sections/files, field errors, save conflict, upload failure and readonly capability |
| Field desk/run tools | Existing feature registry destinations | T13,T22 | Trackers, discoveries, counters, journal, drag/reorder and active drafts |
| Hajin map | `/map/` | T18–T21 | Marker open, grid, sidebar sizes, source/category masks, inspect/edit, pan/zoom |
| X01 maps | `/map/x01/` plus registered floor/provider views | T18–T21 | Floor switch, same symbol classes, markers/inspector, route and source masks |
| Safe Run | `/map/safes/` | T18–T21 | Safe exclusion, locked-room red/key state, spawn/route, minimized tracker |
| Loot Run | `/map/loot/` | T18–T21 | Safes+clinics, best-known road route, excluded points and reorder |
| Map management | Registered map tools, icon studio, custom POIs, source comparison/update/review | T19–T22 | Bounds/edit/upload, staged updates, dedup/review, unavailable local service |
| Backup/settings/recovery | Settings, guide/map/armory bundle owners, migration tools | T22,T25 | Preview/restore/corrupt data, blocked storage, version mismatch and retained candidate |
| Help/sitemap/diagnostics | Feature/help directory, sitemap/mindmap and reports | T22,T23 | Clickable links, zoom, safe readable runtime output, missing capabilities |
| Legacy/404/service status | Generated alias inventory,404, local-service startup/offline pages | T22,T23 | Correct canonical target/context, readable disabled/offline state, no hardcoded origin |

## Verification tiers

1. **All routes:** static generated link/ID/asset/owner classification, including aliases and unavailable local tools. Every route must resolve to its intended owner; a200 fallback page does not prove correct content.
2. **All registered feature entry points:** real browser navigation/shell/current-state/readiness check; every feature appears in the report. Script/console/HTTP/CSP health failures are captured.
3. **Every family and interactive component/state:** Chromium, Firefox and WebKit at 320/390/768/1280/1440/1920 CSSpx, short landscape and representative tall content. Pairwise scheduling is permitted for secondary combinations, with an explicit generated case inventory: each family×engine covers narrow and desktop; each shared component covers all widths and both densities/themes. Do not silently substitute one empty state for populated coverage.
4. **High-risk journeys:** all three engines for real save/readback, cross-page parity, draft/CAS/quota/unverified/Back/focus cases. Include T18–T22 Orders/blueprint controls and existing trackers, crafting, inventory, weapon/camo, map routing/editing and recovery. Use isolated synthetic profiles, never the user's live storage.
5. **Text/device behavior:**200 % text enlargement and browser400 % zoom/reflow (1280 physical viewport equivalent320 CSSpx); browser text-spacing overrides; keyboard-only and coarse-pointer tests. Include mobile dynamic toolbar/safe area and virtual-keyboard manual checks on an actual supported device before claiming physical-device support.
6. **Expanded visual/accessibility:** compare deterministic screenshots for every family/state owner in dark/light. Axe WCAG2/2.1/2.2A/AA where the installed tooling supports them; manual WCAG2.2 focus/target/text checks cover unsupported automated rules. Normal behavioral tests keep CSP intact; any Axe injection exception is isolated and disclosed.
7. **Preservation/performance:** compare canonical fixture records, labels, remaining costs, linked IDs and save revisions. Measure actual selected interaction/DOM/CSS budgets on the same machine/build/browser/fixture methodology. Do not promise speed from a CSS change alone.

## Mandatory adverse scenarios

- Save resolves after the initiating element moves, the user focuses another control, pagehide/Back occurs or another tab writes.
- Quota/IDB/read failure, stale catalog/overlay, committed acknowledgement plus failed reread, blocked preference storage and malformed saved layout.
- Long labels, source names and mission text; missing/invalid icon; unknown quantities and partial denominators; zero/complete data;7-billion currency.
- Nested disclosures open, expanded source/error/recovery sections, short viewport, keyboard on focused field, resized/retracted/restored sidebar and moved panel partly off-screen.
- Map marker remains selected with Inspector open for at least 5 seconds through passive pan/zoom/resize and noninvalidating repaint. Explicit filter/source/data refresh, deletion, floor/context changes and owner transitions follow the existing guarded close/review/clear contract, including protecting active edits; do not promise selection retention when the marker identity or admitted dataset changes. Test both stable and intentionally invalidated selection. Explicit Locate/reset/route-fit can reposition the map; routine inspection must not recenter it.
- Clear/remove/bulk/restore remains previewed or explicitly confirmed according to its current owner; no design control bypasses validation.

## Planned command owners

Use existing `npm test`, `npm run build`, `npm run build:maps`, `npm run test:sitewide`, `npm run sitemap:audit`, `npm run test:sitemap`, `npm run test:ui:modern`, `npm run test:ui:map`, `npm run test:home:a11y`, `npm run test:weapons:workspace`, `npm run test:keys`, tracker and map suites as applicable. Existing standalone Orders/blueprint/upgrade/Quick Collect/Inventory/item-workspace scripts are regression owners; integrate them into the feature's recorded runner rather than assuming exported test functions execute when a module is launched.

T05 will record exact commands/env vars/startup/readiness for this checkout. A case must be Passed/Failed/Blocked/Not run with an explicit reason and artifact path. Passing receipts bind commit/build, fixture ID, engine version, viewport, text/zoom mode, theme, density and expanded state. Do not count screenshot capture alone as functional verification or treat an unavailable tool as passed.
