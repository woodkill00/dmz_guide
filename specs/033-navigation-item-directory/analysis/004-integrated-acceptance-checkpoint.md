# Integrated acceptance checkpoint — 2026-10-29

Reviewer reconciliation at local `5d3758a`, published as `7a0b4caf28e388aa5ffb11c3311fc5c4884e05cf` with identical tree `b7724f55`. Implementation acceptance is complete at this checkpoint. [PR #28](https://github.com/woodkill00/dmz_guide/pull/28) is authorized; the documentation-only final head and post-merge verification must still pass before completion. No deployment is claimed.

## Retained execution history

- Earlier local browser launches were blocked before assertions; those remain NOT RUN locally, not browser passes.
- [CI findings](003-ci-findings.md) and [pointer repair](003-pointer-activation-repair.md) preserve the `bf494817`, `7e720497` and `f256afe7` failures. A URL wait alone did not fix native pointer activation. Avoiding no-op row detach/reappend fixed the actual interaction, with first-pointer detail/Edit/Remove and keyboard regression coverage.
- `f256afe7`, quality run `40951633665`: Ubuntu full pipeline passed. Firefox source heading raced document navigation; the test now waits for hydration, performs the actual link click, awaits its exact destination and retains the heading assertion. Windows Studio lost diagnostics through unsupervised observer rejection; immediate observer supervision and bounded diagnostics preserve failures without changing deadlines.
- `ff582c15`, quality run `40956690486`: eight of nine jobs across quality/map workflows passed, including full Ubuntu and Firefox/WebKit Studio. Windows Studio still FAILED. Its retained diagnostics prove a real save request remained busy at the unchanged 30-second response deadline. This is not an all-green run.
- Local `5d3758a` repairs concrete first-save write amplification by canonicalizing 649 source JSON files with the existing serializer. A tiny header edit previously rewrote 650 files; afterward it writes one. Local timings are diagnostics, not a Windows guarantee. See the [repair assessment](../../../docs/repairs/2026-10-29-modal-focus-and-studio.md).

## Independent source and regression review

- Original combined source review: [002-independent-source-review](002-independent-source-review.md), including 64 focused tests at `6c0d306`.
- Real pointer repair: 24 focused navigation/page-edit/reader-flow tests passed; no synthetic forced-click substitute.
- Observer/ownership review at `8469258`: 11 tests passed, zero failures/skips. Original response, snapshot, restart/import, cleanup and health checks remain intact. WebKit capture exclusions do not exclude functional removal assertions.
- Canonical repair: independently compared every changed JSON file against `8469258`; all 649 parse identically, including array order, IDs and values. No runtime/security/transaction implementation change. Executed `node --test tests/runtime/catalog.test.mjs tests/runtime/sourced-catalog.test.mjs tests/runtime/upgrades-content.test.mjs tests/runtime/upgrades-spending.test.mjs tests/runtime/upgrades-spending-summary.test.mjs`: **44 passed, zero failures/skips**. The actual isolated store regression checks precisely the edited descriptor/objective write set and unchanged bytes everywhere else.
- Published packs already use canonical serialization; their bytes/digests, contentVersion and private-state bindings do not change from this normalization. Raw repository revision changes intentionally. An already open Studio draft must export/reconcile or reload; the existing stale-revision check is not bypassed.

## Actual artifact/pixel review

Synthetic fixtures only. Downloaded artifact digests were verified before inspection; screenshots are not substitutes for functional assertions.

| Head / artifact | Verified SHA-256 | Reviewed evidence |
|---|---|---|
| `f256afe7` / Ubuntu `12932916693` | `b7b9fb30291a70f5a378f1e9fc3a7690385b8ce9cdcdc99512069fca7f790e50` | Chromium items/navigation at 320/390px, 200% text; source pages, unknown-cash refusal, historical rebind and corrected visible level-40 completion control. Source JSON: three scenario groups PASS. |
| `ff582c15` / Ubuntu `12934772611` | `da76b26eb9dfe3d7b41c8a90b162a780c39009120a40895ac97551ee4899e9b6` | Chromium sitemap/map guidance at 320×844 and reference-blocked/cancelled Studio removal at 1280×720. |
| `ff582c15` / engines `12933964528` | `56e02d9adffbc9807cce15b72ad1733189b629897d6fbc7e83b287421f69a882` | Firefox sitemap/map guidance at 320×844 and reference-blocked/cancelled Studio removal at 1280×720. |

Independent pixel reviewer inspected 12 new PNGs across the last two artifacts: readable controls and restored cancellation focus, PASS. Evidence materialized under `qa-pr28-review/ff582c15/{ubuntu,engines}` in the review executor; local artifact directories are not shipped repository content. Earlier Chromium pixels were reviewed under `qa-pr28-review/f256afe7`.

Limits: Studio removal captures are desktop, not mobile. Sitemap/map captures use normal text, not 200%; the 200% claim belongs to items/navigation and source-control coverage above. No WebKit pixel, physical-device or screen-reader certification claim. Content normalization does not change rendered product facts; the repaired implementation also passed exact-head functional CI below.

## Verified implementation and publication gates

| Gate | Status | Required completion evidence |
|---|---|---|
| Canonical repair source/domain review | PASS | Independent identity comparison and 44-test run above |
| Repaired implementation quality CI | PASS: all six jobs | [`40959670904`](https://github.com/woodkill00/dmz_guide/actions/runs/40959670904), head `7a0b4caf`; Windows and Ubuntu full runtime/browser/Studio/package, Firefox/WebKit browser/Studio, Node 24 and repository checks all succeeded |
| Repaired implementation map CI | PASS: all three jobs | [`40959671130`](https://github.com/woodkill00/dmz_guide/actions/runs/40959671130), head `7a0b4caf`; Node 22/24 and browser-engine/accessibility jobs all succeeded |
| Implementation acceptance reconciliation | PASS | Owning tasks/convergence updated; only documentation changes follow the tested implementation. No rendered facts or application/test code changed. |
| Final documentation-head CI and merge | PENDING at this commit | Exact final SHA, required checks and authorized merge result will be recorded in [PR #28](https://github.com/woodkill00/dmz_guide/pull/28) before completion. |
| Post-merge verification | PENDING at this commit | Main merge SHA and all required post-merge check results will be recorded in PR #28; no premature pass is claimed. |

Prior failures remain failures. Neither owner merge authorization, draft publication, partial remote passes nor local tests can fill pending rows without actual results.

Implementation checkpoint observed 2026-10-29 22:01 UTC: all nine jobs succeeded. The integrated local rerun also passed 614 runtime tests (one Windows-only skip), repository validation, 734-route build and formatting. The repair worker independently ran all 40 Python tests successfully.
