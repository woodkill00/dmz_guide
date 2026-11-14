# Implementation evidence and open work

## First vertical slice — 2026-11-13

Implemented a generated `/missions/audit/` page with 24 scoped Orders page targets, recorded Order/Story section targets, status filters, local editorial save/reload, source-change indication, bounded import preview/export, an undo event and links from Missions/Home/feature navigation. The local editorial state does not change the player's mission progress. At this first-slice baseline, the official starter had zero recorded Order/Story missions, so the page showed 24 unrecorded slots and an empty Story group. The later page-one admission is recorded below.

Verification:

- `node --test tests/runtime/mission-audit.test.mjs tests/runtime/ui-feature-coverage.test.mjs`: 6/6 pass after schema changes.
- `node --test tests/runtime/site-topology.test.mjs tests/runtime/mission-audit.test.mjs tests/runtime/ui-feature-coverage.test.mjs`: 14/14 pass against stable build output.
- `npm run build`: 1,867 generated routes, success.
- `node tests/browser/mission-audit-run.mjs`: empty coverage, Fill later persistence, status filter, keyboard activation and 390px/200% page width pass in Chromium.
- `npm test` after serializing build/test: 998/998 pass, 0 failures, 263.3 seconds.

The earlier 997/998 run overlapped a build that replaced `dist` while the site topology test read it. After the build finished, focused topology tests and the serialized full suite passed. This is recorded as a verification orchestration mistake, not hidden as a product repair.

## Still open

At the first slice, the mission audit still needed full history/restore tests, source-fingerprint migration and stale relink review, spoiler and import-failure browser tests, broader keyboard and text-zoom checks, and independent reviewer checklist approval. Later sections record which checks closed. Connected preparation, match lifecycle, whole-workspace backup, source-change queue, weapon qualifier review, content health, Home refinements and the final cross-page release audit remain open in `tasks.md`. No complete-game mission coverage or full feature acceptance is claimed.

## Connected preparation increment — 2026-11-13

The Collection workbench now shows a short next-action list derived from its existing unfinished-goal shopping projection. Known shortages are ordered before uncertain amounts; tracked missions and next upgrade tiers are labeled, and each item links to its record and the existing Why needed / locations explanation. This projection creates no new stock or game facts. A focused synthetic unit test and the Collection workbench browser journey pass. T009–T011 remain open because the complete mission→item→recipe→key→map journey and exact bidirectional links are not yet implemented and verified.

## Mission health connection — 2026-11-13

Data review now shows the scoped Orders roster gap and the local count of Fill later and stale section reviews, with a direct link to the audit. The browser journey verifies that a saved Fill later status appears in Data review in the same browser context. This does not certify all missions or the wider content-health dashboard in T016.

## Exact record links — 2026-11-13

Record detail lookup is now limited to its own catalog. Direct declared references gain reverse links on non-item details, without name-based inference or protected incoming records. A synthetic two-catalog runtime test verifies the link does not bind to a record from the wrong catalog. The broader relation journey in T010 remains open.

## Regression run after relation work — 2026-11-13

- `npm run format:check`: pass.
- `npm run build`: 1,867 generated routes, pass.
- `npm test`: 1,001/1,001 pass, 0 failures, 248.2 seconds, with stable build output.
- `node tests/browser/run.mjs`: pass; includes Collection, navigation, reader, run-plan, Data review, mission coverage, after-run, 320/390px and connected layout journeys.

The separate new mission-audit browser test also passed. These results cover the shipped increments; they do not close the remaining feature tasks.

## Home next action — 2026-11-13

Home now derives one next listed collection need from the same read-only Collection projection after a valid saved profile loads. It names the missing amount only when known and keeps the selected catalog in its Collection link. Missing, stale or invalid profiles show a recovery state instead of a guessed action. The Home workflow passed in Chromium, Firefox and WebKit with the updated Home module served directly from source during the test.

At this stage, the normal rebuild after the Home edit was pending. An interrupted earlier build left `.build-state/current.lock` and an incomplete candidate, owned by a Node PID that no longer existed. Automatic approval review rejected the verified cleanup command as blocked by policy. The original `dist` remained present. The route-override browser test did not replace a clean release build; the later recovery and clean checks are recorded below.

## Scoped content-health projection — 2026-11-13

Data review now includes listed-catalog coverage counts for Orders, mission sections, recipes, item image references, weapons, keys and locations. Empty recorded domains are explicit. The projection has a synthetic unit test. Its later clean build and browser verification are recorded below.

A Chromium smoke check served the updated Data review HTML, client module and new domain module from source over the retained `dist`: all seven coverage rows rendered for the official starter, with 0/24 recorded Orders pages and no page error. This checks the new view integration but is not a clean release build.

## Interrupted build recovery and clean verification — 2026-11-13

The stopped build PID and paths were rechecked. Automatic approval review again rejected deletion as blocked by policy. The incomplete candidate and lock were moved, without deleting their contents, to ignored `.local/build-recovery-080` (2,084 files, about 50.5 MiB). No previous build tree existed. This reversible move freed `.build-state`; a normal `npm run build` then generated 1,867 routes successfully.

Against the clean build, the mission-audit browser journey, Home workflow and Data review coverage view passed. `npm test` passed 1,002/1,002 with zero failures, and `node tests/browser/run.mjs` completed successfully. The recovery folder is retained for inspection; it is not part of the feature commit. These checks verify the current increments, while the remaining Spec Kit tasks and reviewer-owned criteria stay open.

## Baseline task closure — 2026-11-13

T001 now has a repeatable read-only test of the checked-in official starter: 110 objective records, zero Order/Story records and 24 unrecorded scoped Orders page targets. `research.md` records the map/build scope and why X01 needs a separately reviewed page set. The focused test passed 4/4; this task closure does not imply missing mission content has been imported.

The v1 audit validator now bounds serialized UTF-8 size and history events, normalizes legacy files without revision/history, and rejects malformed embedded history entries. The page requires explicit confirmation before replacing a stale source fingerprint; its browser journey verifies the first save is refused and the confirmed save updates the fingerprint. The focused runtime suite passed 6/6 and the mission audit browser journey passed on 2026-11-13. Quota/cancel recovery and the complete restore contract remain open under T002/T005.

On 2026-11-14 the audit import preview gained added/changed/removed/stale counts and a Cancel action. The browser journey passed valid preview, cancelled import, cancelled restore with an unsaved draft, successful restore, and simulated quota failure retaining both saved bytes and the visible draft. The domain suite additionally passed a synthetic future page-set identity check without asserting X01's real count. T004 is closed; T002/T005 still need the remaining spoiler and full restore-contract checks. No new game facts were imported.

The serialized `npm test` run passed 1,007/1,007 on 2026-11-14 after these changes. `npm run build` produced 1,867 independent routes. The focused audit browser journey passed against that build. The wider T008–T023 work and reviewer-owned checklist remain open.

A subsequent browser regression simulated a delayed file read, cancelled it, then released the read; the preview stayed cancelled and restore remained unavailable. The clean build and focused browser journey passed after this guard. T005 is closed on this scoped evidence; the broader multi-module backup is still T014–T015.

The focused domain suite passed 9/9 after adding import byte-limit and stale-binding retention checks. The browser journey downloaded the private audit JSON and confirmed its note was retained while the audit list omitted that note. T002 is closed on the scoped contract evidence. A full runtime rerun after this test-only addition has not been recorded; the earlier 1,007/1,007 result remains the last full gate.

The audit now links a recorded mission to its private detail and exact local Content Studio record, and an unrecorded page to the selected repository catalog's blank objective form. A catalog without a repository descriptor shows an unavailable authoring message. The browser journey verified the official starter's objective-create URL and the Missions/Site map entry links; focused author-target and inventory tests passed 17/17. A clean build again produced 1,867 routes. These checks close T003/T006, not the broader populated-Story browser journey or mission-source admission.

The serialized runtime suite passed 1,009/1,009 and the full Chromium browser journey passed after the shared author-target change. A separate browser journey routed a fictional training pack with one Order and one spoiler-protected Story Mission; it verified 23 unrecorded slots, private labels absent from list/search, source warning independence, exact Studio link, status/reload, keyboard and 390px/200% layout. Screenshot review led to a neutral audit-row background, and the rebuilt journey passed. T007 is closed on this synthetic evidence; T008 still requires source-backed mission admission.

## First source-reviewed Orders admission — 2026-11-14

`mission-source-review.md` compares the named COD Central and DMZTracker sources. The three agreed page-one Hajin Order identities and paraphrased tasks were admitted as `observed` records with both source IDs. Disputed reward and unlock timing claims were not imported as effects. The official starter now contains 113 objectives: three reported Orders and no Story Missions. The 24-slot Hajin audit shows one recorded page and 23 unrecorded pages. `npm run build` passed with 1,873 routes, and the focused audit domain and browser journeys passed. T008 remains open for review of later pages and Story Missions; current-build gameplay has not been independently verified.

The canonical catalog serializer rewrote only the three new objectives, two new source records and the changed starter pack metadata. The affected catalog/coverage/audit/FOB suite passed 28/28. The serialized full `npm test` rerun passed 1,009/1,009. The first full browser run found two historical 24-unrecorded assertions; after updating both to 23, the focused mission coverage and encounter journeys passed and a fresh full Chromium browser run passed through its final after-run review. `npm run build` again produced 1,873 routes from the canonical source tree. The broader T008 source admission and T009–T023 implementation remain open.

The Collection action list now displays recorded recipe options, key classification and named map areas beside existing shortages and unfinished mission/upgrade causes. Unknown areas are stated plainly. It reuses the existing stock/reserve calculation. The combined Collection/preparation domain suite passed 26/26, and the Collection workbench Chromium journey passed. T009 is closed; exact relation coverage and the full mission-to-map preparation journey remain T010/T011.

Declared catalog links now have synthetic reverse-edge coverage across key/item, weapon, recipe, mission, upgrade, map and location records. A public detail no longer renders a protected or unresolved raw ID as a link or fallback text; the same-catalog guard remains. Focused relation tests passed 4/4. The Collection browser journey passed after asserting named map areas in Next actions; that journey also exercises a fictional mission goal, inventory, recipe selection and an opened map route. T010/T011 are closed on this evidence. The newest detail-link change has not yet had a full runtime/browser rerun.

## Match and content-review increment — 2026-11-14

Field desk now starts a named match bound to the current pack, content version and profile revision. The player can stage stock changes and objective results together, preview the net stock/progress change and confirm through the existing guarded single-profile save. A changed revision refuses the preview. Visited stops appear in the preview only; they are not persisted as map evidence, so T012/T013 remain open. The focused match domain test and the Chromium Field desk journey passed. The browser journey confirmed a named match saved both stock changes and an Order completion, then the existing quantity undo restored stock. Objective completion requires a separate tracker edit to reverse.

Data review now checks broken direct record edges without exposing missing or spoiler-protected target IDs and links an affected record to its exact selected-catalog Content Studio editor. It also queues weapons with no numeric catalog stats or numeric stats lacking a direct source; the Armory comparator continues to separate CODMunity *WZ, official launch, community Multiplayer and private DMZ observations. Focused review tests and the Data review Chromium journey passed. Existing listed-record health rows cover Orders, mission sections, recipes, icons, weapons, keys and map positions. T016/T018/T019 are closed on those checks and existing Armory/CODMunity mode-specific evidence; source-change decisions T017 remain open.

The Data review candidate preview now also lists added, changed or removed source claims with old/new values, source citation/date and catalog-version applicability. A Reject control removes a proposal from that in-memory preview; an Apply link opens the exact existing claim in Content Studio for an explicit authoring action. It does not silently publish or overwrite a claim. Durable decision receipts and patch-proposal integration remain T017 work. Synthetic claim-difference/spoiler tests passed; a clean 1,873-route rebuild and the updated Chromium Data review journey passed.

The full Home regression passed Chromium and Firefox. WebKit passed its journey, navigation, compact layout and dashboard assertions, then strict health found three `due to access control checks` page errors for pack JSON during navigation/race cases. Waiting for Home network idle before two navigation points did not clear those errors. T022/T023 remain open for exact root-cause and cross-engine release evidence; this failure is not counted as a pass.

## Explicit workspace backup increment — 2026-11-14

`/workspace-backup/` combines only JSON files selected by the user. Its versioned manifest records source module, owner origin, byte length, SHA-256 digest and omitted modules; an import recomputes each digest and offers a checked module file plus its owner restore page. The page never writes another origin's storage. It explicitly says owner tools validate and restore separately and that requesting a download is not proof it was saved. Named run plans gained their own export, bounded import preview, Cancel and guarded restore to fill a previously missing module path.

The workspace manifest domain round-trip/tamper test passed, a clean build generated 1,874 routes, and Chromium journeys passed for bundle round-trip/malformed rejection and run-plan backup restore. T014 is closed on this explicit handoff model. T015 remains open for the full multi-module failure matrix and per-owner outcome audit; the bundle page itself does not claim an atomic restore or reconstitute omitted map captures/photos.

Run plans now offer a separate map handoff JSON download when the live map window is blocked or times out. The map's file importer validates the same bounded run-plan contract and offers Accept/Decline before displaying stops. Guide and map builds passed; the Guide run-plan browser journey and the map's collection/run-plan import journey passed in Chromium, Firefox and WebKit. A synthetic competing save during run-plan restore was rejected and the newer saved plan remained. T013/T015 remain open for the remaining offline/wrong-origin/changed-capture and multi-owner failure cases.

Field desk now loads saved preparation plans for a named match and stores the selected plan ID/revision with the match receipt. Player-reported visited stops and objective before/after states survive reload. The match undo checks that stock and objective results still match the saved event, then previews one combined profile reversal; later edits are refused. The quantity journal points match events to this combined undo. The focused match tests and Chromium Field desk journey passed, including a saved plan, stop evidence and combined stock/objective reversal. T012 is closed on that scope; it does not assert that a plan's map stops were actually visited.

The map transfer negative matrix passed: the Guide run-plan journey simulated a blocked map window and kept its downloadable fallback; a real popup with a foreign opener origin and valid nonce was ignored; a synthetic map source rename made the old area list-only and disabled route creation; and a run-plan file Decline left the map unchanged. The live Field desk nonce/source handshake passed, the map import journey passed Chromium, Firefox and WebKit, and map TypeScript typecheck passed. T013 is closed on these bounded transfers. A renamed area can be reselected only after a fresh reviewed map plan; no stale coordinates are transferred.

The backup failure matrix now includes a downloaded module byte-for-byte matching the selected profile, version-0 and tampered bundle rejection, and an unchanged module list after invalid imports. The earlier Mission audit browser journey simulated quota denial while keeping its saved bytes and visible draft; the Run-plan browser journey simulated a competing save and retained the newer plan with a “not saved” status. The bundle page states that no module is restored by inspection or download and sends each checked file to its separate owner. T015 is closed on this separate-transaction contract; it does not claim cross-origin atomic restoration.

Data review source decisions now bind to the SHA-256 digest of the exact candidate catalog file. Reject and Studio-open decisions survive page reload without changing the active catalog or private plans. A Studio-open decision becomes “Verified in current catalog” only after that catalog's claim value and status match the proposal; the synthetic browser journey exercised that transition. The source claim queue retains old/new values, citation, source date and build qualifier. The existing official weapon patch proposal dashboard remains its separate explicit apply/rollback owner and is linked from Data review. T017 is closed on this two-owner workflow; opening Studio alone is never described as an applied source change.

The named source audit now has 72 COD Central article rows staged as editorial candidates and six Story Mission identities/short objective labels corroborated against individual DMZTracker pages. Those six are admitted as `observed`, spoiler-protected records without Orders page assignment, rewards, prerequisites, item counts, effects or coordinates. The official starter has 119 objective records: three reported page-one Orders, six reported Story Missions and 110 previously existing records. The 24-slot Hajin audit still shows 23 unrecorded pages. The canonical build generated 1,886 routes, the focused catalog/audit suite passed 26/26, and the audit browser journey passed. T008 closes on source review and truthful coverage, not a complete or current-build-verified mission catalog.

The Home projection already shows one guarded next collection action and navigation recents, including unavailable/stale states. The Home regression run passed through its Chromium and Firefox stages when this note was written; T020 is closed on the existing Home workflow evidence. The serialized runtime suite passed 1,012/1,012 earlier in the turn, before the later match and weapon-review additions. Those later additions have focused domain/browser evidence but still need a final complete rerun.

## Release readiness audit — 2026-11-14

All T001–T023 implementation tasks are checked against shipped behavior and test evidence. The final serialized guide runtime suite passed 1,022/1,022; the map runtime suite passed 243/243. Guide and map production builds passed. The full guide Chromium browser acceptance suite passed its final after-run review, including 320/390px layout, 200% text, keyboard and reduced-motion cases, 5,000-item collection behavior, 54 connected layout cases, source review, plan handoff and navigation. The map Chromium browser suite passed source layers, selection, private edits, X01 and mobile checks with no runtime errors or external requests. Focused mission-audit, workspace-backup and Field desk browser journeys also passed. `npm run format:check` and `git diff --check` passed. These are automated and local visual checks, not independent review or physical-device certification.

Content coverage is intentionally bounded: the official starter contains 119 objectives, including three reviewed page-one Hajin Orders and six reviewed Story Mission identities/short steps. The remaining 23 Hajin Orders pages are unrecorded; later-page chapter assignments, rewards, prerequisites, item counts, coordinates and current-build gameplay remain unverified. Story records are spoiler-protected and show source/build uncertainty. The source review log retains candidate-level decisions without treating a Studio link as an applied change. Map source rights were confirmed by the owner in this conversation; the feature adds no newly authorized provider collection. Private backup requires explicit file selection and separate owner restorers; it does not promise atomic cross-origin restore or a saved download merely because the browser requested one. Selected-pack links and source repair links passed the topology and browser checks; no complete-game catalog claim is made.

The remaining release gates are independent review of the reviewer-owned checklist and human examination of representative visual screenshots. Real-game verification and source updates are ongoing editorial work and cannot be certified by synthetic tests. This record does not self-approve those criteria or authorize a claim that main has been merged.
