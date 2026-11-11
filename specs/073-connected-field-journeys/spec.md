# Feature Specification: Connected field journeys

**Feature Branch**: `feat/071-ui-ux-implementation` (working tree; no branch switch)
**Created**: 2026-11-11
**Status**: Draft for review and implementation
**Input**: Implement the 20 functional and 20 design improvements proposed after reviewing the current DMZ guide.

## User Scenarios & Testing

### User Story 1 - Prepare a run (Priority: P1)

The player selects unfinished objectives, sees one next-run plan, checks stash and carried gear, reserves supplies, and opens a map/key route. **Independent test**: create a plan with a mission, craft target and locked location; verify shortages, access warnings and return links without altering inventory.

### User Story 2 - Reconcile a run (Priority: P1)

After play, the player reviews observed loot, consumed stock, discoveries, boss results and progress in one queue before each owning tracker saves. **Independent test**: stage mixed edits, reject one, confirm the rest, reload and inspect history; failed save retains a recoverable draft.

### User Story 3 - Trust the reference (Priority: P2)

The player sees why each recommendation exists, what is uncertain, what changed at a source, and where map coverage is incomplete. **Independent test**: a synthetic changed source produces an impact preview, unresolved claims stay marked, and unknown positions remain unplotted.

### User Story 4 - Track missions and encounters (Priority: P2)

The player can navigate every recorded Orders page, follow a story mission's requirements, and log dated boss encounters. **Independent test**: link an incomplete mission to items/locations, record an encounter, and verify incomplete catalog pages are labelled without invented objectives.

### User Story 5 - Test weapons and import future data (Priority: P3)

The player records comparable DMZ weapon observations and can preview a bounded player-data import if Activision later supplies an approved export. **Independent test**: incompatible measurements remain separate; unsupported fields never modify a profile.

### User Story 6 - Use a consistent interface (Priority: P1)

The player can move among guide and map tasks without losing selection, focus, saved values or context. **Independent test**: use keyboard and pointer at narrow/short/wide layouts, open rows and markers, edit counts, return, and find the same state.

### Edge Cases

- Unrecorded game facts and missing coordinates remain unknown; no completeness percentage is inferred.
- Competing plans cannot both spend the same reserved stash quantity.
- Reservation priority follows a visible player-controlled plan order. Unknown stock cannot be allocated. Changing priority previews which plans become short.
- A multi-owner after-run review may partially save. The UI must show saved receipts and leave unsaved rows staged; it must never replay saved rows automatically.
- Cross-origin handoffs may fail or be declined; both apps retain their prior saved state.
- Multiple tabs, storage denial, malformed imports, stale catalog IDs and changed source revisions preserve drafts and require review.
- Map popups and movable panels remain operable without dragging; focus never lands behind a panel.

## Requirements

### Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-001 | Provide a dated, editable next-run plan combining selected missions, upgrades, item goals, keys and map stops. |
| FR-002 | Compare the plan with recorded stash/carried stock and show missing supplies without assuming unknown stock is zero. |
| FR-003 | Stage after-run stock, discovery, boss and progress reports together, then preview and save to their existing owners. |
| FR-004 | Transfer an explicit reviewed objective context between Guide and map, with return links and refusal recovery. |
| FR-005 | Derive a deduplicated key/access packing list from selected route stops and recorded dependency chains. |
| FR-006 | Show exact recorded prerequisite chains among objectives, keys, items and upgrades; label unsupported links. |
| FR-007 | Save multiple named collection plans with independent selections and revisions. |
| FR-008 | Reserve stock for one selected plan and explain competing allocations without mutating inventory. |
| FR-009 | Surface unresolved costs, recipes, positions and conflicting source claims in an actionable review queue. |
| FR-010 | Attach bounded private evidence to a specific player observation and keep it separate from public claims. |
| FR-011 | Preview the effects of a reviewed source change on saved plans before applying it. |
| FR-012 | Report positioned, grid-only and unlocated map records by source/category with explicit scope. |
| FR-013 | Display dated source reports and private observations on one location timeline with distinct authority. |
| FR-014 | Flag recorded key, floor and road-gap constraints for each route stop. |
| FR-015 | Show all recorded Orders pages in sequence and mark missing pages as unrecorded rather than complete. |
| FR-016 | Show one story mission workspace with recorded steps, items, map areas, evidence and completion. |
| FR-017 | Record dated boss attempts, kills, tags and optional notes without automatically changing game state. |
| FR-018 | Capture DMZ weapon measurements with armor/range/build/target/version context and refuse incompatible aggregation. |
| FR-019 | Show the last successful backup and included private workspaces without reading unrelated files. |
| FR-020 | Define a bounded read-only player-data import preview; do not enable live account sync without an approved contract. |

### Design Requirements

| ID | Requirement |
| --- | --- |
| DR-001 | Guide pages share heading, actions, breadcrumbs and bounded content width. |
| DR-002 | Navigation exposes prepare, play and review tasks within existing hubs. |
| DR-003 | Current pack, workspace, filters and save status use a compact context strip. |
| DR-004 | Directories share search, filter, sort, row action and empty-state conventions. |
| DR-005 | Each page gives one clearly prioritized next action. |
| DR-006 | Summary and immediate decisions precede expandable evidence. |
| DR-007 | Row/marker details persist until explicitly changed or dismissed. |
| DR-008 | A task uses one primary scrolling region, avoiding nested cell scrollers. |
| DR-009 | Narrow layouts retain name, quantity/status and action; secondary fields expand. |
| DR-010 | Covered, short, unknown, reported and verified labels have consistent meaning. |
| DR-011 | Status always includes text or icon alongside color. |
| DR-012 | Numeric columns align and format quantities/units consistently. |
| DR-013 | Editing and saving a row does not move its action target unexpectedly. |
| DR-014 | Map controls collapse to a reopenable dock while preserving selection. |
| DR-015 | Movable map panels stay inside the viewport and do not cover the active detail. |
| DR-016 | Brief popovers and consequential dialogs use consistent behavior. |
| DR-017 | Keyboard focus, target size and non-drag alternatives meet the documented accessibility targets. |
| DR-018 | Reduced-motion preference suppresses nonessential transitions. |
| DR-019 | Empty/error states identify cause and next recoverable action. |
| DR-020 | Shared semantic spacing/type/surface/status tokens span Guide and map adapters. |

### Key Entities

- **Run plan**: owner-local selected objectives, route stops, stock reservations, date and revision.
- **Run review**: staged changes by owning workspace with individual approval and recovery state.
- **Evidence link**: private observation or sourced claim reference with date and scope.
- **Import preview**: bounded untrusted external rows mapped to known catalog IDs; never directly applied.

## Success Criteria

- **SC-001**: A user can assemble, reopen and edit a mixed next-run plan without changing saved inventory or progress.
- **SC-002**: Every confirmed after-run mutation has an owning tracker, preview and recoverable error path.
- **SC-003**: Every proposed recommendation is traceable to an objective or source; unknown data never becomes a zero, unlocked state or map pin.
- **SC-004**: The six story journeys pass keyboard and pointer checks at 320, 390, 768, 1280 and 1920 CSS pixels plus short landscape height.
- **SC-005**: Selection and entered values survive popover/panel changes and save feedback in browser tests.
- **SC-006**: No account credentials, session tokens, private screenshots or player identifiers enter the public repository or test fixtures.

## Assumptions

All player data remains local and opt-in. Existing domain stores remain the source of truth. No approved Activision API contract or complete DMZ catalog is assumed. Existing map and Guide origins remain separate until an explicit reviewed handoff. This feature adds behavior incrementally; no current source rights or private asset boundaries change.
