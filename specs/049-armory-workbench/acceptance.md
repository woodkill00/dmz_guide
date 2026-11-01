# Feature049 acceptance

Status: implementation and automated verification complete. Independent review and clean local build identity are recorded separately below and in the reviewer-owned checklist.

## Implemented scope

- FR001: scoped two-to-four weapon comparison; private observations require explicit, matching full contexts.
- FR002/005: compatible saved loadouts, bounded previewed imports/exports and source-backed individual attachment advice.
- FR003/006: private measurement evidence with normalized screenshots; manual, attachment and blueprint tracking with public MW4 DMZ references.
- FR004: opt-in loopback dashboard with fixed check/apply/rollback/build actions, exact reviewed proposal binding and recoverable rollback journal.
- FR007/008: separate CAS IndexedDB storage, bounded validated backups, retained failed-save candidates, navigation and compact responsive controls.

## Verification record

Initial domain tests: 7 passed. Initial manager API tests: 5 passed. Python transaction/parser/security tests: 33 passed, including failures before and after rollback promotion.

Initial Chromium/Firefox/WebKit workflows passed build save/rename/export, attachment legality, acquisition, real screenshot normalization and persistence, explicit private comparison, backup cancellation/superseding reads, stale-tab CAS and quota recovery. Each engine exercised 40 workbench layouts, eight dashboard layouts and 48 existing armory layouts. Strict browser health checks passed.

Independent review requested additional stale shared-import error and game/mode reference repairs. Both are implemented with regressions. Visual inspection also caught misleading advice caused by disabled FormData fields; direct control reads fix it. The final negative-image test exposed hidden active restore errors; generation-aware reporting fixes it. Repository checks initially found this acceptance link missing; this document repairs that finding. Early failed runs are retained as failures, not counted as passes.

Final receipts (2026-11-01, Windows, Node24):

| Gate | Result / local receipt |
| --- | --- |
| Full runtime | 718 passed, zero failures/skips; `.local/armory049-runtime.log` |
| Python | 33 passed; `.local/armory049-python2.log` |
| Final manager security | Five tests passed with added actual Host, missing Origin, 4096-byte body and duplicate-key checks; `.local/armory049-security-final2.log` |
| Final workbench | Chromium/Firefox/WebKit passed, 40 layouts each; `.local/armory049-final-workbench3.log` |
| Manager and existing armory | All three engines passed; eight manager and 48 existing armory layouts each; `.local/armory049-engines4.log` |
| Navigation | All three engines passed; `.local/armory049-navigation2.log` |
| Accessibility | 48 WCAG A/AA scans, zero violations; `.local/armory049-axe2.log`, `test-results/armory049-axe.json` |
| Live official check | Guide-to-dashboard link and explicit check passed: zero added/corrected, 65 unchanged, no owner apply/rollback; `.local/armory049-live.log` |
| Repository/format | Zero repository failures, Prettier passed; `.local/armory049-check3.log`, `.local/armory049-format3.log` |
| Builds | Reader830 routes plus404, map TypeScript/Vite passed; `.local/armory049-build8.log`, `.local/armory049-map-build.log` |

Accessibility probes alone use a CSP-bypassing context for axe injection; functional workflows use the normal strict policy and monitor console/script/request errors. Existing map bundle-size advisory remains. No dependencies changed. Source files matched the tested build identity before commit; final clean-build equivalence is checked after the local commit. The late browser-only reporting repair is covered by all three final workbench runs; it did not change the Node/Python domain or manager paths covered by the aggregate tests.

## Limits

Browser experiments are synthetic QA, not real DMZ measurements. Compatibility and source effects retain their original scope; no exact combined-stat prediction, TTK, new verified drop location or unlock fact is invented. Manager mutation tests use disposable databases. Private data is origin-local and requires backups; the updater is manual and depends on supported official source layouts.
