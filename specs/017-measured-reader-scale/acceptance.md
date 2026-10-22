# Measured reader scale acceptance chronology

These entries preserve historical checkpoints. Later dated receipts supersede earlier pending or failed verdicts without erasing their chronology. Final combined closeout is a separate gate.

Historical c0b status: Chrome evidence verified on Linux and Windows for c0b; Firefox subsequently failed strict health and WebKit did not execute. Corrected-candidate cross-engine/platform acceptance and merge/main gates remain pending. This is not a release-complete verdict.

## Candidate and provenance

Hosted candidate c0b2542c089436c1802fca7ff806775292653aea, [run39791556454](https://github.com/woodkill00/dmz_guide/actions/runs/39791556454), independently inspected2026-10-22. Published tree9f93bd0547e4bdc26cc2056f7183ffebfe35e6c3 exactly matches local source candidate bfe782e1532300728e3b6a19e9543627c2186700, confirmed independently by the integration owner and source reviewer. Read-only git ls-remote also confirmed the full published head. Subsequent maintenance integration remains separately gated.

- Linux artifact12431163065, archive SHA256275d49e320bac4ec39ffba997e15f2fb81477af737ae9678765dcfc37b75e673.
- Windows artifact12431623025, archive SHA256908a10f4a4e58b3a251d897375800935bb0de5846d29a72c36df98be8c7153a6.
- Exact measurement JSONs are preserved as evidence/after-pagination-linux-chromium.json and evidence/after-pagination-windows-chromium.json. Each has complete:true, all six fixtures, one warmup and five samples per fixture, full arrays and environment metadata. All measured inventory populations mount exactly50 rows.
- Linux: Chromium155.0.8059.39, Node22.23.3, four logical AMD EPYC9V74 CPUs, approximately16.8GB RAM. Windows: Chromium155.0.8059.85, Node22.23.3, four logical AMD EPYC7763 CPUs, approximately17.2GB RAM. Full OS/kernel and runner metadata remain in the JSONs.

## Observed medians, milliseconds

| Platform       | Inventory items | Initialization | Filter to next painted frame | Mounted rows |
| -------------- | --------------: | -------------: | ---------------------------: | -----------: |
| Linux Chrome   |             100 |           97.0 |                         18.5 |           50 |
| Linux Chrome   |            1000 |          118.8 |                         19.2 |           50 |
| Linux Chrome   |            5000 |          245.7 |                         15.2 |           50 |
| Windows Chrome |             100 |          113.7 |                         18.3 |           50 |
| Windows Chrome |            1000 |          131.0 |                         18.2 |           50 |
| Windows Chrome |            5000 |          231.2 |                         18.2 |           50 |

| Platform       | Native options | Initialization | Keyboard selection to next painted frame |
| -------------- | -------------: | -------------: | ---------------------------------------: |
| Linux Chrome   |            100 |          111.0 |                                     29.0 |
| Linux Chrome   |           1000 |          149.9 |                                     29.1 |
| Linux Chrome   |           5000 |          354.6 |                                     35.2 |
| Windows Chrome |            100 |          110.9 |                                     31.6 |
| Windows Chrome |           1000 |          144.9 |                                     28.5 |
| Windows Chrome |           5000 |          328.5 |                                     39.2 |

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

## Final candidate acceptance, 2026-10-22

Exact candidate `4d6a2ecfa2f789e8a946e595b8302391e53f5f96`, tree `efc75ae955164e1345a5fbff64736e53a26e13d7`, passed all six jobs in [run 39797010157](https://github.com/woodkill00/dmz_guide/actions/runs/39797010157). The integration reviewer independently verified terminal success using the latest-jobs endpoint at 14:48 UTC. Independent source, browser, visual and performance acceptance is complete for this candidate. This supersedes the earlier pending-engine status without rewriting the failed `c0b` chronology. Merge approval, actual merge, exact-main verification and final documentation reconciliation remain separate pending gates at this checkpoint.

The four final measurement files in `evidence/after-pagination-final-*.json` retain every sample and environment field from Linux Chrome, Windows Chrome, Firefox and WebKit. They are repository-formatted, JSON-value-identical copies rather than byte-identical artifact files. `final-pagination-provenance.json` records both original and repository-file SHA256 hashes, artifact archive digests, candidate/run identity and visual scope. `final-pagination-medians.md` records all 24 fixture-population medians. Each platform completed six unchanged valid fictional fixtures, with one warmup and five samples per fixture. All inventory fixtures mounted exactly 50 rows.

At 5,000 inventory items, initialization/filter-to-next-paint medians were 234.4/18.3 ms on Linux Chrome, 220.6/18.1 ms on Windows Chrome, 182/11 ms on Firefox and 149/28 ms on WebKit. Native-selector initialization/key-to-next-paint medians at 5,000 options were 309.9/33.0, 303.4/33.9, 176/27 and 182/23 ms, respectively. All observed 100/1,000/5,000 medians fit the recorded 1,000 ms initialization and 100 ms interaction budgets. These are measured observations, not new timing assertions or a universal performance guarantee. Hardware, browser and runtime differences prohibit causal cross-run speedup percentages.

The next-task invalid-recovery repair passed actual Firefox and WebKit multi-invalid native-validation journeys with shared strict health, plus both Chrome platforms. Full raw/checkpoint retention, owned-before-reserve/catalog-order recovery, failed Save/Discard/Stay, full Save/export/reload, clean view-only changes, boundary pointer/keyboard focus and selected-catalog isolation remained exercised. The separate recovery-truthfulness journey passed on Linux job 119886710271 at 14:39:07 UTC, Windows job 119886710292 at 14:39:58, and engine job 119886710241 at 14:38:02 (Firefox) and 14:39:02 (WebKit). This status evidence is not inferred from the scale module.

The journey reviewer verified 48 full-document coverage manifests against actual PNG dimensions and area: 16 each for Linux Chrome, Windows Chrome and Firefox. The 48 middle-page geometry/state cases cover all four platforms at 320/390/1280 widths, dark/light themes and normal/actual 200% text. Fresh representative 320px dark/light, 200% pixels were inspected on all three screenshot platforms. WebKit has geometry, state, keyboard and strict-health evidence, not screenshots. No exhaustive manual review of every document pixel is claimed.

The conditional decision is to retain bounded 50-row inventory pagination, justified by the earlier independently reviewed residual-budget evidence and validated here against the same fixture populations. The native picker remains explicitly **NO CHANGE**: no replacement, custom combobox, filtering control or density mode is justified. Windows `c0b` was its first valid scale observation, not a Windows baseline. Preserve the failed Firefox `c0b` JSON and explanation: its `complete: true` preceded failed final health and never established functional acceptance. These exact corrected-candidate receipts establish the repair, not final merge/main approval.

## Ordered merge and exact-main verification, 2026-10-22

Under the parent's explicit conditional merge authorization, PR15 was normally merged as `fde244914283d4aa2f65facc4d24aa18775e17bc` at 17:07 UTC. Its tree `efc75ae955164e1345a5fbff64736e53a26e13d7` equals the accepted candidate tree. The automatic push run [39822766874](https://github.com/woodkill00/dmz_guide/actions/runs/39822766874) appeared after an event delay; no manual dispatch or empty commit was used.

Every original Linux runtime step, including cleanup, succeeded by 17:33:34, and the aggregate later reported success, but its required job/check summary remained in progress. This was not described as a test failure or accepted as a terminal check. After fresh verification of unchanged main, completed aggregate and completed downloadable cleanup logs, one parent-authorized targeted status-recovery rerun was accepted at 18:00:46. Only Linux runtime was requested again; the other five successes were preserved. At 18:09 both latest jobs and exact-head check-runs independently showed all six completed SUCCESS. The parent separately verified the six check-runs. T012's actual merge/main obligations are therefore complete; the final combined documentation/convergence publication remains separately owned and is not preclaimed.

## Final feature convergence receipt, 2026-10-22 20:24 UTC

The late bounded corrective slice and its reviewed Studio test-only follow-up passed all six exact-candidate checks in [run 39844947628](https://github.com/woodkill00/dmz_guide/actions/runs/39844947628) at `482c6c8418a73ab1295839d85744059dc2c84ef8`, tree `f80e5076f9e0013f20a4a9915c7871973b0bf959`. Independent acceptance covered all four lifecycle environments and the unchanged metadata surface: 336 fresh normative cases passed, with prior representative-pixel evidence transferred only after source/helper identity verification. The 009 owning receipt retains the actual earlier timeout, unknown original cause and unverified native identical-file-after-timeout behavior; no production deadline or assertion was relaxed.

PR20 was normally merged as `26158bae45934658f8104d77a8a17e1a3553d08a` with the same accepted tree. Automatic exact-main [run 39846987185](https://github.com/woodkill00/dmz_guide/actions/runs/39846987185) subsequently completed all six required latest jobs and exact-head checks successfully, freshly verified at20:24 UTC. The independent final clause/traceability assessment found no new unowned buildable gap, and the accepted-scope ledger now records the actual conditional outcomes and all prior main receipts without replacing failed-history evidence.

This completes the feature-specific source/visual/convergence and integrated-main clauses recorded here. The separately authorized documentation/infrastructure closeout's own publication, candidate CI, normal merge and exact-main result remain governed by 013 T029 and must be recorded externally after they occur; no self-referential future gate is preclosed.
