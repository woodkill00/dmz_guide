# Feature Specification: Character upgrade planner

**Feature Branch**: `023-character-upgrade-planner`
**Created**: 2026-10-26
**Status**: Accepted baseline b935b40b is being extended under the owner’s 2026-10-26 consumption/spending request. Revised definition review precedes runtime changes; new acceptance is pending. PR remains draft and unmerged; parent owns any later merge.
**Input**: Use the supplied upgrade photographs to define upgrade costs, track what a player has not completed, and explain what to keep and look for.

## Clarifications

### Session 2026-10-26

- Owner clarification: the eight observed upgrades consume their listed materials and cash on completion; users need held/needed quantities and total recorded item usage. This is scoped owner-reported semantics, not independent current-build verification.
- Recording an upgrade purchase is private bookkeeping for an action the user confirms occurred in-game; it does not trigger the game. The prior status-only correction remains available and never records spending. Counters cover recorded events only, not unobserved historical play.

## User Scenarios & Testing

### User Story 1 - See my known upgrades and record progress (Priority: P1)

As a player, I can read a photographed upgrade's benefit and required items, then manually record its availability and completion without pretending the guide controls or synchronizes the game.

**Why this priority**: Reliable definitions and truthful progress are the foundation of useful advice.

**Independent Test**: Open the eight observed definitions with a fresh local profile, record an available-but-unpurchased upgrade, mark one completed, reload and undo. No photographed personal balances or progress appear.

**Acceptance Scenarios**:
1. Given an observed definition, when I inspect it, then its exact title, effect, required amounts, evidence limitations and unknown prerequisites are visible; an unobserved lower tier is not invented.
2. Given an upgrade marked available, when I have not marked it completed, then it remains in “Not marked complete”; availability is not purchase completion.
3. Given a manual completion change, when I confirm it, then only progress changes; inventory, cash, reserves and focus goals do not change. The guide says “Recording progress only; update inventory after an in-game purchase.” Undo restores progress, not imaginary refunded items.

### User Story 2 - Know what to keep and search for (Priority: P1)

As a player, I can see which materials still matter across all known upgrades not marked complete, narrow to my focus goals, and distinguish held stock to keep from additional stock to find.

**Why this priority**: A focused shopping list alone misses useful materials for other unfinished upgrades.

**Independent Test**: Use the synthetic stock scenarios in the recommendation contract, with verified synthetic consumption semantics, to change focus/completion/reserves and confirm one shared stock pool is used exactly once.

**Acceptance Scenarios**:
1. Given two known consuming demands of 5 and 10 of the same item and synthetic stock 6, when I view all known incomplete upgrades, then required total is 15, keep from held stock is 6 and search additional is 9, not 4.
2. Given enough stock for an unfinished upgrade, when I view Keep, then the item remains useful even though Search is zero. Completed upgrades contribute no remaining demand.
3. Given missing inventory entry, when I open advice, then it says “Not entered”; it does not claim zero stock or an exact deficit.
4. Given entered stock and known quantities/consumption, when prerequisite completeness or live build is unknown, then known direct-cost subtotals and stock gaps remain usable with a partial observed-scope warning, but not a ready/current/exhaustive claim. Unknown consumption, disputed quantity or missing stock blocks affected exact numbers; no universal “always keep” or “safe to sell” label appears.

### User Story 3 - Trust and recover my planning state (Priority: P2)

As a player, I can see which catalog/scope the advice covers, keep my own watchlist and reserves, and recover progress safely after a content update or failed save.

**Why this priority**: Advice must remain explainable and private when evidence and local state change.

**Independent Test**: Back up synthetic state, preview an older-profile migration and a changed-content rebind, reject an invalid restore and a stale-tab save, then recover the previous valid state without silent changes.

**Acceptance Scenarios**:
1. Given a legacy “unlocked” upgrade state, when I preview migration, then it is review-required and never silently classified purchased; the prior backup remains recoverable.
2. Given a newly observed tier or changed recipe, when the content version changes, then new tiers remain unreviewed and changed/removed references are shown before rebind; historical completion is not inferred for other tiers.
3. Given a manual watch pin or reserve, when known upgrade demand reaches zero, then my rule remains with a separate user-authored explanation; “No known need in this scope” is not a discard recommendation.

### User Story 4 - Record an upgrade purchase and see my spending (Priority: P1)

As a player, I can confirm the exact listed costs against my saved pre-purchase stock, record completion and consumption atomically, and see how many material units and how much cash my recorded upgrades used.

**Independent Test**: With synthetic held quantities and reserves, preview/cancel then confirm a purchase, reload, repeat the operation, manually correct progress, safely reverse the latest record, and restore a backup. Assert exact stock, completion, immutable history and counters after every success/failure.

**Acceptance Scenarios**:
1. Given known consumed costs, when I explicitly confirm I am recording a purchase against pre-purchase stock, then one atomic save deducts only those costs, marks that upgrade complete and appends one cost snapshot. Repeated confirmation never debits twice.
2. Given absent, insufficient, disputed or protected stock, when I request a purchase, then it refuses without changing state; I can edit stock/reserves separately or use status-only correction if stock was already reconciled. Unknown build/prerequisites remain warnings, not a false readiness claim or a barrier to recording a confirmed past purchase.
3. Given recorded purchases, when I inspect counters, then net recorded material count units, per-item/unit breakdown and each cash identity are separate; gross and reversed amounts remain inspectable. Old/manual completions have no invented spend, and totals are explicitly recorded-only.
4. Given the latest unreversed purchase and unchanged affected stock/progress, when I explicitly confirm a bookkeeping reversal, then its original snapshot is refunded once and prior progress restored with an append-only reversal. Later edits, insufficient capacity or overflow refuse safely; ordinary completion correction never refunds.
5. Given a stale tab, quota failure, dirty inventory draft, pack switch or pending save, when I interact repeatedly, then no partial debit/history exists; failed candidates remain exportable and cancellation cannot masquerade as cancellation of an in-flight commit.

### Edge Cases

Missing versus explicit-zero stock; fully stocked but unfinished upgrades; locked/unknown availability; shared prerequisites; same item both retained and consumed; zero known demand under incomplete coverage; unknown requirement quantities; repeated/contradictory observations; unequal builds; retired IDs; completion undo and repeated save; reserve larger than stock; missing tiers; graph cycles; unsupported oversized scope; quota/transaction failure; hidden spoiler uses; pack switch with unsaved input.

## Requirements

### Functional Requirements

- **FR-001**: Present the eight independently checked upgrade definitions and 31 requirement rows in the sanitized evidence seed, with 22 distinct material/currency labels, exact observed effects and separate tier markers. Publish no photographed holdings, cash balance, completion state or original images.
- **FR-002**: Every definition MUST preserve source type, review date, unknown capture/build identity, uncertainty and observation lineage. A public transcription is not independent gameplay corroboration. Unknown build observations MUST NOT silently merge into another build's catalog.
- **FR-003**: Represent upgrade completion separately from availability. Only explicit completion removes its costs; unknown, incomplete, locked or available-but-unpurchased entries remain not marked complete. No tier auto-completion or dependency inference from Roman numerals.
- **FR-004**: Preserve explicitly labeled status-only progress correction, idempotent repeated submission and reversible correction without spending/refunding stock. The separate confirmed purchase transaction in FR-017 is the only completion action that records consumption. Already completed or actively recorded purchases cannot debit again, even after status correction/reset. No game account synchronization is implied.
- **FR-005**: Default advice to all known upgrades not marked complete within the selected compatible scope; offer a clearly labeled Focused view using existing ordered goals. Show scope/count/coverage and unknown or excluded records. Never silently truncate all-known advice or expand persistent goals to evade limits.
- **FR-006**: Aggregate each known one-time prerequisite once, sum consumed demands, protect the maximum retained-tool floor and subtract available inventory once after reserves. Per-goal explanations MUST reconcile to shared totals without double spending. Unknown consumption MUST NOT default to consumed or retained. First-slice advice covers direct upgrade/prerequisite requirements only; crafting routes remain a separate existing planner journey and MUST NOT add both an intermediate item and its crafting inputs as mandatory pickups.
- **FR-007**: Distinguish Required, Held, Reserved, Keep from held stock and Search additional. Keep includes fully stocked unfinished demand; Search contains only additional shortage. Missing stock is “Not entered”, not an asserted zero. Quantities from different units MUST NOT be added together. Distinguish upgrade shortage from any unfilled fixed reserve; the displayed collect-to-target quantity MUST cover both without double counting.
- **FR-008**: Separate “Now” from “Later / eligibility unknown” and explain known prerequisites and blockers. Unknown prerequisites are not an empty verified chain; unknown quantities are not zero. Unknown quantity/consumption or absent stock withholds affected exact numbers. Unknown prerequisite completeness or live-build applicability instead marks known direct-cost totals/gaps as partial observed-scope calculations, not an exhaustive remaining budget or readiness claim. Do not suppress valid known arithmetic merely because additional unknown costs may exist.
- **FR-009**: Show “Used by known unfinished upgrades” with links and scope reasons from item detail and advice. Use “No known need in this scope” for absent demand, never an unqualified “always keep” or “safe to sell”. Unknown locations remain unknown; existing sourced location links do not promise guaranteed spawns.
- **FR-010**: Preserve manual reserves and allow private watch pins as user rules distinct from game facts. Focus changes, completion and catalog refresh MUST NOT erase those rules or silently spend reserved stock.
- **FR-011**: Reuse the existing private per-pack player profile and shared planning facilities, not a separate character/account system. Preserve legacy non-upgrade progress and planner behavior through an explicit compatibility migration and shared semantics review.
- **FR-012**: Persist changes with revision conflict detection and prior-state recovery; keep drafts recoverable after failure. Preview older-profile migration, restore and content-version rebind before commit. Reject malformed, unsafe, oversized or cross-pack state atomically; preserve unresolved references for review. Quantity input MUST distinguish blank/not entered, explicit zero and a deliberate clear action through save, cancel, paging and reload.
- **FR-013**: Preserve stable upgrade/item identities across matching observations; deduplicate the same tier without double demand, retain conflicting claims and do not choose a cheaper value silently. New/unknown tiers stay unreviewed; changed costs trigger a visible content-review notice.
- **FR-014**: Provide keyboard-operable controls, visible focus, non-color statuses, labeled quantity inputs, preserved focus after saves, usable 320px/390px layouts and 200% text. Hidden spoiler uses MUST NOT leak through labels, counts, search, totals or reasons.
- **FR-015**: Validate all public evidence and private inputs as bounded inert data. No original screenshot, private source identifier, player backup or personal quantity enters public history. Numeric overflow and scope/work limits fail with an explanation rather than partial exact advice.
- **FR-016**: Extend rather than replace the existing guide catalog, progression, inventory, shared planner and backup journeys. The separate map-workspace feature remains independent and unchanged.

- **FR-017**: Offer an explicit “Record upgrade completion and spending” preview using saved pre-purchase inventory, known exact compatible direct costs and scoped owner-confirmed consumed semantics. Require a positive acknowledgement that stock has not already been deducted. Commit stock deductions, completion and one immutable purchase snapshot in the same revision-checked write; never trigger the game or charge prerequisites/crafting inputs automatically.
- **FR-018**: Derive recorded spending totals solely from validated snapshots: net count-unit material usage, per-item/unit breakdown, each currency separately, and visible gross/reversed amounts. Do not infer spending from legacy/manual completion or inventory edits. Retired identities and old units/costs remain recoverable and never reinterpreted using current content.
- **FR-019**: Preserve append-only audited reversal: only the latest unreversed purchase with affected inventory/progress still equal to its recorded post-state can be reversed, once, using original costs. Restore prior progress atomically, reject overflow/capacity, never silently erase spending or double-refund. Status-only correction/reset retains the ledger and active-purchase duplicate guard.
- **FR-020**: Evolve private state to strict profile v3 with bounded spending history. Read v1/v2 unchanged; explicit migration adds empty recorded history, preserves old state and warns prior spending is unrecorded. Import replaces a full profile, never replays/debits events; old readers reject v3. Whole-profile reset preserves spending history; restore must explicitly disclose history replacement and retain previous state.
- **FR-021**: Bind each immutable operation ID to its payload and scoped observation identity; reject reused IDs with conflicting intent, alias re-purchases, invalid reversal references and malformed arithmetic. Preserve existing 1 MiB/20,000-node profile limits; refuse capacity without truncating history or partially applying a purchase.
- **FR-022**: Never silently spend protected reserves or retained tools. Block a purchase if post-consumption stock cannot preserve the listed retained floor plus fixed reserve; require any reserve changes as a separate manual inventory action. Missing stock never becomes zero.
- **FR-023**: Apply existing confirmation/failure-export/focus/spoiler/layout protections to purchases, reversal and spending displays. Hidden or unresolved history is conservatively excluded from displayed aggregate totals while spoilers are hidden, with a partial-display notice rather than leaked labels/counts. Private exports retain complete history.

### Key Entities

Upgrade definition; observed requirement; evidence reference; compatible catalog scope; private upgrade progress; inventory/reserve; focused goal; user watch pin; explainable advice row; migration/rebind preview; immutable purchase and reversal events; recorded-only spending totals. Exact data constraints are in [data-model.md](data-model.md).

## Success Criteria

- **SC-001**: All eight seed definitions and all 31 rows match the reviewed transcription; no personal source state is imported or published. The one overlap with earlier research creates no duplicate demand.
- **SC-002**: Every recommendation acceptance vector passes, including shared stock, reserves, retained floors, unknown mechanics, fully stocked Keep, completion/undo and scope isolation; single/shared planner regressions pass.
- **SC-003**: Fresh-state, old-profile migration, save/reload, private backup/restore, changed-content rebind, conflict and quota-failure journeys preserve prior valid state and never silently consume stock.
- **SC-004**: Keyboard, screen-reader labels, 320px/390px, 200% text and spoiler-protection journeys pass with no clipped required controls or hidden-information leakage.
- **SC-005**: At the contract-supported scope, recommendation recompute meets a measured p95 of 250ms on the recorded reference environment; over-limit inputs produce a visible refusal without truncating advice. This is an acceptance target, not an unmeasured claim.
- **SC-006**: All requirements map to implementation tasks and evidence; existing repository/runtime/browser gates and independent reviews pass before any implemented/release-ready claim.

- **SC-007**: Purchase/reversal truth tables and adversarial operation-ID/alias/CAS/capacity vectors pass with exact conservation and no partial writes; original status-only flows remain no-spend.
- **SC-008**: Actual native/engine UI journeys demonstrate preview/cancel/confirm, counters, missing/reserved stock, failed candidates, migration/backup/rebind and bounded history at 320/390px and 200% text. Existing WebKit no-screenshot/CSP policy remains.
- **SC-009**: All 31 observed costs cite a separate dated owner-confirmation source while original photographic evidence remains unchanged; unknown build/prerequisite/capture limits remain visible.

## Assumptions and Clarifications

- The accepted planning checkpoint delivered a reviewable plan and sanitized observation seed. The user subsequently authorized implementation and updates to the same draft PR; current evidence is in acceptance.md. Owner requested completion of this expanded scope before the parent considers the approved merge; this integration lane must not merge or deploy.
- “Character” means the player's existing local per-pack profile. Multiple operators/accounts and live game synchronization are out of scope.
- Images establish displayed requirements and effects, not spending behavior, complete tier trees, capture date, build identity, current player state or exhaustive catalog coverage.
- The owner confirmed consumed semantics for all 31 listed costs of these eight definitions on 2026-10-26. A separate public-safe source records that report; it is not independent gameplay corroboration. Other unknown consumption remains blocked. Build/prerequisite/capture uncertainty remains unchanged.
- Partial deposits/turn-ins, game-triggering purchases, account synchronization, inferred spending for old completions, arbitrary expense entry, universal rarity values, salvage conversion, a complete wiki, map ingestion and screenshot OCR import UI remain out of scope.
