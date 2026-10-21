# Tasks: location intelligence
## Phase 1 Setup
- [x] T001 Execute specify/clarify/plan and record design in specs/006-location-intelligence/{spec,clarifications,plan,research,data-model,quickstart}.md and contracts/ui.md (LI-001–008).
## Phase 2 Foundations
- [x] T002 Obtain independent requirements approval in specs/006-location-intelligence/checklists/review.md and confirm parent hooks in contracts/ui.md before application code (LI-001–008).
## Phase 3 US1: useful trustworthy list
Independent test: default real pack 13 POIs, no markers, filter and inspect source/unknown.
- [x] T003 [US1] Add filter/source/unknown-context tests in tests/runtime/locations.test.mjs (LI-001/002/005/008).
- [x] T004 [US1] Implement pure filterLocations/floorOf helpers in src/domain/locations.mjs; "Coordinates missing/nonfinite/outside extent/inconsistent map transform remain list-only" (LI-002/003).
- [x] T005 [US1] Add native page and complete accessible location list/details in src/ui/maps-page.mjs and src/client/maps.mjs (LI-001/002/005/008).
## Phase 4 US2: calibrated accessible map
Independent test: explicitly select demo, three locations on two floors, same detail from list/map, keyboard camera and missing imagery fallback.
- [x] T006 [US2] Add three-point/x-y-swap/nonzero extent/y-axis/center/outside/new-image-bounds-version tests in tests/runtime/locations.test.mjs (LI-003).
- [x] T007 [US2] Implement projectLocation and placementReason in src/domain/locations.mjs; "Map extent is [minX,minY,maxX,maxY]" and origin/axis consistency enforced (LI-003).
- [x] T008 [US2] Add authored schematic, SVG markers, bounded button/keyboard camera and local validated raster lifecycle in src/client/maps.mjs (LI-004/006/008).
## Phase 5 US3: honest goal relevance
Independent test: match actual itemIds against positive shared-plan deficits; absent/stale/unsupported needs explain no recommendation.
- [x] T009 [US3] Add relation/need intersection, retained-tool and currency-exclusion tests in tests/runtime/locations.test.mjs (LI-007).
- [x] T010 [US3] Integrate confirmed shared-plan adapter and visible relevance explanation in src/client/maps.mjs and src/domain/locations.mjs (LI-007).
## Final Phase: cross-cutting evidence
- [x] T011 Implement exported browser tests and screenshots in tests/browser/maps.mjs for list/map/floor/filter/keyboard/zoom/goal/context/imagery journeys (LI-001–008).
- [x] T012 Run runtime checks, obtain parent hosted-browser evidence, converge and independent review; record exact outcomes in specs/006-location-intelligence/acceptance.md and convergence.md (LI-001–008).

Dependencies: T001 → T002 → US1 → US2 → US3 → T011/T012. T006/T009 tests may be prepared in sequence in the shared test file, not parallel edits. Reviewer checklist can run in parallel with adapter contract confirmation. No further delegation or shared file edits by this worker. MVP is US1, but full requested scope includes all stories. No implementation completion claim until evidence/review gates pass.

## Phase 6: Convergence
- [x] T013 Add successful validated local raster/new bounds/version/floor and rapid pack-context regression to tests/browser/maps.mjs per LI-003/006/008 and US2/AC4 (partial, HIGH).

## Phase 7: Review convergence
- [x] T014 Bound and cancel pending raster decode URLs in src/client/maps.mjs, mask unrevealed spoiler names in goal explanations, and show effective record/map scope per LI-005/006/007/008 and constitution trust/accessibility (partial, HIGH).

## Phase 8: Hosted failure repair
- [x] T015 Diagnose hosted maps.mjs missing-image timeout, replace dangling asset reference with validator-accepted reference-only image metadata, add precondition/runtime regression and failure screenshot/status diagnostics in tests/browser/maps.mjs and tests/runtime/locations.test.mjs (LI-006/008, T012).

Slice evidence: exact cb6e40776fbd28da9bf73ec640df45f91cdff817 hosted browser/visual/source accepted independently2026-10-21. Final integration gates and authorized exact-main merge remain open.

Final integrated evidence supersedes earlier browser-pending notes: exact93ad1f5, all five hosted jobs in run39601721603, independent112-test/build/link/full-height visual/package verdict. Only explicitly named owner-authorized readiness/merge and exact-main CI gates remain pending; see ../008-community-release/acceptance.md.
