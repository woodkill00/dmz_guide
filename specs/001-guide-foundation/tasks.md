# Dependency-ordered tasks
Execution boundary: this document is a master roadmap plus seed tasks. Feature 001 executes S0-S2 only (T001-T017 plus its relevant verification/release gates). Before invoking implementation, generate a feature-specific task list as described in `docs/feature-prompts.md`; never run this entire roadmap unscoped. S3-S7 become separate feature task lists.

All unchecked: planning complete does not mean implementation complete. [P] means safe parallelism only with disjoint files and fixed contracts. IDs are unique project task IDs; task ownership is a role, not a claim of assignment.

## Mandatory per-slice preimplementation gate
Before implementing any task in each slice, run clarify/plan/checklist/tasks/analyze for that slice and resolve critical/high findings in the owning artifacts. T037 is the later convergence check, not permission to skip preimplementation analysis. T026 is intentionally executed before T023 despite its retained stable ID.

## S0: evidence and foundation
- [ ] T001 [Evidence] Recheck empty repo, approved environment and Spec Kit pin; produce kickoff record. Depends: approval. FR03/NFR06.
- [ ] T002 [Product] Resolve Q01 and first planner semantics; maintain claim register and content rights. FR03/04.
- [ ] T003 [Architecture] Ratify constitution, ADRs, scope and traceability; initialize reviewed Spec Kit. Depends T001. NFR06.
- [ ] T004 [Domain] Write JSON Schema, typed contract examples and invalid fixtures; validate stable IDs/references/versions and reject selected recipe-route cycles and progression prerequisite cycles before planning (unused alternatives may be cyclic). Depends T002/T003. FR04/09/14.
- [ ] T005 [Security] Specify import budgets and safe text/image/path policy; adversarial fixtures. Depends T004. NFR04/05.
- [ ] T006 [QA] Establish unit/property/browser/a11y harness, lockfile and CI proposal; no branch-policy mutation. Depends T003. NFR01/03/06.
- [ ] T007 [P] [Design] Tokens, responsive primitives and 5-task nav prototype; document observed evidence. Depends T003. FR01/NFR01.
- [ ] T008 [Architecture] Static-first framework spike and dependency assessment; select versions and record decision. Depends T003/T007. NFR02/06.

## S1: find and understand
- [ ] T009 [Content] Compile validated public pack into route/search data with provenance. Depends T004/T005/T008. FR02/03/04.
- [ ] T010 [P] [UI] Build dark-first shell, theme preference and mobile navigation. Depends T007/T008. FR01/15.
- [ ] T011 [UI] Search, filters, stable links and back-state restoration. Depends T009/T010. FR02.
- [ ] T012 [UI] Item/recipe/guide detail with sources, unknowns and relationships. Depends T009/T010. FR03/04.
- [ ] T013 [QA] Test no-results, unavailable pack, keyboard, dark/light and 320px layouts. Depends T011/T012. FR15/NFR01/02.

## S2: one useful plan
- [ ] T014 [Storage] IndexedDB profile, atomic writes, storage failure/recovery and versioned backup. Depends T004/T006. FR05/14/NFR05.
- [ ] T015 [Domain] One-goal shortage/currency/gate engine with cycle safety, typed effects and conservation tests. Depends T004/T006. FR06/07/NFR03.
- [ ] T016 [UI] Inventory entry, selected goal and reasoned shortage presentation. Depends T012/T014/T015. FR05/06/07.
- [ ] T017 [QA] End-to-end edit/reload/export/restore and denied/quota storage tests. Depends T016. FR05/15/NFR05.

## S3: shared demand
- [ ] T018 [Domain] Ordered allocation ledger, batch aggregation, shared one-time prerequisite closure and strict-reservation vs opt-in executable scheduling. Depends T015 and approved semantics. FR06.
- [ ] T019 [Domain] Cycle rejection, batch/alternative handling and supported-mechanic errors. Depends T018. FR04/06/NFR03.
- [ ] T020 [UI] Collect now/later, reservations, priority reorder and explanations. Depends T016/T018/T019. FR07.
- [ ] T021 [QA] Property tests, adversarial graph fixtures and benchmark harness. Depends T020. NFR02/03.

## S4: local creator and picture packs
- [ ] T022 [Editor] Guided item/recipe/asset metadata editing with private-overlay labels. Depends T004/T014. FR08/13.
- [ ] T023 [Security] Stage/validate/diff/apply JSON import; bounded raster pipeline; never fetch external URLs automatically. Depends T005/T014/T026. FR09/NFR04/05.
- [ ] T024 [Editor] Export content separately from private-state backup, semantic round trip and missing-asset diagnostics. Depends T022/T023. FR09.
- [ ] T025 [QA] Fuzz malformed packs, collisions, prototype keys, migrations, interrupted apply and assets. Depends T024. FR14/NFR04/05.
- [ ] T026 [Architecture] Portable picture-pack format/limits spike BEFORE parser implementation; prove size/decoded-pixel/archive caps and supported raster types. Depends T005. FR09.

## S5: map and list
- [ ] T027 [Maps] Canonical coordinate contract, licensed imagery register and three-point calibration. Depends T004/rights clearance. FR10.
- [ ] T028 [Maps] Lazy Leaflet adapter, map/list synchronized selection, floor and deep links. Depends T027/T011. FR10.
- [ ] T029 [UI] Goal-aware location filters, confidence, landmark directions and possible-spawn labels. Depends T020/T028. FR07/10.
- [ ] T030 [QA] Map unavailable, keyboard/list parity, coordinate inversion, mobile keyboard and safe areas. Depends T029. NFR01/02/04.

## S6: progression and story
- [ ] T031 [Domain] Independent progress tracks, explicit prerequisites, completion/reset semantics. Depends T019 and sourced progression facts. FR11/14.
- [ ] T032 [UI] Spoiler controls, progress vs planned goal distinction and transition preview. Depends T031/T020. FR11.
- [ ] T033 [QA] Branch/cycle/unknown/repeatable/reset fixtures and no silent inventory mutations. Depends T032. FR11/NFR03/05.

## S7: community and release
- [ ] T034 [Community] Verify Discord destination and moderation/correction ownership. Depends owner details. FR12/13.
- [ ] T035 [Content] Correction template, attribution and review/publish workflow; read-only public default. Depends T022/T034. FR13.
- [ ] T036 [QA] Run full acceptance matrix and independent accessibility/security/content review. Depends all in-scope slices. All.
- [ ] T037 [Integrator] Run post-implementation converge for actual slice and resolve appended tasks, then rerun tests/review. Depends tests. NFR06.
- [ ] T038 [Release] Prepare rollback, backup, migration and content-refresh runbooks; request deployment approval separately. Depends T036/T037. FR14/15.

## Deferred work requires its own specification
T039 Scoped offline downloads/cache expiry/rights and quota control. T040 Optional cloud sync/auth/access/deletion. T041 Optional Discord slash search. T042 Advanced route optimization only with navigable graph and objective. None is implicitly authorized by this plan.
