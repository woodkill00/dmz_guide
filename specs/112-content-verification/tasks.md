# Tasks: Content verification

## Phase 1 - Scope and evidence
- [x] T001 Preserve feature111 identity-bound baseline report in ignored test-results/content112; record public summary in verification.md (FR001/008).
- [x] T002 Complete source research, clarification, plan/contracts and independent checklist/analyze/repair/reanalyze before implementation (all FR).

## Phase 2 - US3 current weapon sources
- [x] T003 Reproduce nested-H1/Updated-delimiter live failure; add positive/wrong-mode/malformed tests then repair scripts/codmunity-parser.mjs and owning tests; check BOTH fixed MW4 and candidate DMZ URLs with separate mode/date/coverage outcomes, never promote partial untested DMZ; preview/apply valid preferred-source proposal and prove repeat has no duplicates (FR005/008).
- [x] T004 Reproduce current official damage-table failure; support explicit Pre-patch/Post-patch table/heading form in scripts/weapon_database.py with regression/negative tests; review dated mode-specific source claims and stage/apply through existing workflow (FR005).
- [x] T005 Add Cronen Osprey/CSG-35 combat identities only with source-supported fields and unknown unsupported values; preserve MP/DMZ source boundaries and badge; verify weapon/dashboard/manual/camo parity (FR002/005).

## Phase 3 - US1 reference completeness
- [x] T006 Compare all34 upgrades,95 recipe relationships and24+5 Orders groups/tasks with approved source facts; record exact per-record unchanged/changed/unresolved outcomes in ignored source report and public summary; correct supported content in existing catalogs without player writes (FR002/003).
- [x] T007 Fill source-mapped missing item images and supported fields using bounded fixed-host downloads into ignored .local/item-icons and reviewed src/content/item-icons.json metadata; verify fallback, attribution, duplicate-safe mappings and no artwork committed (FR002/008).
- [x] T008 Add test-first identity-bound disposition/reconciliation to scripts/content-audit.mjs or a focused scripts/content-verification.mjs and tests/runtime/content-verification.test.mjs; justify any classification repair in src/domain/site-quality.mjs, preserve unresolved facts and all baseline coverage (FR001/002/003).

## Phase 4 - US2 map source accuracy
- [x] T009 Reproduce current CODCentral X01 hidden-layer rejection; add explicit supported hidden category to tools/hajin-map/scripts/capture-x01.mjs, src/x01/model.ts and icon/filter owners with fixtures; review fresh52-marker snapshot (48prior+4hidden) and3metadata changes; validate bounds/floors/repeat diff (FR004).
- [x] T010 Add leave-one-out cross-source registration diagnostics in tools/hajin-map/src/x01/workbench-model.ts with synthetic affine/outlier/sparse/nonspanning/floor/immutability tests and display training-vs-held-out labels in owning workbench UI; do not claim gameplay calibration (FR004).
- [x] T011 After T015, audit registered Hajin/X01 source availability and source/floor counts using fixed existing adapters; run marker/popup/floor/locked-room/SafeRun/LootRun/reimport regression suites; retain unavailable DMZHub live comparison explicitly (FR004).

## Phase 5 - US4 touch/accessibility
- [x] T012 Run isolated touch/keyboard/enlarged-text core journeys, inspect accessibility trees and Axe plus actual screenshots; repair reproduced issues with regressions using existing tests/browser and map suites; record physical-vs-emulated boundaries (FR006/007).
- [ ] T013 Add docs/android-verification.md with USB loopback forwarding and Android Chrome/TalkBack checks; perform user-assisted physical tests when connected and record actual results; leave externally blocked observations pending (FR007/008).

## Phase 6 - Verification and convergence
- [x] T014 Update docs/roadmap.md and docs/reliability.md with source coverage/results; run relevant full runtime/Python/build/map/browser/format/repo checks, independent standards/spec/visual review and convergence; repair/retest findings and record outstanding evidence (all FR).

## Phase 7 - Research-driven map isolation repair
- [x] T015 Before final T011/T014 audit, reproduce mixed-map CODCentral collection in tools/hajin-map/tests/source-updates.test.ts; repair server/source-collectors.mjs to exclude every nonempty data-floor from Hajin, including shared/unknown values, preserving no-floor x01-entrance; compare/recollect the affected active CODCentral capture through existing staged update machinery, record each removed Hajin interior ID and its X01 source disposition, retain private markers/state; verify old capture contamination cannot return on repeat and X01 data remains present (FR001/004/008).
- [x] T016 Quarantine the63 source-confirmed X01 interior IDs from old Hajin source captures at read/render/import boundaries, keeping original captures and private custom/reviewed records intact; add stale legacy/saved source regressions, preserve no-floor entrance and include exact source evidence in a bounded public registry (FR004/008).
- [x] T017 Repair reproduced current WZStats optional-title schema drift with a bounded pure row adapter and negative/foreign-map tests; preserve33 new source identities, floors and explicit loot-item semantics so item locations cannot be mistaken for operator spawns; stage/review/repeat update (FR004).
- [x] T018 Repair reproduced MapGenie omitted optional sprite declarations: no declarations may use existing local icons/fallback with explicit warnings; partial/unsafe declarations still reject. Preserve frame/public-access validation and reference-only positions; stage/review/repeat update (FR004).

## Reproduced acceptance repairs
- [x] T020 Repair touch-suite Axe heading-order failure in the weapon chooser by making its existing summary a level2 heading above level3 type groups. Preserve compact summary appearance, native disclosure operation and existing labels; rerun touch/Axe and card reflow (FR006/007).
- [x] T019 Repair the reproduced Needed-page invalid article/listitem combination using a permitted list item wrapper; retain styling/data hooks and verify touch-suite routes with Axe (FR006/007). Update acquisition-roster coverage assertions for two source-backed combat identities while explicitly checking unsupported numeric fields remain unknown (FR002/005).

## Dependencies and completion
T001/T002 gate implementation. T003/T004 precede source application/T005. T006/T007 precede final T008 reconciliation. T009/T015 precede T010/T011 and final map audit. T012/T013 may proceed independently after planning review. Source mutations and shared builds are serialized; research/review actors are read-only. T013 physical test completion requires an actual connected device and observed results; preparation/emulation alone cannot check it off. T014 implementation completion cannot erase factual or external-verification limitations. Recovery remains deferred.

## Phase 8: Convergence
- [x] T022 FR006/008: repair reproduced async waitForFunction false-positive in collection/reliability/new-touch browser tests. Add bounded awaited polling helper and regression proving false values cannot pass and stalled evaluations time out; retain exact saved revision/value assertions and original deadlines. Evidence: WebKit collection revision1 read while savingtrue; pinned frames.js predicate treats Promise as truthy. Rerun affected suites.
- [x] T021 FR006/008: update the source-sensitive browser fixtures for the added X01 floor1 marker (31) and the resolved weapon quality gaps. Exercise a remaining real item-quality finding, retaining filter, Later/save/reload, exact reader/editor-link and enlarged-text assertions. Rerun owning browser suites; retain actual pending device observations under T013. Finding CV1: partial MEDIUM, evidence x01-browser.mjs count and reliability.mjs weapon-only filter after T005.
