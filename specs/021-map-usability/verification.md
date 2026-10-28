# Feature021 acceptance evidence

2026-10-28. Branch feat/021-map-usability, based on feature020 commit1d93ab2. All six user-authorized improvements are implemented in the local map tool. No native guide code, capture assets, private data or external source sites were changed.

## Delivered flows

Find locations / Explore searches source/custom/reviewed locations with paginated keyboard results, details and independent jump highlights. Hidden source selection is not changed; unregistered entries cannot jump. Popups show source/category/notes/coordinates/status, copy fallback and private Edit/flag actions.

Clickable matching-row stars open duplicate names/source positions/distances and representation state. Keep separate is persisted, reversible and bound to source+snapshot+digest+record, never a raw-data merge. Changed/omitted/promoted identities remain inactive. Same-source objects and original matching rules remain protected.

Saved views persist named site/category/search/private/reviewed combinations, support apply/delete and missing-category notices, including correct zero-record category handling. Authored private discrepancy notes support create/edit/resolve/reopen/delete, explicit ownership, dirty-draft protection and backup portability; no external submissions occur.

Completeness labels loaded-data matches, uncertainty, not-found, kept-separate, unplaced and incomplete. Unknown floor/build is uncertain; missing official data disables conclusions.250,000-work overflow never becomes a missing-location claim.

Backup status records initiation only, counts meaningful edits while excluding visibility/search, and gives20-edit/7-day reminders with24h snooze. Local receipt storage failure does not block private editing or downloads. Strict dates reject impossible/future receipt claims; restore/undo/new reset receipts. Portable metadata and exact source/digest omitted dependencies round-trip old/new backups.

## Executed checks

| Check | Result |
|---|---|
| Initial new unit runner before module implementation | Failed missing-module as expected |
| Final npm run map:test |56 passed,0 failed |
| npm run map:build | Strict TypeScript and production Vite build passed |
| npm run map:test:browser |40 scenario groups passed;0 runtime errors;0 external requests (full run01:44:17Z) |
| Additional post-delta standalone synthetic usability run | Seven new feature journeys passed, including exact omission manifests and bounded reminder receipts |
| npm run map:test:capacity | Passed production budgets; details below |
| py -3 scripts/check.py |0 failures |
| git diff --check | Passed |
| Independent definition review | CHK001–004 approved by reviewer after DEF021-01..03 repairs |
| Independent domain/UI/visual reviews | All actionable findings repaired; focused re-reviews clean |

New browser coverage includes custom Edit/move clearing highlight; hidden-result jump preserving masks; clipboard failure fallback; literal star controls; keep-separate save/reload/reverse; saved view apply/delete; no false missing notice for empty categories; private flag CRUD and resolve/delete draft guards; completeness uncertain/not-found separation; backup initiation/snooze/reload, browser storage denial, private backup restore with inactive references;360px keyboard input and screenshots. Existing33 map scenario groups remain passing. Standalone runner is ignored scaffolding; the same exported test function is chained into the normal tracked browser runner.

Units additionally cover version/count/name/reference bounds, old/new schema1 backup support, source/digest identity changes, exception bridging prevention, strict UTC dates and24h receipt bounds, exact edit labels, work-cap incomplete classification and same-snapshot-ID/different-digest dependency retention. No assertion was removed or weakened to obtain a pass. Bugs/reproduction fixes are in analysis/implementation-001.md.

## Performance and environment

Windows, Node24.15.0, npm11, Chromium156.0.8078.4 via pinned Playwright1.64.1. Production capacity run2026-10-28T01:41:44Z: four CPU cores enforced for the owned browser tree,512MiB renderer heap on32-logical-core/64GiB host. Fixture5,000 custom points,1,000 source records,50 reviewed entities,32 icons, joint node/byte limits validated; separate20,000-record source/worker fixtures.

Toggle first-paint p95=216.1ms and search p95=163.9ms (20 samples each,<=250ms). Five production worker comparisons389.9–492.1ms (<=2s each). Durable toggle saves separately verified302.4–636.1ms. Data remains revision-checked; no claim that disk commits meet first-paint timing.56-unit/latest delta verification followed this core-feature performance run; final UI wording/digest-omission/receipt bounds do not change the measured toggle/comparison algorithm.

Synthetic desktop/360px screenshots were inspected by implementer and independent reviewer: readable controls, visible focus, no horizontal overflow observed. Physical8GiB/mobile devices are not certified. Owner-local real map smoke is read-only; assets/screenshots stay ignored and are never CI artifacts.

No native application modules changed. Prior feature020 native tests/hosted checks are historical evidence, not fresh native-run claims for021. Hosted checks for the new branch are separate from these executed local results. Public deployment, game-data accuracy/completeness and redistribution are not claimed.

## Final convergence repair

C021-01/T009 adds editing of authored notes while their exact source capture is inactive/omitted. The restore→inactive Edit→save regression passed in the standalone synthetic browser flow, alongside all other new journeys. Independent UI re-review reported no findings; reference identity remains inactive and no source facts are invented. Source record metadata and copied content remain external. Final production build was rerun after this UI repair.
