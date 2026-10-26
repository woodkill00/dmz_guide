# Independent spending amendment definition review

Reviewer: `/root/review_upgrade_implementation`
Date: 2026-10-26 20:18 UTC
Verdict: **PASS for implementation of the defined scope; no runtime acceptance yet.**

## Exact checkpoint

- Commit: `d6cc1680db7cd6994af71f5daf6d67565d5b72b7`
- Tree: `1f1728e22e4304fa0939eaaee35e3bce5207e59b`
- Prior accepted implementation: `b935b40b27ffc8fa27228bb72fd773ba07171473`.
- Amendment adds US4, FR-017–FR-023, SC-007–SC-009 and pending T023–T032. Baseline implementation/CI claims are explicitly historical for this new scope.
- No runtime changes were present at this definition checkpoint. Reviewer did not edit integration files.

## Reviewer-owned definition checklist

- [x] Separate owner-reported consumption source covers only the eight observed upgrades / 31 costs; original photographic evidence is retained, and capture/build/prerequisite uncertainty is not rewritten as verified.
- [x] Strict profile v3 preserves v1/v2 reading and explicit migration/previous-state recovery; no spend is invented for legacy or manually completed upgrades.
- [x] One pure purchase candidate contains exact direct stock deductions, completion and immutable history; existing profile CAS is the sole atomic persistence boundary.
- [x] Missing stock is not zero; consumed sums, maximum retained floor and protected reserves are explicit. Reserve editing is separate from confirmation, with no override hidden in purchase.
- [x] Operation replay/conflict and scoped transitive purchase identity prevent a second debit after repeated actions, ordinary status correction or reset. Game/mode/build scope and observation keys are explicit; provenance lineage alone is not identity.
- [x] Strict imported-history validation enforces the legal event sequence, including no concurrently active equivalent purchase, latest-unreversed reversal, unique operations and valid snapshot arithmetic. Import never executes stock effects.
- [x] Reversal is an explicit append-only bookkeeping action using original snapshots, latest-event/current-post-state checks and one refund only. Current catalog changes never recompute old costs; correction/reset does not refund.
- [x] Gross, reversed and net recorded usage are distinct; count-unit materials, per-item/unit breakdowns and each currency remain separate. Empty/old history means unrecorded past spending, not lifetime zero.
- [x] Existing profile byte/node/depth limits remain; 500-event and cost-row caps, reserved reversal capacity and worst-size immediate-reversal validation prevent silent pruning or partial writes.
- [x] Dirty stock, quota/CAS, pending cancellation, stale preview, content/pack changes and navigation have explicit no-partial-write, retained-candidate and no-automatic-retry behavior.
- [x] Hidden required items block preview generically. Purchase/reversal/reset/migration/restore summaries share the no-hidden-label/count/amount projection; private export retains full inert history.
- [x] All profile-version readers, reset/rebind, backups and existing no-spend controls are within the compatibility audit. Public content exports exclude private spending history.
- [x] Native/engine/Studio, synthetic pixel, bounded DOM, discovery and existing advisory performance gates are pending implementation tasks, not source-only acceptance claims. WebKit screenshot/CSP and prior Windows stability limits remain protected.

## Findings resolved before approval

D1 (data integrity): the first draft listed reference/arithmetic validation without explicitly requiring legal active-purchase/latest-reversal sequences on import. The final contract mandates the bounded event-state machine and persistent identity unions.

D2 (identity): the first draft's “scoped overlapping lineage” wording could conflate provenance lineage with purchase identity or make ID matching global. The final contract uses full-scope ID and transitive observationKeys only.

D3 (privacy/confirmation): the first draft required a visible upgrade but did not explicitly require all charged/retained items to be visible, and restore counts could be read as bypassing hidden-history rules. The final contract requires generic refusal for hidden costs and safe projection for all summaries.

No remaining blocking definition finding. These conclusions concern the written contract; executable enforcement, actual cross-engine behavior and failure recovery require separate review.

## Independently executed checks

- `python3 scripts/check.py`: 0 failures.
- `git diff --check b935b40b..d6cc168`: passed.
- 32 unique task IDs and 32 requirement/outcome keys (23 FR + 9 SC) checked; all task references resolve.
- Exact corrective delta from `6180340` is confined to the normative spending contract.

The integration owner may copy this attributed report/checklist verbatim. This approval does not authorize deployment, new external services or expanded private evidence publication. The parent retains the separately authorized merge decision after updated implementation gates.
