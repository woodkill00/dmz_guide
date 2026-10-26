# Data model and migration

These are the reviewed contracts implemented by the current candidate; acceptance evidence is tracked separately. Namespaced stable IDs follow the existing `prefix:value` pattern, maximum 100 characters. Display text and imported data remain inert. Existing pack limits (8MiB portable JSON, 20,000 total records, depth16, 150,000 nodes), profile limits (1MiB, depth12, 20,000 nodes) and per-map reference cap10,000 remain enforced. New fields count against the same limits; no limit is silently raised.

## Public definition layer

### EvidenceReference (pack v2 source)

- Existing source identity, title, type, review timestamp and support statement retained.
- `provenance.kind`: `web` or `private-observation`; `url` is safe HTTP(S) for web, nullable for private-observation. Non-null private-observation URL, if provided, must be a clearly labeled public transcription, not an invented original.
- `observationKey`: public-safe stable key, <=100 characters; no file ID, source hash or path. `captureDate`: ISO date or null. `reviewedAt`: ISO date. `buildStatus`: `known` or `unknown`. `lineageKey`: <=100 characters, tracks the same observation across transcription reviews.
- Private pixels/identity mapping remain outside public pack/export. No renderer fetches a private reference. Unknown build is an explicit scope identity; it does not wildcard-match every build.

### UpgradeDefinition (existing objective, pack v2)

Existing `id`, `name`, `track: dmz-upgrade`, `description`, `oneTime:true`, evidence IDs, status, effects and scope retained. New `upgrade` metadata contains `tierLabel` (nullable text, <=20 characters), `prerequisiteStatus` (`known` or `unknown`) and observation keys. `prerequisites` holds only evidenced edges; empty with unknown status does not assert none. An effect “capacity to” is distinct from “capacity by”; source text remains available and discounts are not accumulated by tier.

### Requirement (v2)

`itemId`; `quantity`: positive safe integer <=1,000,000 or null; `consumption`: `consumed`, `retained` or `unknown`; evidence status and source IDs. Null quantity is unknown, not a zero-cost row. Currency remains an item of kind currency/unit dmz-cash; physical items use count. V1 Boolean consumed maps to known consumed/retained only for legacy records under their existing scope; it cannot certify newly observed rows. Disputed quantity alternatives stay as claims, not two simultaneous costs.

### Catalog compatibility

Pack v1 stays readable unchanged. V2 normalization is in memory; no automatic disk rewrite. All content loaders, validators, Studio controller (including advanced JSON), guided editors, server author boundary, portable import/export and renderers must preserve v2 fields. Validate load→guided edit→advanced JSON edit→save→server restart→export/reimport for v1 and v2; no downgrade or field stripping. Unknown semantics do not enter legacy arithmetic: numeric evaluation requires an explicit validated planning projection. The implementation adds no original screenshot assets. Candidate observed pack identity is `observed:upgrade-review-20261026`, content version `2026.10.26.1`, build `unknown-observed-snapshot-20261026` (review identity, not capture date); game identity is labeled user-context/unverified. Reuse an existing equivalent pack if one is present at implementation kickoff. Do not use an existing official pack's inventory or progress automatically.

## Private profile layer (schema v2)

Retain existing id/packId/contentVersion/revision/inventory/reserves/goals/spoilers/routes and generic non-upgrade completion. Add:

- `upgradeProgress`: map of upgrade ID to `{completion, availability, reviewRequired, legacyState?}`. Completion enum `unknown|incomplete|completed`; availability enum `unknown|locked|available`; reviewRequired Boolean. Optional legacyState is one of the four existing v1 completion labels and is archival only. Maximum10,000 entries. Omitted upgrade equals unknown/unknown and not marked complete.
- `watchPins`: unique item-ID array, maximum1,000 entries. A pin has no numeric stock value, expires only on explicit removal, and is not a game fact. Existing reserves remain quantitative and independent.

Inventory/reserves remain integer0..1,000,000 maps. Missing inventory key means not entered for new advice; present0 means the player explicitly entered zero. No source numerator seeds either map. Allocation does not alter them. Inventory UI renders absent entries as blank with “Not entered”; explicit0 differs from absence and is dirty even if an older display rendered0. Clear/unset removes only that inventory key on successful save, not reserves or other fields. Draft state tracks property presence and value; cancel/reload/paging retain the correct distinction and a failed save retains the draft.

### V1 → V2 preview

For IDs that resolve as dmz-upgrade in the selected compatible pack: completed→completed/unknown; locked→unknown/locked; unknown→unknown/unknown; unlocked→unknown/unknown with reviewRequired true. Preserve original legacyState on each migrated entry. Move these IDs out of active generic completion to avoid two authorities; other completion entries remain unchanged. Unknown/unresolved IDs remain preserved and reviewable, not dropped or guessed to be upgrades. No earlier-tier completion is inferred. Migration preview shows affected counts, unresolved IDs, ambiguity and backup option; one CAS commit changes the full profile only after confirmation, retaining the original recoverable snapshot. Repeating migration is idempotent. A cancelled/failed migration changes nothing.

Content rebind never silently completes a newly added tier. Stable completed IDs retain completion; changed requirement evidence/costs flags content review without revoking historical completion. Removed IDs stay recoverable in the existing unresolved-reference flow; do not reassign them by display-name similarity. Content version mismatch blocks advice until preview/rebind.

## Derived layer (not persisted as player facts)

Advice result includes pack/content/profile revision, scope `all-known-incomplete|focused`, included/excluded/unknown counts, coverage note, typed reasons and per-item rows. Each row retains contributing upgrade IDs, known required values, unit, inventory-entry status, reserve, held stock, upgradeGap, reserveGap, Keep/Search (number or null), horizon and uncertainty. Known-direct-cost numbers carry `coverageBasis: known-direct-requirements` and completeness `complete-for-listed-costs|partial`; unknown prerequisite/build facts add explicit warnings and suppress readiness, not valid listed-cost arithmetic. Search includes unfilled fixed reserves separately from upgrade demand. Advisory rows never expand crafting routes. Null recommendation quantities mean blocked/unknown, never zero. Advisory root set and simulated allocations are transient and must not mutate focus goals, inventory or completion.

Budget: <=20,000 pack records, <=500,000 explicit traversal/allocation work steps, safe aggregate <=10^12, finite integers. Advisory selection can exceed100 roots only within those bounds; executable scheduling and persisted goals still cap100. Batching separate100-goal plans and summing them is forbidden because it would reuse stock and prerequisites.
