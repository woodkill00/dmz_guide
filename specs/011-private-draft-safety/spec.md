# Feature Specification: Protect private inventory drafts

**Feature Branch**: `011-private-draft-safety`
**Created**: 2026-10-22
**Status**: Draft, pending independent requirements review
**Input**: Approved roundtable Wave 1 workpackage 1: C1, C3, U1, U11 and save-state portion of U10.

## User Scenarios & Testing

### User Story 1 - Leave without losing edits (Priority: P1)
A player entering owned quantities or protected reserves can decide what happens before leaving the current catalog or page.
**Why this priority**: Private entry work must not disappear silently.
**Independent Test**: Edit an inventory quantity, attempt pack change and internal navigation, then exercise each decision.
**Acceptance Scenarios**:
1. Given changed inventory/reserves, when changing pack or following a same-window page link, show Save / Discard / Stay. Stay or Escape leaves the exact fields and current pack unchanged.
2. Given dirty valid edits, Save persists once and continues only after confirmed success. Failed validation, storage or revision-conflict save retains edits and cancels departure.
3. Given dirty edits, Discard permits departure without writing them. Clean pages never prompt; editing back to the original value is clean.
4. Given dirty edits, refresh, close and browser history departure use the browser's native unsaved-work warning where supported. This cannot promise custom browser dialog text or protection after process termination.

### User Story 2 - Export a trustworthy backup (Priority: P1)
A player can request a validated, identifiable backup from either export button.
**Why this priority**: A null or malformed backup cannot recover private work.
**Independent Test**: Delay initial loading and click both export controls; later export valid and invalid drafts.
**Acceptance Scenarios**:
1. Before initialization and during pack changes, private-state mutation and export controls cannot act.
2. Both export actions reject absent/invalid profiles and initiate equivalent valid profile downloads without writing browser storage or clearing dirty state.
3. The filename identifies catalog, content version, profile revision and timestamp using bounded safe characters. UI reports only that a download was requested, not that the browser saved it.

### Edge Cases
- Empty or invalid numeric input remains verbatim after Stay and failed Save; invalid data cannot be exported.
- Repeated departure requests are ignored while a decision or its save is pending; the first accepted intent remains the only destination. Pack selection stays restored during this interval.
- Modified/new-tab links do not leave the current page and need no prompt. Same-page fragment links do not discard data.
- Pack selection is restored while deciding; Escape restores focus to the initiating control. Save errors remain actionable without a hidden focus trap.
- Editing during an in-flight save is blocked. Existing cross-tab revision checks and snapshots remain unchanged.

## Requirements
### Functional Requirements
- **FR-001**: Detect actual unsaved inventory/reserve changes against the last loaded or successfully saved values, including invalid raw entries; exporting does not mark them saved. Exact reversion restores the saved/unchanged status; numerically equivalent but differently formatted strings may remain dirty. Export-request status must still label unsaved edits when dirty.
- **FR-002**: Guard pack switches and same-window links with explicit Save / Discard / Stay; cancelled departure preserves exact draft and selected catalog.
- **FR-003**: Save proceeds only after one successful validated save; failures preserve draft and prevent departure. Discard performs no save.
- **FR-004**: Provide browser-native unload protection for dirty work where supported, without claiming guaranteed recovery.
- **FR-005**: Disable private-state mutations and exports from initial page markup until ready and during loading; loading failure leaves them unavailable with an error.
- **FR-006**: Route both exports through the same profile validation and sanitized identifiable filename behavior; never export null/invalid state or claim successful download storage.
- **FR-007**: Use keyboard-accessible named dialog actions, Escape as Stay and restored logical focus; preserve existing responsive, theme, health and browser gates.

### Key Entities
- Private draft: selected catalog identity, loaded/saved baseline and current quantity/reserve entries.
- Departure decision: one pending destination with explicit save/discard/stay outcome.
- Backup: existing profile format, catalog/version/revision and request time; no new data schema.

## Success Criteria
### Measurable Outcomes
- **SC-001**: Every exercised Stay and failed-save path retains the exact entered values and selected catalog.
- **SC-002**: No startup or invalid export produces a backup; valid exports from both controls contain the same profile values.
- **SC-003**: Clean departure shows zero warnings; each dirty departure has at most one active decision.
- **SC-004**: Required Windows/Linux Chrome and Firefox/WebKit functional checks and applicable visual review pass for the exact candidate before merge.

## Assumptions
The approved four-wave plan resolves scope; no new account, persistence format, cloud sync or automatic backup is included. Reload/close/history warning wording is browser-owned. This batch does not implement later restore summaries, storage reconnect or loading isolation.

## Clarifications
### Session 2026-10-22
No blocking ambiguity: all functional, data, interaction, reliability, privacy, dependency, edge-case, constraint, terminology and completion categories are covered above. Zero user questions required. Full feature-cycle repair fallback applies because bug extension is not installed.
