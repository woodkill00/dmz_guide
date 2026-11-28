# Specification analysis — independent reviewer

Reviewer: `/root/reliability_review_111`. Feature pointer verified through the pinned prerequisite script; no extension hook file present. Reviewed spec, plan, tasks, contracts, constitution, existing quality/camo validators, journey and layout suite owners. Analysis itself was read-only; this file records the returned report. No implementation or private snapshot was read or modified.

## Pass 1

| ID | Category | Severity | Locations | Finding | Required clarification |
| --- | --- | --- | --- | --- | --- |
| A1 | Underspecification | MEDIUM | spec US3/FR004; plan phase4; contracts | Missing camo fields are largely rejected before quality projection by the strict 35-weapon/25-row camo reader. Missing reference, admitted placeholder/whitespace, and absent local image bytes are different states. Synthetic malformed-only coverage would not demonstrate a reachable product gap. | Define reachable camo checks and local-byte scope; retain strict validation and test applicable admitted cases. |
| A2 | Coverage specificity | MEDIUM | spec US2/FR003/SC001; plan phase6; T008/T009 | Five journey families are referenced without a fixed family/route/assertion/command matrix; suite selection is deferred. Existing suites do not necessarily establish the newly promised weapon/dashboard or map route-order handoff assertions. | Enumerate five families, owning suites, required cross-page state oracles, and added checks where existing suites do not cover the promise. |
| A3 | Measurability | MEDIUM | spec US4/FR005/SC003; plan verification | Readability/action targets and expanded keyboard outcomes lack measurable criteria and bounded representative components. | Reuse feature109 target-size/reflow policy, define no-clipping/focus assertions, actual computed200% text and route/component matrix. |

The initial undefined-weaponURL diagnosis was independently disproved: the import exists at src/domain/site-quality.mjs:314. Parent reproduced the missing-combat branch successfully and will remove the unsupported repair premise. Preserve this as existing behavior regression coverage, not defect evidence.

## Requirement coverage

| Requirement | Task coverage |
| --- | --- |
| FR001 | T001, T010/T011 privacy |
| FR002 | T004 |
| FR003 | T008 |
| FR004 | T005/T006 |
| FR005 | T009 |
| FR006 | T007 |
| FR007 | T006/T008–T011 |
| FR008 | T001/T004/T011 |
| SC001 | T008/T011 |
| SC002 | T005/T006 |
| SC003 | T009/T011 |
| SC004 | T007/T010 |
| SC005 | T001/T004/T010/T011 |

Metrics:13 requirements/outcomes,11 tasks,100% nominal task mapping;3 specificity/ambiguity findings,0 duplication,0 critical constitution conflicts,0 unmapped tasks. Mapping is not execution evidence.

## Review boundary and next action

Private preservation versus deferred recovery is explicit. CI design has correct independent suite budgets, immutable pins, preserved commands and always-evaluated fail-closed old check names; implementation still requires actual coverage/negative-gate verification. No account/sync/deployment/source collection or live profile testing is authorized by this plan. Repair A1–A3 in owning artifacts and rerun analysis before code. Parent already has user authorization to repair/reanalyze; no redundant permission request is needed.

## Pass 2 — accepted for implementation

Re-read updated spec, plan, tasks, contracts, research and new verification-matrix.md; reran pinned prerequisites with explicit feature111. Confirmed referenced map scripts and guide suite owners exist.

- A1 resolved: strict camo validation retained; admitted whitespace/sentinel requirement text distinguished from schema-rejected missing fields and optional local-image availability. No blanket875-row review noise or new review store. Placeholder cases must pass the existing validator in tests.
- A2 resolved: finite five-family inventory/Needed/Quick collect, upgrades, Orders, weapon/dashboard and map/route matrix names owner suites and exact state assertions; missing cross-page/route assertions must be added and wired to CI.
- A3 resolved: bounded representative families/widths and feature109 target thresholds; actual computed200% rendered text, unclipped names/actions, expanded focus/keyboard, screenshot and Axe criteria explicitly required.
- Unsupported weaponURL defect premise removed from active plan/research/tasks; successful behavior remains regression coverage.

Current findings:0.13 FR/SC outcomes mapped to11 tasks (100%);0 critical/constitution conflicts,0 unmapped tasks,0 unresolved ambiguities/duplications. Requirements checklist6/6 accepted. This gate permits implementation, not completion, merge or an unrun GitHub/visual/recovery claim. Verification and fixed-point independent standards/spec review remain T010/T011.
