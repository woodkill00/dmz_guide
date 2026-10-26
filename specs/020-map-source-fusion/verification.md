# Implementation evidence: foundation checkpoint

2026-10-26. Branch `feat/020-map-workspace-implementation`, based on main planning merge `407fa56` ([PR23](https://github.com/woodkill00/dmz_guide/pull/23)). Main and the local main checkout were fast-forwarded after all eight PR checks passed. No feature020 implementation is merged into main by this checkpoint.

## Implemented scope

T001: TypeScript snapshot/frame/applicability contracts; strict bounded inert JSON validation; immutable snapshot parsing; source-scoped identity and aggregate capacity checks; synthetic fixtures. Source authorization and coordinate registration remain separate later gates.

T002: Dedicated `dmz-map-workspace` database; CAS revision commits with atomic current/previous states; draft retention/export after failed writes; previous-state recovery; closed/versionchanged connection handling; pure legacy-mask preview and revision-bound one-time marker/state migration. UI integration comes later. The backup codec will supply its full rights-aware envelope projection in T009; current storage admission measures its supplied projection exactly.

T018: Cross-platform discovery of all unit test files; browser workspace entrypoint chained to existing synthetic harness; capacity script and root alias. Deliberate failures in all three runners returned exit1, and were removed/restored before final passing verification. Root map:test avoids running bounded-input tests twice now that discovery includes them.

## Checks actually executed

Environment: Windows PowerShell, Node24.15.0, npm11, Playwright Chromium156.0.8078.4 (pinned Playwright browser1248). Desktop headless and360px viewport emulation; no physical device claim.

| Check | Result |
|---|---|
| Initial new input/store tests before implementation | Failed with missing-module errors as expected |
| IMP-001 array-boundary regression before fix | Failed as expected; passed after fix |
| `npm run map:test` |16 passed,0 failed; includes all4 original tests |
| `npm run map:build` | Typecheck and production build passed |
| `npm run map:test:capacity` |4 synthetic sources,20,000 records validated,135ms measured run; no comparison/rendering acceptance claim |
| `npm run map:test:browser` |14 scenario groups passed;0 runtime errors and0 external requests |
| Deliberate unit/browser/capacity runner failures | Each exited1; temporary probes removed, browser source restored, final normal suites passed |
| `py -3 scripts/check.py` |0 failures |
| `npm test` (native guide) |521 passed,0 failed |
| `npm run build` (native guide) |154 routes plus404 built successfully |
| Independent foundation review | IMP-001 fixed; re-review clean, reviewer independently ran16 unit tests and typecheck |

Browser evidence covers direct Map key before Layers, source/category masks and reload, mobile fit/focus, missing/malformed/oversized source recovery, raster decode timeout, independent source visibility, actual IndexedDB revision conflicts, quota abort after a queued write, unchanged current/previous states, draft export, previous-state restoration, reopen, versionchange, failed migration rollback, marker/state atomicity and no legacy writes. All data/pixels synthetic; local browser outputs remain ignored.

## Remaining work

T003-T017 remain open. Source registration/import, calibrated imagery comparison, shared workspace visibility integration, custom authoring/icons/backups, fusion/review UI and full capacity/regression/convergence acceptance are not implemented. New providers have no enabled acquisition. No original gameplay data/assets or personal state are included in this commit. No full-feature convergence or complete-feature approval is claimed.
