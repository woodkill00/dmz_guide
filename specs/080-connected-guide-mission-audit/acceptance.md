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
