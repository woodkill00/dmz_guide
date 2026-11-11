# Requirement coverage (2026-11-11)

This is the implementation ledger for all 40 proposals. End-to-end journeys are recorded in `verification.md`; partial coverage remains explicit below. Existing feature071 or older behavior is reused where noted, but does not by itself satisfy a new 073 requirement.

| Requirement | Current state | Next owning task |
| --- | --- | --- |
| FR-001 | Implemented for recorded catalog entries: named plans combine objectives, manually selected key uses, route stops and item reservations; two-plan browser journey passes | T006–T008, T037 |
| FR-002 | Implemented with ordered stash/carried/protected-reserve comparison and explicit unknown/stale labels; competing stock browser journey passes | T005–T008, T037 |
| FR-003 | Implemented: bounded Field desk queue stages stock, progress, discovery and boss reports; each previews and saves through its owner, records a receipt, and fences interrupted or conflicting writes. The separate map confirms boss events by exact event ID | T010–T012 |
| FR-004 | Implemented: public-only run-plan handoff with reviewed accept/decline, map highlight and return; private stock excluded | T013 |
| FR-005 | Partial: manual keyed-use selection and deduplicated access chains work; automatic route-stop matching requires an explicit room location ID, matching name and source. The official pack has no such key-use IDs yet, so all broad area stops remain unlinked | T006–T007, T035 |
| FR-006 | Implemented for recorded chains: bounded objective/item, selected-key and unique recipe input links with parent, depth and quantity; retained tools and multiple/unknown recipes remain explicit uncertainty | T006–T007, T036 |
| FR-007 | Implemented: eight bounded named plans, order and removal; two-plan reorder/reload browser journey passes | T004, T007–T008, T037 |
| FR-008 | Implemented: ordered allocation without stock mutation; competing 3+3 reservations against four stock units switch coverage when plans reorder | T005, T008, T037 |
| FR-009 | Partial: catalog uncertainty queue covers unrecorded requirements, recipe ingredients/eligibility, positions and disputed reports, with record links; owner resolution workflow remains | T015 |
| FR-010 | Implemented: private discoveries retain photo ownership and exact timeline links; the after-run queue saves observations through the same profile owner without transferring photos or public claims | T017, T009–T011 |
| FR-011 | Implemented as a local, read-only catalog candidate preview in Data review: affected saved plans include transitive recorded recipe changes, link back to their owning page, and the browser journey confirms the original catalog and plan count remain unchanged | T014–T015, T034 |
| FR-012 | Implemented scoped map source/category positioned and unlocated counts plus separate Guide key grid references; loaded-capture scope explicit | T016 |
| FR-013 | Implemented on local location detail: dated source reports and private observations with distinct labels and exact private-entry link | T017 |
| FR-014 | Implemented as scoped warnings: each map waypoint shows exact-name recorded key-area uses, floor record/unknown, and incoming road gap/off-road/direct status; no access or passability is inferred | T016 |
| FR-015 | Partial: 1–24 sequence marks missing pages unrecorded and recorded pages can be selected; schema admits bounded page numbers and synthetic browser journey passes, but official catalog has no sourced page-number links yet | T019, T022 |
| FR-016 | Implemented for recorded catalog entries: story filter, bounded sourced step list, requirements, linked records, evidence and manual completion; missing steps are explicit. Official catalog has no sourced story mission entries yet | T020, T022 |
| FR-017 | Implemented in map owner: dated attempts, kills and tags remain separate; Guide mission/map boss browser journey confirms an attempt does not add a kill or alter Guide mission content | T021–T022 |
| FR-018 | Implemented by existing Armory workbench form and strict context comparison; explicit incompatible-armor test added | T023 |
| FR-019 | Implemented for verified profile file writes, with included/excluded scope; ordinary download completion remains unverifiable and is labelled so | T024 |
| FR-020 | Partial: bounded inert file preview exists; no approved schema or save integration | T025 |
| DR-001 | Partial: modern Guide shell has headings, breadcrumbs and bounded content; owner pages still vary | T026–T027 |
| DR-002 | Implemented in modern navigation hubs with task links; legacy rollout remains selectable | T026 |
| DR-003 | Partial: compact catalog context is mounted on profile pages; save/pack/workspace consistency still varies | T026 |
| DR-004 | Partial: directory components exist, but item/key/mission/weapon filters and row actions remain different | T027 |
| DR-005 | Partial: Data review now presents source preview first; other owner pages still have competing actions | T026–T027 |
| DR-006 | Partial: Data review and run-plan put decisions before details; other owner pages need audit | T026–T027 |
| DR-007 | Map selection persists until changed/dismissed in three-engine browser checks | T018, T028–T029 |
| DR-008 | Partial: map task pane owns its scroll; nested Guide owner scroll areas still need audit | T026–T029 |
| DR-009 | Partial: run-plan keeps name/status/action in narrow layouts; other dense tables need review | T027–T029 |
| DR-010 | Partial: run-plan uses Covered/short/unknown words; cross-owner authority/status wording needs consolidation | T026–T028 |
| DR-011 | Partial: run-plan and map statuses have text with color; other owner states need audit | T026–T028 |
| DR-012 | Partial: run-plan counts use locale separators; numeric columns across owners need alignment review | T027 |
| DR-013 | Partial: queued run-plan edits avoid lost rapid clicks; other owner row stability needs verification | T027–T029 |
| DR-014 | Map dock collapse/reopen with retained selection verified across three engines | T018, T028–T029 |
| DR-015 | Map movable panel bounds and pane collision tested in three engines | T018, T028–T029 |
| DR-016 | Partial: map and Guide have brief popovers/dialogs, but behavior remains owner-specific | T026–T028 |
| DR-017 | Browser matrix covers keyboard focus, target size and non-drag moves; physical device checks absent | T028–T029 |
| DR-018 | Reduced-motion browser checks pass for Guide and map | T028–T029 |
| DR-019 | Partial: Data review and run-plan have actionable errors; owner recovery language remains inconsistent | T026–T028 |
| DR-020 | Partial: shared spacing/control tokens now load in Guide and map modern shell; semantic status tokens remain owner-specific | T026–T028 |

The `/run-plan/` first slice is useful for local planning, but user stories 1–6 remain open until owning integration and browser checks pass.
