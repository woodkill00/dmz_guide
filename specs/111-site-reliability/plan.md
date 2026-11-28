# Implementation Plan: Site reliability

**Branch**: `feature/111-site-reliability` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

## Summary
Preserve private data first, then refresh current documentation, extend the existing quality index, exercise cross-page tracking and compact layouts, repair reproduced failures, and split the oversized CI runtime job without losing checks.

## Technical Context
Node 22/24 ES modules, static guide/unified map, existing Playwright 1.58.2 and Node/Python checks. No new dependency or profile schema. Windows local; WSL Ubuntu for unsupported local engines where needed. Existing quality schema/version/ID bindings retained. Pure projection tests precede repairs. Use current `package.json` commands, finite route helpers and catalog admissions.

## Constitution Check
Player-facing reliability; keyboard/reflow evidence; no invented facts; private state excluded from public paths/Git; fixtures isolated; no live storage mutation. Independent requirements and implementation review required. No constitution exception. Recheck after design: same boundaries apply.

## Project Structure and phases
1. Local-only preservation under ignored `.local/private-backups/` (completed before implementation; no private payload in receipts).
2. Spec/clarification/design/checklist/tasks/read-only analysis, repair/reanalysis before code.
3. US1: README.md, docs/roadmap.md, docs/reliability.md and docs/README.md.
4. US3: src/domain/site-quality.mjs, src/ui/site-experience-page.mjs; tests/runtime/site-quality.test.mjs and browser quality coverage. Use `readWeaponCamos()` and finite `weaponURL`/`weaponCamoURL` links. The existing strict35×25 validator rejects absent requirement/image fields: never weaken it to manufacture audit gaps. Reachable content gaps are admitted whitespace/sentinel requirement text; test those against the real validator. Optional missing local image bytes are a separate availability count from declared metadata, not an editorial error or a reason to create875 review rows. `scripts/content-audit.mjs` reports actual catalog/index counts, finite reader/editor links and local image availability into ignored test-results/reliability; no new review store. Existing mission audit remains the owner for mission sections/X01. No remote image downloads.
5. US5: `.github/workflows/quality.yml`: independent `runtime-core`, `browser-acceptance`, `studio-acceptance` OS matrices; retain `runtime-checks (os)` as an always-evaluated fail-closed aggregate over all three. Core retains runtime/build/package; browser retains measured/contributor/full browser; Studio retains full Studio. Each job builds its own checkout and uploads uniquely named evidence. Existing other jobs are preserved. Runtime gate uses dependency result JSON and rejects any non-success. tests/runtime/ci-quality-contract.test.mjs verifies coverage and negative gate fixtures. No action upgrades or test timeout changes.
6. US2/US4: select existing exact-state browser suites and layout/map engines; add a bounded reliability runner/report where needed, never seed real profiles. Actual content gap inventory derived from built quality JSON and mission audit. Audit all reader links; local author URLs validate admitted targets and report companion availability separately.
7. Full relevant runtime/repository/build/map/browser checks, screenshot review, convergence and independent acceptance. Separate deferred backup/recovery workpackage listed last.

## Verification strategy
Baseline probe: missing-combat weapon projection returns a valid weapon route; its import exists at the end of the module. Retain this as regression coverage, not a defect claim. New camo coverage assertions must fail before implementation. Other defects require original reproduction before source changes. Run full runtime once after changes, build/map build, quality browser checks, three-engine daily journey suites, compact/reusable-card tests, existing usability sweep/expanded accessibility and map browser acceptance. Receipt names/commands/results, screenshots and limits in verification.md. Local checks do not imply GitHub execution; a remote run needs exact-head receipts if published. Preserve test oracles and deadlines.

## Risks and alternatives
Splitting jobs increases setup/build cost but isolates budgets; raising the shared deadline alone hides the observed coupling. Aggregate gates preserve check names; always evaluate and fail for skipped/cancelled dependencies. Actionlint validates YAML when available. Do not blindly regenerate full catalogs or rewrite existing reviewed specs. Layout changes require updating the feature109 policy ledger only for genuinely necessary declarations, never bypassing it.

## Dependencies
Reviewed analysis gates code. Public content projection and CI edits are disjoint but integrated serially. Fixed screenshots/receipts precede reviewer acceptance. No merge is assumed by a local test result.

## Explicit journey and visual matrix
See [verification-matrix.md](verification-matrix.md). This is the finite five-family scope, commands, assertions and screenshot/keyboard criteria; missing assertions are added before acceptance.
