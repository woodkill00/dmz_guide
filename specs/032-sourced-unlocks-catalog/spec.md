# Feature Specification: Sourced upgrades and unlocks

**Feature Branch**: `032-sourced-unlocks-catalog`
**Created**: 2026-10-28
**Status**: Local implementation reviewed; browser/visual verification pending
**Input**: Add the three user-selected Detonated pages as a factual basis for items, upgrades, unlocks and rewards.

## User Scenarios & Testing

### US 1 — Find remaining FOB materials (P 1)
A returning player keeps their existing progress and can inspect the additional source-reported upgrade tiers and known item needs.
- Given the existing eight observations, expanding the catalog preserves their identifiers, original evidence and prior spending snapshots without duplicate tiers.
- Given an unknown cash price, the requirement reads unknown and a new purchase cannot deduct only known materials as a complete purchase.
- Given the source-reference dataset, its aggregate equals the independently recomputed per-tier amounts. Personal Keep/Search remains partial or withheld for unknown consumption/evidence; completing a tier removes only that tier from the remaining-needs scope.

### US 2 — Understand unlock routes (P 1)
A player finds reported level, story, Order and looted recipe unlock conditions separately from unprovided crafting costs.
- The listed recipe identities have searchable unlock records with attributed routes, not executable zero-cost recipes.
- Multiple routes remain separate source claims, never an invented all-required dependency. UAV's contradictory loot-only wording is disputed.
- Level rewards distinguish recipe unlocks from awarded consumables; tracking a milestone does not manufacture inventory or completed upgrades.

### US 3 — Review evidence and retain progress (P 1)
A player can follow the three source links, distinguish source reports from observations and inspect gaps.
- Existing profile rebind preserves inventory, completions, operation identity and spending; no automatic grants or historical spending are created.
- An already-recorded purchase of Vendor I or MIA III remains immutable and reversible under existing safeguards, even after adding an unknown cash row.

### Edge cases
Unknown cash (eight definitions), unknown consumption on newly reported tiers, absent crafting costs/yields, unspecified level 40/54 rewards, ambiguous Simone reward, duplicate UAV/NVG routes, article completeness claims, source/build mismatch, old private profile binding, repeated purchase after update, spoiler-sensitive story routes.

## Requirements
- **FR-001**: Include all 28 listed FOB definitions exactly once, preserving the eight original IDs and 31 observed requirement rows; any added rows carry new attribution.
- **FR-002**: Include 37 distinct noncash upgrade labels and all 95 known rows (75 material,20 cash) plus eight explicit null cash rows. Keep source totals separate from personal remaining requirements.
- **FR-003**: Preserve original observed consumption evidence only for its scoped 31 rows; newly reported consumption remains unknown. Unknown/disputed evidence must block purchase recording.
- **FR-004**: Provide 75 unique recipe-unlock identities with 77 source route entries (25 level,2 story,4 Order,46 loot); expose alternatives/contradictions without fabricated craft costs, yields or executable recipes.
- **FR-005**: Represent the 69 listed milestones (levels 2–70) and 90 reward entries with their type and explicit uncertainty. Do not invent a level 1 reward or identities for unspecified bundles.
- **FR-006**: Attribute every added factual record to the relevant dated source; retain original observations, safe source links and unverified build applicability. No article prose/images or private state enter content.
- **FR-007**: Preserve pack identity/game scope, all existing entity IDs and immutable spending snapshots through explicit content rebind. No automatic grants, retroactive debit, or duplicate purchase.
- **FR-008**: Make additions usable through existing catalog, item detail, progression and guide routes with source/conflict visibility; new unlocks and level milestones use the progression track and remain manual progress records, never upgrade-purchase targets. Story-sensitive unlock objectives are spoiler protected; ordinary item descriptions contain no mission names.
- **FR-009**: Preserve source spelling ambiguities and distinguish station progression rewards from numbered purchased tiers; no inferred prerequisites or automatic unlock effects.

## Key entities
Source report, item, FOB upgrade requirement, recipe unlock, DMZ level milestone, field claim, guide, private profile and immutable purchase event.

## Assumptions and exclusions
This is a bounded content expansion using current catalog contracts. The sources are community reports, not official or current-game verification. Existing pack identity is retained for player continuity, with individually attributed evidence. The eight original observations do not independently prove all new content's compatibility. New schema, automatic level logic, crafting simulation, locations, images, live game sync, public deployment and merged publication are outside scope. Public branch/PR permission is handled separately by the parent.

## Success Criteria
- **SC-001**: The full listed coverage and recomputed 889 material units/2,840,000 known cash match source facts; total cash remains explicitly incomplete.
- **SC-002**: All existing IDs and original observation rows survive; old purchase events round-trip unchanged and unknown-price recording is rejected without mutation.
- **SC-003**: Players can find an upgrade, an item, a recipe route and a level reward with source links and uncertainty on desktop/mobile.
- **SC-004**: Schema/repository/runtime/build checks and focused browser journeys pass, with actual failures/unavailable stages recorded; independent data and implementation review pass before completion.
