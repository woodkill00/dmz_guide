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
