# Implementation Plan: Character upgrade planner

**Branch**: `023-character-upgrade-planner` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)
**Reviewed baseline**: `main` at `407fa56afa43104c3342f4ed73b800f292bacf33`

## Summary

Extend the native guide's existing catalog, `dmz-upgrade` objectives, private per-pack profile, progression and shared planning ledger. First ship sourced definitions and truthful manual progress; then expose a derived Keep/Search advisory view over all known unfinished upgrades or existing focused goals. Do not build a second character manager or independent arithmetic engine. This branch contains only planning documents and a sanitized observation fixture.

## Technical Context

**Language/Version**: Existing JavaScript ESM, Node 22.x/24.x and browser modules.
**Primary dependencies**: Existing static build, Playwright and native IndexedDB; no new package required by this plan.
**Storage**: Existing `dmz-guide-local` profiles/content stores, CAS revisions and previous snapshot. Profiles remain keyed by pack ID.
**Testing**: Existing Python structural tests, Node runtime tests, native browser/engine harnesses plus synthetic upgrade fixtures.
**Target**: Native static guide; local private state, no server/account/game synchronization.
**Performance**: Derived advice p95 <=250ms on recorded Chromium reference environment at supported limits; 20,000 total pack records, 500,000 work steps, safe aggregate <=10^12. Existing 100 active execution goals remains unchanged.
**Scope**: Eight new observed definitions, 31 requirement rows, 22 labels; not an exhaustive or current-build verified catalog.
**Constraints**: Unknown consumption/prerequisites/build cannot be normalized into invented truth. No original screenshots or private player state published.

## Constitution Check

| Principle | Response and gate |
|---|---|
| Player decisions/accessibility | Benefit-first definitions; distinct Keep/Search; labels/keyboard/mobile/zoom, T010–T016 |
| Trust is data | Typed private-observation provenance, scoped unknown build, no universal keep/sell claims, T002–T005 |
| Portable/private state | Existing profile and CAS snapshots; explicit preview migration/rebind, T006–T009,T018 |
| Explainable planning | Shared demand/retained/reserve algebra, reasons and blocked unknowns, T011–T014 |
| Inert bounded imports | Existing byte/node/ref limits; v1/v2 validation and atomic restore, T004,T006,T018 |
| Reversible slices/tests | Dependency-ordered tasks, synthetic vectors, no unexecuted acceptance claim, T001–T022 |
| Governance/simplicity | No backend, live-data migration, map change, merge or deployment in this branch |

Pre-design and post-design: no constitutional exception requested. The constitution's proposed/not-ratified status is unchanged. Gameplay evidence gates are documented product behavior, not permission to waive factual integrity.

## Architecture decisions

1. **Catalog admission and scope.** Extend existing objective representation (`track: dmz-upgrade`, one-time) rather than modeling upgrades as produced inventory items. Put newly admitted observations in a clearly labeled observed snapshot pack with unknown build, never silently in `official:mw4-dmz-starter`. At implementation start, reuse an equivalent observed pack if one has since appeared; otherwise create one. Reuse stable item identities only inside the compatible pack; do not bridge inventory between packs. The first seed admits only these eight reviewed observations. Earlier research remains a separate follow-on evidence review, not automatically promoted data.
2. **Content schema evolution.** Introduce explicit pack schema v2 with a dual-version validator and an in-memory v1 normalization adapter. Preserve existing v1 packs and their exact legacy behavior. V2 adds typed source provenance, nullable URL for `private-observation`, and upgrade evidence metadata for prerequisite completeness, requirement quantity/consumption certainty and observation lineage. Null values are not passed as false/zero into the numeric planner. Update schema, actual Studio controller/author boundary (including its schema-v1-only advanced JSON gate), guided authoring, catalog, portable import, rendering and both planners together; no undocumented partial adoption.
3. **Progress schema evolution.** Profile v2 adds authoritative `upgradeProgress` and private `watchPins`; existing generic completion remains authoritative only for non-upgrade objectives. Preview v1→v2 migration and retain original state in a recovery snapshot plus bounded legacy-state annotations. A shared accessor/mutator is used by progression, the inventory page’s existing prerequisite-state controls, single planner and shared planner, preventing the current `unlocked`/`completed` inconsistency. Only explicit upgrade completion suppresses its costs. Legacy `unlocked` upgrades require review, not auto-purchase inference. See [progress contract](contracts/upgrade-progress.md).
4. **One ledger, two uses.** Extract/reuse bounded pure demand/stock allocation logic from `src/domain/shared-plan.mjs`; do not sum per-goal deficits or duplicate it in UI. `src/domain/upgrade-advice.mjs` selects all-known or focused upgrade roots and projects explanations. All-known advice uses a transient root set and bounded graph traversal, never pushes all records into `profile.goals`. It reuses shared prerequisite deduplication and the direct stock-allocation kernel (consumed sums, retained floors and reserves). Advisory calculation explicitly disables crafting-route expansion; direct required items are the pickup targets. Existing route/batch crafting remains an optional separate focused-planner journey, never simultaneously charged as mandatory ingredient pickups. Execution simulation remains capped at 100 active goals and separately labeled. Advice is not an executable purchase plan or global optimum.
5. **Unknowns fail closed.** Requirements/usage/progress remain available with unknown mechanics. Exact known-cost Keep/Search numbers are withheld for affected items when consumption, amount or inventory is unresolved, and incompatible scope joins are rejected. Missing prerequisites/tiers and unknown live-build applicability instead label valid arithmetic as partial observed-scope totals/gaps (“Known requirements only — additional costs may exist”). They block ready-now/current/exhaustive claims, not calculations over known direct costs. Show typed uncertainty, included/excluded records and missing-information reasons. Confirming user inventory does not verify a source or mechanic.
6. **Safe completion.** Manual completion is metadata only. Do not implement a purchase/consume/turn-in action. Completing or undoing never changes stock. All relevant views explain that stock must reflect the player's latest in-game purchase; saved stock is a manual snapshot, not live inventory.
7. **Native UI reuse.** Add an upgrade view to the existing progression journey and Keep/Search to existing planner/item details, preserving pack selection, source display, focused goals, inventory window and local detail links. The inventory page must show absence as blank/Not entered, accept explicit0 as a real change, and provide deliberate clear/unset with cancel/save/paging preservation; update its inventory-window draft controller, not just the form. Existing location/list links may be reused only when supported; feature020/map ingestion is not a dependency.

## Project Structure

Planning deliverables are confined to `specs/023-character-upgrade-planner/`: spec, clarifications, plan, research, data model, source inventory, sanitized evidence, contracts, quickstart, tasks, traceability, quality/reviewer checklists, acceptance and analysis.

Future implementation ownership (not changed here):

```text
schemas/pack.schema.json                         # dual-version source/upgrade contracts
src/content/validate.mjs                         # schema-aware boundaries
src/domain/profile.mjs                          # v1/v2 validation and migration preview
src/domain/upgrade-progress.mjs                  # proposed shared upgrade state accessor
src/domain/shared-plan.mjs, planner.mjs           # common progress + allocation semantics
src/domain/upgrade-advice.mjs                    # proposed bounded advisory selector/projection
src/domain/progression.mjs                       # unified mutations and spoiler-safe projection
src/storage/store.mjs                           # existing CAS/snapshot integration
src/client/progression.mjs, planner.mjs, profile.mjs
src/client/catalog.mjs, common.mjs, guided-editor.mjs, studio.mjs
src/client/inventory-window.mjs                   # missing/zero/unset draft semantics
src/ui/progression-page.mjs, private-pages.mjs, render.mjs
content/catalog/upgrade-observations/             # proposed reviewed observed pack, not official starter
scripts/catalog.mjs, scripts/build.mjs, scripts/author.mjs # version-aware load/build/author boundary
src/content/portable.mjs, src/client/editor.mjs   # preserve v2 evidence on round-trip
src/styles.css
tests/runtime/*upgrade*.test.mjs                 # proposed contract and adversarial coverage
tests/browser/upgrades.mjs                       # proposed end-to-end journeys
```

`tools/hajin-map/**`, feature020 artifacts, root dependency files and the constitution are not implementation targets of this feature. Root package script edits are unnecessary: extend native browser registration and existing runtime test globs, with a failing-test discovery assertion.

## Delivery and decision gates

1. Baseline/contracts and evidence admission (T001–T005): validate sanitized input and compatibility; allow requirements-only catalog even while game mechanics are unknown.
2. Profile/progress and migration (T006–T010): first independently usable MVP; unknown state is honest, not prefilled from photographs.
3. Shared advice and Keep/Search (T011–T016): synthetic semantics exercise math; real exact advice activates only for evidence-cleared rows/scopes.
4. Recovery, bounded performance and regression (T017–T022): version changes, import/export, conflict, mobile, spoiled data, independent review and convergence.

## Risks and mitigations

- Global pack/profile versioning touches multiple readers: serialize shared-contract ownership and test both versions through catalog/editor/import/export/build, not only the new page.
- Legacy unlocked meant different things in two planners: central accessor plus explicit migration review and existing non-upgrade tests.
- Incorrect apparent availability after historical completion: stock remains untouched with prominent manual-reconciliation copy; do not simulate automatic spending.
- Unknown mechanics limits immediate numeric usefulness: show definitions/usage now; after quantity/consumption/stock confirmation, show known direct-cost calculations with partial observed-scope warnings rather than wait for a complete game database.
- Catalog growth exceeds execution cap: bounded advisory engine reuses ledger internals, never invokes execution by splitting into batches with reused stock. Refuse over-budget advisory calculation rather than return partial exact totals.

## Complexity Tracking

No constitutional violation. Two explicit version adapters are justified by strict current schemas and backward compatibility. A separate database, account system, second planner, automated screenshot import and consumption transaction were rejected as unnecessary scope.
