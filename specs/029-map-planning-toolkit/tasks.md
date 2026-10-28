# Tasks
- [x] T001 Research actual data, specify/clarify/constitution/plan/model/checklist/analyze. FR001–010.
- [x] T002 Add strict optional field-guide contracts/private backup compatibility and tracking/evidence/status tests. FR001/009.
- [x] T003 Pure bounded duplicate queue/capture-bound decisions + dual highlight UI and reset. FR002.
- [x] T004 Gameplay preferences/quick categories/saved searches/favorites and density grouping/overlap member list. FR003/005.
- [x] T005 Strict public-view share preview/apply/copy fallback without private values. FR004.
- [x] T006 Pure per-record update delta + paginated preview names/positions/details before existing Apply. FR006.
- [x] T007 Validate explicit graph/projection/directional blocked shortest-path solver and synthetic edge/budget tests. FR008/SC002.
- [x] T008 Planner route storage/waypoint add/map selection/drag+keyboard reorder/reverse/remove, road/direct rendering/errors and popup integration. FR007/008.
- [x] T009 Road import preview/editor/map tracing/junction/block/direction management and ignored local partial starter trace. FR008/009.
- [x] T010 Fresh-profile backup/ref stale and missing-road recovery/draft/CAS/cancel/import failure verification. FR009.
- [x] T011 Help/direct navigation and plan/evidence documentation. FR010.
- [x] T012 Full relevant unit/build/browser/engine/a11y/repository/performance checks and independent security/UI review. SC001–003.
- [x] T013 Analyze/converge append+repair findings, final acceptance/local commit. SC003.

T002→T003→T004→T005→T006 and T007→T008→T009 serialized shared app/backup ownership; T010–013 after implementation. Independent reviewers only delegated under AGENTS requirements. No remote push/merge. External gameplay accuracy is separate and not marked passed.

- [x] T014 Convergence: validate projected planner data before entering durable commit; invalid confidence/manual fields must leave only editable form draft, not poison retained-failure recovery. FR001/009/SC001.

- [x] T015 Convergence: native drag must originate from a draggable non-button handle; actual pointer drag of a button produced no dragstart/drop. Use accessible labelled grip with adjacent keyboard/touch move buttons; retain real dragTo and exact DOM/order assertion. FR007/SC001.

- [x] T016 Repair independent FG029-01: Leaflet tooltip strings interpret HTML. Use inert DOM nodes for source/graph/manual labels, with hostile-name/edge-ID browser regressions and no injected nodes/events/requests. FR008/009/SC001.

- [x] T017 Repair independent FG029-02: bind reviewed waypoints/observations to canonical decision revision, not display status. Accepted-current new decision/move stays stale until explicit reselect; no date misuse or exported source geometry. FR001/007/009/SC001.

- [x] T018 Repair independent FG029-03: manual duplicate equivalence must use bounded root-member groups and blocked-pair lookups, not full-record scan per decision. Benchmark20k records/2k decisions and retain production interaction budget. FR002/005/SC001.
- [x] T019 Repair independent FG029-04: shared view previews revalidate current availability on render and Apply; unavailable/private/changed categories disable/expire Apply. Add capture-change-after-preview regression. FR004/009/SC001.

- [x] T020 Repair independent FG029-05: road file reads use existing abortable10s-deadline/fatal-UTF8 bounded reader, not unbounded File.text; stalled read cancel ignores late preview and releases processing. FR008/009/SC001.

- [x] T021 Repair PLAN-UI-R1: map picker requires matching draft owner before arming, catches callback errors and preserves other form. FR007/008/009.
- [x] T022 Repair PLAN-UI-R2: Favorite locations off triggers nonrecursive base redraw, restoring owned/promoted/reviewed markers immediately without map movement. FR003/005.
- [x] T023 Repair PLAN-UI-R3: arm picker as owned draft, bind form epoch, clear pending picker on actual workspace navigation/cancel; no detached callback write. FR007/009.
- [x] T024 Repair PLAN-UI-R4: render a resolved numbered first waypoint before any route leg exists. FR007/SC001.

- [x] T025 Verify planner quota retry and CAS retained-draft export: retry only the same owned form/save label after a failed durable write; preserve other-tab state and export pending graph before reload. FR009/SC001.

- [x] T026 Keep route mode, network verification/partial coverage and incomplete-leg status visible on map after closing Planner; label partial lengths as known legs, not complete route total. FR007/008/SC001.
