# Acceptance — source catalog expansion

Date: 2026-10-28. Baseline: main `b3c5d3d0b13b468e08212c004fc5cba966a42c33`.
Historical local status: **content/domain checks passed; local browser launch blocked**. Current integrated status is below; not release-complete.

## Delivered local scope
- Same catalog/pack/game identity and all original identifiers; contentVersion 2026.10.28.1.
- 28 FOB definitions,37 noncash materials,95 known requirement rows plus 8 null cash rows. Recomputed reference totals 889 material units and 2840000 known cash; full cash unknown.
- 75 recipe-unlock identities with 77 routes; no fabricated executable crafting recipes, ingredients or yields.
- 69 DMZ milestones 2–70 with 90 typed reward claims; no automatic grants or inferred numbered-tier dependencies.
- 113 item identities,172 objectives,376 claims,4 linking guides,12 sources total. Original 8 observations/31 rows/22 labels retained;3 community sources added.
- Vendor I/MIA III unknown cash correction blocks new purchases while prior recorded ledger entries survive explicit rebind and existing guarded reversal.

## Original isolated checks (2026-10-28)
- `npm run check`: PASS. Repository checks 0 failures; Node runtime 602 passed,0 failed,1 Windows-only skipped; build 732 HTML routes plus 404 page.
- `python 3 -m unittest discover -s tests -p 'test_*.py'`: PASS,40 tests.
- `npm run format:check`: PASS after browser runner wiring; final affected-file formatting is checked again before commit.
- Focused content/history/refusal tests:27 passed,0 failed; independently repeated by reviewer.
- Content payload 333853 bytes, within existing limits. Portable roundtrip passes unchanged.
- Environment: Node 24.22.1, Python 3.12.14, Linux. No Windows result is claimed locally.

## Historical local setup failures
- First `npm ci` failed because default cache directory could not be created; retry with an explicitly writable temporary npm cache succeeded. No dependency version or security setting changed.
- Chromium launch failed before browser assertions: local socket creation was not permitted in the sandbox. The escalated launch could not start because environment setup attempted to create an internal path on a read-only filesystem. No browser sandbox/CSP weakening or alternate bypass was attempted.
- At that local checkpoint, actual Chromium/Firefox/WebKit journeys, screenshot inspection, mobile visual acceptance and remote CI were NOT RUN. Added browser tests are syntax/static-checked, not passed browser evidence. Authorized CI is the proposed next verification step.

## Independent records
- [Design requirements review](analysis/001-design-review.md)
- [Source facts review](analysis/002-source-data-review.md)
- [Focused implementation review](analysis/003-implementation-review.md)
- [Convergence](analysis/004-convergence.md)

## Publication boundary
The owner subsequently authorized publication and merge. Integrated work is published in draft [PR #28](https://github.com/woodkill00/dmz_guide/pull/28). Authorization is not evidence of successful CI or merge: final repaired-head CI and post-merge verification remain pending. No deployment is claimed.


## Browser test preparation
The new `tests/browser/sourced-catalog-journeys.mjs` runs through the existing upgrade suite on Chromium/Linux, Chromium/Windows, Firefox and WebKit CI targets. It covers source navigation, unknown prices, route conflicts, spoiler disclosure, level/kit facts, manual progress, no automatic grants and historical rebind. The prior eight-definition/31-row browser assertions remain scoped to the exact original evidence; appended null cash is separately asserted. The actual-pack advice test distinguishes expanded uncertain scope from the preserved original focused arithmetic. Syntax, formatting, static built-route checks and domain fixture preflight are preparation evidence only, not browser pass claims.

## Integrated acceptance checkpoint — 2026-10-29

See the shared [integrated verification ledger](../033-navigation-item-directory/analysis/004-integrated-acceptance-checkpoint.md) for exact artifact identities, reviewed pixels, retained failures and final pending gates. Actual Chromium and Firefox source journeys have run; the historical local launch failure above is not the current remote execution status.

Canonical normalization at local `5d3758a` preserves parsed values and array order in all 649 affected JSON files. Independent catalog/source/content/spending regression review: **44 passed, zero failed/skipped**. Published pack bytes are already canonical, so normalization does not change pack IDs, contentVersion, published digests or private state. The repository revision intentionally changes; an open Studio draft must reconcile/reload rather than bypass its stale-revision check. Final Windows behavior after this repair is pending CI.

## Repaired implementation accepted — 2026-10-29 22:01 UTC

Head `7a0b4caf28e388aa5ffb11c3311fc5c4884e05cf` passed all nine jobs: quality run [40959670904](https://github.com/woodkill00/dmz_guide/actions/runs/40959670904) and map run [40959671130](https://github.com/woodkill00/dmz_guide/actions/runs/40959671130). This includes Windows Studio save/restore and packaging, Ubuntu full pipeline, Firefox/WebKit browser/Studio, Node 24, repository checks and all map checks. The above pending repair checkpoints are historical, now resolved by these results. Independent source/domain and actual pixel reviews are recorded in the shared ledger. Implementation verification/convergence is complete; final documentation-head CI, authorized merge and post-merge results are tracked in [PR #28](https://github.com/woodkill00/dmz_guide/pull/28) and must pass before delivery is declared complete. No application, catalog or test changes follow this successful implementation checkpoint.
