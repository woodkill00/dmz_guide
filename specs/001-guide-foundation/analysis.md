# Cross-artifact analysis
Status: human-readable planning review, not output of an executed Spec Kit command. Actual `$speckit-analyze` remains to be run after initialization.

## Coverage
FR01 -> T007/T010/T013 -> A01; FR02 -> T009/T011 -> A02; FR03 -> T002/T009/T012 -> A02; FR04 -> T004/T015/T019 -> A03/A08; FR05 -> T014/T016/T017 -> A04; FR06 -> T015/T018/T019/T021 -> A05/A06/A08; FR07 -> T020/T029 -> A07; FR08 -> T022 -> A09; FR09 -> T023/T024/T025/T026 -> A09/A10; FR10 -> T027/T028/T029/T030 -> A11/A12; FR11 -> T031/T032/T033 -> A13/A14; FR12 -> T034 -> A15; FR13 -> T035 -> A15; FR14 -> T004/T014/T025/T031 -> A10/A16; FR15 -> T010/T013/T017 -> A17.
NFR01 -> T006/T007/T013/T030/T036 -> accessibility matrix; NFR02 -> T008/T021/T030 -> documented benchmarks; NFR03 -> T015/T019/T021/T033 -> A03-A08/A13; NFR04 -> T005/T023/T025/T036 -> attack suite; NFR05 -> T014/T017/T025/T038 -> A04/A10; NFR06 -> T001/T003/T006/T037 -> reproducibility/traceability.

## Open risks and disposition
- HIGH factual: screenshot build unknown and source disagreement on printer unlock. Quarantine numerical observations; resolve before corresponding content release, not before generic framework work.
- HIGH privacy/data loss: local state can be cleared or evicted. Backups, warnings, transactional migration and conflict handling required before S2 release.
- HIGH portability: reference-only picture manifests do not meet self-contained pack requirement. T026 plus T023-T025 establish, implement and verify bounded asset bundle capability before claiming S4 done.
- HIGH domain: mixed consumption/reusable requirements and shared batch demand can misallocate. Explicit supported subset plus conservation/property tests before S3.
- HIGH rights: imagery redistribution not established. No screenshot assets or copied map data in public package.
- MEDIUM design: Saved vs Plan naming and tab discovery unresolved. Task-test candidate before final UI.
- MEDIUM operations: hosting/domain and editorial staffing not chosen. No live-service promises or deployment until owner decision.
- MEDIUM scale: budgets proposed, not measured. Spike may adjust limits with documented evidence rather than deleting gates.

No claim of zero risk or guaranteed optimality. Independent reviewer findings are recorded in review notes; source artifacts should be changed first when contradictions are found.

Adversarial traceability: A18/A19/A20/A25 -> FR06/07 -> T018/T019/T021; A21 -> FR03/07 -> T002/T015/T020; A22 -> FR04/06 -> T004/T015; A23 -> FR09/13 -> T024/T035; A24 -> NFR02/04 -> T005/T021.
