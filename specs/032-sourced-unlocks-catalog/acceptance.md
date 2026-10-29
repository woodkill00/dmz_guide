# Local acceptance — source catalog expansion

Date: 2026-10-28. Baseline: main `b3c5d3d0b13b468e08212c004fc5cba966a42c33`.
Status: **local content/domain checks passed; actual browser and visual acceptance NOT RUN; not release-complete**.

## Delivered local scope
- Same catalog/pack/game identity and all original identifiers; contentVersion 2026.10.28.1.
- 28 FOB definitions,37 noncash materials,95 known requirement rows plus 8 null cash rows. Recomputed reference totals 889 material units and 2840000 known cash; full cash unknown.
- 75 recipe-unlock identities with 77 routes; no fabricated executable crafting recipes, ingredients or yields.
- 69 DMZ milestones 2–70 with 90 typed reward claims; no automatic grants or inferred numbered-tier dependencies.
- 113 item identities,172 objectives,376 claims,4 linking guides,12 sources total. Original 8 observations/31 rows/22 labels retained;3 community sources added.
- Vendor I/MIA III unknown cash correction blocks new purchases while prior recorded ledger entries survive explicit rebind and existing guarded reversal.

## Executed checks
- `npm run check`: PASS. Repository checks 0 failures; Node runtime 602 passed,0 failed,1 Windows-only skipped; build 732 HTML routes plus 404 page.
- `python 3 -m unittest discover -s tests -p 'test_*.py'`: PASS,40 tests.
- `npm run format:check`: PASS after browser runner wiring; final affected-file formatting is checked again before commit.
- Focused content/history/refusal tests:27 passed,0 failed; independently repeated by reviewer.
- Content payload 333853 bytes, within existing limits. Portable roundtrip passes unchanged.
- Environment: Node 24.22.1, Python 3.12.14, Linux. No Windows result is claimed locally.

## Failed setup and unexecuted gates
- First `npm ci` failed because default cache directory could not be created; retry with an explicitly writable temporary npm cache succeeded. No dependency version or security setting changed.
- Chromium launch failed before browser assertions: local socket creation was not permitted in the sandbox. The escalated launch could not start because environment setup attempted to create an internal path on a read-only filesystem. No browser sandbox/CSP weakening or alternate bypass was attempted.
- Thus all actual Chromium/Firefox/WebKit journeys, screenshot inspection, mobile visual acceptance and remote CI are NOT RUN for this change. Added browser tests are syntax/static-checked, not passed browser evidence. Authorized CI is the proposed next verification step.

## Independent records
- [Design requirements review](analysis/001-design-review.md)
- [Source facts review](analysis/002-source-data-review.md)
- [Focused implementation review](analysis/003-implementation-review.md)
- [Convergence](analysis/004-convergence.md)

## Publication boundary
Local branch only until explicit public branch/draftPR authorization. No push, PR, merge or deployment is claimed here. Browser/visual gates remain open and cannot be waived by this local report.


## Browser test preparation
The new `tests/browser/sourced-catalog-journeys.mjs` runs through the existing upgrade suite on Chromium/Linux, Chromium/Windows, Firefox and WebKit CI targets. It covers source navigation, unknown prices, route conflicts, spoiler disclosure, level/kit facts, manual progress, no automatic grants and historical rebind. The prior eight-definition/31-row browser assertions remain scoped to the exact original evidence; appended null cash is separately asserted. The actual-pack advice test distinguishes expanded uncertain scope from the preserved original focused arithmetic. Syntax, formatting, static built-route checks and domain fixture preflight are preparation evidence only, not browser pass claims.
