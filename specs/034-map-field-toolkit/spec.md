# Feature Specification: Map field toolkit
**Feature Branch**: feat/034-map-field-toolkit
**Created**: 2026-10-30
**Status**: Implemented and automated-verified; external gameplay/device evidence unverified
**Input**: Implement all ten proposed improvements and menu refinements from the preceding recommendation.

## User Scenarios & Testing
### US1 — Safe editing and reliable routes (P1)
Undo saved route removals/clears, recover recently deleted owned points, inspect unresolved/off-road legs, avoid road segments, and add preferred intermediate stops. Test cancelled deletion, revision conflict, missing references and disconnected networks without losing unrelated data.
### US2 — Plan objectives and collections (P1)
Create private mission checklists with linked locations, collect reusable location groups, select several points and create ordered routes. Filter/search waypoint and tracking lists; distinguish reached/pending/unresolved. Test repeated locations, missing/stale references and reload.
### US3 — Use the map during play (P2)
Right-click or long-press for quick waypoint/POI/note/danger/rally actions; keyboard equivalent picks a point. Use compact field controls, temporary session marks and pixel measurement/copyable grid coordinates. Show several differently colored routes. Configure marker size and reset menu placement, use documented keyboard shortcuts.
### US4 — Maintain and exchange your work (P2)
See source agreement, disagreements and unique-source locations; review existing update previews before apply. Add tags/building/approach/last-checked metadata alongside existing screenshots/floors. Export selected routes, collections, missions, owned POIs and referenced owned icons as a bounded inert pack; preview import duplicates/dependencies, then atomically merge without overwriting existing work.

## Requirements
FR001 Recovery exposes undo of the last saved workspace mutation, guarded against drafts/conflicts, and a persistent bounded bin for20 deleted owned points, with explicit restore/permanent-delete. Existing backup reminders stay accessible; restored points retain metadata/assets or explain missing dependencies.
FR002 Route health lists unresolved stops, disconnected legs, off-road connectors and network verification; allow per-route road avoidance, reset avoidance and preferred intermediate map stops. Never infer complete road topology or safe access.
FR003 Quick-add popup supports waypoint, owned POI, note, danger and rally. Long-press must cancel on drag, multitouch or disposal; existing right-click POI draft behavior remains reachable. Keyboard coordinate/pick controls provide equivalent actions.
FR004 Up to20 private missions,32 checklist objectives each; optional location reference/manual point per objective, manual completion, edit/delete and ordered route creation (deduplicate locations, explain unresolved refs). Labels distinguish private objectives from verified game requirements.
FR005 Up to30 named collections,100 unique reference/manual members each; add/remove/rename, show/hide independent collection overlays, select members to create route (32stop bound), preserve source references without copied source geometry/title.
FR006 Source comparison summarizes conservative agreement/nearby disagreements/single-source observations with provider evidence and map focus. Consensus never certifies truth; preserve existing independent-lineage warnings and update-preview-before-apply workflow.
FR007 Field mode reuses compact gameplay controls with next-stop/progress access, larger controls and temporary danger/rally/note marks. Clear session marks confirms, persists within browser tab session only, never changes source claims or owned data.
FR008 Owned POIs support up to20 tags (40characters), building (120), approach notes (2000), last-checked date, retaining existing multiple screenshots/floor/build/observation fields. Search includes new metadata; editable, validated, backed up and safely rendered.
FR009 Measure straight lines and multi-point paths using at most100 manually picked image-space vertices, show length in pixels and grid/X/Y, copy coordinates with fallback; undo/clear measurement. No meters, ETA, automatic player tracking or passability claims.
FR010 Portable packs <=8MiB include only explicitly selected routes, missions, collections, owned points and referenced owned icons; source references only, never provider snapshots/images/titles/geometry. Strict version/schema/limits/asset verification, preview counts/duplicate/dependency findings; stable semantic duplicate detection across repeated import, remap conflicting owned IDs, preserve existing data and backup limits, atomic guarded apply/cancel.
FR011 Waypoint/tracking search and status filters, selection checkboxes, remove selected with confirmation and progress cleanup; add selected stops/tracked locations to a collection. Source updates do not retarget captured references silently.
FR012 Display several saved routes with their own colors; only active route has actionable numbered popup/progress controls. Additional routes remain non-destructive and independently switchable.
FR013 Settings page exposes marker-size selection, menu-position reset, field mode and shortcuts reference. Keyboard shortcuts avoid typing/editable contexts and dialogs, preserve drafts and offer escape/cancel. Display preferences fail gracefully if storage is unavailable.
FR014 Additive optional data only, old backup compatibility, validated transaction/CAS/quota rollback and bounded resources. Private data stays local; no new services/collection/deployment. Explain compatibility with older strict readers and retain downloaded backup.
FR015 Update Help/docs and verify meaningful unit/integration/browser tests for positive/failure/repeated-import/reload/recovery/drafts,320px keyboard/axe, all3 engines and independent definition/code/security/visual review; analyze/fix/converge until no actionable issues. Physical device/gameplay/screenreader claims require real evidence.

### Key Entities
Private missions/objectives, collections/members, route preferences, POI metadata, deleted-point bin and portable selection pack. Source identities stay capture-bound. Session marks/measurements are separate from persisted user content.

## Success Criteria
SC001 Every FR has an implemented user entry point and executed acceptance coverage; original route/source/backup workflows remain functional.
SC002 Re-importing an unchanged selection pack adds zero duplicates; malformed/conflicting/stale operations preserve previous workspace/drafts.
SC003 Missing references, road gaps and uncertain source agreement remain explicit; no fabricated game facts or private-source export.
SC004 Scoped/full map tests, build, repository checks and supported engine/a11y tests pass with independent review; external observations remain honestly pending.

## Assumptions and Clarifications
All preceding recommendations are authorized; reasonable bounded defaults avoid new paid services. Missions are owner-authored. Avoidance uses available graph edges; preferred paths use intermediate waypoints/owned road editing. Existing screenshots/backups/reminders/update previews are extended and verified rather than duplicated. No automatic road extraction or external fetching is required. Trash count20 and2MiB; exceeding it requires explicit permanent removal or clearing bin, never silent loss. Undo uses the retained previous workspace revision and expires when that snapshot changes. Session marks stay in this tab and are excluded from exported packs/backups. New optional fields require this updated app to read them; old backups still import.
