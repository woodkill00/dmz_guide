# Tasks: Connected field journeys

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md). Tests requested by the user. Tasks are ordered by independently testable story; checkbox means implementation and verification evidence, not only code presence.

## Phase 1: Existing-owner admission

- [x] T001 Inventory existing Guide/Map ownership, overlap with feature071 and baseline behavior in `specs/073-connected-field-journeys/verification.md` (FR-001–020, DR-001–020).
- [x] T002 Define bounded `RunPlanV1`, `RunReviewV1`, handoff and future-import contracts in `specs/073-connected-field-journeys/contracts.md` (FR-001,003,004,020).
- [x] T003 Add focused plan limit, content binding and stock reservation tests in `tests/runtime/connected-field-journeys.test.mjs` (FR-001–002,007–008).

## Phase 2: User Story 1 — Prepare a run (P1)

**Independent test**: create/reopen a named plan with a mission, item target, key and stop; verify stock/access checks without inventory mutation.

- [x] T004 [US1] Implement bounded named plan persistence and stale-pack handling in `src/domain/run-plans.mjs` using existing compare-and-swap in `src/storage/store.mjs` (FR-001,007).
- [x] T005 [US1] Derive stash/carried readiness and explain competing reservations in `src/domain/run-plans.mjs` (FR-002,008).
- [x] T006 [US1] Derive recorded objective/item/key prerequisite chains without guessing in `src/domain/run-prerequisites.mjs` (FR-005,006).
- [x] T007 [US1] Build Today/Prepare page and primary action in `src/ui/run-plan-page.mjs`, `src/client/run-plan.mjs`, `src/ui/hub-page.mjs` and `src/ui/main-hubs.mjs`; route registration stays in the build extension to preserve the frozen feature071 registry (FR-001–002,005–008; DR-002,005–006).
- [x] T008 [US1] Add navigation, context strip and desktop/mobile journey in `src/ui/site-navigation.mjs`, `src/ui/workspace-shell.mjs`, `src/styles.css`, `tests/browser/run-plan.mjs` (DR-001–004,009–013,017–019).

## Phase 3: User Story 2 — Reconcile a run (P1)

**Independent test**: stage stock, discovery, boss and progress updates; approve selected entries; verify partial failure recovery and no replay.

- [x] T009 [US2] Add failing reviewed-batch tests in `tests/runtime/run-review.test.mjs` (FR-003,010).
- [x] T010 [US2] Implement bounded per-owner review receipts and replay protection in `src/domain/run-review.mjs` (FR-003).
- [x] T011 [US2] Add Field desk review queue using existing owner saves in `src/ui/field-desk-page.mjs` and `src/client/field-desk.mjs` (FR-003,010; DR-005–006,016,019).
- [x] T012 [US2] Add browser conflict/reload/error journey in `tests/browser/run-review.mjs` (FR-003; DR-013,019).

## Phase 4: User Story 3 — Trust reference and map (P2)

**Independent test**: inspect source change impact, map coverage and a location timeline with unknown positions unplotted.

- [x] T013 [US3] Extend current reviewed map handoff with explicit acceptance/return and no private-stock transfer in `src/domain/collection-handoff.mjs`, `tools/hajin-map/src/workspace/collection-import.ts` and `tests/browser/map-handoff.mjs` (FR-004).
- [x] T014 [US3] Calculate source-change impact on saved plans without applying changes in `src/domain/source-impact.mjs` and `tests/runtime/source-impact.test.mjs` (FR-011).
- [x] T015 [US3] Build actionable uncertainty review queue in `src/ui/data-review-page.mjs` and `src/domain/data-review.mjs` (FR-009).
- [x] T016 [US3] Report scoped map coverage and constraints in `tools/hajin-map/src/workspace/health-panel.ts`, `tools/hajin-map/src/workspace/field-guide-ui.ts` and `tools/hajin-map/tests/coverage.test.ts` (FR-012,014).
- [x] T017 [US3] Show source/private observation timeline and bounded evidence links in `src/client/local.mjs`, `src/client/field-desk.mjs`, `src/domain/field-ops.mjs`; item pages already link to Field desk (FR-010,013).
- [x] T018 [US3] Preserve marker selection and viewport-bounded, collapsible map panels in `tools/hajin-map/src/workspace/app.ts`, `tools/hajin-map/src/workspace/pane-host.ts`, `tools/hajin-map/src/workspace/pane-view-state.ts` and the existing `field-workflow-browser.mjs`, `pane-host-browser.mjs`, `menu-browser.mjs` journeys (DR-007,014–018).

## Phase 5: User Story 4 — Missions and encounters (P2)

**Independent test**: navigate a missing and a recorded Orders page, inspect mission prerequisites and log a boss encounter.

- [x] T019 [US4] Add page-coverage model and unknown-page states in `src/domain/progression.mjs` and `src/ui/progression-page.mjs` (FR-015).
- [x] T020 [US4] Compose linked story mission view in `src/ui/progression-page.mjs`, `src/client/progression.mjs` and `src/domain/progression.mjs` (FR-016); verified with synthetic story steps, while the official catalog has no sourced story mission records yet.
- [x] T021 [US4] Add bounded dated boss encounter log through existing checklist owner in `tools/hajin-map/src/workspace/checklist-ui.ts`, `tools/hajin-map/src/workspace/checklist.ts` and `tools/hajin-map/tests/checklist.test.ts` (FR-017).
- [x] T022 [US4] Add mission/boss browser journey in `tests/browser/mission-encounter.mjs` (FR-015–017).

## Phase 6: User Story 5 — Weapons and future import (P3)

**Independent test**: save incomparable DMZ observations separately and preview/refuse unsupported player-data file.

- [x] T023 [US5] Verify and reuse existing contextual DMZ measurement form/validation in `src/ui/armory-workbench-page.mjs`, `src/client/armory-workbench.mjs` and add explicit incompatible-context coverage in `tests/runtime/connected-armory-measurements.test.mjs` (FR-018).
- [x] T024 [US5] Add backup-scope and date summary using confirmed browser file-write metadata in `src/ui/private-pages.mjs`, `src/client/profile.mjs` and tests (FR-019).
- [x] T025 [US5] Define bounded file-only import preview in `src/domain/player-import-preview.mjs` and runtime tests; unsupported schemas remain inert (FR-020).

## Phase 7: User Story 6 — Consistent interface (P1)

**Independent test**: run core journeys across specified widths/height, keyboard and pointer, with stable selection and row geometry.

- [x] T026 [US6] Consolidate Guide shell, context, directory and state presentation in `src/ui/site-navigation.mjs`, `src/ui/workspace-shell.mjs`, `src/styles.css` (DR-001–006,008–013,019–020).
- [x] T027 [US6] Adapt item/key/upgrade/mission/weapon owning views without replacing their data contracts in `src/ui/item-workspace.mjs`, `src/ui/progression-page.mjs`, `src/ui/armory-workbench-page.mjs`, `src/styles.css` and `tests/browser/connected-layouts.mjs` (DR-004–013,016,019).
- [x] T028 [US6] Adapt map panels/selection/feedback and semantic tokens in `tools/hajin-map/src/workspace/app.ts`, `tools/hajin-map/src/workspace/pane-host.ts`, `tools/hajin-map/src/workspace/checklist-modern.css` (DR-007–008,014–020).
- [x] T029 [US6] Verify 320/390/768/1280/1920 and short landscape layouts, keyboard focus, non-drag actions and reduced motion in `tests/browser/connected-layouts.mjs` and map browser tests (DR-007–020; SC-004–005).

## Phase 8: Convergence and evidence

- [x] T030 Register new Guide/map browser and domain tests in `tests/browser/run.mjs` and `tools/hajin-map/scripts/run-tests.mjs`, run `npm run check`, focused Guide browser suites and map domain/build/browser suites; record exact results in `specs/073-connected-field-journeys/verification.md` (SC-001–006).
- [x] T031 Reconcile all 40 requirements against implementation and tests in `specs/073-connected-field-journeys/coverage.md`; leave gaps explicit (FR-001–020, DR-001–020).
- [x] T032 Obtain independent source/visual review; record decisions and unresolved physical-device checks in `specs/073-connected-field-journeys/verification.md` (SC-004–006).

## Dependencies and delivery

T001–T003 precede all stories. US1 precedes US2 and US3 because they read plan IDs; US4/US5 can follow admission independently. US6 adapters follow each owning story to avoid styling an unstable contract. T030–T032 follow implementation. Shared `src/styles.css`, feature registry and map workspace are serialized with feature071 changes. First usable slice is T004–T008; no completed checkbox is claimed merely because a file exists.

## Phase 9: Convergence — gaps found after implementation review

- [x] T033 [US4] Add at least one source-backed story mission with recorded steps, item/map links and review date to the official catalog, or retain the explicit unrecorded state if source evidence is unavailable; verify no synthetic step reaches the public pack (FR-015–016; SC-003).
- [x] T034 [US3] Put the read-only saved-plan source-impact preview into the visible data review flow, including removed/changed references and a return to the affected plan; test that preview never applies a source update (FR-011; DR-005–006,019).
- [x] T035 [US1] Resolve selected route stops to recorded key-use identities only when the location match is exact and sourced; expose ambiguous/unlinked stops separately and test deduplicated packing without inferred access (FR-005–006; SC-003).
- [x] T036 [US1] Extend the bounded prerequisite view with recorded recipe ingredient links and uncertainty, without adding inferred recipes or treating retained tools as consumed (FR-006; SC-003).
- [x] T037 [US1] Verify and complete mixed mission/item/key/stop editing, plan ordering, competing reservation previews and reload across two named plans in one browser journey; correct any uncovered controls or math (FR-001–002,007–008; SC-001–003).
