# Independent implementation review notes

Date: 2026-11-17. Interim review only; planning-quality checklist is separate.

## Closed early findings

Source re-review confirms verification is single-flight, captures operation/context and only clears its matching operation. Submitted-owner draft clearing is separate from other panels; canonical model refresh updates panel facts/qualifiers without replacing their input nodes. The atomic operation receipt feasibility assessment remains valid. Parent reports Chromium/Firefox regressions for the repaired races; this review has not independently rerun those browser tests.

readExistingRecord now enumerates databases when the API is available before opening an absent store, retaining the 1500ms deadline and late-open/abort cleanup. This addresses the reported WebKit absent-shell path where enumeration is supported; no universal unsupported-browser zero-shell guarantee is independently certified.

## Remaining findings

- P2, src/client/dashboard.mjs:617–633 / refresh:273 — Interrupted initial manifest loading cannot recover on bfcache return. pagehide aborts the initial controller before catalogs is assigned. resume only calls refresh/loadArmory, and refresh returns if catalogs lacks the selected entry; no path retries the manifest bootstrap. The Refresh button has the same limitation. Capture a held manifest fetch, navigate away, restore via actual Back, release it, and require the selected catalog/dashboard to recover without page reload or a player-store write. Make bootstrap retryable under the same lifecycle guards. The independent weapons manifest has a similar interrupted-load concern: its aborted catch sets weapons=[], with no later public identity reload.
- P2, src/client/dashboard.mjs:531–532 — Pagination changes pages[id] before asking whether a dirty item draft may be left. Choosing Stay returns without rendering but leaves the internal page advanced; the next unrelated render can jump pages and detach the draft's source tile. Check the guard before changing pagination state, and test dirty Next → Stay → unrelated refresh/section expansion preserves exact page, input node/value and visible range.

No production files edited. These notes do not certify complete feature implementation or release acceptance. Implementation and regression gates remain pending.

## Source convergence re-review — 2026-11-17

The two findings above are closed in source: loadCatalogs is restartable and guards owner/generation after manifest/weapon reads; resume retries startup when catalogs/pack are absent. Pagination now asks the dirty guard before mutating page state. Parent reports all three engines, the 100-target Stay regression and seeded dark/light axe scans passed; this reviewer has not independently rerun that matrix. Existing atomic receipt, independent panel drafts and single-flight verification repairs remain present.

New P2, FR-008/FR-012/T016: dashboard refresh loads only the published pack URL and profile. src/client/common.mjs selectedCatalog first reads the validated dmz-guide-local/content overlay for the same catalog ID. A private content edit retaining the same ID/version can change requirements, recipe availability, names or item bounds while Home projects the published facts; owning Inventory/Quick collect use the overlay. This violates same-context parity and can make Add found use different item validation. Resolve existing content read-only with the same validation/ownership semantics (and no absent-DB creation), or block projections/writes when an overlay cannot be safely reconciled. Add same-ID/same-version overlay parity fixtures, invalid-overlay states and Add found bounds checks.

Implementation convergence remains open pending this finding and final aggregate/artifact evidence. Planning-quality approval does not close implementation evidence. No production files edited.

## Overlay parity repair re-review — 2026-11-17

The overlay finding is closed in the reviewed source. readDashboardOverlay reads the existing content envelope without creating a store; refresh validates schema and exact pack ID, prefers the overlay and retains invalid bytes with a baseline warning. Profile projections validate inventory against the selected pack's bounds. Add found rereads both the profile revision and overlay presence/revision tag before dispatch, then uses captured selected-pack item validation. This is existing profile CAS plus guarded overlay preflight, not a claim of a new atomic content-and-profile transaction.

Parent reports same-ID/version private name/recipe/currency parity passed in Chromium/Firefox/WebKit (111178/490d80), including the owning Quick collect value. Independently executed dashboard and dashboard-storage runtime files: 10/10 PASS; git diff --check passes. No remaining actionable P1/P2 found in this source re-review. Final owning-page/aggregate/acceptance evidence remains pending; no global feature or merge approval.

## Topology/import lifecycle delta review — 2026-11-17

Independently parsed and validated .local/topology-modern-087.json with the new shared topology-only 350,000-value cap: 321,111 values, 8,035,093 UTF8 bytes, 2,096 nodes, 23,682 edges and zero issues. Independently executed dashboard-topology-budget tests: 2/2 PASS. The exact endpoint exception keeps generic default 150,000/max 300,000, depth 20/string 20,000 and byte/graph bounds intact. This measured narrow cap is supported; no controls/edges were discarded.

Remaining convergence issues: upgrade-budget.test.mjs still hardcodes the exported cap at 300,000 and needs an owning-contract update while retaining its graph/byte/overflow checks. Also hub.startDashboard's pending import has no captured generation/controller or queued resume: if pageshow occurs while loading, retry returns early; an old import rejection after pageshow clears loading without retry. A held import rejected after persisted return should prove recovery, or this limitation must remain explicit rather than claiming automatic import retry coverage. This is a source-derived lifecycle scenario, not an independently reproduced runtime failure.

Parent reports the classic aggregate 1,045-test check passed before the topology/import deltas. It cannot be claimed as the final post-delta full suite. Modern build/final regression and acceptance remain pending; planning checklist unchanged. No implementation edits.

## Delta finding closure — 2026-11-17

Reviewed the updated upgrade-budget tests: explicit cap is 350,000; elevated-reader and overflow cases use the exact topology endpoint; generic default failure and structural graph/byte assertions remain. No assertion was waived to fit the new snapshot.

Reviewed hub import failure handling and runDashboardModuleFailureTests. The scenario now explicitly accepts an unavailable dashboard with Reload to retry after a rejected import; static All features remains visible and pageerrors must be empty. The test holds the module request through synthetic persisted hide/show before aborting it. Acceptance and T022 accurately describe reload recovery rather than automatic rejected-module retry. This closes the prior source-derived lifecycle concern within the documented unavailable-state contract, without claiming a real browser bfcache experiment or successful retry of a cached rejected module.

Parent reports classic dashboard --engines --a11y all three PASS (session 38600). Acceptance still explicitly marks final runtime/modern/broad Home receipts pending; no unsupported complete-aggregate claim was found. No remaining actionable blocker identified in this reviewed delta. Final implementation checklist gates remain pending and planning checklist unchanged. Only reviewer notes updated.

## Final convergence — 2026-11-17

All reported source findings are closed; final evidence and explicit independent-versus-parent-run boundaries are recorded in implementation.md. Full runtime1047/1047 and three-engine broad Home terminal logs were independently read; final modern/classic dashboard/axe/build/check receipts were supplied by the parent. No remaining actionable blocker found in the reviewed scope. Prior pending statements are historical. Cross-platform CI/maintainer merge remain separate.
