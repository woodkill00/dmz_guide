# Dependency-ordered implementation tasks

2026-11-19 · authorized094 · dependent on reviewed staged093. Check only executed work; independent checklist is reviewer-owned.

- [x] T001 [FR01–12] Inspect093 source/tests and author/build boundaries; specify user journeys, clarified defaults, pure tools, checkpoint/history/refresh contracts, research and constitution checks. No production changes before planning analysis.
- [x] T002 [FR01–12] Independent analysis2 READY: EDITEXP01–03 repaired in owning contracts; no remaining planning blocker. Reviewer owns checklists/analysis. Production/runtime acceptance remains separate.
- [x] T003 [FR02,03,04,06,07] Implement/test pure editor experience models: readable labels/diff/error mapping, bounded preferences, fresh-ID custom templates/pattern validation and batch operations. Preserve all093 caps and source fields.
- [x] T004 [FR09,10,11] Implement strict CAS disk checkpoint storage and server-owned bounded saved revision snapshots under existing root lock/transaction/path protections. Original/after capture, image eligibility, retention/quota, expected bytes, corrupt/future data, symlinks, stale owners and replay need runtime/adverse coverage before UI wiring.
- [x] T005 [FR08,11] Implement fixed reader-refresh job API and durable status/restart/shutdown ownership; test concurrency/idempotency, failed build/previous-reader preservation and successful save with independently failed refresh. No arbitrary commands or remote deployment.
- [x] T006 [US1,US2 FR01,02,03,06,07] Build Order/item-first enhanced shell: visible Edit, Content/Layout/Photos, preview/outline/inspector selection, friendly typed forms/reference search, resizable/collapsible remembered panels, linked inline errors, readable changes and explicit version assistance. Reuse existing Save/recovery logic.
- [x] T007 [US4 FR04] Add section templates, outline search/multi-select/batch actions, reusable custom patterns and keyboard shortcuts. Validate IDs/anchors/projections/caps and pattern imports; no accidental canonical fact copies or native form undo override.
- [x] T008 [US4 FR05] Add media drop/library thumbnails and visual crop/quality feedback with numeric alternatives. Reuse normalization/rights/placement pipeline; test cancellation, stale callbacks, pixels/budgets and no unsafe source image transfer.
- [x] T009 [US2,US3 FR07–11] Wire disk checkpoint timestamps/conflicts/export/restore/clear, revision compare→restore-as-draft and Save & refresh with separate statuses/retry. Generation/exact-target/operation guards and source review survive navigation/reload. No private stock/completion writes.
- [x] T010 [FR01–12] Verify all registered adapter flows, Order/item end-to-end, keyboard/mobile320–1920/200%, dark/light/axe, error focus, canonical planner/version boundaries, cross-browser recovery/revision restore, lost acknowledgement and failed refresh. Run proportional existing runtime/browser/build/format/repo/release checks; record exact receipts and limits.
- [x] T011 [FR01–12] Independent implementation review and convergence/fix cycle, update docs/coverage/acceptance, review intended diff. Leave local reader/editor ready to inspect; no automatic commit/push/merge/publication.

Dependencies: T001→T002→T003/T004/T005; T003→T006→T007/T008; T004+T005+T006→T009; all implementation→T010→T011. Shared files/contracts edited serially. Independent review uses existing integration_review agent per AGENTS, not parallel production edits.

Traceability: FR01 T006/010; FR02 T003/006/010; FR03 T003/006/010; FR04 T003/007/010; FR05 T008/010; FR06 T003/006/010; FR07 T003/006/009/010; FR08 T005/009/010; FR09 T004/009/010; FR10 T004/009/010; FR11 all persistence/adapter verification; FR12 T002/010/011.

## Phase 2: Verification convergence

- [x] T012 [FR12, T010] Repository Python fixtures copy installed dependencies, generated releases and private recovery directories for every assertion. Exclude those runtime outputs from fixture copies while retaining all source/provenance inputs and every existing positive/negative assertion. Rerun the complete Python suite and record the original interrupted run accurately. This repairs verification cost and avoids copying private local state; it does not alter product scope or validator rules.

- [x] T013 [FR08, FR12] A real fixed-command refresh succeeds, but its initial status read can return transient409/REPOSITORY_BUSY while the child captures source files under the shared lock. Preserve API status/code and retry only that precise temporary status for a bounded15seconds, with lifecycle/target guards; do not retry Save or other failures. Reproduce in all browser engines and verify the real local fixed command plus durable terminal/replay. This closes an observed production integration gap missed by injected build runners.

## Phase 3: Mission instruction presentation repair

- [x] T014 [US5, FR13] Assess Gear Up and every recorded Orders/story objective, distinguish stored facts from UI placeholders, define shared disclosure behavior, spoiler/escaping/private-state boundaries and independent repair review. Audit87/87 have non-placeholder steps; no data import is needed.
- [x] T015 [US5, FR13] Render actual canonical objectives under mission links in the Orders directory (collapsed) and all29 chapter rosters (expanded), using one escaped helper, concise responsive styling and existing individual guide/Edit links. Keep disclosures independent and private state unchanged.
- [x] T016 [US5, FR13, SC06] Verify all recorded steps/rosters and unknown/spoiler/unsafe text cases; rebuild and run Chromium/Firefox/WebKit user journeys with keyboard, mobile/200%/axe and live Gear Up/X01 checks. Record repair acceptance, independent review/convergence and final format/repository checks. Do not claim older aggregate runs executed the new repair.
