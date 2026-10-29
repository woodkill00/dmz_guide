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
