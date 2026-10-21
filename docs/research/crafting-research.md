> Research appendix. Exploratory proposals and alternatives below are superseded where they differ from the canonical spec, plan, ADRs and acceptance gates. Canonical limits: 100 active goals; provisional 20,000 total records and depth 32. The final phased roadmap is S0-S8 in plan.md. Examples are illustrative unless explicitly validated; no application tests have been executed.

# Crafting and editable data-pack engine: design research

Research date: 2026-10-21. Target: github.com/woodkill00/dmz_guide. This is a proposal, not a repository audit or implementation. No runtime, repository, or remote changes performed. All example names, costs and recipes below are fictional software test fixtures, not MW4 game facts. Official mechanics are verified in the reconciliation section below; all generic fixture values remain fictional.

## Executive recommendation

Build a local-first, inspectable planner, not an opaque “optimal loadout” calculator. Keep publisher/community content separate from user inventory, objectives and personal edits. Every recommendation should answer “why this item, how many, for which goal, from which data version?” Shared inventory must be consumed by one allocation ledger across all goals, never separately subtracted from each recipe. Pin one recipe choice per output for v1 and explicitly explain that the result is deterministic, not globally optimal. Permit experimental data only with persistent labels and a separate profile.

## Concrete proposals, with trade-offs

1. **Immutable base packs plus user overlays.** Pack snapshots have stable namespaced IDs and content hashes. Personal edits become an overlay referencing a base revision; “Save as pack” materializes a standalone copy. Pros: updates do not silently erase edits, rollback is trivial. Cons: rebase/conflict UI is required. V1 may use explicit fork-and-replace instead of overlays, provided it never overwrites personal work.
2. **Separate schema, content and game versions.** `schemaVersion` changes file structure, `packVersion` changes content, `gameVersion` and `seasonId` declare applicability. Pros: an item balance update is not mistaken for a migration. Cons: authors must maintain three concepts. Never infer correctness from a newer semantic version alone.
3. **Evidence at fact/recipe level.** Each game claim has status, source URL, retrieval date, exact supported scope, and optional reviewer. Pros: a verified item's name does not falsely verify its numerical recipe. Cons: editorial effort. UI distinguishes official, observed/community, unverified, fictional, obsolete and disputed.
4. **Atomic import preview.** Parse into an isolated staging area; validate syntax, schema, graph and rights metadata; show counts, deleted/renamed IDs, changed costs, and affected goals before commit. Pros: corruption cannot partially replace a usable profile. Cons: extra import step. Restore previous snapshot in one action.
5. **One shared allocation ledger.** Aggregate all active goals, consume eligible stock once, then expand shortages. Pros: fixes common shared-ingredient bugs and supports explanations. Cons: priority, batching and scope semantics need deliberate definitions. Show reservations per goal rather than silently subtracting hidden totals.
6. **Pinned alternatives before optimization.** Multiple recipes may exist, but user selects a route per item; planner can compare complete alternative plans. Pros: reproducible answers and simple audit trail. Cons: user chooses trade-offs. Later solver must optimize the entire graph jointly, not choose cheapest local branches independently.
7. **Inventory locations are first-class.** Stash, carried, equipped, reserved, spent and lost are separate quantities or events. Pros: possession is not confused with accessible stock. Cons: manual capture friction. A session picker makes extraction transfer explicit; do not infer live game integration.
8. **Two horizons, one inventory pool.** Compute “now” goals first, then future goals from its residual stock and scheduled surplus. Pros: later demand never steals from now and ingredients are not counted twice. Cons: “later” is policy-relative, not universal. Users can reorder priorities with a preview.
9. **Always-pick-up is a personal policy, not a factual claim.** Allow user pins with optional target reserve, capacity warning and expiry. Pros: honors the user's knowledge and rare-item priorities. Cons: unbounded pins can saturate storage. Distinguish “always flagged” from “you need another.”
10. **Explainable item cards.** Show `owned`, `usable here`, `reserved`, `missing now`, `later`, `protected reserve`, confidence and exact goal traces. Pros: advice is trustworthy and easy to correct. Cons: many fields; compact defaults and expandable details are necessary.
11. **Local-first storage with explicit backups.** IndexedDB stores validated packs, assets, profile events and snapshots; downloadable portable export contains everything needed offline. Pros: privacy and offline availability. Cons: browser data is not a backup; clearing storage or eviction can remove it. Show save failures, backup date and export reminders, never claim “saved forever.”
12. **Revision-aware sync only after a reliable local product.** Content-addressed packs plus per-profile revisions; conflicts in inventory counts require reconciliation. Pros: avoids accidental inventory duplication. Cons: conflict resolution is less magical than last-write-wins. Cloud account and sharing are optional later features.
13. **Scoped reset previews.** Reset a run, inventory, objective progress or season separately. Archive old profile and show affected counts before apply. Pros: season updates cannot erase unrelated notes/pins. Cons: more explicit choices. Never assume a game reset policy from franchise history.
14. **Safe offline image bundles.** Manifest references bundled raster files by relative path and checksum, with attribution/license metadata. Pros: portable packs, no surprise tracking requests, predictable rendering. Cons: larger downloads and image validation costs. Remote asset import is a separate opt-in flow, not automatic on JSON parsing.
15. **Derived reverse index and map bridge.** Each item can answer “used by these recipes/objectives”; map candidates consume a read-only missing-item query, never mutate inventory because a marker was clicked. Pros: planning and maps cooperate without misleading pickup claims. Cons: locations have separate freshness/uncertainty rules.
16. **User-visible change reports.** “Recipe cost increased from 2 to 3; you now need 1 extra” with before/after plans and rollback. Pros: update trust. Cons: compute two plans and preserve old content. Stale profiles remain readable rather than being force-upgraded.

## Pack and profile contracts

Use JSON Schema Draft 2020-12, with a schema shipped and pinned by the application. Do not fetch arbitrary `$schema` or `$ref` URLs supplied by a pack. Structural validation covers required keys, bounded strings/arrays, integer quantities, known enums and unknown-property policy; semantic validation covers references and game applicability. Draft 2020-12 provides the structural vocabulary, but application-level graph and identity checks are still needed. [JSON Schema](https://json-schema.org/draft/2020-12), [Validation vocabulary](https://json-schema.org/draft/2020-12/json-schema-validation).

Recommended pack entities:
- Manifest: `packId`, `packVersion`, `schemaVersion`, `gameId`, `gameVersion`, `seasonId`, `locale`, `createdAt`, `updatedAt`, `contentHash`, `authors`, `license`, `provenance`, `capabilities`.
- Items: stable namespaced `id`, localized name, category, tags, asset reference, optional stack/capacity facts with evidence. Display names are never join keys.
- Recipes: stable `id`, one main output and positive integer yield for v1, ingredient quantities, applicability, station/unlock requirements, evidence. Multi-output recipes explicitly unsupported initially, not silently flattened.
- Objectives: exact item requirements, prerequisites, repeatability, progress semantics, and evidence. Consumed turn-ins differ from merely possessing an item.
- Assets: IDs, filenames, SHA-256, MIME, dimensions, byte count, rights holder, license/source and attribution. A hash proves integrity, not trust or permission.
- Sources: IDs, official/community distinction, URL, retrieval and verification dates, precise supported claims.
- Changes/mappings: stable-ID rename map, tombstones, replacement notes. Never automatically merge two item IDs just because their names match.

Profile stores a separate `profileSchemaVersion`, `profileId`, pinned pack ID/hash, revision, inventory events, goals, selected recipe routes, custom pins, reserve floors, run context and user notes. Importing content must not replace these. Export options: content pack only; profile backup; complete bundle including assets. A profile without its exact pack is recoverable but cannot produce an asserted-current plan.

### Fictional portable example

```json
{
  "schemaVersion": "1.0.0",
  "packId": "demo:outpost",
  "packVersion": "0.1.0",
  "gameId": "fictional-fixture",
  "gameVersion": "test-only",
  "seasonId": "demo",
  "locale": "en",
  "title": "FICTIONAL PLANNER TEST DATA — NOT MW4",
  "license": "CC0-1.0",
  "evidenceStatus": "fictional",
  "items": [
    {"id":"demo:wire","name":"Copper Thread","assetId":"demo:wire-icon"},
    {"id":"demo:board","name":"Signal Tile"},
    {"id":"demo:cell","name":"Glow Cell"},
    {"id":"demo:beacon","name":"Trail Beacon"},
    {"id":"demo:tool","name":"Survey Tool"}
  ],
  "recipes": [
    {"id":"demo:board-batch","output":{"itemId":"demo:board","quantity":2},"inputs":[{"itemId":"demo:wire","quantity":3}],"evidenceStatus":"fictional"},
    {"id":"demo:beacon-build","output":{"itemId":"demo:beacon","quantity":1},"inputs":[{"itemId":"demo:board","quantity":1},{"itemId":"demo:cell","quantity":1}],"evidenceStatus":"fictional"},
    {"id":"demo:tool-build","output":{"itemId":"demo:tool","quantity":1},"inputs":[{"itemId":"demo:board","quantity":1}],"evidenceStatus":"fictional"}
  ],
  "assets": [
    {"id":"demo:wire-icon","path":"assets/wire.png","mime":"image/png","license":"CC0-1.0","attribution":"Original fictional test art"}
  ]
}
```

This illustrative manifest omits production timestamps, hashes and the actual PNG; it is not an import-ready verified bundle. A content-only JSON can have no assets and display a built-in placeholder. A real bundle must include the referenced file and its verified hash.

```json
{
  "profileSchemaVersion":"1.0.0",
  "profileId":"local:example",
  "packRef":{"packId":"demo:outpost","packVersion":"0.1.0"},
  "revision":1,
  "inventory":[
    {"itemId":"demo:wire","location":"stash","quantity":4},
    {"itemId":"demo:cell","location":"stash","quantity":1}
  ],
  "goals":[
    {"id":"goal:beacon","itemId":"demo:beacon","quantity":1,"horizon":"now","priority":1},
    {"id":"goal:tool","itemId":"demo:tool","quantity":1,"horizon":"now","priority":2}
  ],
  "recipeSelections":{"demo:board":"demo:board-batch","demo:beacon":"demo:beacon-build","demo:tool":"demo:tool-build"},
  "pickupPolicies":[{"itemId":"demo:wire","mode":"always-flag","reserveFloor":2}]
}
```

The example's reserveFloor is a protected stock policy, not an added consumption goal. With that protection, only 2 of 4 wires are usable, so the two goals need 1 additional wire. Without the protection, 3 wires are reserved and 1 remains. UI must make this distinction explicit.

## Exact baseline allocation mathematics

### Scope and assumptions

V1 item production supports consumptive integer inputs, one output per recipe, positive integer output yields, selected recipes forming a directed acyclic graph, and no automatic arbitrage or recipe byproducts. Retained-tool prerequisites may be represented as availability gates, but durability/charges are unsupported. Upgrade effects use a distinct action model described below. Other mechanics are represented as unsupported capabilities or separately tested constraints. All amounts are safe bounded integers; guard additions and multiplications against overflow.

A planning context defines eligible locations. A stash-only crafting context excludes carried items until explicitly transferred. A run-pickup context can display stash alongside carried but cannot count it as immediately usable. Equipped or locked stock is excluded unless explicitly made available.

For item i:
- H_i = total eligible held quantity.
- F_i = user-protected reserve floor, bounded below by zero.
- S_i = max(0, H_i - F_i), allocatable held supply. If H_i < F_i, reserve refill is separately shown as max(0, F_i - H_i), not silently consumed by goals.
- G_i = outstanding direct goal quantity for the current horizon, after recorded completed turn-ins.
- y_i = output yield of selected recipe r_i, if craftable.
- a_ji = amount of ingredient j used per batch of recipe r_i.

Set D_i = G_i. Process nodes in a topological order from outputs toward ingredients, so every lead reviewer demand reaches an ingredient before it is processed:
1. R_i = min(S_i, D_i): held stock reserved for the plan.
2. U_i = max(0, D_i - R_i): unmet output demand.
3. If craftable and route allowed, B_i = ceil(U_i / y_i); planned output C_i = y_i B_i; planned surplus E_i = C_i - U_i. Add a_ji B_i to D_j for every ingredient j.
4. Otherwise missing-to-acquire M_i = U_i; set B_i = E_i = 0.
5. Remaining held stock S'_i = S_i - R_i.

A planner can display both unmet finished items and leaf acquisition requirements, but must not sum them as if they were independent shopping requirements. “Need 1 beacon” and “need 1 cell to craft that beacon” are two views of one dependency, not two extra goals.

Shared-ingredient conservation: total reservations across goal traces never exceed S_i. Sum of all ingredient allocations plus surplus explanations equals computed demand. Never run a separate `max(0, goalCost - inventory)` for each goal and combine results.

Batch aggregation example: beacon needs 1 board, tool needs 1 board; a batch makes 2 boards from 3 wires. Combined demand is 2 boards, so one batch and 3 wires, not two batches and 6 wires. If one board is already held, remaining demand is 1, still one batch, with one surplus board.

Priority explanation: first calculate the aggregate quantities, then distribute held reservations and batch output tokens deterministically by (priority, stable goal ID, stable dependency order). Store lead reviewer trace edges; avoid copying exponential numbers of full dependency paths. A token assigned to one goal cannot satisfy another. A shared batch may support two goals, so explain the batch jointly rather than falsely assigning the full 3-wire cost to both goals. Fractional cost attribution may be informative but is not an actionable integer pickup quantity.

### Now versus later

Plan now, retaining the post-plan ledger: held residual S' and the explicitly contingent planned surplus E. Plan later using that residual and surplus. Clearly label surplus unavailable until the now plan is actually crafted. Do not recompute later against the original inventory. Reserve floor remains protected across both passes, not reapplied as a fresh deduction. If an alternative planner route changes, recompute both horizons together.

“Can craft now” is a separate executable simulation: process the chosen DAG from ingredients to outputs using real eligible stock, without treating missing-to-acquire quantities or future surplus as already owned. A target may be partially executable even when the whole plan is not. Crafting simulation never mutates inventory; recording a craft event atomically consumes inputs and adds actual yields once.

### Alternatives, cycles and advanced scope

- Alternative routes: pin selections, then validate the selected dependency graph. V1 comparison executes whole plans for a bounded number of alternatives and labels “best among these compared routes,” not “optimal.”
- Ingredient substitutions: normalize each permitted combination into an explicit route. Large combinations need an optimizer later; never sum all substitutes as if all were required.
- Cycles: run strongly connected component detection after route selection. Reject selected self-loops/cycles with the exact path and affected goals. Preserve import data for editing but disable the invalid plan. A cycle in unused alternatives need not block a valid selected route.
- Reusable tools: model as prerequisite availability, not consumptive ingredients; only introduce when supported by evidence. Their durability/charges require a different resource model.
- Multiple outputs/byproducts: v2 uses a general production network and shared inventory ledger. Flattening a two-output recipe into two independent recipes would double-count inputs or produce free output.
- Optional optimization model: nonnegative integer batch variables x_r and acquisition variables p_i with balance H_i + sum_r output_ir*x_r + p_i >= G_i + F_i + sum_r input_ir*x_r. Minimize user-chosen weighted acquisitions, then execution/capacity cost lexicographically. This balance is necessary but not sufficient for executable cyclic recipes; add sequencing/initial-resource feasibility or keep cycles forbidden. Capacity, station/unlock and time constraints must be explicit. Global balance alone cannot prove that an initially empty A→B→A production loop can start.

## Recommendation semantics

Return an advice object with item ID, eligible owned, inaccessible owned, allocated-now, missing-now, missing-later, protected quantity, reserve-refill deficit, personal pin, evidence status, context, pack hash and explanation traces.

Priority display, not mutually exclusive hidden flags:
1. **Pick up now: N** for missing current leaf requirements and/or protected-reserve refill, disclosing the separate components.
2. **Keep: N already owned** reserved for current goals or protected by policy. Do not describe all held stock as safe to sell if an unselected/blocked goal might need it.
3. **Later: N** additional demand after current reservations, with future unlock/horizon context.
4. **Always flagged** from the user's explicit policy, even when no current deficit; cap or capacity warning if configured.
5. **No tracked use** rather than “useless” or “safe to sell.” Unknown or incomplete data prevents stronger advice.

A locked objective is not silently discarded: show “later/locked,” its unlock prerequisite, and whether its items are included in a selected pre-collect plan. Item rarity and market value are evidence-backed metadata, never invented as a substitute for goals.

## Validation, migration and security

- Reject invalid UTF-8, oversized files, excessively deep nesting, duplicate object keys, duplicate IDs, missing references, non-finite/negative/fractional quantities, out-of-range safe integers, zero output yields, unknown required capabilities and invalid path references. JSON parsers normally overwrite duplicate keys; use a parser/validation stage that detects them before information is lost.
- Limits are exploratory here; use the canonical acceptance.md limits and benchmark them before shipping. Report the violated limit before replacing any data.
- Never execute strings, inline scripts, user formulas, HTML, arbitrary CSS, imported plugins, schema code or server URLs. Render names/notes as text. Reject prototype-pollution keys in objects later merged into application state; do not deep-merge untrusted objects into prototypes.
- Asset ingestion verifies extension, magic bytes, decoder success, dimensions, expanded byte limits and hash; allow PNG/JPEG/WebP initially, reject SVG/HTML and executable formats. Randomized internal IDs prevent filename collisions. Disallow absolute paths, `..`, symlinks and archive traversal; protect against zip bombs. A future server asset proxy needs SSRF protections, allowlisted destinations, redirects checks and private-network blocking.
- Automatic remote image loading can leak IP/referrer and expose arbitrary URLs; import should not fetch them by default. An explicit remote image flow explains destination, enforces HTTPS and image validation, and saves a local copy only with appropriate rights.
- License metadata is required for redistribution but does not establish legality. Keep original attribution and source; provide placeholders for unclear rights. Do not bundle scraped game artwork merely because it is publicly viewable. User-private imports and public redistribution have different review gates.
- Deterministic migrations are application-owned transforms `v1→v2`, not code supplied by a pack. Validate before and after, snapshot before migration, preserve source export, test idempotence at the wrapper level, and never mutate the original artifact. Unknown future major versions open in an explanation/export screen rather than best-effort destructive conversion.
- On pack updates, removed IDs create orphan records for review, not discarded inventory. Changed yields/recipe inputs recalculate advice only after acceptance. Renames need an explicit mapping; splits/merges require user reconciliation. Season reset rules must be source-backed and user-confirmed.

OWASP supports layered input validation and safe upload handling; the specific limits and pack rules here are design recommendations. [Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html), [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Local save, update/reload and sync

Write imported content, profile migration and active-pack pointer in one IndexedDB transaction; publish a successful save state only after completion. Keep previous revisions. Failure or quota exhaustion leaves the previous active revision usable and displays unsaved state. Multi-tab editors compare profile revision in the write transaction; stale saves produce a conflict dialog rather than silently winning. Database schema upgrades coordinate blocked tabs and close outdated connections. IndexedDB provides transactions, but an application must still handle storage failures and user/browser deletion. [IndexedDB standard](https://www.w3.org/TR/IndexedDB/), [MDN usage guidance](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB).

Reload means reading the committed snapshot, not fetching newer content automatically. Explicit “Check pack updates” downloads/stages a new snapshot, compares applicability and validates it. Cache app shell and supported pack assets for offline use, with a visible active version. Never mix a new schema reader with half-updated data after a service-worker update; test old-tab/new-tab interactions.

Optional sync model: each action has UUID, device ID, base revision and causal metadata. Pure note changes can merge by field. Inventory “set quantity” on two devices conflicts; never add two snapshots. An event ledger can deduplicate repeated event IDs, but independently recording the same physical pickup twice remains ambiguous and must be surfaced. Do not permit merged negative inventory. Tombstones prevent deleted goals from resurrecting. Personal data and private notes are excluded from public content-pack exports by default. No background public publishing.

## Algorithm and recovery test cases

1. Shared batches: beacon=1, tool=1, wire=3, cell=1, no boards → 1 board batch, no missing leaves, no surplus board. Separate per-goal result of 6 wires fails.
2. Shared shortage: same goals, wire=2, cell=1 → exactly 1 missing wire, not zero from separately reusing held wires.
3. Intermediate stock: same goals, board=1, wire=3, cell=1 → 1 board batch and 1 surplus board; held board reserved once.
4. Output stock: beacon=1 already owned, goal beacon=1 and tool=1, no ingredients → beacon demands no ingredients; tool requires a board batch (3 wire), surplus 1 board; no cell demand.
5. Yield rounding: board demand 3, yield 2, cost 3 wire → 2 batches, cost 6 wire, surplus 1.
6. Nested fork: two lead reviewers each need a shared intermediate that itself needs wire → merged intermediate demand is rounded once before wire expansion.
7. Consumed progress: goal requires 5 delivered cells and 3 are recorded delivered → demand 2; delivered cells cannot also remain available in stash.
8. Location: stash wire=3, carried wire=3, stash-only context → eligible wire=3, not 6. Confirmed extraction transfers carried 3 to stash 3 without changing total ownership 6; loss removes only exposed carried stock, preserving secured stock.
9. Protected floor: wire=4, floor=2, requirements=3 → usable 2, missing now 1, protected 2. Removing floor → missing 0 and leftover 1.
10. Later allocation: now needs wire=3, later needs wire=4, held=5 → now missing 0, later missing 2, not 0. Both horizons cannot claim the same 3 wires.
11. Selected cycle: A needs B and B needs A → diagnostic path, no infinite recursion, no valid plan label. Unselected cyclic alternative does not block valid selected route.
12. Alternatives: a route using wire versus a route using cells → only selected inputs appear; a route change recomputes all shared goals.
13. Duplicate import/event: same pack hash imports idempotently; same craft-event UUID does not consume ingredients twice.
14. Malicious pack: script-like name renders literal text, remote image causes no request, `../` bundle path fails, duplicate item IDs fail atomically.
15. Save failure: simulated quota/transaction failure leaves previous pack and profile unchanged; export remains available.
16. Migration: v1 fixture migrates deterministically, is validated, and source export remains recoverable; v99 is not silently coerced.
17. Reset: season profile copy/reset preserves old archive and user pins according to explicit preview; run reset cannot erase stash.
18. Capacity and unavailable context: insufficient station/unlock produces “blocked” with reason, not “craftable now.” Unsupported capacity data produces “capacity unknown,” not an invented guarantee.
19. Goal order invariant: permuting equal-priority input arrays does not change quantities; stable-ID tie-breaking preserves attribution. Changing priority can change attribution but should not arbitrarily increase total demand under the pinned-DAG assumptions.
20. Property tests: all quantities nonnegative; no allocation exceeds eligible stock; ingredient balances conserve; increasing stock never increases leaf deficits for fixed graph/goals; merging identical goals matches summed quantity; export/import preserves semantic state; cancelling a goal releases its reservations.

These are proposed test specifications, not executed implementation tests.

## Phased Spec-Kit plan and acceptance gates

Constitution principles: no fabricated game facts; no destructive imports; every recommendation traceable; offline personal data by default; no claim of optimality without proof; pack licenses respected; accessibility and reproducible tests required. Official Spec Kit describes the specify/clarify/plan/tasks cycle and consistency analysis; exact agent command spelling should match the installed integration. [Spec Kit](https://github.com/github/spec-kit), [workflow reference](https://github.github.com/spec-kit/reference/workflows.html).

### Phase 0: Data contract and provenance

Deliver spec, schema, fictional fixtures, unsupported-capability list and trust-state vocabulary. Accept when fixture validates, malformed examples report stable error paths, facts have evidence states, fictional mode is unmistakable, and no unsupported MW4 recipe is presented as verified. IDs and content/profile separation documented before UI work.

### Phase 1: Import, editing, save/export/reload

Deliver editor with text fields and structured quantity controls, staged import diff, local transactional persistence, placeholder images and complete backup export. Accept when offline edit→save→reload→export→reimport reproduces state, invalid pack cannot replace active data, duplicate imports are idempotent, asset references resolve or have clear errors, and save failures are visible. Include keyboard-only and small-screen tests.

### Phase 2: Correct single-route planner

Deliver shared DAG allocation, yield rounding, route selection, location scopes, current goals and explanation cards. Accept all tests 1–9, 11–12 and conservation properties. “Can craft now” must be proven by executable stock simulation. Planner result contains content hash and profile revision so stale results can be rejected.

### Phase 3: Pickup policies and lifecycle

Deliver future goals, protected reserves, always-flag pins, session carry/extraction/loss bookkeeping and scoped reset previews. Accept tests 10, 17–20, no silent deletion, and explanations that distinguish speculative future surplus from owned stock. Map integration uses a read-only query contract and never marks a pickup from merely viewing a location.

### Phase 4: Pack updates and trust pipeline

Deliver version diff, migration fixtures, orphan-ID handling, editorial evidence review, license gate and rollback. Accept tests 13–16 plus stale/mixed-version UI checks. Public contribution acceptance must not automatically promote unreviewed recipes to official status.

### Phase 5: Optional sync and advanced planning

Deliver conflict previews, deduplicated events, multiple devices, optional byproducts/substitution optimizer only if demanded by verified mechanics. Accept concurrent-edit, clock-skew, duplicate-event, offline/reconnect and negative-stock rejection tests. A solver must return feasible plan, objective, gap/time-limit status and user-readable explanation; timeout never becomes an unqualified optimal result.

Do not bundle all phases into one implementation ticket. Each spec should include observable user behavior, failure behavior, data invariants and tests before stack choices. Run the cross-artifact consistency check before implementation; keep content authoring separate from engine implementation.

## Open decisions requiring product judgment, not guesses

- Is “always pick up” a permanent personal pin, a target stock level, or both? Proposed default: both, separately visible.
- Is a goal “possess X,” “craft X,” or “turn in X”? These cannot share one ambiguous progress counter.
- Which game-proven inventory scopes and transfer/reset rules apply? Populate only from official evidence or clearly labeled observation.
- Can players edit verified base data directly? Proposed default: fork locally, preserve original provenance, mark edits as personal/unverified.
- Does the first release need cross-device sync? Proposed no; reliable export/import first.

## Roundtable reconciliation and official-mechanics correction

### Verified official context, checked directly

MW4/DMZ is confirmed, not speculative. The October 9 official FOB guide describes crafting, shared stash, deployed backpacks, secure-slot survival on failed exfil, printing to Operator or stash, recipe/ingredient tracking, and station upgrades. Its Medkit example costs 30 Chemicals, one Binding Catalyst and five Biomaterials. Valuables can serve upgrades as well as sale; field crafting is a trait. These support distinct resource/location/requirement types, not assumptions imported from older DMZ. [Official FOB guide](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide).

The October 19 progression article distinguishes DMZ progression and provides an unlock appendix. Its image descriptions say printer level 1, while the October 9 prose says level 2; extracted appendix starts with levels 1 and 2 before the printer entry, so table association needs visual confirmation. Do not resolve this by silently trusting newer alt text. Mark the unlock claim disputed until verified. [Official progression guide](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige).

Consequences: the design is a real MW4/DMZ planner; only generic test recipes and unsupported mechanics are fictional. The complete source-backed production dataset is a separate editorial deliverable. Add `modeId` and inventory `protection`/`operatorId` fields. Failure/loss removes exposed carried stock only, not secure-slot stock or stash. Track printing destination independently from ingredient eligibility; the guide does not by itself establish every ingredient consumption scope. Do not copy MP Prestige resets into DMZ profile rules.

### Accepted peer changes

- **Build-time public catalog, runtime private packs.** Accept precompiled trusted catalog for site speed, reject a build-only content system: user-imported and edited packs must work offline without redeployment. Trade-off: runtime schema validation remains necessary.
- **Maps are candidate locations, not guaranteed loot.** Add spawn kind, confidence, observed patch and verification date. Unknown locations differ from verified absence. A visited marker never increments inventory; explicit pickup quantity has undo and location selection.
- **Private needs remain private.** Goal filters compute locally. Sharing gets a sanitized preview; no hidden private goals/counts/notes in URL parameters or route titles. Spoiler policy applies to search, routes, exports and share previews. Trade-off: fewer automatic rich previews.
- **Account linking does not merge inventories.** Default snapshot import replaces a selected profile only after diff/backup. Do not sum snapshots. Event UUID deduplication applies only to actual event exports, not inferred pickups.
- **Separate map-coordinate migrations.** Image version and coordinate-transform version are distinct. Reprojection is reviewed; unresolved saved routes are held, never silently reinterpreted.
- **Mode-scoped state.** Campaign/story and DMZ progress have separate namespaces and reset policies.
- **Explicit reserve protection and confidence.** No aggressive liquidation action or “safe to sell” claim. Unknown recipes and blocked goals remain visible.

### Rejected or deferred approaches

- Reject per-goal inventory subtraction, per-goal batch rounding, latest-write-wins stash counts, name-based item matching, automatic remote asset fetch, imported executable formulas, arbitrary cyclic production, automatic season resets, and “no tracked use = worthless.”
- Defer global optimality, byproducts, mixing multiple recipes for the same item, reusable-tool durability, market-value liquidation, cross-device sync and authenticated community publishing. Extend only with evidence-backed mechanics and dedicated specifications.
- Do not assert that aggregate demand planning chooses the maximum number of achievable goals. It minimizes neither pickup travel nor starvation by itself. Priority is a translead reviewer user policy, not a score pretending to solve all objectives.

## Priority and edge-case addendum

### Two different outputs are required

1. **All-selected-goals demand plan:** the shared DAG method computes complete requirements, held reservations and missing leaves. This is a shopping/retention plan; it need not be feasible with current stock.
2. **Executable-now goal schedule:** process whole goals in user priority order against a separate real-stock ledger; recursively craft with pinned routes, holding changes in a trial transaction. Commit the simulated goal only if fully feasible. If blocked, default policy reserves its scarce inputs for that higher-priority goal; a clearly labeled “allow lower goals to use these” option can release them. Partial goal execution is opt-in and separately explained. Planned acquired inputs are never treated as actual stock.

Strict priority can starve lower goals. This is deliberate and visible: “2 cells protected for your first goal; lower goal could complete if you release them.” An optional work-conserving mode can skip blocked higher goals and execute lower ones, but must disclose changed reservations. Do not silently toggle these policies to make the completion count look better. The all-goals aggregate totals remain the same for a fixed graph; achievable-now and allocation attribution can differ.

### Additional acceptance fixtures

21. **Direct and nested use compete:** A requires one X, X requires two raw R; B directly requires one R; held R=2. All-goals demand is R=3 and deficit=1. Strict A-first schedule crafts A and blocks B; B-first consumes R=1 and blocks A. One physical R cannot satisfy both.
22. **High goal blocked elsewhere:** A requires X and missing Z; X costs R=2; B costs R=1; held R=2. Strict policy protects R for A and explains B's blockage; work-conserving mode may complete B but then A needs extra R. Neither policy is universally optimal.
23. **Batch surplus reused later:** A needs board1, yield2 costs wire3; later B needs board1. Now plan makes one batch, later consumes contingent surplus and needs zero additional wire. Before crafting, the board is “planned surplus,” not held.
24. **Upgrade consumes ingredients and unlocks a recipe:** Upgrade U costs R=3 and must complete before goal A costing R=2; held R=4. Total deficit R=1, with U→A execution dependency. Do not model the upgrade solely as a free boolean. A one-time upgrade already completed must not be charged again. Represent unlock objectives separately from item production nodes; detect cycles across both graphs.
25. **Reusable tool:** Two recipes require tool T as a nonconsumed prerequisite. Owning T=1 suffices for sequential use; do not demand T=2. If its durability is unknown, do not assume unlimited use; capability is unsupported pending explicit modeling.
26. **Same name, different quality:** Common R and Rare R have different IDs. Held Common R=10 cannot satisfy Rare R=1 unless an explicit verified conversion/substitution exists. Display-name dedup is a failure.
27. **Cash is a constrained noncraftable resource:** Bank cash=100, floor=40, upgrade costs80 → usable60, deficit20. Show a cash shortfall, not a loot-item pickup. Do not send cash to a POI filter or combine currency units with item counts. Cash earning locations remain suggestions only if evidence supports them.
28. **Unknown recipe:** Goal X has unknown ingredients. Mark the goal unresolved and advice incomplete; retain pinned ingredients and never claim all unlisted items safe to sell. A missing recipe does not mean zero ingredients.
29. **Secured inventory:** Backpack holds exposed R=2 and secured R=1; failed exfil loses only exposed2. Stash remains unchanged. Secure-slot eligibility/capacity must be validated against source-backed equipment facts; unavailable slot data produces a review warning.
30. **Station prerequisites:** A recipe needs station level2 and the user has level1. If upgrade costs are known and selected, expand them once as a prerequisite objective; otherwise show blocked with unknown upgrade requirements, not a fabricated ingredient list.

### Advice side by side, without misleading numeric scores

For the same item card show: “Need now: 1” (all-goals deficit), “Keep: 2” (already reserved), “Later: 3” (additional future demand), “Protected: 2” (personal reserve), and “Always flagged” (user pin). Every value has a drill-down to goals and the exact profile/pack revision. Do not add these labels into one pickup quantity: held reservations are already owned, protected stock may overlap the held total, and later requirements use the residual ledger.

For a blocked or uncertain route, “Collect now” changes to “Potentially needed: amount unknown” or “Plan incomplete,” with the missing fact. A sortable priority tuple can be `(current deficit > 0, explicit pin, goal priority, evidence confidence, stable item ID)`; call it an ordering policy, not a probability or mathematical value score. Rare-item scarcity should only modify ordering when sourced, and never override a user's protected priority invisibly.


## Screenshot evidence and typed game-effect contract

The screenshot peer directly observed separate bank-cash and four resource counters, named ingredient rows, and upgrade effects. These are evidence about the photographed player state, not defaults for a new user. The observed bank balance, recipe holdings and level progress must never seed a personal profile. The displayed MAX 50 label has unclear semantics and must not become a fabricated backpack-slot capacity. A Roman numeral on an upgrade does not prove a prerequisite edge. An obscured ingredient quantity remains uncertain.

Use a discriminated resource model:
- `item`: stable item ID plus quality/variant ID, integer quantity, location and protection; slot rules separate.
- `resource`: stable resource ID and integer amount; do not invent conversion to named ingredients.
- `currency`: currency ID and balance scope (e.g. bank versus carried if confirmed), integer minor unit, protected balance floor. Display currency, not collectible item count.
- `prerequisite`: station/category/player-level/unlock predicate, with source. Satisfying a gate is not consumption.
- `retainedTool`: availability predicate for a reusable object, not `inputs`; unknown durability disables guarantees.

Actions are discriminated too:
- `craftItem`: consumptive costs → item output and yield, destination choice.
- `upgrade`: consumptive costs → typed effects, once-only completion and prerequisites.
- `turnIn`: consumptive costs → objective progress.
- `transfer`: moves stock between locations, conserves total.
- `loss`: removes only eligible exposed stock.

Upgrade effects include `capacityDelta` with target category, `capacitySet`, `categoryUnlock`, and `unlockFlag`, never an item quantity. Screenshot observations such as +18 item-stash slots, +6 weapon-stash slots and +20 dog-tag storage belong to typed capacity effects, not recipe yields. Costs and gains may share a numeric display but differ in semantics. Validate that one-time completed upgrades cannot be charged twice, effects cannot accidentally multiply when a goal quantity changes, and unknown prerequisites are not silently assumed satisfied. A generic effect editor can be advanced-only; the ordinary form should label "Cost", "Requires", and "Unlocks/Improves" separately.

The design-pattern peer identified an existing planner with multi-recipe totals and local persistence. Therefore differentiation should be explainable eligibility and current/future reservations, reliable private edits/update diffs, and trustworthy lifecycle handling, not a claim that basic aggregation is novel. Competitive feature claims should cite that peer's directly reviewed evidence rather than be treated as independently verified here.
