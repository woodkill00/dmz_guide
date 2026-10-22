# Measured reader scale: partial hosted acceptance

Status: Chrome evidence verified on Linux and Windows for c0b; Firefox subsequently failed strict health and WebKit did not execute. Corrected-candidate cross-engine/platform acceptance and merge/main gates remain pending. This is not a release-complete verdict.

## Candidate and provenance

Hosted candidate c0b2542c089436c1802fca7ff806775292653aea, [run39791556454](https://github.com/woodkill00/dmz_guide/actions/runs/39791556454), independently inspected2026-10-22. Published tree9f93bd0547e4bdc26cc2056f7183ffebfe35e6c3 exactly matches local source candidate bfe782e1532300728e3b6a19e9543627c2186700, confirmed independently by the integration owner and source reviewer. Read-only git ls-remote also confirmed the full published head. Subsequent maintenance integration remains separately gated.

- Linux artifact12431163065, archive SHA256275d49e320bac4ec39ffba997e15f2fb81477af737ae9678765dcfc37b75e673.
- Windows artifact12431623025, archive SHA256908a10f4a4e58b3a251d897375800935bb0de5846d29a72c36df98be8c7153a6.
- Exact measurement JSONs are preserved as evidence/after-pagination-linux-chromium.json and evidence/after-pagination-windows-chromium.json. Each has complete:true, all six fixtures, one warmup and five samples per fixture, full arrays and environment metadata. All measured inventory populations mount exactly50 rows.
- Linux: Chromium155.0.8059.39, Node22.23.3, four logical AMD EPYC9V74 CPUs, approximately16.8GB RAM. Windows: Chromium155.0.8059.85, Node22.23.3, four logical AMD EPYC7763 CPUs, approximately17.2GB RAM. Full OS/kernel and runner metadata remain in the JSONs.

## Observed medians, milliseconds

| Platform | Inventory items | Initialization | Filter to next painted frame | Mounted rows |
|---|---:|---:|---:|---:|
| Linux Chrome |100|97.0|18.5|50|
| Linux Chrome |1000|118.8|19.2|50|
| Linux Chrome |5000|245.7|15.2|50|
| Windows Chrome |100|113.7|18.3|50|
| Windows Chrome |1000|131.0|18.2|50|
| Windows Chrome |5000|231.2|18.2|50|

| Platform | Native options | Initialization | Keyboard selection to next painted frame |
|---|---:|---:|---:|
| Linux Chrome |100|111.0|29.0|
| Linux Chrome |1000|149.9|29.1|
| Linux Chrome |5000|354.6|35.2|
| Windows Chrome |100|110.9|31.6|
| Windows Chrome |1000|144.9|28.5|
| Windows Chrome |5000|328.5|39.2|

All these observed medians fit the recorded1000ms initialization and100ms interaction budgets. These are observations, not CI latency assertions or universal performance guarantees. Fixture generation, validation bounds, payloads, warmup/sample count and timing definitions remain unchanged. The routed HTTP200 fixtures isolate browser work rather than representing variable production-network latency. Runner hardware differs between runs: do not derive causal speedup percentages. Windows has its first valid scale evidence here, not a Windows baseline comparison.

## Functional and visual coverage established on Chrome

Both complete functional JSONs retain selected-only readiness and explicit identity recovery, failed Discard-switch raw/checkpoint retention, Stay, failed Save, validated hidden/all-page Save and export, durable reload, successful Discard restoration, bounded stable page ranges, filter/search/zero results, pointer/keyboard boundary no-ops and focus, invalid owned/reserve recovery and no catalog refetch on paging/filtering. The executed test includes native mounted multi-invalid ordering (owned before reserve, then next catalog item) and hidden/offscreen invalid recovery. No product repair was inferred from the earlier Playwright aria-disabled actionability mismatch; its bounded real-mouse fixture correction is exercised here. Required strict browser-health checks were retained.

For each Chrome platform, the independent journey validator verified16 full-document coverage manifests against actual PNG tile dimensions and total area:12 middle-page combinations (320/390/1280 widths, dark/light themes, normal/true200% text) plus four320px empty-state combinations. This includes approximately43,000px-tall narrow200% documents. Eight additional first/last-boundary locator screenshots exist per platform. Representative native pixels inspected included Linux320dark200 middle,390lightnormal,1280light200 and dark/light200 first/last/empty; Windows320dark200 and320light200 middle. Reported findings were readable controls, visible focus and no overlap. This does not claim manual inspection of every pixel of every document.

## Conditional decisions and outstanding gates

Inventory pagination: retain the reviewed fixed50-row implementation. It was justified before implementation by all three engines' after-index residual-budget failures; current Chrome observations meet the budgets with full raw/checkpoint semantics intact. Firefox/WebKit after-pagination confirmation remains pending.

Native picker: NO CHANGE. Keep the existing native selector. Prior complete after-index Linux-engine data and these new Chrome observations do not justify replacement, filtered selection or a custom combobox. No density mode or unrelated optimization is added.

At14:12UTC, the five non-engine jobs were terminal success, while engines job119868679990 was still installing Firefox/WebKit dependencies. There was no current-candidate Firefox/WebKit execution or artifact to accept. Await the actual outcome without suppressing errors, extending deadlines or treating installation progress as runtime acceptance. T010/T011/T012/T013/T019 remain unchecked until their full relevant exact-candidate/platform/recovery/merge/main evidence exists. Subsequent013 maintenance integration requires its own exact-candidate validation; this document neither certifies that integration nor authorizes a merge.

## Subsequent c0b Firefox failure, superseding the installation snapshot

Engines job119868679990 subsequently executed Firefox and failed final strict health at health.mjs169: three invalid-form-control-not-focusable console errors concerned reserve:demo:scale-item-75 and owned:demo:scale-item-76 (the latter twice). The first native invalid callback synchronously replaced all fieldsets, detaching later controls still being visited by native validation. This is an actual current-feature defect, not an assumed preexisting issue. WebKit did not execute.

Independently verified engine artifact12433490434 has archive SHA2562bbfd24bbbd4fc2d207269f7a4f3286bfec93f37c1f217cbcf6c3b552b6a51b6. Preserved evidence/failed-candidate-c0b-firefox-observations.json reports complete:true because six fixtures/five samples finished before the runner's final shared-health check. That flag does NOT establish functional acceptance. Firefox146.0.1 on four logical AMD7763 CPUs observed inventory100/1000/5000 initialization148/187/257ms and filtering13/14/16ms; native5000 initialization312ms/key34ms. These are failed-candidate timing observations only. The validator separately verified16 Firefox full-document coverage manifests and12 geometry records, with representative320dark/light200 pixels; that visual facet does not override failed functional health. No WebKit evidence exists for this candidate.

T020 tracks the bounded next-task native-validation repair, retaining all multi-invalid ordering/raw/focus assertions, exact-target focus waits under unchanged deadlines and strict health. Corrected-candidate cross-engine rerun is required before acceptance. Prior Chrome observations remain historical evidence of c0b, not proof of the new candidate.
