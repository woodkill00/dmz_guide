# Reviewer-owned requirements checklist

- [x] Navigation hierarchy and the meaning of “Orders” are unambiguous.
- [x] All requested pages are reachable, with X01 separated from Hajin.
- [x] Existing routes, profile state, mission details, and audit remain intact.
- [x] Mobile and keyboard disclosure behavior is covered.

## Independent review — 2026-11-15

Reviewed spec/plan/analysis, source diff and the new browser journey. The Orders label and separate native Hajin/X01 subsections are clear, and no catalog/profile writes are introduced. Final acceptance is blocked by the following findings.

- P2, src/ui/progression-page.mjs (new Orders sections navigation): static #hajin-orders/#x01-orders anchors point to client-only IDs. Independently ran tests/runtime/site-topology.test.mjs: 7 pass / 1 fail, with two missing-fragment issues in the current generated graph. This repeats the 082 fragment boundary; retain the static graph oracle and use emitted static IDs or valid query handling.
- P2, src/client/navigation-menu.mjs: base href is captured once when More opens, while individual page links are created later when a subsection opens. After pack A → pack B, existing anchors are updated by common.mjs but a previously unopened subsection still creates links from captured pack A. Read the current entry URL when creating links and add a two-pack lazy-hydration regression.
- Test/evidence gap, tests/browser/orders-navigation.mjs: real page navigation is mouse-only on the guide with its default pack. The mobile branch only checks primary Orders visibility, and no companion surface or nested-keyboard flow is exercised. isVisible on a roster does not prove the correct target was scrolled into the viewport. Add the requested keyboard/mobile/companion and pack-preservation cases before checking the last criterion.

Additional dynamic-filter concern: the existing menu filter cannot search page links until their subsection is hydrated, and later hydration does not reapply an active filter. Define and test consistent lazy-page search behavior rather than showing newly added nonmatching links.

No implementation files edited. No merge approval or successful aggregate claim.

## Repair re-review and scoped closure — 2026-11-15

The original findings above are historical and now closed. Static Orders-section links use emitted mission-directory-hajin/x01 container IDs. Independently reran site-topology.test.mjs: 8/8 PASS, including the actual generated graph with no broken internal targets. All 29 dynamic page links are created together on first More opening, so filtering has complete page membership. currentBase reads the current selected catalog and refreshLinks runs on pack change and link activation; the stale captured-base path is removed.

Independently executed runOrdersNavigationTests against a disposable owned static server in Chromium, Firefox and WebKit: all PASS. Coverage includes 24/5 links, actual guide page navigation, a catalog switch after menu creation with pack-bound links, filtering nonmatching page links, mobile Enter disclosure, mobile page navigation, and the shared companion renderer/enhancer's new-tab link contract. The companion check is a fixture rendered on the guide origin, not a fresh full Map/Studio/manager integration run. The roster is asserted present after navigation, not an exact scroll-geometry budget. Existing mission detail/audit/storage code is unchanged by this feature; no profile or catalog writes added. These distinctions limit the checked criteria and avoid claiming unrelated complete regression or manual accessibility certification.

No remaining actionable P1/P2 found in this scoped repair review. All checklist items supported within the evidence above; final aggregate/CI and merge decisions remain separate. No implementation files edited or merge approval given.

## Final selector/registry delta review — 2026-11-15

Reviewed the outer-menu selector mappings in navigation-directory, engines, reader-flow, reflow and compact-ui. Direct-child summary selectors preserve the original open/focus/theme/viewport assertions while excluding the intentionally new nested disclosures. The compact test still requires five top-level groups; focused Orders coverage owns the new nested group. Matching production CSS is likewise scoped to the outer summary. No forced action, tolerance increase or removed original assertion was found.

The stable feature registry retains its historical Missions identity/label, while featureLabel and primary legacy navigation render Orders. This preserves the existing snapshot contract without changing routes, IDs or Map mission tracker ownership. Independently reran ui-feature-coverage and ui-search-scopes runtime files: 4/4 PASS; git diff --check passes. Parent reports targeted compact UI 96-case PASS; this reviewer did not repeat that matrix. Additional Orders wording changes in audit and run-plan are presentation only. No remaining actionable blocker identified in this delta; the earlier scoped checklist disposition stands, without claiming completion of the still-running broad browser/CI gate or granting merge approval.
