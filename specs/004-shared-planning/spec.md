# Feature Specification: Shared collection planning
**Feature Branch**: 004-shared-planning
**Created**: 2026-10-21
**Status**: Requirements review
**Input**: Continue approved S3 shared goals, prerequisite closure, batch allocation and executable-now distinction. Depends on003 runnable guide, does not remove005–008 commitments.

## User Scenarios & Testing
### US1 - One collection list for several goals (P1)
Player selects up to100 ordered goals and explicit intermediate recipe routes, protects reserves and sees one shared requirements ledger without spending owned stock twice.
Independent test: fictional beacon+scanner share one board batch (3 wire→2 boards) and pay the10-credit bench once; completed bench costs zero; retained tool is not consumed.
Acceptance: total intermediate demand is aggregated before batch rounding; stock reduces demand before crafting; each consumed unit belongs to one goal; per-goal allocation and aggregate ledger agree. Reordering changes priority allocation, not the unowned raw shared requirements. Currency units stay independent.
### US2 - Distinguish requirements from executable work (P2)
Player sees now/later reasons and a separate executable schedule. Strict-priority reservation is default; explicit work-conserving mode may use resources reserved for a blocked higher goal.
Independent test: high goal lacks one input but reserves scarce resource; lower goal requiring that resource is not executable in strict mode but can be in selected work-conserving mode. Trial execution never mutates owned profile.
Acceptance: no partial failed goal consumption; retained tools remain after complete execution; prerequisite objectives deduplicated and completed once in schedule; unknown eligibility/requirements/gates never ready; projected surplus cannot masquerade as owned stock.
### US3 - Understand unsupported or unsafe plans (P3)
Selected-route cycles, mixed modes/builds, malformed quantities or excessive graph work produce explainable errors, not silent approximation or hangs.
Independent test: cycle shows path, unselected recipe alternative cycle is tolerated, selected cycle blocks planning, 200 goals rejected.

### Edge Cases
Shared diamonds, long chains, alternate routes, zero stock, reserves larger than stock, simultaneous retained+consumed same item, noncraftable ingredients, completed objectives, repeated goals, unknown/disputed gates and stale profile content.

## Requirements
- F004-01: Select/add/remove/reorder up to100 goals, explicit output quantities and selected intermediate route per output. One-time objectives quantity1. Preserve choices in versioned private profile.
- F004-02: Expand selected acyclic dependencies and aggregate shared intermediate demand before yield rounding. Deduplicate one-time prerequisite costs. Allocate actual stock once by goal priority after protected reserves; show leaf consumption and intermediate owned/projected quantities, retained needs and per-goal attribution.
- F004-03: Show collect-now/later with named prerequisites and uncertainty. Collection priority is not executable status. Strict priority protects allocations even for blocked higher goals; work-conserving mode requires explicit choice and explains the tradeoff.
- F004-04: Simulate complete executable actions against actual stock in a copy, rollback failed goals, consume only consumable costs and preserve retained tools. Produced surplus belongs only to trial schedule, never profile. Explicitly avoid optimal/guaranteed route claims.
- F004-05: Reject unsafe integers/aggregate overflow, duplicate goals, unknown refs, scope joins, unsupported inputs and selected-route cycles before planning. Enforce100goals,20krecords,graph-work500k and iterative traversal without recursion stack failure.
- F004-06: Add deterministic conservation, batch/shared-unlock/alternative/retained/currency fixtures and randomized invariants, accessible browser goal editing/priority controls/reload and explainable results. Maintain003 gates and independent review.

## Key Entities
Goal quantity, explicit route selection, scope-aware dependency graph, aggregate demand ledger, priority allocation, retained-tool floor, objective closure and copied executable schedule. Existing profile routes/goals fields suffice; policy is explicit UI state persisted in later profile field with migration only if needed.

## Success Criteria
SC004-01: All named acceptance fixtures pass;1000 randomized owned-stock/reserve trials never overallocate or mutate input.
SC004-02: Beacon+scanner consumes3 wire for one shared batch and30credits for shared unlock+scanner, not6wire or40credits; completed unlock removes10credits.
SC004-03: 100goals permitted,200 rejected;20k-node synthetic DAG validation terminates with bounded work and no call-stack overflow.
SC004-04: Mobile keyboard usable add/reorder/remove controls and results remain readable at320px; browser tests/screenshots recorded on actual runner, not inferred.

## Assumptions
A manual single planning pool remains explicitly local, not verified game stash semantics. Only selected routes expand, auto route choice is never silently optimized. Unknown game eligibility stays blocking. No new services, hosting or public data. Missing route means collect raw item; unavailable known records are not invented.

## Clarifications
### Session2026-10-21
Prior approved foundation specifies strict priority, optional work-conserving, aggregate batch rounding and shared closure. No new owner question needed. Algorithm choice is reversible plan detail, not player semantics.

### Resolved semantics
Recipe goal quantity means additional produced output, consistent with003; already-owned final output does not silently complete a requested craft. Owned intermediate stock reduces expansion. Two selected root recipes producing the same item, or a root pin conflicting with routes for its output, are rejected with an explicit choose-one-alternative message; no silent precedence.
Now/later fixture A25 is mandatory: now and later each require1board, batch2boards/3wire. Zero boards attributes3wire shortage to now and0later via contingent surplus; one held board makes now0wire and later3wire. Combined conservation is required, per-horizon stock monotonicity is NOT required.
Disputed prerequisite evidence remains a blocking warning even if manually completed/unlocked. UI save failures preserve/export unsaved goal/route edits through a direct current-profile backup button; cancellation never applies staged changes.
Each selected root recipe's requested additional output is earmarked for that goal and cannot also satisfy another root's ingredient demand; only newly produced unclaimed batch surplus is reusable. Existing owned final output never silently satisfies a requested craft. Ledger exposes rootReserved and successful trial exposes delivered quantity. Both root/dependent priority orderings must conserve stock.
Retained-tool shortage attribution follows each horizon's incremental retained floor, not the global maximum assigned to the first use: an unlocked goal needing tool1 followed by a locked goal needing tool5, owned0, reports now1 and later4; owned1 reports now0/later4. Global ledger retained floor remains5 and joint consumed/retained accounting must conserve available stock.
