# Feature020 implementation acceptance

2026-10-26. Implementation branch `feat/020-map-workspace-implementation`, based on planning main `407fa56` ([PR23](https://github.com/woodkill00/dmz_guide/pull/23)). This records executed local checks, not deployment or third-party acquisition clearance.

## Delivered scope

T001-T014 and T018-T020 implement all three user stories: four provider identities, shared source/category masks and direct Map key; bounded staged authorized imports, raw inspection, taxonomy, calibrated owned backgrounds and affine opacity comparison; private point/icon authoring; explicit candidate/field review, lineage, history, split/undo and refresh staleness; atomic local persistence, migration, backups and recovery. The native guide database and content are unchanged. Raw records are immutable and unregistered records never receive guessed coordinates.

CODMunity, WZStats and CODCentral ship as reference-only. Their source links and permission requirements are visible; imported declarations cannot enable them. Existing owner-local official resources keep their prior status. No scraped dataset, owner pixels, private backup or original screenshot is included in tracked changes.

## Executed checks

Environment: Windows, Node24.15.0, npm11; tool Playwright1.64.1 / Chromium156.0.8078.4. Native Playwright1.58.2 browsers were installed after an initial missing-executable failure, then native checks passed. Synthetic desktop and360px viewport tests are automated emulation, not physical-device certification.

| Command / gate | Actual result |
|---|---|
| `npm run map:test` | 39 passed,0 failed |
| `npm run map:build` | Strict TypeScript including unused checks and production Vite build passed |
| `npm run map:test:browser` | 30 scenario groups passed;0 runtime errors;0 external requests |
| `npm run map:test:capacity` | Production performance passed; details below |
| `npm test` | Native guide521 passed,0 failed |
| `npm run build` | Native154 routes plus404 built |
| `npm run test:browser` | Native Chromium regression passed |
| `npm run test:engines` | Native Firefox146.0.1 and WebKit26 regression passed |
| `py -3 scripts/check.py` | 0 failures after correcting a documentation encoding error |
| `git diff --check` | Passed |

Browser coverage includes all original019 regression groups plus actual IndexedDB CAS/queued-write quota abort/versionchange, current/previous recovery, atomic one-time migration and machine flag survival; custom point preview/cancel/CRUD/undo/offline reload; inert imported strings; icon normalization/reference replacement/invalid rollback/cancelled stalled decode; gated providers and official compatibility; authored review choices, lineage, refresh/stale/raw evidence inspection, split and undo; private backup transitive redaction and owned corrections; replacement backup gate; source-key-Layers keyboard focus;360px forms and overflow; owned background provenance, invalidated calibration picks, warp and opacity; markers above opaque imagery; mirrored overlay clearing and superseded delayed resource reads; stale multi-tab draft export; locked asynchronous saves; and cancelled search timers across toggles/undo/reload.

Machine-local evidence lives in ignored `tools/hajin-map/.local/browser-checks/`: `results.json`, `capacity.json`, synthetic desktop/mobile screenshots. Owner-local visual smoke uses separately ignored owner assets and is never published. The existing real capture rendered138 markers and21 categories without runtime errors; this is compatibility evidence, not a factual completeness claim.

## Production capacity evidence (T015)

Latest run:2026-10-26T14:36:46Z. Owned Chromium process tree restricted to four CPU cores; renderer heap capped at512MiB. Host has32 logical cores and64GiB RAM. This is an explicitly bounded host run, not a physical8GiB device certification.

Jointly validated rendering fixture:5,000 custom points,1,000 raw records,50 reviewed entities and32 icons. Exact JSON node/byte limits apply jointly, so independent count maxima are not simultaneous promises. Separate source validation covers20,000 records across four providers.

| Measurement | Result | Budget |
|---|---|---|
| Toggle first paint,20 samples after warm-up,p95 |181.5ms |250ms |
| Search first paint,20 samples,p95 |105.6ms |250ms |
| Production comparison worker,20,000 records,five runs |301.7-359.1ms |2,000ms each |
| Dense incompatible comparison,pure algorithm,five runs |115.5-140.1ms |Bounded work |
| Separate20,000-record input validation |174ms |Input caps |
| Durable toggle persistence,independently verified each sample |472.6-524.8ms |Reported separately from UI response |
| Observed renderer JS heap used |70.6MB |512MiB configured limit |

A prior first-paint run failed because full graph validation ran on the main thread. Preparation now uses a bounded worker; optimistic controls render immediately and retain failure drafts. No timing assertion was weakened. Candidate generation stops at10,000 pairs or250,000 examined entries with an explicit narrowing message. Physical low-memory device timing remains unverified; mobile acceptance is functional only.

## Analysis, convergence and independent review

Initial definition passes are preserved in `analysis/pass-001.md` and `pass-002.md`; foundation findings in `analysis/implementation-001.md`. Full implementation findings and remediation are recorded in `analysis/implementation-002.md`. Final read-only artifact analysis, convergence and independent verdicts are recorded in the final reports alongside it. Reviewer-owned checklist approval concerns requirements quality and is not self-awarded runtime approval.

Provider permission/coordinate research is a future external gate. No live harvesting, public/share export, deployment, game-file inspection, accounts, line/polygon geometry or collaboration is delivered or claimed. Backups deliberately omit restricted raw/derived content and all background pixels, with explicit missing dependencies; private authored points/icons remain usable. Export before changing browser profiles or preview ports.

## Local capture/right-click follow-up

User explicitly confirmed permission to collect the three named providers in this session. Actual captures and source icons are ignored local resources, not distributed assets. Local viewer shows543 records across four sites with60 category entries: official138/21, CODCentral194/15, CODMunity103/10, WZStats108/14. A disposable browser confirmed independent source hiding (CODMunity off leaves440 records), successful image loading and0 page errors/provider HTTP requests. Local `blob:` URLs are local resources, not external requests.

T021 adds actual right-button placement: canonical coordinates, unsaved POI default, cancel, retained draft and explicit pick-mode reuse. T022 adds the opt-in bounded manifest, hash-bound registration/capture loading, per-site key masters/category icons, independent counts/masks/reload and source promotion into review. Default CI/checkout has no enabled provider captures; the browser harness explicitly isolates owner-local configuration and tests authorized captures on a separate synthetic origin.

Latest unit suite:40 passed; strict TypeScript/production build passed. Extended browser suite covers32 scenario groups, including all prior journeys, actual right-click behavior, four-source category/master/global controls, reload, changed-marker-digest rejection/retry and staged promotion of all three providers with unknown lineage retained. Runtime errors and external requests must remain zero. See `analysis/follow-up-004.md` for review and final execution status. Native application code remains untouched; prior native/hosted results are historical evidence, not a claim that the follow-up received another hosted run.

Follow-up production capacity rerun passed (2026-10-26T20:44:54Z): toggle first-paint p95=203.7ms, search p95=115ms, five20,000-record worker comparisons157–393.9ms. Same four-core affinity/512MiB renderer limit on64GiB host; no physical8GiB claim. All32 browser groups passed at20:43:49Z, including capture digest rejection/retry and provider promotion.
