# Independent Studio fixture and resource-ownership review

Reviewer: `/root/review_upgrade_implementation`
Date: 2026-10-26
Verdict: **PASS for the exact test/evidence-only delta; fresh actual Studio/health/package acceptance remains required.**

Frozen commit `0bc0fe77e31ae37501ce4176730d5f48db82811c`, tree `c02bb8f7405a3f4637258e201c2cd86a120a7738`, compared with published `d5283565f14b3fc7b4454a02d6d14b6909d47ddf`.

Four changed paths are the Studio caller/helper, seven resource-lifecycle regressions and historical failure ledger. Production source, source facts, private-profile accounting, browser-health rules and dependencies are unchanged.

The old helper incorrectly required unknown consumption from the now admitted consumed observation. I independently loaded the actual fixture and confirmed consumed. The new helper explicitly asserts that source value, verifies the guided value agrees, then makes a clearly labeled isolated synthetic unknown edit. Full guided→JSON→save→restart→export/import equality and original-content restoration remain. Unknown-field coverage is not removed, and no real gameplay source is rewritten by this test.

The exceptional resource defect is independently confirmed in the old source: helper-local server replacement could fail before returning the replacement handle, leaving its caller with an already-closed original and a live orphan. The underlying server close is non-idempotent, so merely adding a helper catch-close would not prevent stale caller cleanup masking the original failure. The new explicit ownership transfer resolves that boundary: the caller clears its handle before awaiting; the helper owns context/page setup and every restart, clears a handle before closing, closes its current server on failure, and returns ownership only after successful context cleanup. Multiple cleanup errors retain the original failure through AggregateError cause rather than silently replacing it.

Independent exact-archive execution: **7/7 actual-helper mocked-resource tests passed**, covering new-context, new-page, restart, later assertion, context-close, cleanup-error and successful latest-handle return. Syntax and delta whitespace checks passed. These probes establish test-harness ownership semantics, not actual native/browser Studio completion. Source inspection supports the failure assessment; the stalled hosted run is not relabeled a pass, and terminal-log attribution remains separate where available.

No remaining blocker in this narrow test repair. Fresh actual Studio, strict health, clean package and final artifact review are still required. No merge or deployment authorization is implied.
