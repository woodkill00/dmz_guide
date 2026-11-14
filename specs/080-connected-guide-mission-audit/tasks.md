# Tasks: Connected guide and mission audit

**Status**: In progress. The mission-audit vertical slice is in the feature branch; unchecked tasks retain their remaining acceptance work.

## Phase 1 — Contracts and admission

- [x] T001 (FR-001–FR-009) Record the initial mission/catalog/page-set baseline and source/build scope in `research.md`; verify 24-slot projection and the then-zero Order/Story records with a repeatable read-only test. Evidence: official starter baseline on 2026-11-13; the test now asserts the later three-record page-one admission.
- [x] T002 (FR-004–FR-007) Finalize bounded audit schema, migration/stale binding, spoiler/export contract and restore preview in `data-model.md` and focused contract tests. Evidence: nine focused domain tests and audit browser export/restore journey on 2026-11-14; the private export retains notes while the list omits them.
- [x] T003 (FR-010–FR-018) Review shared IDs, existing profile/field-desk transactions, map handoff, backup exclusions and source-update contracts; amend plan/tasks for discovered ownership conflicts. Evidence: ownership review in `plan.md` (2026-11-14); T012–T018 retain the separate-transaction and source-review gates.

## Phase 2 — Mission audit MVP (P1, FR-001–FR-009)

- [x] T004 (FR-001–FR-003, FR-005, FR-006, FR-009) Add pure audit target/section projection in `src/domain/mission-audit.mjs` using `ordersPageCoverage`, stable objective IDs, scoped page sets, computed evidence warnings and spoiler-safe labels; unit tests for empty, recorded, chapter-shift and synthetic later-page-set cases. Evidence: `tests/runtime/mission-audit.test.mjs`; no real X01 page denominator asserted.
- [x] T005 (FR-004, FR-006, FR-007, FR-009) Add validated local audit persistence, bounded reviewer/date/note fields, status history/undo, stale-binding review and warned private export/preview-restore; tests for invalid data, quota and cancel/failure retention. Evidence: `tests/runtime/mission-audit.test.mjs` and `tests/browser/mission-audit-run.mjs`, including delayed-read cancellation and simulated quota failure. Broader workspace backup remains T014–T015.
- [x] T006 (FR-001, FR-004, FR-008) Add generated `/missions/audit/` page and compact list/detail client with section selection, status menu, note, filters, links and truthful save status; add links from Missions, feature registry, Home and Site map. Evidence: audit browser journey and exact Content Studio create/edit target tests on 2026-11-14; unrecorded pages open a blank objective form without adding a mission automatically.
- [x] T007 (FR-001–FR-009) Browser-test empty 24-page list, synthetic Story group, section status/reload, Fill later, source warning independence, spoiler hiding, keyboard, 390px and 200% text; visual review and repair cycle. Evidence: `tests/browser/mission-audit-run.mjs` and local synthetic mobile screenshot, 2026-11-14. This does not certify real mission catalog completeness.
- [ ] T008 (FR-002, FR-003, FR-005, FR-008) Audit named mission sources from `research.md`; stage source claims with attribution/build/differences. Import only reviewed records and preserve the empty-slot view for unresolved pages. Record exact coverage without claiming a complete game catalog. Partial evidence: `mission-source-review.md` and three observed page-one Hajin Orders; later pages, Story Missions and current-build checks remain open.

## Phase 3 — Connected preparation (P1, FR-010–FR-011)

- [x] T009 (FR-010) Extend the existing derived goal projection with one prioritized next-action list across unfinished missions/upgrades, shared stock/reserves, print/craft choices, key needs and known map locations; unit tests for shared ingredients, partial costs and no-location cases. Evidence: existing workbench math plus `connectedPreparation` recipe/key/area projection; 26 focused domain tests and the Collection workbench browser journey passed on 2026-11-14.
- [x] T010 (FR-011) Add exact bidirectional link projection for item/recipe/upgrade/mission/key/weapon/location records; prevent spoiler leakage and broken cross-pack links. Evidence: `recordRelations` declared-ID graph tests and public detail guard tests, including selected-pack isolation and protected/missing ID masking.
- [x] T011 (FR-010, FR-011) Add compact preparation view from Home/Planner with explanations and deep links; test complete synthetic mission→inventory→recipe→map journey. Evidence: Collection next actions and existing fictional mission/profile/recipe/route browser journey, with added named-area assertion, 2026-11-14.

## Phase 4 — Match lifecycle and recovery (P1, FR-012–FR-013)

- [ ] T012 (FR-012) Extend Field desk staging to bind a named match to a preparation snapshot, manual finds/objectives and optional map-stop evidence; preview net changes before applying through existing guarded transactions.
- [ ] T013 (FR-012) Add explicit map handoff/fallback and stale-source handling; test map offline, wrong origin, changed capture and cancelled transfer without partial writes. Partial: guide run-plan file fallback now imports into the map with explicit Accept/Decline; live nonce/origin handshake and three-engine file-import journeys pass. Offline/wrong-origin/changed-capture negative matrix remains.
- [x] T014 (FR-013) Build a versioned multi-module backup manifest from explicit guide/map/armory/route/audit exports; validate size/digest/permissions and preview supported/omitted modules before per-module restore. Evidence: `/workspace-backup/` explicit file selection, bounded SHA-256 manifest, omission/owner-restorer preview and per-module extraction; run-plan export/validated restore; focused domain and Chromium round-trip/rejection journeys. Map/armory restoration remains owner-tool work, never a cross-origin transaction.
- [ ] T015 (FR-012, FR-013) Browser-test round-trip, old backup, malformed file, quota/storage denial, mid-apply failure and accurate restore outcome report; document that cross-origin modules are separate transactions.

## Phase 5 — Content health and reference quality (P2, FR-014–FR-016)

- [x] T016 (FR-014, FR-016) Extend `src/domain/data-review.mjs` into a scoped coverage dashboard for mission sections, recipes, icons, weapons, keys and map positions; show denominators only where a reviewed scope exists. Evidence: `contentHealth` listed-record projection, focused test and Data review Chromium journey; this does not claim complete-game coverage.
- [ ] T017 (FR-014) Add source/patch change queue with old/new claim, citation, build applicability and explicit apply/reject; preserve conflicts and private-state independence. Partial: candidate claim preview and session Reject/Studio Apply link exist; durable decisions, actual apply receipt and patch proposal integration remain.
- [x] T018 (FR-015) Add mode/patch/source qualifiers to weapon comparison and missing-stat review; never label WZ data as DMZ-tested without evidence. Evidence: existing separated Armory comparison modes, dated source/patch disclosures, CODMunity *WZ not-tested label, and new missing-stat/source issues in Data review; domain/browser regression coverage includes CODMunity and private DMZ comparison.
- [x] T019 (FR-016) Add relationship integrity checks and exact Studio repair links for missing item, recipe, mission and map references; regression-test known valid catalogs. Evidence: generic owner-side reference check masks missing/protected targets, exact selected-catalog Studio edit URLs, focused domain test and Data review browser journey.

## Phase 6 — Home, UX and release evidence (P2, FR-017–FR-018)

- [x] T020 (FR-017) Add next-action and recent-work cards to Home using existing private projections, with empty/locked/unavailable states and direct task links. Evidence: existing guarded Home next action and navigation recents; Home browser workflows check saved, unavailable, cross-catalog and interrupted reads.
- [ ] T021 (FR-017, FR-018) Align repeated navigation, search, filters, save feedback and compact detail controls across affected guide/map pages; test consistent identification and keyboard order.
- [ ] T022 (FR-018) Run end-to-end user journeys at desktop, 390px, keyboard and 200% text; performance checks on bounded large catalogs; fix actual overflow/focus/status failures.
- [ ] T023 (FR-018) Run exact repository checks and a release-readiness audit for content coverage, source rights, private backup, links, accessibility and real-game evidence; record successes and gaps in `acceptance.md` without self-approving reviewer criteria.

## Dependency and analysis cycle

T001–T003 → T004–T008 → T009–T011 → T012–T015 → T016–T019 → T020–T023. T008 source ingestion can continue after the audit MVP, and unknown records remain explicit. `analyze` is read-only; findings repair the owning spec/plan/tasks first, then analysis repeats. After implementation, converge requirements against shipped behavior and rerun focused/full tests. No task may be checked from planning alone.
