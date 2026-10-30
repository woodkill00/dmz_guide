# Acceptance evidence
Status: independent source/domain and partial actual browser/visual verification passed; final repaired-head CI and post-merge gate OPEN.

Historical isolated-worktree evidence follows; the current integrated checkpoint is linked below.

2026-10-29: `npm run check` passed repository/schema validation, 600 runtime tests with one Windows-only skip, and 216 generated HTML routes. This final local aggregate includes the navigation-context regression and authoritative record-pack precedence.
`python3 -m unittest discover -s tests -p 'test_*.py'`: 40 passed. Expected owned-server interruption diagnostics were exercised by the suite, not unexplained test failures.
`npm run format:check`: passed. Focused navigation, author-target and reader-flow tests passed after extending the existing VM mock for an optional sort control; the original assertions were retained.

Actual local browser stages: NOT RUN. Chromium launch failed before assertions because its singleton socket was forbidden by the sandbox. The authorized escalation then failed runtime setup with a read-only filesystem error. No browser sandbox or source security policy was weakened. The first throwaway launcher also used the wrong cleanup method; it was corrected to the documented owned-server `stop()` before the explicit launch failure was recorded.

New browser journeys are wired into Chromium and Firefox/WebKit suites and local Studio acceptance. They cover search/filter/sort/empty state, all-pack scope, 320/390px at 200% text, exact author links, nondefault pack navigation, conflicting detail query, external-map separation, no-JavaScript reading, reference-blocked removal, cancellation/focus, unsaved draft preservation, and unreferenced draft-only removal. Writing/wiring these scenarios is not evidence that they passed.

Independent design and source review are recorded in reviewer-owned checklist/analysis files. Physical touch devices, assistive technology certification, live game data and deployment are not claimed. Parent integration must run exact-commit CI, inspect browser artifacts and record post-merge checks before declaring delivery complete.

## Related integration repair
See [modal focus and Studio failure assessment](../../docs/repairs/2026-10-29-modal-focus-and-studio.md) for the separately scoped repair integrated with this feature.

## Current integrated checkpoint — 2026-10-29

See [integrated verification ledger](analysis/004-integrated-acceptance-checkpoint.md). Actual pointer, narrow-screen/200% text and source-control pixels have passed review. Earlier interaction and CI failures are retained, not converted to passes. Latest pre-canonical head `ff582c15` passed eight of nine jobs across quality/map workflows, including full Ubuntu and Firefox/WebKit Studio; Windows Studio timed out on an actual save amplified by noncanonical source bytes. Local `5d3758a` fixes the measured unrelated rewrite amplification without relaxing deadlines or transaction safety. Added Chromium/Firefox sitemap/map and desktop removal screenshots passed independent pixel review with limits recorded in the ledger. Final exact-head CI and post-merge verification remain explicitly pending.

## Repaired implementation accepted — 2026-10-29 22:01 UTC

Head `7a0b4caf28e388aa5ffb11c3311fc5c4884e05cf` passed all nine jobs: quality run [40959670904](https://github.com/woodkill00/dmz_guide/actions/runs/40959670904) and map run [40959671130](https://github.com/woodkill00/dmz_guide/actions/runs/40959671130). This includes Windows Studio save/restore and packaging, Ubuntu full pipeline, Firefox/WebKit browser/Studio, Node 24, repository checks and all map checks. The above pending repair checkpoints are historical, now resolved by these results. Independent source/domain and actual pixel reviews are recorded in the shared ledger. Implementation verification/convergence is complete; final documentation-head CI, authorized merge and post-merge results are tracked in [PR #28](https://github.com/woodkill00/dmz_guide/pull/28) and must pass before delivery is declared complete. No application, catalog or test changes follow this successful implementation checkpoint.

## All-page navigation repair — 2026-10-30
User requested the menu on all pages. Shared escaped SSR renderer now covers native guide, interactive map, static map Help and local Studio, with native pack scoping and query-free, opener-isolated cross-app links. New companion CSS reflows real rem-based text at320px/200% and flex sizing preserves map viewport. Studio only adds one fixed CSS asset to its existing allowlist; origin/token/API paths are unchanged. No source acquisition or private workspace mutations.

Executed634native runtime tests passed; both builds passed (734guide routes+404;72map modules), repository/format checks passed. Focused native navigation8tests independently passed. Actual generated-file audit found one main menu in all735guideHTML and2built toolHTML. Actual7route Chromium checks passed at2026-10-30T01:47:53.080Z: guide/items/sitemap/404/map/help/Studio, all menu destinations,320px/200%text, configured WCAG2A/AA/2.1AA axe zero, noJSmap/help/Studio and retained unsaved map/Studio fields. Production-preview map/help also passed withoutJS at320px/200%text. Temporary profiles only; screenshots/receipts stay ignored in .local/nav-repair.

Tracked navigation.browser.cjs passed2focused groups: no automatic guide requests, intercepted labelled synthetic guide destination via keyboard/newtab, unchanged workspace and retained draft, static/no-JS map/help, real text scaling/dropdown bounds and configured axe. Existing native navigation-directory/removal browser journeys passed with its normal test-only text-zoom stylesheet installed temporarily and restored afterward. Initial standalone invocation lacked that runner fixture; no CSP policy was changed.

First full map run exposed a viewport-dependent planner fixture after the menu reduced map height. T012 fits the same synthetic icon positions before density-off and retains all4/0/restored icon assertions. Focused planner5groups passed. Existing native journey also assumed only one map URL anywhere in a landing page; T013 preserves one main CTA and adds one shared-nav link assertion. Independent review approved both corrections without weakened criteria.

Chromium156.0.8078.4/Firefox157.0/WebKit27.2 map functional/axe checks passed with zero runtime errors/violations. Final full map-suite outcome recorded below. No physical touch/screenreader or hosted-CI claim. Local repair branch only; no push/merge performed.

T014 closes saved repository preview coverage discovered by auditing every HTML constructor. Actual browser check expanded to8route families including a real saved preview, passed at2026-10-30T01:58:39.439Z with320px/200%text, zero configured nav axe violations/runtime errors, no-JS preview and retained map/Studio draft fields. All10targeted preview/navigation tests passed independently after preview delta (full634native run preceded that final HTML-only preview addition).

T015 fixes a real map resize drift exposed by the wrapped header: invalidating size with pan:false let the max-bounds move handler animate from a transient displaced center and override restoration. Public Leaflet pan:true/animate:false invalidation counter-pans synchronously first. Independent review confirmed behavior in pinned1.9.4. The original exact menu camera assertion is unchanged and focused2groups pass; new navigation regression verifies exact displayed center/zoom on key resize (pixel geometry avoids comparing a cached unsnapped setView target to rounded rendered coordinates). Final aggregate/engine reruns passed, as recorded below.

Final `npm run map:test:browser`: all79scenario groups passed at `2026-10-30T02:02:34.742Z`, zero runtime errors/external requests. Final three-engine report at `2026-10-30T02:00:27.700Z`: all3passed, zero configured axe violations/runtime errors. Final native/map builds passed (734guide routes+404;72map modules). Format/repository/whitespace checks passed. T008-T015 complete; independent definition/code/security and both assertion-repair reviews clean. No pending safety/data gates. Physical touch/screenreader and hosted CI not executed for this local repair; no push/merge performed.
