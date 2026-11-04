# Tasks: Map Key Scrolling and Resizing

**Input**: Design documents from `specs/065-map-key-scroll-resize/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Browser regression is explicitly required by the specification.

## Phase 1: Setup

No project initialization or dependency changes are required; the map browser test harness already exists.

## Phase 2: Foundational

No shared infrastructure changes are required. The feature is confined to the map-key sidebar.

## Phase 3: User Story 1 - Browse and resize map-key sections (Priority: P1)

**Goal**: Keep controls and a long layer list visible and independently scrollable, and let users resize their split accessibly.

**Independent Test**: With a synthetic long list at a 620px viewport, scroll to the first and last entries; resize the split by pointer and keyboard; verify both sections stay bounded and map/layer state is unchanged.

### Tests for User Story 1

- [x] T001 [US1] Add a synthetic browser regression for SC-001–SC-004 in `tools/hajin-map/tests/field-workflow-browser.mjs`, covering 620px initial list visibility, first/last scrolling, bounded pointer and keyboard resizing, responsive viewport changes, and unchanged map/layer state

### Implementation for User Story 1

- [x] T002 [P] [US1] Add a labelled focusable separator with bounded pointer and keyboard resizing for FR-002–FR-003 in `tools/hajin-map/src/main.ts`
- [x] T003 [P] [US1] Give the controls and layer list independent contained scrolling and a responsive default split for FR-001, FR-002 and FR-005 in `tools/hajin-map/src/styles.css`
- [x] T004 [P] [US1] Document map-key scrolling and divider controls for FR-001–FR-005 in `tools/hajin-map/help.html` and `docs/local-map-workspace.md`
- [x] T005 [US1] Run `npm --prefix tools/hajin-map run test:workflows` and `npm run map:build`; fix any map-key regressions in `tools/hajin-map/src/main.ts`, `tools/hajin-map/src/styles.css` and `tools/hajin-map/tests/field-workflow-browser.mjs`

**Checkpoint**: The map key has a visible scrollable list at the constrained viewport; pointer and keyboard resizing preserve selections and map state.

## Phase 4: Polish and Cross-Cutting Concerns

- [x] T006 Run `npm run map:test` and `npm run map:test:browser`, then record exact results, touched paths, requirement traceability, and any unavailable checks in `specs/065-map-key-scroll-resize/acceptance.md`

## Dependencies

- T001 precedes T002 and T003 because the focused reproduction must exist before implementation.
- T002 and T003 are independent file changes and may be implemented in parallel after T001.
- T004 is documentation-only and may proceed independently of the runtime implementation.
- T005 depends on T001–T004.
- T006 depends on T005.

## Parallel Execution

After T001 is added, T002 and T003 may proceed in parallel; T004 may proceed independently. T005 and T006 are sequential verification tasks.

## Implementation Strategy

Deliver the single P1 story as one vertical slice. Keep the synthetic regression as the acceptance oracle, make the smallest layout and interaction changes, update the user help, and run map-specific verification before recording evidence. Do not change map data, persistence, dependencies, or the feature 064 worktree edits.

## Phase 5: Convergence

- [x] T007 Keep the map-key opener pointer-accessible on narrow screens and add a real-pointer regression for FR-005 / US1 AC4 (partial)
