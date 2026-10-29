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
