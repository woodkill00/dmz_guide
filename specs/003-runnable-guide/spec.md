# Feature Specification: Runnable guide foundation

**Feature Branch**: `003-runnable-guide`
**Created**: 2026-10-21
**Status**: Specified, pending independent requirements review
**Input**: Continue building the complete functional multipage DMZ Guide. This first implementation increment covers S0–S2; 004 shared planning, 005 editor/packs, 006 locations, 007 progression and 008 community/release remain committed follow-on slices, not omissions.

## User Scenarios & Testing

### User Story 1 - Find trustworthy content (Priority: P1)
A reader opens the guide, searches items, weapons, recipes or guides, and reads a stable detail page with provenance and unknowns.
**Why this priority**: Reliable reading is useful without any private profile.
**Independent Test**: With scripting disabled, all seeded detail pages remain readable and linked.
**Acceptance Scenarios**:
1. Given a seeded record, when opening its detail URL, then name, description, type, version, verification state and sources are visible.
2. Given a search term or category with no matches, when searching, then an explicit empty state and clear-filter action appear.
3. Given a fictional example, when viewing it, then a persistent fictional-fixture label distinguishes it from verified game facts.

### User Story 2 - Plan one goal privately (Priority: P2)
A player enters owned quantities and selects one goal to see shortages, retained tools and prerequisites without pretending to change the game.
**Why this priority**: Turns reference content into an actionable checklist.
**Independent Test**: Select the fixture goal, change owned inputs, reload and see identical shortages.
**Acceptance Scenarios**:
1. Given owned input below cost, when planning, then the shortage equals demand minus eligible owned stock and reserve.
2. Given locked or unknown prerequisites, when all materials are owned, then the goal is not certified executable now.
3. Given a completion toggle, when changing it, then inventory is unchanged.

### User Story 3 - Keep and recover local progress (Priority: P3)
A player exports and previews a private backup and can recover from invalid data, storage errors or reset.
**Why this priority**: Local state must remain portable and safe.
**Independent Test**: Export, reset with confirmation, preview restore and recover equivalent inventory and goal selection.
**Acceptance Scenarios**:
1. Given malformed, oversized, future-version or invalid quantities, when importing, then state remains unchanged and an actionable error appears.
2. Given an older saved revision in another tab, when saving, then overwrite is blocked and reload/recovery is offered.
3. Given storage unavailable, when editing, then a visible unsaved warning and export remain available.

### Edge Cases
Blank search; hostile text; invalid references; selected-route cycles; zero/null values; stale or disputed facts; absent image; denied storage/quota; conflicting tab revision; retired content IDs; deep URL reload; no network after prior cache; 320px layout.

## Requirements
### Functional Requirements
- **F003-01**: Provide independently navigable readable home, catalog, item, weapon, recipe and guide routes, with keyboard-accessible navigation and stable detail URLs. Preserve search/filter context in the URL.
- **F003-02**: Show sources, build/mode, content version, reviewed date and uncertainty. Display unknown statistics as unknown, not zero. Separate fixtures from verified content and label original illustrative assets.
- **F003-03**: Keep local inventory, reserves, goal and progression separate from public content. Bound quantities to whole values 0–1,000,000; unknown IDs must be preserved in a recovery report, not silently dropped.
- **F003-04**: Calculate one-goal consumable shortages and retained-tool checks; detect invalid references and cycles before planning. Show locked/unknown gates, currency units and executable-now separately from future requirements. Completion never consumes inventory.
- **F003-05**: Show saved/unsaved state, backup export, staged restore with changes before apply, explicit reset confirmation and recovery. Reject unsupported versions and stale concurrent revisions without losing the previous valid state.
- **F003-06**: Default dark with persisted light choice; visible focus, reduced motion, non-color labels, 44px primary controls, no horizontal page overflow at 320px. Provide semantic reading without scripting.
- **F003-07**: Run locally with documented simple commands, emit static deployable output without paid services, and disclose offline availability rather than imply universal caching.
- **F003-08**: Include automated domain/import/property tests, route/link checks, browser reload/recovery/keyboard checks and desktop/mobile screenshot review. Independent reviewer acceptance and exact-head/main CI required before completion.

### Key Entities
Content pack and provenance; item/weapon/stat with unit; recipe and objective with typed costs and prerequisite references; private profile with revision, content binding, quantities and completion states. Public content exports cannot include player state.

## Success Criteria
### Measurable Outcomes
- **SC003-01**: Every seeded public record has a readable direct URL and provenance/fixture label, verified without scripting.
- **SC003-02**: All conservation and malformed-profile cases pass; a 100-operation deterministic test never produces negative allocations or overcounts owned inventory.
- **SC003-03**: Backup round trip preserves all supported private fields and unknown-ID recovery, while all invalid-import cases preserve prior state.
- **SC003-04**: No broken internal routes, browser console errors or page overflow in tested desktop and 320/390px emulated views. Report emulation honestly, not physical-device certification.
- **SC003-05**: Initial guide scripting stays under 200 KiB compressed and HTML/CSS/text under 350 KiB; report measured lab performance separately from unmeasured field metrics.

## Assumptions
No account, cloud sync, telemetry, gameplay automation, hosting, credentials or new external service. Build-specific missing facts remain unknown. Manual owned stock uses one explicitly local planning pool until game pool semantics are verified. The Discord destination remains unset until supplied. S0–S2 provides first usable increment, not final requested scope.

## Clarifications
### Session 2026-10-21
No new user questions required: the approved baseline already distinguishes unknown gates, retained tools, private manual state and fixture provenance. Framework choice is a reversible engineering decision assigned to the plan. Integration, privacy, roles, scope and completion categories are clear; external data breadth remains explicitly limited.

### Clarified safety and planning boundaries
- Profile input maximum: 1 MiB UTF-8, depth 12, 20,000 object keys/nodes, 100 goals, 10,000 inventory/reserve/completion references each, 2,000 characters per string. Reject dangerous property names (__proto__, prototype, constructor), non-finite/fractional/negative quantities, unsupported format versions and invalid IDs. No backup URL fields or executable content.
- Restore cancellation changes nothing; applying commits the entire staged validated snapshot in one transaction while retaining the previous snapshot. Quota/storage failure preserves persisted data and in-memory edits with an unsaved warning and export. Stale tab revisions block overwrite.
- A contentVersion mismatch is visible and blocks planning until the user previews and explicitly rebinds; known stable IDs retain quantities, unmatched IDs are retained as unresolved references and exportable. No cross-pack or cross-mode joins.
- A recipe goal selects one explicit recipe ID and target output quantity. Batches round up target/yield; projected surplus is not owned stock. Retained tools are checked against protected available stock but never consumed, and their requirement does not multiply by batch. Currency stock stays in its own item/unit ledger. Unknown ingredient set, input-pool eligibility, disputed prerequisite or scope mismatch cannot certify ready even if manual stock suffices. Unsupported intermediate routes must be visibly blocked rather than guessed.
- Accessibility acceptance includes 200% text zoom without lost controls/content; normal text contrast >=4.5:1, large text and meaningful UI boundaries >=3:1 in both themes; error/status updates use polite live regions, field errors identify labels, keyboard focus stays visible and moves to the error summary after failed submit.
- Missing pictures retain descriptive alt/fallback text and never remove record information. Invalid routes serve an explicit 404 page with catalog/home links, not unrelated home content. Uncached offline routes honestly report unavailable; no claim of first-visit offline operation.
- Reset clears only the selected private profile after explicit confirmation, retains a recoverable prior snapshot and never deletes content packs. Recovery restores that snapshot with a new revision. If the same item is both consumed and retained, consumed allocation must leave the retained quantity untouched; one owned tool cannot satisfy both simultaneously.
