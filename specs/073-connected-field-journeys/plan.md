# Implementation Plan: Connected field journeys

**Branch**: `feat/071-ui-ux-implementation` (working tree) | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

## Summary

Build a private prepare → play → review journey over existing inventory, progression, keys, map and field-desk owners. Keep cross-origin transfers explicit, bounded and previewed. Adapt presentation through shared shell/tokens while preserving existing domain calculations and the unfinished feature071 work. Implement by six independently testable stories; avoid wholesale rewrites of existing 763-path dirty tree.

## Technical Context

- **Language**: Node 22/24, JavaScript modules, CSS; companion map uses TypeScript/Vite.
- **Storage**: Existing local profile/IndexedDB owners plus a separately versioned bounded run-plan record. Never copy private account credentials.
- **Testing**: `npm test`, `npm run build`, focused `tests/browser/` journeys; map tests/build/browser suite for map changes.
- **Target**: Local desktop and responsive browser; offline catalog reading remains available.
- **Performance**: Bound mounted rows and imported bytes; measure before adding a new catalog index or persistent worker.
- **Constraints**: No live account sync; no invented game facts/coordinates; source rights stay owner-local. All imports preview and validate. Independent review and physical-device checks are separate gates.

## Constitution Check

Player decisions, accessibility, sourced facts, private local state, explainable planning, inert imports, reversible slices and tested behavior are mandatory. Current plan aligns by retaining existing owners, reporting uncertainty, requiring review before transitions and refusing unsupported API sync. Cross-tool write ownership is a high-risk contract: explicit adapter and transactional tests precede use.

## Existing Owners and Paths

- `src/ui/feature-registry.mjs`, `site-navigation.mjs`, `workspace-shell.mjs`, `main-hubs.mjs`: Guide navigation/shell.
- `src/ui/field-desk-page.mjs`, `src/client/field-desk.mjs`, `src/domain/field-ops.mjs`: reviewed local field operations.
- `src/domain/collection-needs.mjs`, `collection-budget.mjs`, `build-targets.mjs`: need/reservation math; extend without duplicate arithmetic.
- `src/ui/keys*`, `src/ui/progression-page.mjs`, `src/ui/armory-workbench-page.mjs`: specialized owner views.
- `tools/hajin-map/src/workspace/`: map/source/route controllers; preserve camera, selection and source evidence.
- `src/styles.css`, `src/ui/field-desk.css`, map styles: semantic token adapters, not a global reset.

## Data and Transfer Contracts

1. `RunPlanV1`: ID, name, date, pack/version, revision, bounded objective references, selected stops and reservations. Catalog mismatch archives references; never rebind by name.
2. `RunReviewV1`: staged entries with owner (`inventory`, `progression`, `boss`, `observation`), old/new preview and independent decision. Commit only through existing owner APIs; partial commits get explicit receipts and resumable remaining entries.
3. Cross-origin `PlanHandoffV1`: public IDs and coordinates only, bounded, one-time acceptance, no stock, private notes or account data. Existing map collection handoff is preferred and extended rather than replaced.
4. `PlayerImportPreviewV1`: future adapter accepts a bounded file only after a documented source contract; unsupported fields stay inert. No network fetch or Activision sign-in in this feature.

## Delivery Order and Risks

1. Inventory current behavior with focused tests; map existing APIs and incomplete feature071 overlap.
2. Build next-run plan and compact shell journey on Guide origin. This is the first vertical slice.
3. Add key/route handoff and cross-tool review; validate rejection and rollback.
4. Add source/evidence/coverage, mission/boss and weapon protocols.
5. Apply shared visual patterns to owning pages and map; run full browser matrices and independent review.

Main risks: stale pack IDs, double-counted reserved stock, partial multi-owner writes, lost map selection and storage denial. Use revision-bound saves, owner APIs and synthetic fixtures. No automatic global transaction across separate origins is claimed.

## Verification and Rollback

Use focused domain/browser tests per story, then repository `npm run check`, browser journeys and map suites for touched code. Record exact commands and results in `verification.md`. Revert each adapter independently; retain old profile stores and map workspace files. User backups remain portable. The existing unfinished071 gates remain independent and cannot be declared passed by073 evidence.
