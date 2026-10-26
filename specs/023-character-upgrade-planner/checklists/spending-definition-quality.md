# Independent spending-amendment definition checklist

Reviewer: `/root/verify_upgrade_player_journeys` — independent functional/recovery/accessibility QA.
Date: 2026-10-26 UTC.
Reviewed freeze: `d6cc1680db7cd6994af71f5daf6d67565d5b72b7`, tree `1f1728e22e4304fa0939eaaee35e3bce5207e59b`, against accepted baseline `b935b40b`.
Verdict: **PASS for implementation-ready functional definition; no runtime acceptance is implied.**

Reviewed addendum: `603dc766cbdcae0c498a8f8adde15470b96ce5ac`, tree `66ab9e81659a9af2330f5eeeaa4d91afe2775e44`. This narrowly allows v3 currency stock/reserves up to 2,000,000 and clarifies that incomplete requirement coverage is not an unknown listed amount. It is not a claim of universal gameplay capacity or fresh runtime evidence.

This is a new reviewer-owned amendment checklist. Earlier planning/implementation checklists remain historical and were not repurposed or edited by this reviewer.

## Definition quality

- [x] The user-facing outcome is distinct: record a confirmed upgrade purchase against saved pre-purchase stock, complete it once and retain an auditable spending snapshot. It does not trigger or synchronize the game.
- [x] Status-only correction remains separately labeled and non-consuming; resetting/correcting progress cannot erase the active-purchase duplicate guard or silently refund spending.
- [x] The purchase preview has an unchecked, explicit pre-purchase-stock acknowledgement, exact deducted/retained/reserved amounts, before/after holdings, completion and counter impact. Cancel has no persistence effect.
- [x] Missing stock, explicit zero, shortage, disputed/unknown cost semantics, protected reserves and retained floors have fail-closed, testable outcomes. Reserve edits are a separate saved action, not an implicit purchase override.
- [x] Atomic completion, stock deduction and history share the existing revision-checked write. Stable operation identity, scoped alias identity and pending-save serialization provide independently testable defenses against duplicate charging.
- [x] Quota/CAS, dirty inventory, stale previews, navigation and in-flight cancellation are covered by explicit failure/candidate-export contracts; no automatic newer-revision retry is permitted.
- [x] Latest-unreversed-only reversal is separately confirmed and uses immutable original snapshots. It checks current affected stock/progress, appends a reversal, preserves unrelated fields and refuses unsafe/capacity cases. Matching current values is not presented as proof of intervening gameplay.
- [x] The approved currency-input addendum keeps v1/v2, non-currency and cost/goal limits unchanged; unresolved v3 imports are not clamped, and selected known items enforce their proper kind-specific bound. Actual 2,000,000 cash entry/purchase/reserve/reversal is added to independent UI acceptance.
- [x] Counter meaning is specified: net recorded count-unit materials, visible gross/reversed amounts, separate per-item/unit and currency identities. Other resource units are not mixed into item counts or cash.
- [x] Legacy/manual completions and inventory edits create no invented spend. Strict v3 migration is explicit; exact v1/v2 prior snapshots remain recoverable; restore replaces history with warning instead of executing imported events.
- [x] The initial reset/restore wording conflict is resolved: reset retains spending history/guards; explicit whole-profile restore can replace history after preview and retains the previous profile.
- [x] History has explicit event/row/byte/node/depth limits and purchase admission reserves reversal capacity. There is no silent truncation or compaction.
- [x] Changed/retired IDs and units retain original accounting, while hidden/unresolved history is conservatively omitted from UI totals with a generic partial-display notice. Snapshot text is inert and spoiler-guarded. Hidden required items block previews generically; purchase/reversal/reset/migration/restore summaries share the no-hidden-count policy.
- [x] The domain-review addendum defines full-scope ID/observation-key identity, not provenance lineage alone, and validates a bounded legal event sequence: no concurrently active scoped aliases or non-latest reversals. It validates records without replaying inventory effects.
- [x] Owner-confirmed consumption is scoped to eight definitions/31 existing costs and recorded separately from photographic amount/effect provenance. Current build, capture date and complete prerequisite knowledge remain unverified. Unknown readiness is not a false barrier to recording a user-confirmed past event.
- [x] Mobile/keyboard/native focus, bounded 50-row display, actual Chromium/Firefox pixels, WebKit computed-layout-only and strict CSP/health are explicit acceptance gates, not inferred from source review.
- [x] US4, FR-017–FR-023, SC-007–SC-009, T023–T032 and B01–B11 provide traceable implementation and verification work; old baseline passes are not represented as proof of the amendment.
- [x] One integration writer and the reserved outside-checkout reviewer files preserve independent ownership. No dependency, map, permission, deployment or merge action is introduced by this QA approval.

## Pending implementation evidence

Purchase/reversal browser journeys, ledger runtime/property tests, actual v3 migration/restore, exact-head native/engine/Studio CI, new synthetic pixel review and final convergence are **NOT RUN for this amendment at this definition checkpoint**. They remain required before implementation acceptance.

The independent UI matrix is maintained outside checkout in `purchase-spend-qa-plan.md`. Reserved reviewer files are `independent-upgrade-journeys.mjs`, `independent-upgrade-advice-ui.mjs` and new `independent-upgrade-spending.mjs`; the integration writer may copy explicit frozen handbacks only.

Attribution: `/root/verify_upgrade_player_journeys`. Integration may copy this checklist verbatim as definition review, never as completed runtime approval.
