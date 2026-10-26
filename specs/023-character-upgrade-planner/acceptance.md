# Acceptance and verification ledger

## Planning deliverable

Base: `407fa56afa43104c3342f4ed73b800f292bacf33` on main, verified2026-10-26. Scope: `specs/023-character-upgrade-planner/**` only. Pinned Spec Kit v1.2.2 instructions/templates were used manually; no claim that merely reading a skill ran an autonomous lifecycle command. Feature creation script ran explicit number23, then separate local Git branch creation and ignored active-feature selection. Setup-plan, checklist context and setup-tasks scripts ran. No extension hooks file was present. Clarification scan resolved behavior under unknown facts; gameplay gates remain open.

This branch **does not implement** upgrades, migrations, content pack ingestion, Keep/Search, UI or tests for the proposed behavior. All22 implementation tasks remain unchecked. No profile or catalog migration has been executed. No merge/deploy authorized here.

## Checks actually executed

At frozen planning checkpoint `65a816118aa58d86096ea38c0d3a4f94500029cc`, Node24.22.1:

- Spec Kit prerequisite resolution: PASS, correct feature023 and required artifacts.
- `python3 scripts/check.py`: PASS,0failures.
- `python3 -m unittest discover -s tests -v`: PASS,40tests.
- `npm test`: PASS,520passed/0failed/1platform skip (native Windows exclusive-open case on non-Windows).
- `npm run build`: PASS,154 independent HTML routes plus404.
- Seed structure/traceability/privacy scan:8definitions/31rows/22labels;22tasks;16FR+6SC covered; no private-path/Library/source-image pattern found in public artifacts.
- Original clean-worktree `git diff --check` was insufficient; independent review correctly found11Markdown hard-break whitespace issues in baseline-to-HEAD diff. Remediation removes them and uses the committed range gate.

These check unchanged baseline behavior and planning structure only. New runtime, browser/engine/Studio feature acceptance has NOT RUN; implementation does not exist. No npm dependency installation or runtime file change was required.

## Independent review

Independent final reviews accepted core checkpoint `57ab0690a0ece7bd6fd849f2199d8b941c7e6214` / tree `19051a024a3c8afcc9dee7234bad5b95970e96c5`:

- [Integration/privacy](analysis/002-integration.md): PASS; original R1–R5 resolved.
- [Domain accounting](analysis/002-domain.md): APPROVED; D1/D2 resolved;29,791 synthetic formula combinations pass (documented math review, not app tests).
- [Image evidence](analysis/002-evidence.md): PASS; all8definitions/31rows/22labels match independent transcription; privacy and source limits preserved.

The final record-only addition copies these attributed reports, records their reviewer-owned checklist dispositions and links this acceptance ledger; it changes no substantive spec, plan, tasks, contracts or seed. Original HOLD reports and the remediation record are preserved. Full baseline-range whitespace and repository structural checks pass after remediation. Parent publication approval is limited to this planning branch and a draft PR; no merge or runtime execution is authorized. Final remote/CI evidence belongs in the PR record to avoid repeated evidence-only source commits.

## Future implementation acceptance

SC-001–SC-006 are NOT RUN for the new behavior. Exact source transcription independently checked; that does not prove gameplay mechanics or implementation correctness. Consumption, prerequisite completeness and build applicability remain real-data gates. Record exact implementation head, commands, exit codes, browser/manual evidence, unresolved limits and independent review here after authorized implementation. Do not overwrite the planning record with a future claim that this branch shipped the feature.

## Rollback

Planning rollback: revert only feature023 artifacts. Future runtime rollback: preserve/export private v2 state and previous snapshots; old clients must explicitly reject unsupported v2 rather than drop fields. Do not roll schemas back by deleting user progress. Content version rebind is previewed and reversible via retained state; exact rollback procedure must be exercised in T018/T020 before release.

## Authorized implementation kickoff — 2026-10-26

User continuation authorizes implementation and updates to the same draft PR, not merge/deployment. Live main rechecked at `407fa56afa43104c3342f4ed73b800f292bacf33`; draft PR24 at `358324df72b579e0695e4e1774852ac919b94658`, tree `8cc3e52a45c3fdd965bf2fb368b4e8a3f85cb716`. Local accepted metadata was reconciled to that exact fetched commit after matching tree and retaining the local planning branch. Clean worktree at kickoff. Explicit environment selection is feature023; feature020 and `tools/hajin-map/**` remain independent, untouched. No extension hooks file. Existing ignore files cover node_modules, generated builds, secrets and local state.

Pinned implement workflow is being executed against the accepted checklist gate (requirements 5/5 and upgrade-planning 16/16 checked; definition quality only). One integration writer owns all implementation paths; independent reviewers are read-only at frozen checkpoints. Sanitized intake rechecked: 8 objectives,31 requirements,22 labels; unknown consumption/build/capture/prerequisites preserved. Earlier matching Stash Weapon I is not admitted as a second objective.

## Implementation checkpoint 1 (review candidate, not release acceptance)

Implemented dual-version content/authoring boundaries, observed catalog admission, v2 profile validation/migration preview, central upgrade semantics, explicit progress-only controls, missing/zero/unset stock drafts, bounded direct Keep/Search, private pins and content rebind review. Existing legacy single-goal non-upgrade unlocked behavior is preserved independently from shared-root/prerequisite semantics. No original images, owner holdings, feature020 or dependency changes.

Executed: contract tests first failed on absent v2/migration exports; initial advisory tests failed on missing module. Focused new feature tests now pass (16 tests); combined content/image-kind/inventory/progression focused checkpoint passed117 tests before further additions; reader-flow focused regression passed14. Static build succeeds with214 routes plus404; repository checks0failures; whitespace check passes. Full runtime pass currently undergoing final rerun after repairing version-aware image fixture discovery, invalid-stock fixtures and VM import stubs. Earlier full run531passed/2test-harness failures/1platform skip is not recorded as a full pass.

Actual browser launches are blocked before page startup by the execution environment's sandboxed Chromium socket restriction. No disabled-sandbox workaround used; VM event tests are supplemental only. Independent reviewer-authored real browser journeys are registered in native and engine harnesses; CI is required to establish actual runtime UI/pixel evidence. Studio v2 journeys, capacity benchmark, discovery proof, full regression and independent acceptance remain open. All real consumption/current-build/exhaustive-readiness gates remain unknown; exact affected numbers stay withheld.

## Corrected implementation checkpoint 2 — pre-CI

First review findings and repairs are recorded in [implementation remediation](analysis/003-implementation-remediation.md); independent acceptance is pending, not self-approved.

Actually executed against the corrected source (Node24.22.1, Linux6.18.55 x64):

- `npm test`: **544 passed,0failed,1platform-specific Windows skip** (545total). Includes strict content/profile/migration/progress/advice/capacity regressions and unchanged legacy regressions.
- `python3 -m unittest discover -s tests -v`: **40passed**.
- `npm run format:check`: **PASS**; `git diff --check`: **PASS**.
- Static build: **214routes plus404**; structural/provenance/link gate: **0failures**.
- Native and engine harness discovery: each deliberate temporary feature023 throw produced **exit1** with the named sentinel. Runtime sentinel was discovered by `npm test`, producing exactly1intentional failure. All sentinels removed; subsequent full runtime suite passes.
- Maximum validated independent-root fixture: **5,766roots**,2,817,589serialized bytes; next root violates the joint input limit. Five warmups +50measured runs: **p95 55.45ms**, max63.43ms on AMD EPYC9V74,9logical CPUs reported. Exact per-run JSON remains in generated evidence. This is Node measurement, not browser timing. Claim-heavy2,500-root/5,000-claim regression verifies one-pass indexing rather than a hidden quadratic scan.
- Privacy scan:39observed catalog JSON files contain no profile keys, Library/sediment references or private filesystem paths. No feature020, `tools/hajin-map`, root dependency or constitution diff.

Actual local browser/engine/Studio acceptance remains **BLOCKED / NOT RUN**, not failed product behavior: sandboxed Chromium cannot create its local socket. The ordinary escalation wrapper also failed before command execution; no sandbox-disabling attempt or restricted-path access followed. Pinned Playwright1.58.2/Prettier3.6.2 local dependencies were reused only after checking an identical existing lockfile; no dependency file changed. Registered CI tests include independent source/stock/progress/recovery/privacy journeys, synthetic advice UI, browser50-run timing and actual Studio v1/v2 guided→advanced→save→restart→export/import. Compact upgrade artifacts use the existing pinned upload action without changing credentials or permissions. Exact-head hosted results and actual synthetic pixel review remain the next acceptance gate.

## Corrected implementation checkpoint 3 — pre-CI

Second-pass independent findings were repaired with focused regressions: record-scope-safe observation identities, conservative alias dispute/readiness evidence, legacy single-root v2 consumption, requirement-only source rebind review, and exportable failed watch-pin candidates. Actual Node full suite:549 total,548 passed,0 failed,1 Windows-only platform skip. Upgrade-focused suite28 passed. Build214 routes+404, repository check0 failures, formatting and whitespace checks pass. Watch-pin unit coverage exercises actual client recovery logic with a synthetic DOM; it does not replace real browser verification. The independently authored browser advice module now includes both pin surfaces × quota/CAS recovery. Studio no-assets and measured-scale invalid-fixture preflight repairs preserve intended coverage. Hosted browser/Studio/engine/pixel gates and independent final acceptance remain open.

## Final pre-hosted verification candidate

A further independent scope-isolation finding is repaired: unselected/completed conflicting observation groups cannot poison an unrelated focused group sharing a material. Selected conflicting aliases gate the union of affected materials. V2 focused planners now refuse exact shortage calculation for absent selected-input stock, including chosen-route intermediates; explicit zero is distinct, completed costs remain excluded, and additional root output stock is not unnecessarily required. V1 focused numeric behavior remains compatible with a visible legacy unset-as-zero assumption; new Keep/Search does not make that assumption. Rebind review copy covers both legacy ambiguity and changed evidence.

The full Node suite on this source passes **552 tests,0 failures,1 Windows-only platform skip (553 total)**. The maximum valid5766-root/2,817,589-byte fixture,5 warmups and50 measured runs yields p95 **44.9803ms**, max47.5414ms in the previously recorded Node24/Linux reference environment. Build remains214 routes+404. Actual registered browser tests now include121 distinct material rows in bounded50/50/21 keyboard pages without inserting goals, plus actual changed-cost/source/retired/new-ID rebind and recovery. Browser execution and screenshot inspection remain pending hosted CI; no source-only test is represented as browser acceptance.
