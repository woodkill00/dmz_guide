# Feature 044 acceptance

Status: accepted for local delivery. Automated gates and independent final review passed. No remote push, merge or deployment is included.

## Scope and traceability

| Requirements | Implementation and verification |
| --- | --- |
| FR001–003 | Scope-safe Roman tier families, lowest incomplete current head, Other tiers disclosure, view-only Flat alternative, whole-family matching and bounded50-head/50-child windows. Domain and three-engine feature tests cover out-of-order completion, Undo, reload, matching later tiers and151-tier pagination with unique control IDs. |
| FR004–006 | Automatic read-only Next and All remaining material scopes reuse canonical observation/prerequisite/stock accounting. Domain tests cover alias completion, consumed sums, retained maxima, reserves, unknowns, protected names/IDs, invalid roots,121roots and5000families. Inventory tests cover0tracked goals, separate required/missing quantities, covered Needed membership and completion removal. |
| FR007 | No input remount on preview edits; Save/Cancel, invalid/offpage recovery and existing stock/profile safety remain. Three-engine feature tests exercise themes,320–1920px,200%text, readable inputs and44px visible steppers. Independent visual review closed Owned sizing/Reserve overlap finding. |

## Review and fixes

Independent definition/source review required canonical completed-alias metadata, strict visibility for new scopes, visible partial qualifiers and Unknown rather than blocked zero totals. These were repaired and independently checked. Independent layout review found undersized wide-screen steppers; fixed44px nonshrinking controls and wrapping readable inputs passed ten width/text cases. Reviewer-owned decisions are recorded in checklists/requirements.md.

The first full runtime run passed661/664. Three extraction-harness failures came from missing new imported dependencies in the VM context. The harness now injects the actual four helpers; all18scoped tests pass with original populations and assertions unchanged. Independent review accepted this repair. Existing per-tier browser journeys use the public Flat layout while preserving their original durable-state and numeric assertions; new tests separately exercise default Grouped behavior. No thresholds, timeouts, content limits or persisted-goal caps were raised.

## Executed gates

| Command/check | Result |
| --- | --- |
| `node --test --test-concurrency=4 tests/runtime/*.test.mjs` | **664 passed,0failed,0skipped**,176761.4ms, including9new domain tests. |
| `npm run test:browser` | **Full Chromium suite passed**, including default Grouped feature and existing Flat/draft/stock/profile/recovery journeys. |
| `npm run test:engines` | **Full Firefox and WebKit suites passed**, including the new feature and retained existing safety assertions. |
| Advisory capacity | Original5766roots,5warmups,50measured runs and250ms p95 limit retained. Chromium24.1ms/max27.3ms; Firefox125ms/max178ms; WebKit35ms/max41ms. |
| Feature layout checks | All3engines:320/390/768/900/1440/1920px, both themes, mobile and wide200%text, bounded151-tier sublist and stable draft geometry. Independent width/text review closed the Owned sizing finding. |
| `npm run build` | **735routes plus404**. |
| `npm run format:check` | **Passed**. |
| `py -3 scripts/check.py` | **0failures**. |

Axe-core: **24checks,0 WCAG2A/AA/2.1AA violations** across Upgrades/Inventory,320/390/900/1440/1920px, both themes and expanded mobile tiers/Uses. Initial scanner incorrectly sought a native Inventory disclosure and timed out; corrected scanner activates the actual Uses button, then all24checks passed. This is automated evidence, not physical-device or screen-reader certification. Local4173 Upgrades/Inventory,4174 Studio and5175 map returnedHTTP200; disposable Chromium smoke confirmed default Grouped heads and both Inventory quantity columns. Final delivery rebuild generated735routes plus404; sourceFiles exactly match the tested build identity, and the same HTTP/UI smoke passed. Independent final acceptance is recorded in checklists/requirements.md. Local commit is followed by a clean-HEAD rebuild/smoke without source changes. Logs are ignored `.local/tier044-*`; capacity receipts are in ignored `test-results/upgrade023-independent/performance-{chromium,firefox,webkit}.json`.

## Boundaries and rollback

No content/schema migration, scraping, game modification, automatic completion, inventory deduction/refund, goal insertion or profile deletion. Next/full are alternative upgrade scopes, not additive to each other or selected goals. Unselected mission/recipe quantities and missing game tiers remain unknown. Revert this feature commit and rebuild to remove the feature; existing private profile records need no migration. Tests use fictional disposable browser profiles, never the owner's browser storage. No complete current-game catalog or physical-device/screen-reader certification is claimed.


## FR008 unfinished collection and crafting extension

Status: accepted for local delivery; automated gates and final independent review passed. Earlier tables above describe FR001–007 and are not new FR008 full-browser/capacity runs.

Needed now contains unfinished upgrade/mission collection demand and required crafting ingredients, not unrelated planner-only goals. Completed canonical upgrades and completed/unlocked missions are excluded. All four existing mission tracks are supported; Campaign contributors are labelled. Next/All upgrade columns retain their upgrade-only meaning. The separate Collection status/Uses explanation shows shared direct/indirect requirements and stock shortage. Red means a known positive shortage, yellow unresolved/partial demand, green complete known listed quantity coverage. Crafting use remains explicitly tagged. Quantity coverage does not certify crafting eligibility or complete game costs.

Read-only recipe projection aggregates parent demand before batch rounding, consumed sums, retained maxima, common stock after reserves and held intermediate outputs. Explicit visible routes or fully visible sole producers are used; alternatives never add into a false numeric shortage. Hidden identities/endpoints cannot establish a sole producer. Unknown evidence/stock, invalid binding, overflowing sums, work limits and necessary recipe cycles cannot report green. Unrelated covered cycles do not resurrect ingredients. Limits are20000admittedrecords/500000node-edgework, including the privacy prepass. Limit failures retain only known safe membership with an incomplete warning. No goal/route/profile schema, inventory grant/deduction, completion or game data changed.

Review-driven repairs addressed ambiguous-route false shortages, global binding/draft gates, complete endpoint privacy, disconnected cycle reachability, unsafe mission numeric lower bounds and Campaign prerequisite labels. Initial browser admission failed on an unsupported recipe spoiler field; removed the fixture field and used admitted protected-name/endpoint cases without schema bypass. Original admitted three-engine collection journey then passed.

- Final frozen-source runtime: **677passed,0failed,0skipped**,186137.4ms (`.local/fr008-runtime-final.log`).
-13collection model cases include chains, yields, reserves, held outputs, shared demands/retained tools, completed roots/missions, alternatives/routes, unknown/overflow/cycles, protected identities/endpoints, invalid binding/draft,500000work budget and Campaign prerequisites. Strengthened overflow assertions receive a separate final scoped run.
- Final affected driver passed in Chromium, Firefox and WebKit: collection color/text/contrast4.5+/both themes/320–1920px/actual200%text/goal-only exclusion/Save/Cancel/completion, tier grouping/Undo/draft quantities, dashboard and refined inventory5000-row/draft journeys (`.local/fr008-affected-final3.log`). Initial affected run caught inputy movement from wrapping badge text; fixed short two-line badge slots with reserved unused space, preserving full accessible descriptions. Exact original geometry assertion passed without relaxation. After this UI-only repair,40focused runtime tests passed (`.local/fr008-scoped-final.log`), including all13collection cases and stronger overflow assertions. Independent visual review additionally found320px/200% fragmented labels and19.6px Short/Met typing movement despite prior automated nooverflow/axe passes. Narrow fullwidthname/status, rem-based auto-fit stock fields and stacked summaries repaired it. Latest all-engine journeys retain exact200%Short/Met/Check geometry assertions. Independent screenshot/geometry review closed the blocker with identical224×59.8px input bounds and53.97px badge height across states. Goal/Missing labels may still wrap at extreme text sizes; this was reviewed as nonblocking. Latest-CSS axe-core:24checks,0WCAG2A/AA/2.1AA violations (`.local/fr008-axe-final.log`, `test-results/fr008/axe.json`). HTTP200guideUpgrades/Inventory4173,Studio4174,map5175 and actualguideUI smoke passed (`.local/fr008-smoke.log`). Build735routes+404; formatting and repository checks passed; final independent receipt is in checklists/requirements.md. Local commit is followed by a source-equivalent clean rebuild and repeated smoke without source changes. This extension does not claim a fresh full unrelated browser/map suite, capacity benchmark or physical-device/screen-reader certification.
