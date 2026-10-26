# Feature023 implementation acceptance checklist

Reviewer: `/root/verify_upgrade_player_journeys` — independent browser and visual QA.
Date: 2026-10-26 UTC.
Scope: implementation acceptance only; this does not replace or modify the signed planning checklist.
Status: **PASS for the reviewed implementation, with explicit limits and the original unexplained Windows timeout retained.** Final reconciliation: 2026-10-26 16:37 UTC.

Source: `a5212fc496e234d32e6e9a1097f24852d210c25a`, tree `1c8aa1ca96a70bcfd8d53ce9af9473616978c3dd`; hosted run `40356453421`; CI merge `5f8b4031522847ba8e3c0458b33e568bf875c7a3` independently confirmed tree-equivalent.

## Observed coverage

- [x] Independently authored journey/advice modules are byte-identical to the integrated modules; actual hosted reports establish their execution, not just discovery.
- [x] Eight observed recipes, 31 cost rows and 22 labels; fresh holdings empty and progress/mechanics unknown.
- [x] Absent inventory, explicit zero and clear remain distinct; reserve, explicit Save, Cancel, reload and dirty-navigation behavior exercised.
- [x] Availability and completion are independent on both surfaces; completion/Undo do not consume, refund or silently save inventory.
- [x] Both progress surfaces and both watch-pin surfaces retain separate exportable failed candidates under quota/CAS; committed state stays unchanged and no newer-revision retry is automatic.
- [x] Explicit v1 migration preview/cancel/commit and exact original recovery; v2 file backup/restore, rebind changed/retired/new identities and cross-pack rejection.
- [x] Actual Studio v1/v2 guided and advanced edits, preview/save, restart, export/import and no-field-loss checks pass on the completed Ubuntu/Windows Chromium, Firefox and WebKit jobs, including the single authorized Windows repeat.
- [x] Synthetic numeric cases separately verify All-known/Focused, shared-stock-once, positive Keep with zero Search, reserve/upgrade gaps, collect-to-target and completion without stock mutation.
- [x] Observed gameplay arithmetic remains gated even after manual stock entry; partial/unknown scope and user rules remain explicit. No invented consumption evidence or unsafe sell claim accepted.
- [x] Spoiler-sensitive names and hidden parent-map locations are tested without leaking their terms into the new chooser/reference controls.
- [x] Original keyboard focus assertion passes on actual Chromium, Firefox and WebKit after the evidence-driven native-modal repair; diagnostic wrappers/probes were removed before acceptance.
- [x] Computed layout checks cover 320/390 CSS pixels, both themes, actual 16px/32px text, reduced motion, control bounds and overflow.
- [x] Actual Chromium/Firefox pixels reviewed separately from computed layout; tiled evidence has full-height coverage and overlap audits. Final-production pixel continuity established as detailed in the accompanying review.
- [x] Reference runs for four platform/engine combinations use five warmups plus 50 measured samples and 5,766 roots; current-head browser p95 values are 16.1ms (Ubuntu Chromium), 29.2ms (Windows Chromium), 57ms (Firefox) and 32ms (WebKit). These are measured CI references, not device-wide promises.
- [x] Completed browser reports exercise 121 distinct material rows in 50/50/21 keyboard pages, at most 50 rendered rows and no injected focus goals.
- [x] Named negative discovery failures were independently inspected in retained logs; sentinels were removed and later actual suites ran.
- [x] Current Ubuntu/Windows and engine browser/Studio strict-health jobs pass; CSP, health assertions and functional assertions were not weakened.
- [x] Final Windows-only same-head repeat completed successfully, including Studio/packaging. Artifact 12668420959 digest verified; 12 manifests / 70 tiles / 58 exact overlaps; all 75 PNGs match reviewed same-production Windows evidence.

## Explicit boundaries and residuals

- [x] The first current-head Windows attempt's pre-023 dark-to-light theme timeout is retained as an unexplained historical failure. The one authorized same-head repeat passed; it remains diagnostic, not a claimed root-cause repair.
- [x] WebKit has functional/computed-layout acceptance only: no WebKit pixel claim, following the baseline pinned-Playwright/CSP policy.
- [x] Local browser launch was blocked before application startup; no sandbox bypass. Actual browser claims are from authorized hosted CI.
- [x] No physical-device/iOS Safari certification, manual screen-reader certification or full WCAG conformance claim.
- [x] Actual gameplay consumption, exhaustive prerequisite knowledge, capture date and current-build applicability are not verified by synthetic QA.
- [x] Only fresh/synthetic holdings and normalized observations appear in the reviewed artifacts; no raw private observation screenshots or real owner holdings were published.
- [x] Comprehensive A01–A20/alias accounting is attributed to the separate domain review, not misrepresented as these browser interactions.
- [x] No merge, deployment or expanded private-data admission is authorized by this checklist.

Attribution: reviewer `/root/verify_upgrade_player_journeys`; the integration writer may copy this finalized checklist verbatim. Full artifact identities, evidence and limitations are in the accompanying independent implementation acceptance review.
