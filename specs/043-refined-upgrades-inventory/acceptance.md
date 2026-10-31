# Feature 043 implementation acceptance

Status: accepted for local delivery. All automated gates and final independent review passed. No push, merge or deployment is included. The reviewer-owned final receipt is in [the requirements checklist](checklists/requirements.md).

## Scope and traceability

| Requirements | Implemented behavior and evidence |
| --- | --- |
| FR001–003, FR007–008 | Compact grouped stock rows, stable numeric controls, independent reserves, unknown versus explicit zero, explicit Save/Cancel, consumed/retained previews, density and 50-row windows. Browser tests cover raw partial-number preservation, invalid offpage recovery, sticky-footer focus visibility, stale-validation cleanup and durable stock preservation. |
| FR004–006 | `/upgrades/` reuses the existing progression/profile/purchase controllers. Track adds an ordinary goal once. Details retain evidence, authored tiers, listed costs, manual state and explicit purchase confirmation. The advisory table labels the focused unfinished prerequisite chain, consumed/retained quantities and contributors. |
| FR009 | Compact Keep/Search retains the existing engine; item/reference links preserve catalog identity. Guide and map stores remain separate. Shared navigation includes Upgrades on all 736 generated HTML files and live guide/Studio/map/help surfaces. |
| FR010–013 | Per-snapshot direct-use indexing, complete-endpoint spoiler projection before grouping/search/counts, independent recipe/objective/output deduplication, explicit track/role badges, authored sections/Other, category/use filters, source/name sorting, responsive Uses disclosures and 50-reference pages. Successful mission progress saves immediately reproject completion badges; canonical legacy consumption fields are preserved. |
| SC001–003 | Responsive themes/text resizing, keyboard geometry, persistence, recovery, three engines, actual 5,000-item catalogs and retained performance budgets are exercised below. Long names, warnings, expanded details and enlarged text may grow naturally. |

## Executed gates

| Command or check | Result |
| --- | --- |
| `node --test --test-concurrency=4 tests/runtime/*.test.mjs` | **644 passed, 0 failed, 0 skipped**, 175,518.9 ms. |
| `npm run test:browser` | **Passed**: complete Chromium acceptance, including native progression/planning, spending, imports/assets, conflicts, drafts, backups, recovery, reader navigation, mobile/no-JS and console/CSP health. |
| `npm run test:engines` | **Passed**: complete Firefox and WebKit suites, including the new inventory/upgrade journeys and all existing safety assertions. |
| Exact 5,000-item grouped inventory | **Passed in Chromium, Firefox and WebKit**: an admitted 5,000-item catalog mounts only 50 items across sections; filtering, sorting, collapsing, uses paging, invalid drafts, Save/Cancel and logical focus remain correct. No content limit was raised. |
| WebKit cancellation diagnostic | **100/100 fresh contexts passed**, attempts 1–100; original exact two-second focus and durable-state assertions retained. No retry-until-pass behavior. Default aggregate suite still runs its original five contexts. |
| `npm run map:test` | **176 passed, 0 failed**. |
| `npm run build` | **735 routes plus 404**, 736 generated HTML files. |
| `npm run map:build` | **Passed**; Vite retains its existing >500 kB chunk-size advisory. |
| `py -3 scripts/check.py` | **0 failures**, including the final documentation check. |
| `npm run format:check` | **Passed** after final test formatting. |
| Actual metadata font-floor checks | **84 cases in each engine passed**, preserving the original thresholds and actual 200% root-text checks. WebKit uses functional/geometry evidence under the pinned CSP/tool policy. |
| Axe-core production-page checks | **18 checks, 0 WCAG 2A/AA/2.1 AA violations**: two views, four widths, two themes, plus two expanded mobile views. This is automated evidence, not formal certification or physical-device/screen-reader testing. |
| Navigation and local services | Generated pages contain Upgrades navigation; guide inventory/upgrades (4173), Studio (4174), map and map help (5175) returned HTTP 200 with shared navigation. |

The unchanged advisory capacity benchmark uses **5,766 roots, 50 measured runs and a 250 ms p95 limit**:

| Engine | Final p95 | Maximum | Material page bound |
| --- | ---: | ---: | ---: |
| Chromium | 21.7 ms | 23.6 ms | 50 |
| Firefox | 203 ms | 208 ms | 50 |
| WebKit | 61 ms | 68 ms | 50 |

The earlier Firefox 75 ms receipt is not the final run. Parallel attempts hit unchanged build/readiness/performance timing assertions; serial gates passed without relaxing their thresholds or timeouts.

## Review and fix cycle

Independent review closed hidden-other-input references, canonical legacy completion, unknown-stock Missing display, partial-number coercion, mobile action overlap, sticky-footer focus occlusion, stale validation notices and WebKit keyboard-link skipping. Regression tests preserve invalid numeric state rather than erasing saved stock, and exact-record navigation preserves dirty drafts. Reviewer-owned journeys deliberately open disclosures; original safety assertions remain intact.

The final WebKit cancellation investigation distinguished actual user access from programmatic focus on an offscreen native picker after modal/catalog changes. Real Tab and click/Escape worked. Ineffective readiness/task/frame experiments were fully reverted. The test brings the picker into view before its original focus call, retaining exact focus and durable-state assertions. No global readiness delay, focus retry or autofocus was added to the application.

The retained `runMeasuredScaleTests` suite also **passed**, with complete evidence for 100/1,000/5,000-item inventory and native-selector populations. All inventory populations mounted 50 rows. For 5,000 items, median initialization was 301 ms and median interaction-to-paint 20.6 ms; the 5,000-option native selector measured 425.7 ms initialization and 39.6 ms interaction. Its original persistence/guard assertions remain intact; tests explicitly remount filtered fields before reading the same raw values and restore filters before navigation actions.

Local evidence is ignored under `.local/feature043-*` and `test-results/`: final browser/engine/runtime logs, per-engine capacity JSON, actual UI screenshots, exact-5,000-item checks and the 100-context cancellation receipt. All browser profiles and holdings used for tests are synthetic and disposable.

## Rollback and boundaries

Revert the feature commit and rebuild guide/map. No profile/schema migration, game modification, scraping, data deletion or cross-application synchronization was added. Existing private profiles remain in their original stores. Unknown prices, missing records and unverified build applicability remain explicit; this UI does not certify a complete current-game catalog. The unrelated 041 shared starter LT order still awaits an actual name sequence and is outside this feature.

## FR014 inline completion verification (2026-10-31)
Summary buttons reuse the canonical confirmed status-only path, including read-only, identity/revision, busy and spoiler protection. No schema changes.
- `node tests/browser/inline-upgrade-completion.mjs`: Chromium, Firefox, WebKit passed Cancel, focus return, complete, reload, reopen, invariant inventory/goals/history and320/390/1440px bounds/44px action checks.
- Scoped runtime: progression10/10 and upgrades-progress/profile/dialog-focus36/36 passed.
- Build735routes+404, repository check0failures, format and syntax passed.
- Supplemental full refined journey passed Chromium/Firefox; WebKit stopped before upgrade checks at the existing synthetic5000-item inventory setup (rows disappear during a loading transition after readiness). This is not claimed as a full WebKit suite pass for this extension. Focused WebKit requested-feature journey passed. No unrelated readiness changes shipped.

Independent review found and verified the fix for narrow200%-text wrapping: <=420px upgrade rows now flow in one column. Allthree focused engine runs passed additional readable-button geometry assertions at320/390px200%text. Independent reviewer approved bounded FR014 source/visual behavior with the unrelated full-suite setup limitation retained.

Checkbox presentation revision: native18px Completed checkbox replaces the button, with44px labelled hit area. Focused Chromium/Firefox/WebKit tests passed cancel, save/reload, undo, resource invariance,18px bounds (0.1px subpixel tolerance), narrow layout and200%text. Independent reviewer verified Space/label activation, saved checked state through confirmation, Cancel/focus and readable200%text geometry. Build and repository checks passed.

FR015 verification:20/20 progression/upgrade-progress runtime tests passed, including shuffled alphabetical/Roman names, IV/IX/X, untiered/invalid labels, explicit tiers, ties, paging/filtering, source immutability, hidden-name invariance and other-track order. Three-engine focused browser checks passed actual Bank Upgrade I–VII sequence and alphabetical grouping plus unchanged checkbox persistence/cancel/undo/responsive behavior. Guide build735+404 and repository check0failures passed.

Independent FR015 review passed source inspection,12 progressiondomain tests and the live28-row observed upgrade ordering. No outstanding ordering findings.

FR016 verification: sticky desktop column labels align with all summary cells; compact bordered row containers and responsive labelled groups retain full Details. Focused Chromium/Firefox/WebKit checks passed completion/undo/reload, ordering, normal320/390/768/1440 and narrow200% bounds, exact heading/cell alignment and sticky/focus geometry.34 scoped runtime tests passed; build735+404, format and repository checks passed. Independent review passed8 width/text-size cases, exact6-column alignment, readable44px checkbox labels and nativeTab clearance at320px200%. Scoped header wording/font and small-screen action stacking were repaired from review findings.

## FR017-021 usability verification ledger (superseded by final receipt below)
All seven approved improvements implemented: independent direct missing previews; combined source/state/search plus quick views; focused inline material cards; guarded recipe/use/location shortcuts; completed feedback/exact-enum Undo; selected-catalog visible counts; persisted per-catalog columns/density. Unknowns remain explicit and direct gap excludes separate reserve top-up (full canonical advice exposes both). No schema or stock/spending mutation changes.
- Final runtime: `node --test --test-concurrency=4 tests/runtime/*.test.mjs`654/654,0failed/0skipped,178945ms (`.local/upgrade-dashboard-runtime-final.log`).
- Full Chromium `npm run test:browser` passed (`.local/upgrade-dashboard-chromium.log`), including new dashboard and existing purchase/rebind/recovery/readers/health. Final bounded label/Undo-notice deltas receive latest focused tests and final engine checks rather than being silently treated as the prior build.
- Latest isolated complete WebKit refined inventory5000 journey passed after test-only readiness repair (`.local/upgrade-dashboard-refined-webkit.log`); exact stock/pack/count/focus assertions retained. No application load delay added.
- Initial pending gates are closed by the final postoptimization receipt below.

### Performance convergence I027 (resolved)
Unchanged Firefox capacity gate initiallyfailedp95364ms; fresh-process diagnostic alsofailed358ms, so process isolation was not adopted as a bypass. Lazy singleton-signature omission alonefailed307ms. Added within-call exact scope caching/nested observation maps; same gate thenpassedp95167/max199ms at5766roots,50measured/5warmup runs, with unchanged250ms threshold, conservation and121-material paging/0goals. No work limit or semantic assertion removed. All14advice/capacity tests passed including admitted six-field alias conflict matrix in bothorders. Retained logs under `.local/upgrade-dashboard-performance-*.log`; uniqueattempt receipts under `test-results/upgrade023-independent/`. Complete postoptimization runtime and fullbrowser suites passed; see final receipt below.

## Final delivery receipt - FR017-021 / I027
Status: accepted for local delivery,2026-10-31. All seven approved improvements implemented; independent final source/visual review passed with no outstanding blocker. No push, merge or public deployment is claimed.

| Gate | Result |
| --- | --- |
| Full runtime, concurrency4 |655/655,0failed/0skipped,175182.5ms; `.local/upgrade-dashboard-runtime-optimized-final.log` |
| Full Chromium |PASS; `.local/upgrade-dashboard-chromium-final.log` terminal Browser acceptance passed |
| Full Firefox/WebKit |Both PASS; `.local/upgrade-dashboard-engines-final.log` terminal engine receipts |
| Focused completion, allthree engines |PASS Cancel/commit/reload/reopen/resource invariance, labelled18px checkbox and44px target, sticky/aligned columns; `.local/upgrade-dashboard-inline-final.log` |
| Dashboard in aggregate, allthree engines |PASS filters/preferences/reload/sourceID-collision catalog isolation, legacy read-only, summary, exactenum Undo/Cancel/Apply/newrevision expiry, spoiler-safe feedback, panels/shortcuts, themes/mobile/200%text |
| Capacity, unchanged250ms p95 |5766roots/50runs/5warmups: Chromium15.6ms, Firefox26ms, WebKit52ms; all121-material keyboard paging max50, goalCount0; per-engine `test-results/upgrade023-independent/performance-*.json` |
| Accessibility |10WCAG-tagged axe scans,0violations; four widths x twothemes plus expandedmobile inboththemes; `test-results/upgrade-dashboard/axe.json` |
| Independent final visual/focus |8width/scale cases,4column masks, desktop/narrow200% snapshots; readable44px labels, aligned columns, nativeTab clears actualstickyheader |
| Build / checks |735routes+404, repository0failures, format and diff checks PASS |

Earlier364/358/307ms Firefox failures remain recorded above; actual within-call computation was optimized, not the fixture/runs/budget/harness. The earlier WebKit grouped-inventory readiness limitation is superseded by both isolated5000-item and finalaggregate passes; only test settlement changed, with exact pack/count/profile/focus assertions retained. No production readiness delay shipped. Unknown/partial source data remains explicitly unknown; this is not complete-game data, physical-device testing or formal WCAG certification.

Final production source inputs are captured in `.local/upgrade-dashboard-tested-build-identity.json`; after local commit, rebuild and compare observed source inputs before final smoke. Reviewer approval is recorded in the reviewer-owned requirements checklist.
