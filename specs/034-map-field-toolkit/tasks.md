# Tasks: Map field toolkit
## Setup and foundation
- [x] T001 Define/clarify scoped feature, inspect current implementation and select034; specs/034-map-field-toolkit/spec.md. FR001–015.
- [x] T002 Complete reviewed plan/model/contracts/checklist and analyze consistency; foundation was staged before independent gate completed (analysis records deviation); specs/034-map-field-toolkit/*.md. FR014/015.
- [x] T003 Implement strict optional toolkit/owned metadata model and bounded recovery, semantic pack preview/import pure helpers; workspace/toolkit.ts,field-guide.ts,model.ts,backup.ts,annotations.ts and tests/toolkit.test.ts. FR001/004/005/008/010/014.
## US1 safe routes/recovery
- [x] T004 Expose guarded Undo/deleted bin and route health, per-route avoidance/preferred stops; toolkit-ui.ts,field-guide-ui.ts,app.ts. FR001/002.
## US2 mission/collections
- [x] T005 Implement mission objective editing/linking/completion/route conversion and collection CRUD/member selection/show-hide/route conversion; toolkit-ui.ts. FR004/005.
- [x] T006 Waypoint/tracking text/status filters, checkbox/bulk-remove/add collection and multiple colored route overlays; field-guide-ui.ts. FR011/012.
## US3 field tools
- [x] T007 Quick-add/right-click/long-press with keyboard alternative; temporary marks, field controls and measurement/copy; toolkit-ui.ts,app.ts. FR003/007/009.
- [x] T008 Settings/marker size/menu reset/shortcuts and responsive styles; toolkit-ui.ts,styles.css. FR013.
## US4 maintenance/exchange
- [x] T009 Owned structured POI editor/search/popup and source comparison summary/focus, preserve update review workflow; annotation-editor.ts,explorer-index.ts,toolkit-ui.ts. FR006/008.
- [x] T010 Explicit selected portable pack download/strict preview/transactional apply, idempotent duplicates and dependency reporting; toolkit-ui.ts. FR010/014.
## Polish and verification
- [x] T011 Help/docs plus meaningful focused/full unit/browser/engine/a11y/320px/draft/recovery/import/CAS tests; tests/toolkit.test.ts,scripts/toolkit.browser.cjs and runners. FR015/SC001–004.
- [x] T012 Analyze/converge independent security/code/visual review findings, record actual evidence and local commit; specs/034-map-field-toolkit/{analysis,acceptance}.md. FR015.

Dependencies: T001→T002→T003→T004/T005→T006→T007/T008/T009→T010→T011→T012. All production shared contracts serial. Independent reviewer owns requirements checklist and review evidence; no parallel implementation writes. Each US has independent synthetic browser scenario. Existing verified capabilities are regression-tested, not rewritten unnecessarily.

## Convergence repairs
- [x] T013 Repair independent import findings in toolkit.ts/field-guide.ts: preserve stale owned identity, include authored route progress/collection visibility in semantic matching, use remapped preview dependencies and reserve unresolved namespaces for omitted owned/reviewed references. Add collision/repeat regressions in tests/toolkit.test.ts. FR010/014.
- [x] T014 Scope enlarged field-mode buttons to actual toolbar actions, preserve official pin rotation with CSS scale, make toolbar horizontally scrollable at narrow widths; unchanged menu touch/drag/minimize assertions pass in focused reproduction. FR007/013/015.
- [x] T015 Add quota/retry, cancellation/malformed pack and other-tab CAS browser flows; per-route avoidance/changed graph/reset; long-press movement/multitouch/Escape and any-dialog shortcut guards. scripts/toolkit.browser.cjs. FR001/002/003/010/013/014.

- [x] T016 Repair capacity regression without changing250ms thresholds: avoid redundant marker-size attribute/style invalidation on unchanged redraws; rerun unchanged capacity fixture in isolation and final browser/engine checks. toolkit-ui.ts. FR013/015.

- [x] T017 Avoid new overlay hot-path amplification: early exit without graph serialization when no secondary routes, resolve all active overlays through one record index per render, cache collection visual signature while honoring source/version/visibility changes; verify collection show/hide and secondary geometry. toolkit-ui.ts. FR005/012/015.

- [x] T018 Protect secondary worker deadlines against queued stale success/error handlers: generation check before mutation plus worker-local timer; fake-worker/virtual-clock browser reproduction proves newer deadline still fires. toolkit-ui.ts,scripts/toolkit.browser.cjs. FR012/015.

- [x] T019 Repair WebKit post-save focus: never restore dialog container as prior control, preserve newer connected focus, retry once after native dialog focus settles with epoch/disposal cancellation. Focused WebKit7groups passes with recovery focus and actual tracking filters; field-guide-ui.ts,scripts/toolkit.browser.cjs. FR013/015.

- [x] T020 Render imported route/collection tooltip labels as safe DOM text, not Leaflet HTML strings; synthetic hostile-label tooltip rendering in3engines, no injected elements/execution. toolkit-ui.ts,scripts/toolkit.browser.cjs. FR010/014/015.

- [x] T021 Provide an explicit confirmed delete-without-bin fallback for an active point exceeding the bin byte/count limit; preserve existing bin and cancel path. Full-bin browser reproduction in3engines. app.ts,scripts/toolkit.browser.cjs,docs/local-map-workspace.md. FR001/014/015.
