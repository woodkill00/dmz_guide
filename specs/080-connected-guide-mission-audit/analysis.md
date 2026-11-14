# Planning analysis and repair cycles

## Cycle 1 — 2026-11-13

Read-only comparison of `spec.md`, `plan.md`, `data-model.md`, `research.md` and `tasks.md` found three gaps:

1. **Editorial export ambiguity (high)**: an export cannot both preserve the owner's spoiler-containing notes for restore and promise spoiler-free contents. Repaired FR-009 and T005: list/search projection hides protected content; private export retains notes with an explicit warning and never enters public search automatically.
2. **Audit action count (medium)**: SC-002 required three actions while the planned list → section → state → Save flow takes four. Repaired SC-002 to four actions and retained a visible Save confirmation.
3. **Requirement traceability (medium)**: several task lines relied only on phase-level FR ranges. Repaired T004–T023 with explicit IDs on each task.

The source review also found a scope hazard: the official starter currently has zero DMZ Order/Story records, while the existing UI models 24 Orders slots and official Season 1 notes add X01 Orders. Spec, research and data model now state that 24 is the current scoped page set, not a complete-game denominator. Unrecorded slots are editorial targets, never fabricated mission records.

## Cycle 2 — 2026-11-13

Reran a read-only requirement/task scan: **7 user stories, 18 functional requirements, 23 open tasks, zero unmapped requirement IDs, zero template/clarification placeholders**. Reviewed the mission audit path, cross-origin backup boundary, source rights, spoiler protection, player/editorial-state separation and failure paths against the constitution. No critical or high specification contradiction remains before implementation.

Planning is complete; implementation, reviewer-owned checklist approval, actual test runs and acceptance are pending. The checklist remains unchecked and is not self-approved. Later source findings or tested behavior may require another tasks→analysis→fix cycle.

## Cycle 3 — 2026-11-13, first implementation slice

Compared the new mission-audit projection and generated page with FR-001–FR-009 and the shared catalog-loading contract. The first browser run found that the generated page omitted `#pack-note`, which the shared loader writes before rendering. Added that element and reran the page: the 24 empty slots render, a Fill later status persists after reload, and the 390px layout has no horizontal page overflow.

The gap review also found that an unreadable saved audit could otherwise be replaced by an import. The client now blocks all writes when an existing audit fails to load; the validator requires the declared content version and page set. Focused tests cover the target projection and invalid states. T005 and T007 remain open: durable history, source-fingerprint rebinding, complete spoiler behavior, import-failure browser cases and 200% text/keyboard checks still need implementation and evidence. The remaining feature phases are likewise open; this cycle does not mark them accepted.

## Cycle 4 — 2026-11-13, verification ownership

An initial full `npm test` run reported 997/998 passing; the topology snapshot test failed while a separate build was replacing `dist` concurrently. This was a test orchestration error, not a missing route: after the build completed, the generated topology contained `/missions/audit/` with feature ID `mission-audit`, and the focused topology, registry and audit tests passed 14/14. Future full-suite and build checks are serialized so `dist` is stable during snapshot tests. The new browser test passed the empty roster, Fill later persistence, status filter and 390px overflow checks. Full-suite rerun remains pending after the last code changes.

## Cycle 5 — 2026-11-13, stable verification and visual check

The serialized full runtime suite passed 998/998 with a stable `dist`. A screenshot review found that default buttons made all 24 unrecorded pages look like bright primary actions; the page now uses compact muted cards with a clear selected outline. The added keyboard and 200% text browser test initially attempted inline CSS and was correctly blocked by the site's `style-src 'self'` policy. The test now loads a generated local CSS file, and the browser journey passes at 390px/200% text without horizontal document overflow. This repairs a test harness issue while preserving the production CSP.

## Cycle 6 — 2026-11-13, connected preparation

The Collection workbench already computes shared unfinished mission/upgrade needs, stock, reserves, recipe steps and locations; a second calculation would create a conflicting source of truth. The new action strip is a bounded view of that projection. A browser regression exposed reuse of the existing `data-why-item` hook, which made exact test selectors ambiguous. The new action button now has a distinct hook and delegates to the same explanation. Focused Collection workbench and needs browser journeys pass. The action strip does not yet close FR-010/FR-011: exact key/map cross-links and full scenario evidence are still open.

## Cycle 7 — 2026-11-13, audit and review connection

The Data review page previously counted catalog uncertainty but had no route to editorial section status. It now reads the same bounded local audit format as `/missions/audit/` and presents scoped roster gaps, Fill later and stale counts. Failed or unavailable local reads produce an unavailable message without changing state. The audit browser journey verifies a saved section appears in Data review. Full multi-domain coverage and change-queue contracts remain open under T016–T019.

## Cycle 13 — audit persistence contract

The repeatable baseline test confirms the checked-in starter has zero recorded Order/Story missions and exactly 24 unrecorded page targets. The audit validator now normalizes older v1 files, bounds payload/history, and validates each before/after event. A changed source fingerprint must be explicitly confirmed before save. Focused runtime and browser tests passed; quota failure, cancelled restore and full workspace backup remain open. T001 is closed; T002/T005 remain open pending those recovery cases.

## Cycle 14 — import recovery and page-set scope

The first import UI named only entry counts, which obscured removed or stale reviews. A pure preview now reports added, changed, removed and stale/missing bindings before an explicit replace. Cancel is inert, and restoring over an unsaved form asks before discarding it. Browser checks cover cancelled import/restore, successful restore and simulated quota failure without changing saved bytes. A synthetic later page set confirms IDs are separate without inventing real X01 page coverage. T004 is closed; T002/T005 remain open for spoiler/export and broader restore cases. No critical or high contradiction was found in this slice.

## Cycle 15 — delayed import cancellation

A pending file read could outlive Cancel and reopen the restore preview. The client now invalidates pending reads on cancel, replacement and catalog switch. A browser reproduction held `File.text()`, cancelled the import, released the read and verified the preview remained cancelled. T005 is closed with this evidence; the complete workspace backup remains T014–T015. T002 still needs separate spoiler/export-contract review.

## Cycle 16 — audit contract convergence

The export contract test now verifies private JSON retains the owner note while the audit list omits it. Focused tests also bound UTF-8 import size and retain an old fingerprint as stale review evidence. T002 is closed; T003 and the remaining cross-page tasks still require implementation and acceptance checks. The reviewer-owned checklist was not self-approved.

## Cycle 17 — repository authoring ownership

The audit previously linked recorded missions only to the private detail and gave unrecorded pages no authoring action. It now uses the published catalog manifest's exact pack key to build Content Studio links: recorded objectives select their existing record; unrecorded page slots open a blank objective form. Unknown private packs receive a truthful unavailable message. The first browser run found that `author-target.mjs` is intentionally excluded from public assets, so the public client now serializes the validated target fields locally while Studio parses them with its strict target contract. Build, focused author-target tests and audit browser journey passed. The ownership review in `plan.md` closes T003 and the tested navigation closes T006. T007 and source ingestion remain open.

## Cycle 18 — populated audit and visual check

A routed fictional training pack supplied one Order with an assigned page and one protected Story Mission. The browser journey verified 23 unrecorded page slots, separate Story sections, hidden protected name in the list/search, exact author link and a checked Rewards state that did not remove the evidence warning. The 390px screenshot showed row fills were too visually heavy; a neutral surface fill and selected border repaired that. The rebuilt page passed the browser journey, including keyboard and 200% text checks. T007 is closed; no fictional data was added to the catalog.

## Cycle 19 — first real source admission

The named COD Central and DMZTracker pages agree on the first Hajin Orders page's three identities and tasks but differ on reward and unlock timing. Three source-reported objective records were admitted with both citations, short paraphrased steps, no disputed effects and explicit current-build uncertainty. The official starter now has one recorded Hajin page, 23 unrecorded pages and no Story Mission records. Build and focused audit tests passed. T008 stays open for the remaining source review; the earlier empty baseline remains historical evidence, not the current catalog state.

## Cycle 20 — catalog and browser convergence

The initial full runtime run found three stale test/canonical assumptions after the content version and Orders admission. Canonical serialization repaired first-save byte stability; the Orders baseline and pinned content-version assertions were updated. The focused affected suite passed 28/28, then full runtime passed 1,009/1,009. The first site-wide browser run found two old 24-unrecorded assertions, now updated to 23. Both focused journeys and a fresh full Chromium browser run passed. No task was closed merely from the new source rows; T008 still requires review of remaining pages and Story Missions.

## Cycle 21 — next-action enrichment

The shared Collection projection already accounts for unfinished roots, stock, reserves and recipe alternatives. The presentation list now adds up to three recorded output recipes, key identity and named map-area links for each top action; absent areas are labelled unknown. A synthetic test verifies the extra context leaves a known shortage unchanged and reports no location when none is recorded. Combined Collection/preparation tests passed 26/26 and the Collection browser journey passed. T009 is closed without a second stock calculation; T010/T011 still require complete exact-link and user-journey evidence.

## Cycle 22 — exact relation and journey closure

The existing declared-ID relation projection already stayed inside one selected catalog, but public detail references could expose a protected or missing raw ID in a URL/text fallback. Public links now replace protected targets with a spoiler-safe label and missing targets with a generic unresolved label. A synthetic graph covers item, key, weapon, recipe, mission, upgrade, map and location reverse edges without name inference. The existing Collection browser workflow starts from a fictional mission and profile, inspects ingredient/recipe alternatives, builds a two-stop route and opens the map; an assertion now checks named areas in the compact next-action strip. Focused relation tests and the browser workflow pass. T010/T011 are closed; cross-origin match handoff and whole-workspace recovery are separate later tasks.

## Cycle 23 — match transaction and coverage review

The Field desk's old run form staged stock only. A named match now binds to the active profile revision, previews stock and objective changes in one candidate, and uses the guarded profile transaction to save both. A stale revision or invalid objective fails before save. Optional stops are preview-only because map and guide are different origins; persisting them needs the explicit handoff and receipt contract in T013. T012 remains open for stop evidence and full recovery behavior. The focused domain and Field desk browser journey pass.

The Data review page already had the seven scoped coverage rows required by T016, but it did not surface broken declared references or exact repair actions. A read-only edge check now identifies the owning record while masking missing/protected target IDs; valid starter records generate no relation issue. Exact Studio links use the selected catalog key. Weapon records without numeric stats or direct source references enter the queue; comparator modes remain separate. T016/T019 close on focused domain and Chromium Data review evidence. T017/T018 still need source-change decisions and a complete patch/mode review.

## Cycle 24 — source claims, weapon qualifiers and browser health

Candidate catalog preview now compares claim IDs and shows old/new values, source citation/date and content-version applicability without touching the current catalog or player state. A local Reject action and exact Studio Apply link expose decisions, but they have no durable receipts and patch proposals are not unified; T017 remains open. A spoiler guard omits protected claim targets and secret-bearing values. Synthetic domain and Chromium Data review tests pass after a clean rebuild.

The existing Armory comparator already separates official launch, community Multiplayer, CODMunity *WZ and private DMZ observations; its patch history is dated and mode-labelled. Data review now flags weapons with no numeric stats or a numeric stat without a direct source. T018 closes on this mode/source separation and existing browser/domain regressions. No value is promoted to DMZ-tested merely because it appears in a WZ column.

The Home cross-engine regression passed Chromium and Firefox. WebKit completed the feature/layout assertions but strict health recorded pack-JSON `due to access control checks` page errors during navigation. Waiting for network idle at two Home transitions did not remove them. This remains a T022/T023 finding and must be reproduced with page/phase diagnostics before relaxing any health gate. The mission source review also now indexes six COD Central Story Mission article candidates; none is admitted as a game objective without record-level reconciliation.

## Cycle 25 — explicit multi-module recovery

The prior profile backup excluded map, armory, run plans, audit and photo bytes. The new workspace manifest accepts only owner-selected JSON exports, binds each to a fixed owner origin and digest, and names every omitted module. It offers validated extraction and the owner's import page; it does not imply cross-origin atomic writes. A 36 MiB serialized cap and filename guard close oversized/unsafe bundle cases. Run plans now have a missing export/previewed restore path with revision-guarded save. Domain and Chromium round-trip/tamper tests pass. T014 closes for explicit manifest and per-module handoff; T015 remains open for old-bundle, quota and mid-apply outcome cases across owners.

## Cycle 26 — map file fallback and recovery conflict

Live run-plan transfer already bound nonce, expected origin and target window but had no file fallback. The Guide now downloads the same validated public-only handoff and the map accepts it through the existing file picker, requiring Accept or Decline. A file-import browser journey passes in Chromium, Firefox and WebKit, and map typecheck/build pass. A synthetic competing run-plan save during restore leaves the newer saved plan intact and reports failure. Changed map capture identity and wrong-origin/offline negative cases are not yet separately verified, so T013 remains open. The wider multi-owner recovery outcome gate T015 remains open as well.

## Cycle 8 — 2026-11-13, exact record links

The detail renderer resolved target IDs across every loaded pack, so a duplicate ID in another catalog could point at the wrong record. Detail references now resolve within the selected pack, and a bounded direct-reference projection supplies reverse links for non-item records. A synthetic two-pack test verifies that the wrong catalog's link is excluded. The first build after editing failed because a broad text replacement also changed the catalog directory's pack list; that line was restored before retesting. Build and focused relation tests pass. FR-011 remains open for key/weapon/map-specific journeys and broader browser evidence.

## Cycle 9 — 2026-11-13, regression convergence

After the relation changes, `npm test` passed 1,001/1,001 against stable build output, and the full Chromium browser run passed its existing connected journeys. The feature's new mission-audit browser run passed separately. No new failure was reported by this regression pass. T010/T011 remain open because the tested direct relations do not yet cover all exact key, weapon and map journeys; T012–T023 remain pending implementation or broader evidence as described in tasks.

## Cycle 10 — 2026-11-13, Home action and build state

The Home action reuses `collectionWorkbench` and `connectedPreparation` after a valid profile/content match. The first Home browser run passed Chromium but stopped on an intermittent Firefox key-detail assertion; isolated Firefox and WebKit Home/key journeys then passed. A subsequent Home assertion failed because the local `dist` still contained the prior Home module. Inspection found an incomplete build candidate and lock in `.build-state`; its recorded PID was no longer running. An automated verified cleanup command was rejected by approval policy, so recovery material remains untouched. Current-source Home behavior passed the full Home workflow in Chromium, Firefox and WebKit using a single-module Playwright route override. A clean normal build and final release check remain open until the interrupted build state is resolved.

## Cycle 11 — 2026-11-13, scoped content coverage

The first Data review summary exposed mission roster counts but not the other listed content areas in FR-016. A pure bounded projection now counts listed recipe ingredient completeness, catalog image references, numeric weapon stats, key descriptions/sources and positioned locations alongside scoped Orders and checked mission sections. Zero-record domains display "None recorded" instead of a misleading 0/0 completion. Each row states that its denominator is the selected catalog's listed records; image references and weapon numbers do not assert loaded art or DMZ testing. Focused unit tests pass. Browser/build verification remains pending while the interrupted build lock is unresolved.

## Cycle 12 — 2026-11-13, reversible recovery and clean recheck

After the user's explicit instruction to handle cleanup, automatic approval review again rejected the narrow deletion as blocked by policy. A verified reversible move of the stopped candidate and lock into ignored `.local/build-recovery-080` was allowed; it preserved all bytes and did not touch current `dist`. A normal build then succeeded with 1,867 routes. The mission audit, Home and Data review checks passed against built files; the serialized runtime suite passed 1,002/1,002; and the full Chromium browser run passed. The build-state blocker is resolved. This cycle does not close unfinished functional tasks or reviewer-owned criteria.

## Cycle 27 — saved match evidence and combined recovery

Analysis found that match stops disappeared after the preview and a generic quantity undo could leave objectives completed. The match receipt now persists plan ID/revision, player-reported stops and objective before/after states. The history directs match events to a guarded combined undo that refuses later stock or objective edits. A Chromium Field desk journey and focused domain tests pass. The test exposed that run-plan UUIDs do not fit catalog record-ID syntax; the bounded match validator now accepts the run-plan ID grammar, and the rebuilt browser journey passes. T012 closes on this evidence; map handoff, multi-module restore and source review gates remain open.

## Cycle 28 — map transfer failure matrix

A blocked popup still exposed a file fallback. The origin test used an actual foreign opener with the correct nonce; the map ignored it. A renamed synthetic source marker left an imported old area unpositioned, and analysis found the route button remained active even with zero resolved positions. It now disables until at least one registered position resolves. The changed-capture, Decline and three-engine file-import journeys, live handshake and TypeScript typecheck pass. T013 closes on these local transfer boundaries.

## Cycle 29 — backup outcome matrix

The bundle import had a valid round-trip/tamper journey but no explicit old-version or checked-module byte comparison. The browser journey now rejects version 0, confirms a downloaded module equals the selected profile, and retains no restore choices after malformed input. Existing Mission audit quota-denial and Run-plan competing-save journeys cover independent owner failure and “not saved” feedback. The bundle remains an explicit handoff, so there is no cross-origin commit to roll back. T015 closes on the documented separate-transaction contract.

## Cycle 30 — durable source review and WebKit navigation

The source claim preview lost Reject decisions on reload and treated a Studio link as the only apply path. The new bounded local log binds each decision to an exact candidate-file SHA-256 digest. A Studio-open receipt is verified only when the current selected catalog contains the proposed claim value/status after a rebuild. Synthetic domain and browser journeys pass reject reload, pending Studio and verified catalog match; the existing official weapon patch owner remains separate and linked. In the cross-engine Home regression, WebKit alone reported a cancelled directory icon catalog GET during quick native navigation. A bodyless `keepalive` GET for that secondary icon lookup passed the isolated strict WebKit navigation test; the broad three-engine gate still needs a rerun.

## Cycle 31 — limited Story Mission admission

The source audit had names staged but no Story records, despite two named providers agreeing on six identities. Individual DMZTracker pages were checked for three short objective labels each, with COD Central's walkthrough directory corroborating names. Six `observed`, spoiler-protected Story records were admitted with separate source records; disputed rewards, dependencies, item counts, map coordinates and current-build verification stayed out. No fixed Orders page was assigned because chapter choice can change order. The 23 unresolved Hajin page slots remain explicit. The canonical build emitted 1,886 routes, focused catalog/audit tests passed 26/26 and the audit browser journey passed. T008 closes as a bounded source audit, not complete mission coverage.

## Cycle 32 — full runtime regression fixes

The first full runtime gate after Story admission found two unrelated assertions: a pinned FOB fixture still expected the previous catalog content version, and the new Data review link pointed to `/weapon-updates/` instead of the registered `/armory/updates/` route. The fixture was updated for the deliberate content-version bump and the link was corrected. Focused FOB and generated-site topology checks then passed 10/10 with zero graph issues. A fresh full runtime rerun is in progress; neither failure is counted as a pass before that result.

## Cycle 33 — implementation convergence and release evidence

The corrected full guide runtime suite passed 1,022/1,022. Map runtime passed 243/243. The guide build produced 1,886 routes, and the map typecheck/build passed. The full guide browser run reached its final after-run review with no failure: responsive, search, save/recovery, 5,000-item collection, connected layout and source/plan journeys passed. The map browser suite passed its source, private workspace, X01, key, route and mobile cases with no runtime errors or external requests. Separate mission-audit, backup and Field desk browser journeys passed. Formatting and whitespace checks passed. A cross-check of FR-001–FR-018 against tasks T001–T023 found no unimplemented task within the documented bounded scope; the release audit records incomplete source coverage, independent visual/reviewer gates and absent real-game certification without turning them into fabricated passes. No implementation repair was needed in this final cycle.

## Cycle 34 — source roster reconciliation

The release review found the source-review document still describing six Story Missions as unpublished and a 23-page gap after the earlier admission. The current two-provider Orders comparison found 66 matching Hajin identities, including repeated Healer and No Time entries and a Jail Break/Jailbreak alias. Sixty-three more records and their direct detail sources were added; only seven fixed page rosters receive `orderPage`. Astronaut and Stalking the Stalker keep empty steps because source objective counts or requirements disagree. The documentation now distinguishes unassigned page position from missing Order identity. A clean 2,012-route build, 14 focused runtime checks and the audit browser journey passed. Broad tests and independent review remain the next gates.

## Cycle 35 — regression audit after roster growth

A full runtime rerun passed 1,022/1,022. The full local browser runner exposed a milestone selector timeout under concurrent runtime load; the exact journey passed in isolation. Two subsequent full runner attempts terminated at different stages with Windows access-violation code `-1073741819`, not an assertion. Focused browser audit, coverage, encounter and Data review journeys were run separately. Coverage and encounter initially retained the former 23-unrecorded assertion; they now assert the source-reviewed seven fixed rosters and 17 unassigned positions and pass. The remaining full-suite evidence must come from fresh CI or a stable local run; prior full-suite results are not relabelled as current.

## Cycle 36 — independent audit review and repair

Independent review on `26789da` found four reproducible audit issues: dirty filter rerender, stale-tab replacement, protected-note disclosure, and source-record omission from fingerprints. Repairs were added with focused runtime and browser checks. A second review then found a real queued Web Lock race that discarded edits typed after clicking Save. The write path now freezes editable controls and target selection until the lock completes. A browser test holds the actual Web Lock and verifies controls remain disabled and the saved note remains intact. Undo now disables itself immediately after its successful reversal. Fresh full CI and independent re-review are required before the implementation can be considered release-ready.

## Cycle 37 — restore lock and Undo receipt

A second independent pass reproduced a stale Undo pointer after importing a valid audit history and a misleading Cancel action while Restore waited on a lock. Successful restore now clears in-memory Undo and its same-tab receipt; cross-reload Undo requires a receipt matching this tab's last saved event. Import and cancellation controls freeze during writes, and their handlers reject programmatic activation while queued. The updated browser journey uses a consistent imported event, confirms Undo stays unavailable after restore and reload, and tests Cancel under a held real Web Lock. The focused journey passes. Fresh independent re-review and CI are still required.

## Cycle 38 — unsaved Undo guard

Independent review found that Undo could silently discard a note edited after the previous save. Undo now asks before discarding unsaved audit edits; Cancel preserves the draft and saved summary. The browser journey exercises Cancel and Confirm before completing Undo. The 2,012-route build and focused audit browser journey passed. Independent re-review and final CI remain release gates.

## Cycle 39 — reviewer checklist reconciliation

The reviewer found that the workspace backup manifest still marked named run plans as having no restore tool, while the run-plan page already has a guarded import/restore flow. The manifest now directs that module to `/run-plan/`; a focused manifest test confirms the inspected bundle returns the correct destination. This fixes misleading backup guidance without changing saved data or import behavior. A feature080 entry in the asset/rights register now records the authorized local factual collection, provider attribution, transformations, excluded media and public-license boundary; the reviewer-owned source-rights criterion remains subject to its evidence assessment.
