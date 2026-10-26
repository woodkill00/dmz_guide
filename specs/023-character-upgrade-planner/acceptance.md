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
