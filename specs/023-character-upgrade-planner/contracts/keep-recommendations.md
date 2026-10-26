# Contract: Keep and Search advice

## Input, scope and purity

Use a validated compatible pack/profile pair and explicit selected scope. Default All known not marked complete includes every visible known upgrade whose authoritative completion is not completed; Focused includes only upgrade roots from existing ordered goals. Known prerequisite closure is de-duplicated by stable objective ID. Completed prerequisite costs are excluded once. Unknown prerequisite completeness is a partial-coverage/readiness warning, not an empty verified graph and not a reason to erase arithmetic for known direct requirements.

The selected scope is one game/mode/build/content version. No cross-pack stock sharing. Hidden spoiler objectives and their usage/counts/names/reasons are not projected; show a generic limited-coverage notice instead of leaking their count. This view does not alter profile goals or bypass their100-goal execution limit.

Demand arithmetic reuses the existing shared direct stock-allocation kernel and known one-time prerequisite deduplication. First-slice advice is direct-requirements-only with crafting-route expansion disabled; existing selected routes and batch behavior remain in the separate optional focused planner. Scope traversal is iterative/bounded (20,000 total records/500,000 work steps), and output identifies versions and coverage. Over-limit, cycle, unsafe integer or scope mismatch yields a blocked result with no partial exact totals. Do not divide into independent100-goal runs and re-use stock.

## Verified arithmetic

When listed costs, their consumption and inventory entries are known inside the explicitly selected observed/compatible scope, calculate exact totals for those **known direct requirements**. Incomplete prerequisites/tiers or unknown live build mark them partial/lower-bound advice, not ready/current/exhaustive totals. Do not infer common live-build identity from the observed set.

For item i, consumed demand C=sum of each distinct unfinished consuming requirement after shared-prerequisite deduplication; retained floor T=max of retained requirements; H=manually entered held stock; R=manual reserve; A=max(0,H-R).

- Known total requirement G=C+T (same item/unit only).
- Keep from available held stock K=min(A,G).
- Upgrade-only gap U=max(0,G-A), matching the existing demand ledger.
- Unfilled fixed-reserve gap Q=max(0,R-H). Search additional to meet the known target and fixed reserve S=U+Q=max(0,R+G-H). Show U and Q separately, so the user knows which shortage comes from a personal rule. With no upgrade demand, any Q is a user-reserve target, not a game-recipe need.
- Recompute invariant: after adding S to H with unchanged G/R, both upgrade-only gap and reserve gap are0. This does not claim unknown future costs have been covered.
- Existing reserve protected=min(H,R), shown separately; total held protected=min(H,R)+K. Never add reserve twice or claim physically held stock beyond H.
- Shared ledger allocates the retained floor before consumable spending. Per-goal demand/allocated/shortage reasons reconcile to the aggregate; priority can change attribution, not physical stock or total demand.
- Strict/work-conserving executable simulation remains a separate existing planner choice. Keep/Search does not promise that every apparently stocked goal is executable together, optimal or legal in-game.

All quantities are safe nonnegative integers, each aggregate <=10^12. Cash retains its own unit; do not sum cash and material counts as “total items”. Absence of a cash row is not proof of zero cash requirement.

## Unknowns and explanations

Missing stock returns Held/Keep/Search=null with “Inventory not entered”; explicit0 permits zero-stock arithmetic only after other gates clear. Unknown consumption/quantity or conflicting costs blocks exact advice for affected items: Keep/Search=null, known rows and “Used by” reasons remain visible. Missing prerequisite completeness, unseen tiers and unverified live build instead retain known-direct-cost calculations with “Known requirements only — additional costs may exist”; they block readiness/exhaustive/current-build claims. Scope mismatches still reject the join; unknown build never wildcard-matches another pack. Unknown build applicability blocks a current-build/readiness claim; the observed pack's known requirements are labeled historical/observed, not live verification. No count gets a misleading precision badge.

“Now” requires known availability and cleared applicable prerequisites/evidence. Locked or unknown availability shows Later/eligibility unknown. No known demand displays “No known need in this scope”, not “sell”. A watch pin remains its own “Your watch pin” reason with no invented quantity. Manual reserves remain excluded from allocation; no automatic watch reserve is created. Known location links use existing sourced records; missing evidence displays “Locations not verified”.

## Synthetic acceptance vectors

All stock/reserve values below are deliberately fictional, never taken from source images. Numeric examples assume compatible synthetic evidence and confirmed consuming semantics; they do not certify the photographed mechanics.

| ID | Setup/action | Expected |
|---|---|---|
| A01 | Two consuming Power Regulator demands5+10; H6,R0 | G15,K6,S9; not per-recipe deficit sum4 |
| A02 | Same; Focused only5-cost upgrade | G5,K5,S0; Keep row remains |
| A03 | Same; mark5-cost upgrade completed | G10,K6,S4; H still6; completion reminder visible |
| A04 | Undo A03, then repeat save | G15,K6,S9; no fabricated stock/refund or duplicate demand |
| A05 | G15,H18,R5 | A13,K13,S2; reserve-protected5,total held protected18 |
| A06 | G15,H6,R9 | A0,K0,U15,Q3,S18; protected6, not9 held; adding18 yields H24,R9,A15 and both gaps0 |
| A07 | C8,T=max(3,5),H9,R0 | G13,K9,S4; floor protected5, consumable allocation4 |
| A08 | Same two roots share a one-time prerequisite costing4 | Prerequisite demand4 once, not8; completed prerequisite costs0 |
| A09 | Required15; inventory key absent vs present0 | Absent: no exact S; explicit0: S15 only if other gates clear |
| A10 | One requirement consumption unknown/quantity null/disputed | Affected K/S null; known rows and blockers retained, no false0 |
| A11 | Available but unpurchased / migrated unlocked | Demand remains; migrated entry review-required |
| A12 | Higher tier marked complete without sourced chain | No lower tier auto-completion or synthetic edge |
| A13 | Item no remaining known demand, watch pin/reserve set | No known need label plus preserved separate user rule |
| A14 | Repeated identical observation / conflicting observation | One objective demand; conflict blocks choosing numeric winner |
| A15 | >100 advisory roots within pack/work caps | Exact common-ledger aggregate if gates clear; profile goals untouched, execution still limited100 |
| A16 | Scope mismatch, cycle, overflow or work-budget exceeded | Clear failure, no partial exact recommendation and no profile mutation |
| A17 | Hidden spoiler upgrade uses otherwise unused material | No secret usage/count/name leak; generic scope limitation |
| A18 | Stock fully covers an unfinished consuming goal | Keep>0,Search0; completion removes its demand without spending stock |
| A19 | Upgrade directly requires2X; H(X)=1,H(Y)=0; chosen crafting route1X←3Y | Direct advice Keep1X/Search1X, no mandatoryY row. Optional focused craft planner can instead explain producing missing1X from3Y, never both as independent mandatory pickups |
| A20 | Known consumption/amount/stock, but prerequisite completeness or live-build applicability unknown | Known direct-cost totals/gaps remain visible with partial observed-scope warning; no readiness/current/exhaustive assertion |

Inventory interaction tests must also distinguish blank/Not entered, explicit0 and deliberate clear: setting0 from absence is a dirty change, clear removes the key only on successful commit, and cancel/paging/reload/failure preserve presence separately from numeric value.

Every vector must also assert input/profile immutability. Runtime tests include permutations and unit-specific examples, not only this table.
