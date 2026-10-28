# Feature 027 acceptance evidence

Date: 2026-10-28. Branch: feat/027-field-guide-upgrades. Environment: Windows, Node24.15.0, local opt-in viewer. Status: implemented; automated verification and independent review recorded below; T012 external verification remains pending.

## Delivered and traceable behavior

- FR001–004 / SC001 / T002–003: bounded cached search across names, categories, providers, notes and evidence. Quoted/multiple terms, approximate titles, source/category/kind/floor/build/visibility/verification/placement filters, relevance/name/nearest, grid and XY origins, radius, pagination, title/Jump selection and Nearby. Conservative name+position source grouping keeps original evidence and an ungrouped option; unplaced references never acquire coordinates. Results clear while debounced work is pending. Origin popups use inert DOM text. Nearby distances are canonical image pixels, not game meters. Category suggestions cap at200; exact typed categories still work. Compact layout shows results in the initial desktop viewport.
- FR005–006 / SC002 / T004–005: Health shows limits, storage estimates, five-provider capture status and missing background dependencies, safe existing maintenance links, metadata-only recovery manifest, explicit persistence request, and authenticated bounded read-only update history. No implicit collection or filesystem deletion. Fresh browser-context recovery restores owned state; missing backgrounds are reported and matching files can be reattached; source inputs remain separate.
- FR007–008 / SC002 / T006–007: optional observation dates, private normalized PNG attachments/captions, editable coordinate/map-pick routes and areas, rendering and undo/delete/backup recovery. Old point-only backups remain valid. Screenshot input8MiB,8192px/32Mi pixels; normalized output1600px/2MiB; aggregate limits remain enforced.
- FR009 / SC002 / T008: original recipe-only icon packs with bounded file parsing, preview, atomic import and repeat identity reuse; saved recipe starters and50-state designer undo/redo. No imported SVG execution.
- FR010–011 / SC003 / T009–010: engine/accessibility runner and CI job, repeat/restart/changed/removed update fixtures, Help and five-provider documentation, and manual evidence worksheet. CONTRIBUTING/SECURITY introductions now describe the runnable guide/local tools accurately.

## Executed checks

- `npm run map:test`:103 tests passed,0 failed.
- `npm run map:test:browser`:65 scenario groups passed at19:24:09UTC after the final mobile layout repair, zero runtime errors and zero external requests. Includes previous feature regressions and all five new upgrade groups.
- `npm run map:build`: strict TypeScript/Vite production build passed (65modules).
- `npm run test:engines` in tools/hajin-map: Chromium156.0.8078.4, Firefox157.0, WebKit27.2 passed Help/mobile, private-point save, generated icon,4K screenshot normalization, search/Jump and IndexedDB reload. Chromium axe4.14.0 scans of Help and all seven workspace tabs reported zero violations for the configured WCAG2A/AA and2.1AA rules. No exclusions were used. Automated accessibility is not certification.
- `npm run map:test:capacity`: passed on a64GiB/32logical-core host with browser4-core affinity and512MiB renderer heap. Toggle first-paint p95=101.5ms; map-layer search p95=48.9ms; production20k worker145.3–173.3ms;20k source validation113ms. This is not a physical8GiB-device test. Final search-layout-only refinement does not change these engines.
- Pure advanced search30k-record fixture: index41.5ms; five filtered queries27.7–33.7ms; unfiltered nearest/grouped query38.2ms on this host. These are recorded Node measurements, not a renderer latency guarantee.
- Native guide regression: `npm test`521 passed; `npm run build` produced154HTML routes plus404. Native application source is unchanged.
- `py -3 scripts/check.py`:0 failures. `git diff --check` and staged diff check passed.
- Read-only live local smoke at19:23UTC: all five captures loaded; `source:mapgenie has:location` returned162located entries; selecting G6/nearest results highlighted locations; Health showed8history summaries. Zero runtime errors and zero external requests. No update collection was triggered. Private screenshots and captures remain ignored.
- Focused upgrades browser runner passed all five scenario groups, including >2MiB4K input, oversized-image rejection, fresh-context restore, missing-file recovery, icon-pack file import/repeat, hostile titles,360px layout and keyboard navigation.

## Convergence and review

FG027-01 pack JSON text parsing, FG027-02 screenshot preflight/output mismatch and FG027-03 mixed-case/unverified-source semantics were repaired and regression-tested. T016–022 cover inert popups, deterministic debounce-race reproduction, bounded suggestions/no-op pack saves, read-only history, stale-result prevention and initial-viewport results. No failing assertions were removed. Reviewer-owned requirements checklist was approved independently by integration_review. source_research independently reviewed security/data boundaries and final history/search changes without outstanding findings. fusion_research independently reviewed the final UI. Its LAYOUT-R1 finding (mobile navigation pushing results below the viewport) was repaired as T022. Settled360×800 screenshots and assertions now show both the count and first result title in the initial viewport; the reviewer confirmed resolution with no remaining findings. Final full-suite evidence is recorded above.

## External evidence still pending

T012 stays unchecked. Live-game landmark/POI/grid accuracy, physical touch-device behavior and an actual screen-reader session require real observations; automation cannot complete them. Follow [manual-verification.md](manual-verification.md). Hosted CI configuration was added but its remote run was not executed. No push, merge or deployment was performed. The local viewer is available on127.0.0.1:5175 while the dev process remains running.
