# Feature specification: Camo grid and private completion
**Branch**: feat/090-camo-grid-tracker | **Created**: 2026-11-18 | **Status**: Implemented and verified locally
**Input**: Match the in-game four-tier camo grid for every weapon. Picture buttons open requirements and a completion checkbox. Green completed, red remaining, yellow next in the user's tracking order; Special challenges may progress together.

## User Scenarios & Testing
### US1 — Browse four tiers (P1)
Open any of35 weapon camo pages. See Military8 in two rows of4, Special3 in one row, Completionist4 and Prestige4, responsive at320px. Click a tile to expand a compact detail panel in that tier with requirements/source links/checkbox. All25 existing references remain reachable: six shared mode mastery entries on a separate Mode mastery view.
Independent test:19 progression tiles in exactlyfour tiers; six mastery tiles in other view. Keyboard/native buttons, accurate expanded state, stable selection and no page-covering popup.

### US2 — Track completion and next goals (P1)
Check/uncheck a camo in its detail panel and retain it across reload and weapon navigation. Completedgreen, remainingred, nextyellow, each with a text status. First unfinished Military is yellow; when all8 are complete, every incomplete Special is yellow. Gold yellow only after all8Military+3Specials complete. Manual completion of later goals never silently completes earlier ones or deletes later progress on undo.
Independent test:Military8→Special3parallel→Gold; reverse a prerequisite and recalculate yellow while preserving checked downstream records.

### US3 — Keep data safe (P1)
Use existing armory backups, conflict and failed-save recovery. Shared Divergence/mastery completion appears consistently across weapons. Manual/blueprint/build/evidence/inventory remain unchanged.
Independent test:CAS stale rejection/quota/denied/corrupt storage preserve olddata and retained candidate; export/restore and existing acquisition/workbench edits preserve camoprogress. No empty-store write just for reading.

## Requirements
- **FR001** Four-tier progression grid for all35 guns;8Military/3Special/4Completionist/4Prestige;25 references retained through Mode mastery switch. No new artwork or private reference screenshot redistribution.
- **FR002** Real buttons with square swatches/name/textstatus; click reveals requirements and completion checkbox in a compact inline panel belowthat tier. One selectedtile per tier, independent other tiers. Same tile toggles closed; selectedpanel survives saves. Keyboard/aria-expanded/aria-controls/focus and dark/light/320..1920/200%text/reducedmotion/nooverflow.
- **FR003** Green iff manually completed; red otherwise except yellow next-to-track. Military firstunfinished; Specials parallel afterMilitary8; Gold afterMilitary8+Special3. Platinum requirescurrentGold+reported classGoldcount, Harmonic currentPlatinum+33globalPlatinum, Divergence33globalHarmonic. Prestige firstunfinished independently; mode chains aftersharedDivergence, firstunfinished eachmode. Yellow is the requested planning convention, not an assertion game-level gates are satisfied. No inferred extractions/ownership or automatic checkbox completion.
- **FR004** Add bounded optional camoCompletions to existing privatearmory, absent means no recordedcamos. Keys separate perweapon from sharedDivergence/mastery; snapshot/sharedassociation not multiplied35times. Unchecking removes onlythat record; unknown archivedkeys retained. Controls enable only after validated read; no silent reset of invalid/denied stores.
- **FR005** All writers preserve existingfields; save CAS transaction completion before green/count confirmation. Onependingmutation; same absolute failedcandidate retained for export/retry originalrevision/reload, stale rejection nooverwrite. Prevent accidental navigation with failed/pending data; no focus/scroll theft during save/refresh; focus/tab return refresh clean state. Export/restore usesexisting fullarmorybackup, previews showcamo count and whole-record replacement including legacyabsence.
- **FR006** Reference pages remain readable without storage/JS and never contact providers automatically. Build/release/sourceinventory and previous089 media rules preserved. Meaningful state-machine, schema/backup/adverse-storage and threeengine/visual/accessibility tests; independent analysis and implementation review.

## Entities
Camo reference, progression metadata, tile selection, recordedcompletionkey, sharedunlock, armoryrevision/retainedcandidate.

## Success Criteria
SC1 all35pages have4tiers/19tiles+6mastery, eachdetail correctly sourced.
SC2 color/text/checkbox transitions exactly match FR003, survive reload/export/restore and sharedscope.
SC3 no unrelateddata lost; stale/quota/denied/corrupt cases fail recoverably.
SC4 independent review no blocker; relevant runtime/build/format/release and browser/a11y/responsive checks pass.

## Clarification and scope
Interpret the user's last “first one in Special” as first Completionist/Gold, which follows completingSpecials. This assumption was stated before work; no conflicting instruction received. User's desired parallelSpecial yellow follows Military, even though actual Special level gates can open earlier; explicitly label it as planning order. Prestige stays independent per source. Reading doesnot create a private record. No telemetry, account linking, source recollection or public art change.
