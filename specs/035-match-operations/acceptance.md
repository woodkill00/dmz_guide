# Acceptance evidence

Executed locally on2026-10-30 against feature035 using disposable synthetic browser profiles. Original owner workspace data and downloaded provider assets are not acceptance fixtures or committed artifacts.

| Scope | Executed evidence | Result |
| --- | --- | --- |
| FR001/002 | Road attestation rejection/acceptance, graph-change stale overlay protection, saved checklist issue, practical gameplay worksheet | Synthetic checks pass; real gameplay not executed |
| FR003/008 | Frozen route/start objectives, separate end progress, temporary mark promotion, cancellation, injected quota failure/exportable candidate/saved-state reload, strict validation and source pinning | Pass |
| FR004 | Actual pointer drag, moved reached-token reset, popup insertion, fresh route duplication, source stop protection and explicit new manual coordinate, worker alternatives | Pass |
| FR005 | Read-only impact calculation, changed capture repair, archived old tracking and reset claims, frozen historical references | Pass |
| FR006 | Duplicate mission labels resolve exact ID, exact road-report navigation and owned POI editor, query bounds/location matching | Pass |
| FR007 | Same-title field changes show coordinates/notes in restore comparison; preview and cancel do not mutate; existing replacement gate stays disabled without backup acknowledgement | Pass |
| FR009 | Full regressions, configured axe,320px panels, review/convergence and build/check evidence below | Pass subject to explicit external boundaries |

Executed commands and receipts:

- `npm run map:test`:139 passed,0 failed/skipped.
- `npm run map:build`: strict TypeScript and Vite build passed. Existing chunk-size advisory remains.
- `npm run map:test:browser`:95 check groups passed, no runtime errors or external requests. Original authoring/grid assertions pass after scoped invisible-popup fix.
- `npm --prefix tools/hajin-map run test:engines`: Chromium156.0.8078.4, Firefox157.0 and WebKit27.2 passed, including session-end quota recovery and six new panels; no recorded violations/errors.
- `node --experimental-strip-types scripts/operations.browser.cjs` from tools/hajin-map: six focused groups passed.
- `npm test`:634 passed,0 failed/skipped.
- `npm run build`:734 independent guide HTML routes plus404 built.
- `py -3 scripts/check.py`:0 failures.
- `git diff --check`: passed (line-ending normalization advisories only).
- `npm run map:test:capacity`, isolated after other suites completed: passed production-build fixture (5000 owned points,1000 source records,50 reviewed entities,32 icons). Source toggle first-paint p95=99.2ms and search p95=52.6ms against unchanged250ms budgets; five worker samples150.2–169.8ms against2000ms. No external requests/runtime errors. Receipt2026-10-30T09:44:13.657Z, four-core affinity/512MiB renderer; not a physical8GiB device.
- Local map5175, guide4173 and Studio4174 each returned HTTP200 after verification.

Raw logs, screenshots and browser JSON receipts are machine-local under `.local/nav-repair/operations-*` and `tools/hajin-map/.local/browser-checks/`; intentionally excluded from Git. Independent definition/source/security/mobile review is recorded in checklists/requirements.md. Reviewed screenshots cover visible panel tops; below-fold controls have automated interaction evidence rather than visual certification.

External boundaries: no actual match, physical-device or screenreader test performed. No claim of road-network completeness, live GPS, safe routes, meters or ETA. Reports require owner observations and become stale when the graph changes. Last backup receipt records a download request, not proof of a file saved to disk. No source collection, public asset publication, push, merge or deployment in this feature.
