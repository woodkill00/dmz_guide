# Feature Specification: Weapon acquisition checklist

**Feature Branch**: `feat/088-weapon-acquisition`
**Created**: 2026-11-17
**Status**: Implemented and locally verified; see acceptance.md and reviewer-owned implementation checklist.
**Input**: Populate weapon/blueprint acquisition from web references and track three extractions per weapon for the camo.

## User Scenarios & Testing

2026-11-19 owner display amendment: color each weapon name on `/armory/acquisition/` red when manual ownership is unchecked and the recorded extraction count is0; yellow for recorded1–2 or an owned manual with recorded0; green for3or more. Unrecorded counts remain unrecorded/neutral, with no count inferred from ownership alone. Owner clarification2026-11-20 explicitly makes owned-manual/0 yellow. Keep existing count/ownership text as non-color status. Update immediately after successful counter/ownership changes and after reload, with readable dark/light colors and no storage/schema migration.

### US1 — Track manuals and extraction progress (P1)
Players open a compact class-grouped weapon checklist, mark manual ownership and increase/decrease recorded Weapon Manual extractions toward a three-extraction War Spoils goal. Each weapon opens its own checklist/detail section and retains the same state after returning.
Acceptance: an old owned-manual record shows extraction count Not recorded, never an invented one or three. Purchased unlocks do not increment extracted counts. Zero, one, two and three have distinct text, with three labelled tracked goal reached rather than game-verified reward ownership. Counter correction cannot remove other saved data. All sourced released weapons are present; upcoming weapons remain excluded.

### US2 — Track named blueprints (P1)
Players see researched named blueprints with weapon, source, acquisition method, source date and ownership checkboxes; expand a weapon to read and mark its list. Search covers weapon and blueprint names. Custom names remain available for unlisted blueprints.
Acceptance: known names already present in private records appear owned; adding a known/custom duplicate name does not create another identity. Distinct documented variants remain distinct. No sourced list is called a complete live game catalog when coverage is unknown. Looted LT loadouts are not invented as permanent blueprint unlocks.

### US3 — Move between trackers safely (P1)
Players use a main acquisition page from shared navigation, dashboard and weapon pages. Counts share the existing private armory data with the workbench. Desktop/mobile users save without menus jumping, can filter unfinished camo goals or unmarked manuals/blueprints, and recover failed edits using existing backups.
Acceptance: stock, builds, screenshots and unrelated acquisition entries remain unchanged by a checkbox/counter edit. Stale-tab writes fail without overwriting current storage. Unsaved candidate is retained for export/retry/reload. No collection, remote fetch or account access occurs during normal site use.

### Edge cases
Absent versus zero extraction counts; legacy checked manuals with unknown extraction count; purchased weapon unlocks; multiple same-name blueprints on different weapons; variants; archived weapon IDs; invalid/excessive counts; denied/corrupt storage; rapid double activation; another tab saving; quota errors; missing artwork; empty search; 320px and 200% text zoom; keyboard-only use; public catalog update preserving private names and IDs.

## Requirements
- **FR-001** Add a focused acquisition destination with links from shared feature navigation, Home dashboard and armory pages; retain existing workbench and its saved data.
- **FR-002** Publish a bounded, source-attributed acquisition catalog of released weapon identities and researched blueprint names/methods. Include the launch roster and confirmed released Season1 weapons. Display snapshot date/coverage and per-source evidence; no fabricated damage stats or implied complete storefront inventory.
- **FR-003** Group weapons by class with alphabetical names, independent expandable rows, stable counters/checklist controls and compact image/fallback indicators. Support weapon/blueprint search, class and status filters, reset and empty result feedback.
- **FR-004** Track manual ownership separately from recorded manual extractions. Optional absent count means Not recorded. Permit explicit whole-number correction from0 through9999 and +/- controls, retain totals beyond3 and show progress toward3. No automatic counter inference from ownership or named blueprints.
- **FR-005** Explain the manual-versus-weapon-versus-blueprint distinction and attribute the community-reported three-extraction camo goal. Do not auto-grant a camo or unlock, promise drops or infer manual applicability from disputed global totals.
- **FR-006** Known blueprint checkboxes and custom name controls reuse saved owned blueprint names. Match names case-insensitively after trimming/collapsing spaces; preserve unrelated custom/archived data and documented variant distinctions. Show owned/known-in-snapshot counts with coverage qualifiers.
- **FR-007** Extend existing private armory validation without rewriting legacy workspaces on load. Accept bounded optional extraction metadata; reject malformed counts/unknown extra fields. Keep existing transaction revision CAS, previous snapshot, import/export validation and data caps. Old backups remain accepted; expanded records export/restore losslessly.
- **FR-008** Serialize saves, disable mutable controls while pending and keep successful updates focus/scroll/expansion stable. On stale/quota/denied failures keep the unsaved candidate and permit explicit export/retry/reload; never silently reset player data or blindly replay an uncertain delta. Refresh clean state on visible return without overwriting dirty edits.
- **FR-009** Dashboard displays recorded extraction progress and links to focused acquisition. Existing workbench edits preserve new optional fields; no separate competing extraction store.
- **FR-010** Responsive dark/light UI, keyboard-visible focus, textual states, minimum24px targets/44px primary actions, no horizontal overflow at320px/200% text. No external artwork fetches or new asset downloads; use existing safe local weapon art or labelled fallback.
- **FR-011** Normal build/read/test is offline with respect to sources. Capture only inert reviewed facts, source URLs/dates and research decisions. Document catalog maintenance and private backup/recovery. Verify validators, legacy storage, duplicate handling, stale/quota failures, browser journeys, navigation, counts and accessibility.

## Key Entities
Acquisition catalog snapshot; released weapon; named blueprint and acquisition method; source/evidence; private acquired record; recorded manual extraction count; three-extraction progress; revision-bound retained edit.

## Success Criteria
- **SC-001** Every weapon in the published released roster has a reachable checklist and extraction controls; each sourced named blueprint maps to exactly one weapon/variant identity.
- **SC-002** Counter sequence0→1→2→3→2 persists exactly after reload and workbench edits; legacy unknown stays unknown until explicitly entered. No unrelated stock/progression data changes.
- **SC-003** Existing/custom blueprint ownership matches the known checklist without new duplicates; stale and failed saves retain a recoverable candidate and do not replace current storage.
- **SC-004** Three-browser keyboard and320/390/768/1280/1920/200%-text journeys have no overflow or disappearing details; seeded dark/light accessibility checks have no violations.
- **SC-005** Independent analysis/review has no unresolved blocker and documented repository/runtime/build/format/affected-browser checks pass.

## Assumptions and scope
The user's camo request refers to War Spoils Weapon Manual extractions, not extracted gun instances. The total3 requirement is reported by community/press sources and remains labelled; one source says three more, which is recorded as a discrepancy rather than silently converted into an official fact. Manual ownership may be granted through purchases, independently of extractions. Public named blueprint coverage is snapshot-limited and updateable; all researched entries are included, not a claim to know every current or future storefront offer. No game-account synchronization, automatic detection, purchases, broad camo challenge tracker or invented weapon stats.

## Clarification decisions
No user question is required for the manual/camo ambiguity: follow the supported three-manual player record and label its reported scope and differing secondary wording. No weapon extraction is counted automatically. Known blueprint coverage is a dated reference snapshot and per-weapon not-marked ownership; custom entries allow later correction. Melee is a released weapon identity with manual/camo applicability explicitly unverified, not counted as a guaranteed manual unlock.

## Dashboard amendment — user request
The Home section is now titled **Weapons**, with its heading linking to the canonical main weapons hub `/dmz-weapons/`. Show known-roster weapons whose manual is not marked collected or whose recorded manual extractions have not reached3, including weapons without a saved acquisition entry. Show how many recorded extractions remain to3, with unknown legacy counts labelled rather than inferred from ownership. No blueprint names or attachment totals appear in this dashboard section; their detailed checklist remains on the acquisition page. Fully collected manuals with3+ recorded extractions leave the outstanding preview. Blocked/unavailable storage is never treated as an empty record. This supersedes the older blueprint-summary dashboard wording in087/088 FR-009.
