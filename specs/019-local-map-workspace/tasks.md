# Tasks: Local Hajin Map Workspace

## Setup and foundations
- [x] T001 Read repository governance and establish explicit 019 context; produce spec/clarification, plan, research, data model and contracts. FR-001–008.
- [x] T002 Obtain independent requirements-quality review of checklists/integration-review.md before implementation. FR-001–008.

## User Story 1 — additive local workspace
- [x] T003 [US1] Copy original source/package/coordinate tests into tools/hajin-map without third-party assets or old repo metadata. Preserve native source/content/build. FR-001/003/004.
- [x] T004 [US1] Add root map:* commands, local port 5175, docs/local-map-workspace.md and tool README; asset acquisition remains explicit opt-in. FR-002/003.
- [x] T005 [US1] Exclude research acquisition helpers; bound local snapshot/image reads, reject malformed/oversized data, bound decoding and ensure recoverable source/image failures. FR-004/007.

## User Story 2 — key/source behavior
- [x] T006 [US2] Retain direct key opener, icon/key filters, synchronized all/none/mixed source state and local preference isolation. Add clean-checkout synthetic browser tests for key opening before Layers, saved state, source independence, image/data recovery and mobile layout. FR-004–008.
- [x] T007 [US2] Add dedicated Node 22/24 workspace CI without removing existing quality gates or fetching game resources. FR-008.

## Verification and merge
- [x] T008 Run root structural/Python/Node/build and available native browser checks; run tool unit/typecheck/build/browser checks. Audit tracked files and public outputs for downloaded assets. Record exact outcomes/limits in acceptance.md. SC-001–004.
- [ ] T009 Run convergence, obtain independent final code/visual review, repair findings, and record review evidence. No implementer approval of reviewer checklists.
- [ ] T010 Commit/push a feature branch, open PR, wait required CI, normally merge without bypassing protections, verify main and report actual result. User authorization includes push/merge, not deployment.

## Dependencies and strategy

T001 → T002 → T003/T004 → T005 → T006 → T007 → T008 → T009 → T010. Keep shared root contracts serialized. Independent review may run while unrelated read-only environment checks continue; implementation itself is sequential. MVP is an independently buildable viewer with missing-file recovery; then prove key/source behavior using original synthetic fixtures. Do not claim a source-asset launch from code-only integration.
