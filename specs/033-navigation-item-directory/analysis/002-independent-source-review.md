# Independent source and contract review

Date: 2026-10-29. Scope: feature 033 implementation before integration, plus its required contracts. Verdict: source/domain review PASS; actual browser and visual acceptance remain pending.

## Independently checked

- Shared navigation, compact directory, sitemap and separate local-map guidance use existing escaped rendering and public/fictional/spoiler projection.
- Detail pages carry their authoritative catalog identity. The intermediary navigation module propagates only a bounded pack ID to same-origin workspace links, not query text, opaque context or the external map application.
- Item editing/removal targets retain exact catalog key, catalog ID and record ID. The existing resolver rejects mismatches, missing records and unexpected parameters. Public routes do not mutate a catalog or player profile.
- Remove opens the existing reference-aware Studio preview after startup. Referenced records cannot confirm; cancellation retains the draft; unreferenced removal changes only the draft until the existing explicit repository-save workflow. No new deletion endpoint, persistent model, migration or automatic save was added.
- The directory defaults to a non-fixture catalog, supports combined selection with visible catalog grouping, and retains no-JavaScript readable rows. Private browser content remains separately labeled.
- New browser scenarios cover narrow/text-zoom navigation, selection/sorting/empty results, exact action targets, referenced removal, cancellation focus, dirty-draft preservation and unsaved-only fixture removal. Those scenarios must actually execute before acceptance.

## Findings resolved before handback

1. The new browser test originally selected a relative Inventory href after the client had rewritten it to an absolute URL. It now selects the scoped accessible navigation link.
2. Static sitemap/map-workspace intermediary pages originally dropped selected catalog context on the next navigation. A bounded same-origin navigation module and browser checks now preserve it.
3. Generic query context could have overwritten a detail page's known owning catalog. The rendered `data-nav-pack` identity now has precedence; a runtime regression asserts it.

## Independent verification

Executed `node --test tests/runtime/navigation-directory.test.mjs tests/runtime/page-edit.test.mjs tests/runtime/reader-flow.test.mjs`: 23 passed, zero failed/skipped (exit 0).

This focused run does not certify full checks, browser behavior, visual layout, Windows, physical devices, screen readers, publication or merge. Exact integrated-head CI and actual screenshots remain required. No failing assertions were removed or weakened by this review.

Verification correction: the initial command named a nonexistent `author-target.test.mjs`; Node ran the other selected files (18 passes). The command above was rerun with the actual `page-edit.test.mjs` file and produced 23 passes. The initial run is not evidence for the missing file.

## Integrated source review — 2026-10-29

Reviewed combined local commit `6c0d306` (published equivalent tree `406ecf26`, PR head `bf494817596b1322076908ac50aa20c98758f8b7`) against main `37a8462`. Source/domain verdict: PASS. This remains separate from browser/visual and exact-head CI acceptance.

- Catalog expansion preserves stable IDs, original requirement rows, explicit unknown cash/consumption, spoiler boundaries and immutable recorded spending. Rebinding and guarded reversal contracts are unchanged.
- The focus repair only blurs a currently focused descendant of the invalidated modal before native close; it cancels older pending restoration and never blurs newer outside focus. Positive/negative lifecycle regressions cover this branch. The original failing browser endpoint assertion remains intact.
- The Windows Studio module-load `ERR_NO_BUFFER_SPACE` diagnostic is documented as an observed resource failure with unproven underlying host cause. No speculative Studio patch, automatic reload, ignored diagnostic or test relaxation is introduced. A successful exact-head Windows run is still required.
- Navigation/removal integration retains the reviewed identity and explicit draft/save boundaries. No catalog/profile schema, dependency, security policy or workflow change was introduced.
- Review follow-up corrected Chromium runner ordering so strict browser-health monitoring attaches before the new navigation journeys. Firefox/WebKit already attached it before those journeys.
- Exact per-catalog displayed row sequences are now asserted for type, evidence status and name sorting, including unchanged row counts; selecting a sort option alone is no longer treated as verification.

Independently executed on local `6c0d306`:
`node --test tests/runtime/sourced-catalog.test.mjs tests/runtime/upgrades-content.test.mjs tests/runtime/upgrades-spending.test.mjs tests/runtime/navigation-directory.test.mjs tests/runtime/page-edit.test.mjs tests/runtime/reader-flow.test.mjs tests/runtime/upgrades-dialog-focus.test.mjs`

Result: 64 passed, zero failed/skipped, exit 0. `git diff --check` passed. This focused independent result does not replace the integrator's full aggregate checks or pending actual browser/visual/CI gates. No runtime changes were made by the reviewer.
