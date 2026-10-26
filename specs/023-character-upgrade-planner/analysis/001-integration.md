# Independent integration/privacy analysis — pass 001

Reviewer: `inspect_guide_feature_baseline` (independent of planning writer). Reviewed 2026-10-26.

**Checkpoint:** `65a816118aa58d86096ea38c0d3a4f94500029cc`
**Tree:** `4be823c2fe2b28d40eab5c9166a2051fd67bb199`
**Base:** `407fa56afa43104c3342f4ed73b800f292bacf33`
**Verdict:** HOLD for definition corrections below. This is planning-document review, not implemented feature acceptance. No analyzed repository files were edited by reviewer.

## Findings

| ID | Severity | Owning locations | Evidence and required correction |
|---|---|---|---|
| R1 | HIGH | tasks.md T007/T008; contracts/upgrade-progress.md central semantics | Existing `src/client/profile.mjs:101–105` renders legacy four-state controls for all objectives and `:176–179` writes `profile.completion` directly. The task ownership does not explicitly replace this inventory-page mutation for upgrades. Specify the inventory control/read/write migration to the central upgrade authority and cross-surface tests: changing an upgrade on Inventory then Progression (and vice versa) must update the same `upgradeProgress` state, with legacy non-upgrade behavior preserved. |
| R2 | MEDIUM | data-model.md:33; tasks.md T006/T014 | New advice distinguishes missing inventory from explicit zero, but existing `src/client/inventory-window.mjs:11` renders absent values as zero, `:20` treats blank as NaN, and dirty tracking only compares raw strings. Existing inventory inputs are required. Define an operational Not entered/explicit zero interaction, deliberate unset behavior, dirty/paging/cancel/reload semantics, and ownership/tests for the inventory-window draft module rather than assuming existing input paths suffice. |
| R3 | HIGH | data-model.md:24; plan.md architecture2; tasks.md T005 | V2 preservation promises all Content Studio paths, but named T005 paths omit `src/client/studio.mjs`, whose `:868` explicitly rejects `schemaVersion !== 1` for advanced JSON. Include the actual Studio controller/author boundary audit and both-version load→guided/JSON edit→save→restart→export/reimport tests through the existing Studio browser harness; generic catalog tests alone do not prove this contract. |
| R4 | HIGH | contracts/keep-recommendations.md:15–22; tasks.md T012/T013 | Direct C+T advisory demand is not reconciled with selected crafting-route expansion in the reused shared ledger. That ledger contains intermediate missing/produced rows and expanded leaf demand, so naïve projection can prescribe both the missing crafted item and its ingredients as mandatory acquisitions. Select an explicit direct-requirement-only policy or a mutually exclusive route-aware projection, and test an upgrade requiring2 X, held1 X, optional recipe1 X←3 Y with held0 Y. Never charge both missing1 X and3 Y as independent required pickups; explain retained heldX value and preserve legacy planner behavior. |
| R5 | LOW | spec.md/plan.md; quickstart.md diff-check command | `git diff --check BASE..HEAD` reports11 trailing-whitespace lines from Markdown hard breaks. Bare `git diff --check` on a clean committed checkpoint misses these. Remove/rewrite hard-break whitespace and validate the committed baseline-to-head range. |

The separate domain reviewer owns evidence-gate and reserve-gap findings. Their findings are not silently counted as resolved by this report.

## Checks performed

- Read pinned Spec Kit analyze/checklist instructions; ran analysis prerequisite check with explicit feature023 path and required spec/tasks. No extensions hooks file present.
- Read all15 changed artifacts and relevant current app/profile/Studio/planner contracts. Compared frozen commit against exact baseline.
- All15 changed paths confined to `specs/023-character-upgrade-planner/`; no runtime, map020, dependency, constitution or original screenshot changes.
- `python3 scripts/check.py`: PASS, 0 failures.
- Independent traceability check:16FR+6SC=22 keys, all map to valid tasks;22 future tasks, none checked implemented. This mechanical coverage does not negate concrete R1–R4 task-definition gaps.
- Independent evidence structure check:8 definitions,31 requirement rows,22 distinct item/currency labels. No holdings, balance, Library/file IDs, original paths or private source mappings in the public evidence payload. Pixel accuracy is owned by independent image review, not inferred from this scan.
- `git diff --check BASE..HEAD`: FAIL (R5). Working tree stayed clean during this review and frozen HEAD/tree remained unchanged.
- No new-feature runtime/browser tests performed or implied. No new implementation exists to accept.

## Reviewer checklist assessment at this checkpoint

Satisfied within integration/privacy plan scope: CHK001, CHK002, CHK005, CHK008, CHK010.

Held: CHK003 (R1); CHK006 (R4 and domain math review); CHK007 (domain gate review); CHK009 (R2/R3); CHK004/CHK011 until cross-surface state/input test ownership and combined findings are resolved.

Formal requirement/task mapping is100%, with0 orphan task references. Critical constitutional violations found:0. High findings:3; medium:1; low:1. No acceptance applies to future edits automatically.

## Next action

Writer may repair owning definitions and traceability, then provide a new frozen commit/tree. Re-review changed artifacts and committed diff checks before publication. Runtime implementation, merging and deployment remain outside this planning-only acceptance.
