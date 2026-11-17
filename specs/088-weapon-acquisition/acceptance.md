# Weapon acquisition acceptance — 088

Branch `feat/088-weapon-acquisition`, based on the committed 087 dashboard `191332c`. Local Windows / Node 24 / Python 3.14.4 / Playwright 1.58.2. Synthetic player records only. No account access, downloaded game images or private inventory is committed.

## Delivered behavior

`/armory/acquisition/` lists 35 source-backed released weapon identities and 85 researched named blueprint ownership entries, with 9 source references checked 2026-11-17. Scope is a dated, incomplete blueprint snapshot; announced stores and reported rewards remain qualified. Launch identities and the two Season 1 identities are separate from combat-stat admission. Melee manual/camo applicability is labelled unverified.

Each weapon opens independently to manual ownership, extracted-Weapon-Manual count, +/− and explicit correction, known blueprint checkboxes, source methods/links and custom owned names. Unknown counts stay unknown until entered; purchases/ownership do not invent extraction counts. The reported three-manual War Spoils goal is not an automatic in-game reward grant. Exact normalized final ownership keys are unique in source; new edits share matching with the workbench while preserving unrelated legacy/custom/archived names.

Optional private manualExtractions metadata stays in the existing armory envelope, revision transaction, previous snapshot and backup format. No automatic migration/reset. Failed saves retain an absolute candidate/original expected revision for export/retry; stale saves cannot replace newer data. Successful commit acknowledgement is separate from painting. Stable row nodes, bounded validation, preserved drafts/expansion/scroll and action-aware focus recovery cover keyboard and WebKit pointer behavior. Dashboard and shared navigation link exact focused rows, including Season 1 identities without fabricated combat pages.

## Executed checks

- `npm test`:1052/1052 PASS, no skipped/canceled tests,437513.8112ms (`67360`, `.local/runtime-088-final.log`). Subsequent narrow focus and reserved-ID repairs have targeted/browser receipts below.
- Focused armory/acquisition/build-identity/snapshot/registry files:37/37 PASS (`85802`, terminal `3cfc 46`). Latest acquisition bounds/normalization/backup/legacy tests:5/5 PASS (`db 2665`, after reserved-ID hardening and final method wording).
- Clean-source Python unittest discovery:79/79 PASS,543.166s (`5300`, `.local/python-088-clean.log`). Uses the tracked-source plus new-feature snapshot with the required Acorn package, excluding ignored private caches/assets; no test or assertion was removed. The original all-folder fixture copy was stopped after an identified source-inventory fixture failure, then that fixture was repaired and the unchanged suite rerun. Later focus-only UI changes are covered by final browser runs and actual root packaging.
- Classic acquisition journeys, `node tests/browser/weapon-acquisition-run.mjs --engines --a 11y`: Chromium/Firefox/WebKit PASS (`10514`, initial `effed 3`, terminal `a 86c 03`). Includes 35/85 roster, no-write discovery, legacy unknown,0→1→2→3→2 persistence, actual blueprint/counter saves, custom duplicate/filter/removal, invalid queries, Season 1 navigation, owning workbench/dashboard/backup parity, keyboard/focus/scroll, quota/retry, held-success/failure newer intent, stale CAS rejection, retained corrupt envelope and denied storage. Geometry at 320/390/768/1280/1920 and 200%text; seeded dark/light axe scans report zero violations.
- Modern acquisition journeys: all three engines + axe PASS (`18618`, initial `fc 2cbf`, terminal `989fac`), including final WebKit action-origin/focus fallback. The later invalid-query assertion was added and exercised in the classic run; the shared controller has no variant-specific query logic.
- Dashboard regression with seeded axe scans: all three engines PASS in classic (`95826`/`d 43329`) and modern (`11282`/`185d 1f`).
- Existing armory workbench regression: all three engines PASS (`99312`, final `ff 833d`), including legality, real raster handling, private saves/share/import/restore/stale/quota and 40 responsive/text layouts per engine.
- Modern build 55188 (`574e 50`) and final classic build 96098 (`a 5e 367`): PASS,2043 independent HTML routes plus 404.
- Actual final packaging 82286 (`c 9f 63a`): PASS,2326 fully inventoried payload files. Release verification receipt follows below.
- Format check: PASS (`db 2665`). Repository checker:0 failures (`fc 2cbf`). `git diff --check`:PASS. Local acquisition route returnsHTTP 200 (`cb 0131`).

Synthetic desktop/mobile PNGs remain ignored under `test-results/acquisition-*`; no WebKit screenshots per existing policy. Independent reviewer inspected source, focused Chromium and screenshots separately from parent-run receipts; see reviewer-owned implementation checklist for final disposition. These checks do not claim gameplay verification or arbitrary-device coverage.

## Analysis/convergence fixes and delivery boundary

Planning repaired source bounds, final owned-name collisions and missing Season 1 combat destinations. Implementation repaired save-focus loss/light contrast, newer search intent, filtered custom removal and WebKit's neutral MAIN focus state. Explicit byte/node/reserved-ID fixtures complement scalar/semantic admission. New catalog source dependencies and registry 87 admission were added to owning fixtures without altering the historical 071 baseline 83.

Actual packaging exposed inherited 087 dashboard JSON bypassing output inventory; emit now registers it, and acquisition JSON joins both build-source and Python package-source inventories. Actual PR39 logs showed ubuntu 26.04 rejected by pinned Playwright 1.58.2; affected quality/focus Linux jobs are pinned 24.04 with unchanged required check labels, steps, dependencies and timeouts. Cross-platform CI on the final pushed head is a separate gate; no remote pass/merge is claimed here.

Final repository check after documentation fixes:0 failures (`fc 2cbf`). Final source/data wording is admitted by the focused 5-test suite. Final default build servesHTTP 200. The public method text clarifies that BlackCell DMZ kills/exfils award points, rather than implying a number of required exfils. All final source changes are included in actual root packaging 82286.

Actual clean release verification35239 (`10f086`):PASS,2326 file hashes, native links, owned Node child and exact content. No helper leakage or payload exclusions were used.

Final combined gate45651b: repository0 failures, fullformatPASS and diffcheckPASS. Clean extraction verification35239/10f086 PASS:2326 file hashes, native links, owned Node child cleanup and exact content. Reviewer-owned implementation checklist is complete for scoped local acceptance. No remote CI, merge or public release pass is claimed.

## T016 dashboard amendment — manual goals
User-requested change: Home now titles the section Weapons with a native heading link to `/dmz-weapons/`. Known-roster weapons appear when their manual is not marked collected or their recorded extraction count is absent/below3. Unsaved roster identities appear too; completed collected3+ entries leave the preview. Known counts show max(0,3-count) more extractions; unknown counts show3to-record with a not-entered qualifier, never an invented savedzero. Blueprint names and attachment totals are absent from this section and remain available in the acquisition workspace. Archived private records remain stored; blocked/empty data never claims completion.

Targeted runtime:13/13 PASS (dashboard8 plus acquisition5), chunk89e911. Independent dashboard runtime8/8 PASS is recorded by reviewer. Modern dashboard all3engines+axe:33641, terminal5929ce PASS. Classic dashboard all3engines+axe:52275, terminal330fb1 PASS. Each includes actual heading navigation, missing/new/legacy/explicitzero/3+/complete, absent/denied/empty sources, no private blueprint leakage and existing collection/refresh/persistence regressions. Acquisition owner all3engines+axe passed in classic34682/7e5cb2 and modern50429/d68aed, with expanded manual preview navigation updated. A Firefox test first observed the destination before navigation settled; its oracle now waits for both the exact URL and visible destination heading.

Modern14333/ce02bb and final default43188/e7cc85 builds:2043routes+404 PASS. Fullformat/diff e98895 PASS; repository checker89e911:0failures. Existing local guide857805:HTTP200. Modern desktop screenshot visually reviewed. No player-store write or schema change. Earlier full-suite/Python/release receipts above remain historical; this amendment's exact validation is the scoped runtime/browser/build/checker/format set here, not a claim of a newly packaged ZIP or final remote CI pass.
