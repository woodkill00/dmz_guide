# Acceptance — organized map menu (2026-11-05)

Feature067, local branch `feat/067-map-menu-organization`. Manual pinned Spec Kit v1.2.2 full cycle; definition review passed. Final independent source, visual and receipt review passed; all nine source hashes matched.

## Delivered behavior

FR001: Collapsed Combined map categories at the top and separate collapsible website lists. Each site keeps its visibility, link, categories, icons and duplicate evidence. Combined switches group normalized equal display names across available captures; a mixed checkbox represents partial selection. This is a visibility control, not a new merged dataset or a synonym/identity claim. Existing location deduplication remains unchanged. Disclosure state and list scroll survive rerenders in the current page session; source/category selections keep the existing storage behavior. Private/reviewed controls and source update actions remain available.

FR002: Hide map key retracts the sidebar and expands the map. Explicit Map key opener restores it without resetting list scroll. Existing independent section scrolling/resizing remains.

FR003–004: Compact scrollable marker cards open without automatic camera movement and are translated inside the map viewport below top controls. The optional secondary summary opens only through Selected details, with its visibility reflected in aria-expanded. Panning/zooming while selected defers marker rebuilds; closing the last popup flushes the deferred redraw. Synchronous A-to-B popup replacement retains pending work. Explicit data/filter refreshes close stale selection and take effect immediately. No source collection, schema or game-fact changes.

## Executed evidence

- `npm --prefix tools/hajin-map test`: 207/207 pass, zero failures/skips/cancellations. `.local/menu067-unit.log`.
- `npm --prefix tools/hajin-map run test:workflows`: Chromium, Firefox and WebKit pass, including retained065 sidebar controls/list scrolling/resizing, state preservation, toolbar/search/layers, selection/highlight/collapse/resize/mobile/reset and authoritative waypoint action. `.local/menu067-workflows-final.log`. Existing inspector assertions remain, with explicit Selected details/Expand steps matching the new deliberate opening behavior.
- `npm --prefix tools/hajin-map run test:safes`: all three engines pass, 15 axe scans with zero violations; existing key/color/overlap, source refresh/race, route drag/order/persistence, worker lifecycle/cap/deadline checks retained. `.local/menu067-safes.log`. An earlier attempted parallel launch could not acquire5279; new menu test permanently uses5282 and safe regression then completed normally. No failed assertion was removed.
- `npm --prefix tools/hajin-map run test:menu`: final receipt `.local/menu067-browser-final.log`. Synthetic sources/terrain and a private synthetic CRUD record; no owner data or provider requests. Tests combined/mixed switches, native Space focus restoration, source disclosure retention, retract/restore map expansion, stationary opening, pan persistence, inspector expanded-state Close/Escape, A-to-B pending redraw retention/flush and authoritative filter/private deletion. Long-content corner cards at1440px/320px and100%/200% root font size stay within map bounds; close/action buttons receive real clicks. Nine axe scans per engine (one key, eight edge cards),27 total, zero violations. This is root text sizing, not a claim of actual browser zoom or physical-device certification.
- Strict TypeScript/three-entry Vite build passed: `.local/menu067-build-final.log`. Repository checker: zero failures, `.local/menu067-check.log`. `git diff --check` passed. Focused helper/test formatting performed; legacy condensed source style retained to avoid unrelated whole-file rewrites.
- Actual local main/safe desktop/mobile preview: `.local/menu067-live.json`, screenshots `.local/menu067-{main,safe}-{desktop,mobile}.png`; no page errors or horizontal document overflow. Reviewer inspected actual main desktop/mobile source-list visuals. No private screenshots/assets are committed.

## Analysis and repairs

Independent definition review requested corner reachability and authoritative-change tests; both added. Tests exposed overlay interception at a popup close button; clamp now reserves top overlays/bottom controls. Independent source review found combined focus loss, inspector aria drift and a lost redraw on popup replacement. Stable IDs/focus capture, centralized panel visibility and retained guarded pending work repair these defects, with explicit regressions. Tests await normal Leaflet fade removal and completion of asynchronous CRUD before asserting, retaining exact state assertions.

Scope: main map and shared tool views; shared popup/map-view behavior also verified through the existing Safe runs regression. No native guide catalog/navigation behavior changed. Prior065 broad aggregate failure remains previously recorded; it is not claimed as a passing aggregate here. Formal accessibility certification, physical-device and every unrelated native guide journey were not performed.
