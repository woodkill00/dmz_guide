# Feature 109 implementation and verification

Worktree: `MW4_109`, branch `feature/109-sitewide-usability-design`, checkpoint `a5baed481b92dadf7514234c01fede3bf84834fb`. The original workspace and its browser data have been retained. No remote push, merge or deployment.

The shared token contract now supplies calc-backed spacing, density, typography, corner sizes, visible viewport and measured sticky offsets. Consumers across 32 existing guide/map stylesheets use those tokens. Intrinsic media, minimum hit targets, table sizes and map primitives retain explicit dimensions in `layout-exceptions.json`; world coordinates and item/planner counts were not converted into layout values.

Navigation has persistent Hide/Show menu and Reset layout controls. Reset touches layout preferences and existing map-panel position/width owners only. Invalid or unavailable preference storage falls back to session operation. The map's reparented navigation keeps its reopen controls reachable. The small migration notice lives inside navigation instead of covering map actions.

Audit and ordinary field-table lists use document scrolling. Metadata has a shared readable size; quantity widths, item-card wrapping, bounded dialogs, short-height editor/navigation behavior and mobile Home actions were refined. Mobile legacy map tools occupy separate layout rows instead of overlapping. At short heights and enlarged text, map detail titles use the compact shared label size without truncating their text.

## Commands

- `npm run ui:audit`: classifies 92 registry features, 2,278 guide routes and explicit map entries; checks exact retained dimensions and the baseline-selected CSS budget.
- `npm run test:ui:sitewide`: owned local server by default; Chromium/Firefox/WebKit shell persistence, focus, viewport/text-size, short-height and representative populated-route checks. Isolated synthetic player storage only.
- `DMZ_SITE_URL=http://127.0.0.1:4186` selects the isolated preview for existing browser suites (PowerShell: `$env:DMZ_SITE_URL='http://127.0.0.1:4186'`).
- `npm run test:ui:sweep`: baseline/candidate screenshot and DOM receipts. A populated Hajin capture must wait for hidden terrain status and real markers.
- `npm test`, `npm run map:test`, `npm run build`, `npm run build:maps`: existing runtime/build owners.

One-time migration scripts require explicit `--apply` or `--review-current`; they are not automatic fixers. Review source changes and geometry before refreshing any exception. `ui-layout-policy.test.mjs` proves that replacing an approved dimension with another raw value fails even when the declaration count does not grow.

## Evidence ledger (updated as suites finish)

- Guide and unified map builds passed; maps include admitted owner-local provider snapshots in the ignored development configuration.
- Map runtime: 245 passed, zero failed (`109-map-runtime.log`).
- Blueprint acquisition: all three engines passed real save/parity/quota/verification tests (`109-blueprints.log`).
- Orders: all three engines passed completion, disclosure, X01, concurrency, recovery and responsive tests (`109-orders.log`).
- Dashboard upgrades: all three engines passed completion/next/Undo, unchanged stock, draft/recovery/concurrency and responsive enlarged-text cases (`109-upgrades-fixed.log`).
- Item workspace: Chromium passed 320–1920/light/dark/enlarged-text/reduced-motion and saved build/stock parity (`109-items.log`); the existing runner uses Chromium.
- Map selection integration and pane host: all three engines passed (`109-map-selection.log`, `109-map-pane.log`).
- Safe Run: all three engines passed full behavior, popup, persistence, adversarial routing and five Axe scans per engine (`109-safe-route.log`).
- Loot Run existing browser suite passed (`109-loot-route.log`).
- Layout core: all three engines passed menu/focus/reload/reset, measured offset, 12 viewport/text states, short height, 36 family cases each and malformed preferences (`109-browser-frozen.log`).
- Topology: 2,278 guide routes, zero static findings; 50 of 52 companion targets opened, two explicitly unavailable services, zero failed (`.local/site-topology-audit/report.html`).
- First full implementation runtime: 1,194/1,195 passed. Sole failure was the isolated navigation VM missing the new layout initializer stub. Repaired; targeted 5/5 pass; clean full rerun is executing. Four stale checkpoint crafting assertions were also repaired; affected 14/14 passed.

Final acceptance remains pending final runtime, settled visual review, remaining owner suites and performance reconciliation. Physical mobile keyboard/browser-toolbar checks require a real supported device and have not been performed. Neither screenshots alone nor the absence of a confirmed code defect closes those gates.

## Latest verification — local desktop candidate

- Clean complete runtime run: **1,195/1,195 passed**, zero skipped (`109-runtime-accepted.log`). Later changed Dashboard/navigation/manager and new policy owners: **31/31 passed** (`109-runtime-affected-final.log`); the new policy checks also passed separately.
- Current map runtime: **245/245 passed**, zero skipped; TypeScript check passed.
- **92 registry entries checked** with browser health; Studio's separate owner-service redirect is capability-gated and its actual shell is tested separately (`109-feature-readiness.json`). This is entry readiness, not a claim that every action was activated.
- Guide/map/local Studio/manager layout and recovery cases are covered across Chromium, Firefox and WebKit. Real Studio+manager shells passed exact asset200/MIME and strict browser-health checks in disposable synthetic repositories (`109-services-small-fixture.log`).
- Modern guide: all three engines passed the populated18-route family matrix and viewport/menu/preference checks (`109-modern-family-matrix.log`). Modern shell preference/no-JS checks passed before a separate outdated navigation fixture was repaired. Normal presentation flags remain unchanged; the normal build was restored.
- **60 guide Axe scans**, all zero violations, across five main pages, three engines, dark/light, desktop and320px/200%-text states (`109-modern-axe.log`). No physical browser zoom or device certification is implied.
- Shared production item-card fixture: **48 width/text/theme/density combinations per engine**, plus expanded recovery/error/loading/missing-art Axe checks; all three engines passed (`109-component-reference.log`). Axe injection bypass is confined to this inert synthetic component context.
- Modern map:8 main marker cases plus2 Safe Run popup cases per engine passed five-second lifetime/control/camera checks (`109-final-marker-proof.log`). Actual raw/restored marker Edit save/Cancel/reload/backup tests passed in all three engines after map controls were rearranged (`109-marker-edit-controls.log`).
- Map sidebar widths: all three engines passed pointer/keyboard/bounds/reload/invalid preference/form/camera/domain preservation (`109-task-resize-settled.log`). Responsive assertions wait for the actual settled hidden state, rather than assuming two animation frames.
- Firefox wrapped-footer action obstruction and WebKit ResizeObserver delivery were repaired; targeted organized-menu tests passed (`109-menu-footer-fixed.log`, `109-menu-observer-fixed.log`). The popup reserves measured attribution geometry and schedules observer writes in the next frame.
- Independent visual review closed both confirmed findings in the inspected comparison set (`visual-review.md`). Desktop toolbar coordinates prove the action rows do not overlap; all inspected terrain screenshots are settled/populated.
- Fixed budgets passed:38 matched DOM comparisons,10 native navigation+two-frame samples, and CSS source **423,601 bytes versus423,763 maximum** (`109-performance.json`, `109-map-header-budget.log`). Raw literal-layout declarations fell from3,316 to868; exact remaining primitives have a maintained ledger. These measurements do not promise universal performance.
- Layout policy is now included in the quality CI job after the build. This turn ran local checks; it did not run or claim a GitHub Actions result.

Remaining signoff limits: final navigation-bounds fixture reconciliation, final source/build/format receipts, full delivery reconciliation and independent acceptance. Actual mobile keyboard/browser-toolbar and physical-device checks are not run. The separate broad legacy071 runner was not all green: its navigation fixture omitted the newer weapon acquisition source file; that fixture repair is being verified. No unexecuted runner is counted as passed.
