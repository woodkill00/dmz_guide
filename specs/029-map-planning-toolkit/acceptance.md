# Map planning toolkit acceptance
Finalized2026-10-29 (Europe/Bucharest). Branch feat/029-map-planning-toolkit. Windows, Node24.15.0, Vite/Leaflet local viewer. Implemented and automated-verified; external road/gameplay/device evidence remains pending.

## Delivered behavior / traceability

| Requirements | Work / owning code | Evidence |
| --- | --- | --- |
| FR001 | T002/T014/T017: optional private tracking, dated evidence, owner-confirmed state, capture/decision-bound staleness; field-guide.ts, explorer-index.ts, Planner/popup | Invalid confirmed submission remains editable, valid save/search status, stale reviewed-current decision and source capture tests |
| FR002 | T003/T018: capped name/category/location queue, paired evidence/highlight, reversible same/separate/later, exact-capture activation; plannedDuplicates | Actual decision UI/reset, inert hostile source titles, floors/builds/source separation,20k-record/2k-decision fixture |
| FR003/005 | T004/T022: gameplay shortcuts/categories/favorites/large icons, reversible density member lists | Five focused Planner groups,30k partition unit, favorite on/off immediately restores4real owned/reviewed PNG symbols without camera action |
| FR004 | T005/T019: strict source-scoped public links, preview then apply, availability revalidation | Valid link Apply, private/unknown rejection, changed-availability preview expires, private data absent from links |
| FR006 | T006: stable-ID additions/moves/renames/removals and paginated before/after details before existing update Apply | Pure combined rename+move/add/missing/repeat tests; existing five-provider update browser checks now assert per-source detail previews |
| FR007/008 | T007–009/T015–016/T020–024/T026: route editor/drag+keyboard reorder, numbered stops, nearest-edge projection/worker shortest paths, graph editor/import, road/direct/connector/gap display | Positive/negative solver tests, actual dragTo and exact order, successful map pick, first-stop engine assertion, graph file import and local starter route |
| FR009 | T002/T010/T014/T016–017/T019–021/T023/T025: strict optional schema, old backups, exact source refs/dependencies, preflight, dirty/CAS/quota/cancel protections | Fresh-profile restore, missing/stale refs, invalid fields, stalled read/late callback, quota retry, other-tab CAS win and downloaded retained draft |
| FR010/SC001–003 | T001/T011–013/T014–026: Help, plan, reviews, bounded performance and executed checks | Commands/results below; independent review and manual worksheet |

Source waypoint handles retain capture references only; provider titles/positions are resolved transiently and not copied into private exports. Reviewed handles bind decision ID/acceptance/freshness rather than mutable display status. Observations remain owned claims; source possible-spawn claims are never promoted into live-match facts. Imported text and tooltips use DOM text, not Leaflet HTML strings.

Road mode snaps stops to the nearest open edge within160canonical pixels and computes shortest geometric paths between those snaps, respecting authored direction/blocked edges. Dashed connectors are unverified off-road geometry. Disconnected/far/missing/stale legs show errors with no automatic straight-road fallback. Direct mode is explicitly straight-line planning. First stops draw before any leg exists. A map summary retains mode/partial-network/verification/incomplete status after Planner closes; partial lengths are labelled known-leg length. No game meters, ETA, live tracking or safe-route guarantee.

Road JSON<=2MiB,5000nodes/10000edges/20000vertices; the joint maximum boundary is tested. Unknown fields, reserved IDs, wrong map/frame, zero-length/unknown endpoints, nonfinite/out-of-map vertices, unsupported direction and overflow reject. Road file reader is abortable with10s deadline/fatalUTF8; preview/import is revision-bound. Graph work runs in a replaceable deadline-bound worker. Junctions are explicit; crossings do not silently connect.20saved routes/32stops,5000tracking entries/2000comparison decisions and existing20MiB joint backup admission remain enforced.

## Executed checks

- `npm run map:test`: **119passed,0failed**. Includes joint graph-budget/5000-node solve, directions/blocks/projection/disconnection, unknown unsafe data, old optional schema, source-only references, reviewed decision staleness, share privacy,30k density partition and20k/2k manual grouping.
- `npm run map:build`: strict TypeScript and production Vite build passed,70modules; dedicated road worker emitted.
- `npm run map:test:browser`: **71scenario groups passed**, at `2026-10-28T22:29:42.214Z`, zero runtime errors and zero external requests. Includes the five Planner groups plus previous features. Focused `node scripts/planner.browser.cjs` was rerun after the final empty-coordinate/picker cleanup and passed all five groups.
- `npm run test:engines`: Chromium156.0.8078.4, Firefox157.0 and WebKit27.2 all passed, including actual road import, two-waypoint worker routing, first-waypoint marker, private save/reload and popup keyboard/Escape. Chromium axe4.14.0 scans of Help, workspace tabs, all six Planner sections and popup reported zero configured WCAG2A/AA/2.1AA violations. Final report `2026-10-28T22:28:25.965Z`. One earlier audit sampled the Leaflet popup fade mid-transition; fixture now waits computed opacity1 before auditing, without exclusions or disabled rules.
- `npm run map:test:capacity`: production constrained fixture passed at `2026-10-28T22:26:00.743Z`. Toggle first-paint p95 **112.2ms** (250ms budget); map-layer search p95 **58.8ms**.20k-record production worker155.2–181.6ms; independent20k validation102ms. Host64GiB/32logical cores, browser4-core affinity/512MiB renderer heap; **not a physical8GiB-device test**. Render fixture5000owned points/1000source/50reviewed/32icons; this is not a claim that every maximum is jointly render-tested.
- Independent20k-source/2k-manual-Same benchmark improved from1766ms to172ms on the same Node fixture after group-member indexing. This pure computation measurement is separate from the production render fixture above; no all-maximum renderer latency claim.
- `py -3 scripts/check.py`:0failures. Final whitespace/staged checks recorded during local finalization.
- Native guide source is unchanged; native guide/browser suites were not repeated for this isolated map-tool feature. Hosted CI was not run remotely; existing local-map engine job consumes the expanded script.

## Actual local road smoke (separate temporary browser profile)

At `2026-10-28T22:30:15.834Z` the real local viewer loaded the ignored starter network: **11junctions/11segments**, labelled **unverified**, partial visual trace. Two manually selected network endpoints yielded1/1connected road leg,4724.0canonical pixels and **31rendered vertices**, demonstrating bends rather than a two-point direct fallback. Zero runtime errors/external requests. No website collection ran. The temporary profile did not modify the user's existing browser profile. Private map screenshots and graph stay ignored under `.local/provider-research` and `public/maps/hajin/roads.local.json`.

The starter is not map-wide coverage or gameplay-confirmed road access. It is a separately retained local reference, excluded from backups by default. Explicitly imported/authored workspace road geometry is included in private backups; source-reference dependencies are manifested and protect current/previous referenced snapshots from pruning.

## Independent review / convergence

integration_review approved R001/R002 after source-scoping shared category masks and requiring invalid/unavailable previews to disable Apply. source_research found FG029-01–05 (tooltip HTML, reviewed revision binding, quadratic manual grouping, stale share previews, unbounded file reads); all repaired and reviewed clean,15focused tests independently passed at that review. Its final same-owned-form retry/CAS delta review is clean. fusion_research found PLAN-UI-R1–R4 (wrong draft picker, favorite restoration, stale picker after navigation, missing first stop); all repaired with focused browser reproductions and re-reviewed clean. T014/T015/T025 also capture actual invalid-form, native drag grip and quota/CAS findings; no assertions were weakened to clear them. Convergence records owning tasks and fixes.

## Remaining real-world work

Follow [manual-verification.md](manual-verification.md): validate/extend actual roads, junctions/bridges/gates and POI positions in gameplay, physical touch and an actual screenreader. No real-world accuracy/passability/accessibility certification is claimed. This does not replace feature027's still-pending manual audit. No remote push/merge/deployment. Local viewer remains127.0.0.1:5175 while its dev process runs.
