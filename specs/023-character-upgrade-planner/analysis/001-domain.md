# Independent domain review — feature 023 planning

Reviewer: `design_upgrade_tracking_rules` (independent of artifact writer)

Reviewed checkpoint: `65a816118aa58d86096ea38c0d3a4f94500029cc`

Date: 2026-10-26 UTC

Scope: Read-only review of the feature specification, data model, progress/advice contracts, source inventory/fixture, clarification gates, implementation plan, tasks, checklists, quickstart, and acceptance ledger. This is review of the proposed algorithms and tests, not validation of an implemented feature. No writer-owned files or runtime files were changed.

## Assessment

**Changes requested: D1 and D2.** The core model is otherwise sound and meaningfully reuses existing pack/profile/shared-planner facilities. The writer accepted both findings; approval awaits a frozen revised checkpoint and targeted re-review.

### D1 — High: uncertainty gates suppress useful known-cost arithmetic

Locations: `contracts/keep-recommendations.md:13,28`; `plan.md:41`; related `clarifications.md:18-20`.

The advice contract gates exact Keep/Search on full prerequisite knowledge and compatible scope, whereas the clarification record treats build/prerequisites principally as readiness gates. All eight source records have unknown prerequisites/build, so a literal implementation can suppress the user's useful known-cost advice even after consumption and inventory are confirmed.

Required resolution:

- Distinguish arithmetic over **selected known direct requirements / selected observed set** from exhaustive all-tier/current-build requirements and live executable readiness.
- With confirmed per-row quantities/consumption and explicitly entered inventory, known direct costs can have exact internal arithmetic while the result is clearly labeled partial/observed-set, not an exhaustive game need.
- Unseen prerequisite costs remain unquantified; they make overall demand incomplete/lower-bound, not zero. They must not erase clear known direct requirement rows or their scoped calculation.
- Different unknown snapshots must not be certified the same actual live build; arithmetic over a selected observed set remains a bounded advisory scenario, not gameplay verification.
- Unresolved consumption or disputed quantity still blocks the affected exact recommendation. “Known rows remain visible” alone is not sufficient if the only supported numeric view is globally disabled.
- Add explicit tests separating partial direct-cost arithmetic from withheld readiness/exhaustiveness claims.

### D2 — Medium: Search additional undercounts a fixed reserve above current stock

Locations: `contracts/keep-recommendations.md:15-20,43` (A06).

The stated vector uses synthetic G=15, H=6, R=9 and recommends Search=15. If the player finds those 15, new H=21; protecting fixed R=9 leaves A=12, still three short of G=15. Thus “Search additional” does not satisfy the target it appears to represent.

Required resolution:

- Preserve the existing allocation ledger's `upgradeGap = max(0, G - max(0,H-R))` semantics rather than silently change unrelated planner behavior.
- Separately expose `reserveGap = max(0,R-H)` when a reserve target is not yet met.
- If Search is a collection target sufficient to cover demand while maintaining the fixed reserve, use `collectTarget = upgradeGap + reserveGap` for positive known upgrade demand. A06 becomes upgrade gap 15, reserve gap 3, collect target 18.
- Reserve-only need with no upgrade demand remains a separately labeled user rule, not an invented unfinished-upgrade requirement.
- Add an invariant test: after adding the advertised collect target with unchanged demand/reserve, the remaining upgrade gap is zero. Keep from physically held stock must never exceed H.

## Passed definition checks

- Completion, availability, and fresh not-recorded state are distinguished. Legacy unlocked is retained as archival state, explicitly review-required rather than silently completed.
- Both single/shared planners and progression mutators use one planned semantic layer; generic non-upgrade behavior is protected.
- Completion is explicitly historical recording, not an in-game purchase. Undo/reset/repeated save never fabricate inventory/refunds and preserve other profile domains.
- Missing inventory differs from explicit zero. No screenshot quantity seeds player state.
- Shared consumption sums, retained floors, prerequisite deduplication, scope isolation and no per-goal stock reuse are specified and testable.
- Keep includes fully stocked unfinished demand; qualitative watch pins remain separate from numeric reserves.
- New tiers, Roman numerals, missing source evidence and disputed facts do not silently become zero, dependencies, or cumulative effects.
- No unqualified “always keep” or “safe to sell” claims.
- The evidence fixture has 8 definitions, 31 required rows and 22 distinct item/currency labels; each upgrade's consumption is explicitly unknown.
- Manual inspection of fixture fields and planning examples found no captured holdings/balance, original pixels, private paths or Library IDs. A supplemental literal scan found no known private-reference/holding patterns. The scan is supplemental, not a comprehensive privacy proof.
- Public source mapping uses safe observation identity, unknown capture/build and nullable typed provenance rather than fabricated source URLs.
- The prior overlapping Stash Weapon I observation is not duplicated. Earlier evidence stays separate pending scope review; no automatic 14-record compatible-build catalog is claimed.
- All implementation tasks remain future work, and baseline/planning checks are not mislabeled as acceptance of absent runtime behavior.

## Evidence executed for this review

- Read the frozen Git HEAD and the planning files listed above.
- Parsed `evidence/upgrade-observations.json`: 8 definitions / 31 requirements / 22 labels; all `consumptionStatus` values unknown.
- Evaluated the reserve counterexample with synthetic values: contract Search 15 leaves a recomputed shortage 3; collect target 18 clears it.
- Read existing reserve input/allocation code to verify that D2 can be fixed as a new advice presentation contract without silently changing the legacy planner ledger.

No runtime acceptance, browser testing, actual game mechanics verification, or source publication is claimed by this review.

Signed: `design_upgrade_tracking_rules`, 2026-10-26.
