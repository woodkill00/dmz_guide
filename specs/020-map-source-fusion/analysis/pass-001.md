# Definition analysis pass001

2026-10-26. Independent read-only reports from source_research (full pinned analyze workflow) and fusion_research (scope/contract review), recorded by the integration owner after analysis. No runtime tests were represented as executed. Original observations referenced the pre-repair draft; owning files were repaired separately.

| Consolidated ID | Reviewer IDs | Severity | Finding | Owning repair |
|---|---|---|---|---|
| A001 | COV-01 | HIGH | Existing runners do not discover planned tests | tasks T018: discovery, browser and capacity wiring with deliberate-failure verification |
| A002 | CAP-01,FUS-R2 | HIGH | Count-valid workspace can exceed20MiB backup | contract exact UTF-8 backup-projection admission budget, optional source omission, T002/T009/T014 tests |
| A003 | SCOPE-01,FUS-R1 | HIGH | No explicit source-background comparison flow | FR-004, BasemapAsset, staging/calibration/warp/switch/opacity contract and T004 tests |
| A004 | FUS-R3 | MEDIUM | Accepted versus stale visibility contradictory | separate acceptance and freshness in spec/model; stale accepted remains visible |
| A005 | FUS-R4 and policy clarification | MEDIUM | Rights filtering not transitive through derived curation | backup contract filters canonical/history/alternatives and unknown origin; T014 tests |
| A006 | FUS-R5 | MEDIUM | SC-002 rejects valid documented crops/axes | criterion and quickstart distinguish invalid/undocumented from documented valid transforms |

Initial coverage:19 requirements (13FR,6SC),17 tasks,100% nominal task coverage,0 unmapped tasks. Runner discovery was a substantive coverage gap despite nominal links. No critical or duplication findings. All six repairs require independent reanalysis; this record does not assert approval.
