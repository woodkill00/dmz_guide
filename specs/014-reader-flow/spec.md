# Feature Specification: Clear reader and planning flow
**Feature Branch**: `014-reader-flow` | **Created**: 2026-10-22 | **Status**: Recovered draft
**Input**: Approved final roundtable Wave 2 workpackages 6–9 only.

## User Scenarios & Testing
### User Story 1 — Understand and follow a collection need (P1)
A player enters additional desired output (not target stock or craft count), sees an actionable empty state before goals, and follows shortages to exact active item and declared related locations.
Acceptance: no goals shows Add a goal and inventory action without blank result/schedule panels. Both quantity controls use Additional output quantity; explanation distinguishes owned stock, output and whole crafts without changing allocation/reserves. Same-ID private overlay navigation retains exact catalog/version, including same-version edits, or fails explicitly without published substitution. Missing acquisition relation stays unknown.
### User Story 2 — Find visible records safely (P1)
All whitespace-separated case-insensitive tokens match projected visible search text, preserving original order. Hidden spoiler names/aliases never match. Free query, goals, progress and private state are not automatically serialized to URLs. Validated public catalog pack/type only are shareable; incoming legacy query is consumed locally and removed. Back/refresh may retain only safe view state; local query persistence is not required.
### User Story 3 — Read evidence and useful locations (P2)
Source support is visibly distinct from current-build verification. Unknown-coordinate maps lead with useful lists and explanation, no empty camera controls; calibrated synthetic maps keep functional camera/markers and distinguish filtered-empty results. Reduce mobile decoration/card padding without hiding evidence or shrinking text/44px controls. Closed secondary navigation identifies current section; detail hierarchy prioritizes content with central uncertainty warning visible.
### Edge Cases
Whitespace/punctuation/duplicates/no matches/hidden spoilers; missing/expired/malformed/denied/quota handoff; changed same-version pack; current hidden target; back/refresh/pack changes; no maps/unknown or invalid coordinates/filtered-empty calibrated map; long provenance, keyboard and actual 200% text.

## Requirements
- **FR-001** Consistent additional-output wording and explanation; allocation/reserve/priority semantics unchanged.
- **FR-002** Keyboard-operable Add a goal and inventory actions replace zero-goal blank results.
- **FR-003** Shortage links retain exact active item/declared location context and fail closed if unavailable/stale; acquisition unknowns preserved.
- **FR-004** Public/private search uses every visible token, stable original order and existing spoiler projection.
- **FR-005** Automatically preserved URL state is validated public pack/type only; no free query, manual progress, goal amounts or private content serialized.
- **FR-006** Readable functional metadata explicitly distinguishes source support and live-build verification.
- **FR-007** Unplottable maps lead with useful lists, without invented coordinates/unusable camera interaction.
- **FR-008** Mobile decoration/card spacing decreases without reduced text, 44px controls or evidence; secondary nav/detail hierarchy orient readers.
- **FR-009** Preserve inherited safety/focus/strict health, Windows/Linux Chrome and Firefox/WebKit; full-page visual and actual 200% checks are release gates.
### Key Entities
Active catalog identity/version/private overlay; existing collection demand and declared relations; safe public view state. Private navigation is not a shareable snapshot.

## Success Criteria
SC-001: identical quantity terminology, one action reaches entry in zero-goal state.
SC-002: synthetic nonadjacent queries return exactly expected visible matches in unchanged order; hidden sentinel absent from results/generated URLs.
SC-003: same-ID private/published and same-version drift never silently display different target.
SC-004: every no-coordinate case exposes list before map interaction; calibrated synthetic markers/camera work.
SC-005: 320px/390px/desktop dark/light keyboard and actual 200% checks show no content loss, hidden warning or target regression; measured mobile decoration and card spacing decrease.

## Assumptions and Clarifications
Final agreed wave supersedes historical ranking/broad URL proposals. No new facts, schema, display mode, ranking/fuzzy search, progression URLs, accounts, framework or broad refactor. Existing local static architecture remains. Constitution reviewed unchanged. Browser evidence is separate from source/controller probes. Worktree now inherits 013 at 6d920438245e61c488d5c8d028e9d4a55058983b (includes reviewed 012). Original uncommitted artifacts were lost when shared workspace vanished; this recovery preserves requirements and requires independent recheck.

Search scope is public catalog and private record listing, not map/progression filter semantics. Existing explicit selected-pack navigation URLs remain supported; shortage handoff itself exposes only opaque tokens.

## Interaction clarification — 2026-10-22
Integration owner approves explicit same-tab navigation buttons instead of anchors for per-tab shortage handoffs: “View item here” and “Known locations here”, type=button, keyboard accessible, minimum44px targets. Adjacent explanation says these open the matching active-catalog view in this tab. This avoids misleading placeholder hrefs/native modifier behavior and preserves20-entry bounds. Storage/token failure shows actionable error without navigation or wrong fallback. FR-003 “links” means these explicit navigation controls for shortages; ordinary public/existing private links retain native semantics. No new mode.
