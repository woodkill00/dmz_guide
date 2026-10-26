# Independent functional and visual acceptance — recorded spending amendment

Reviewer: `/root/verify_upgrade_player_journeys` · 2026-10-26 22:30 UTC.

## Verdict and exact source

**PASS, with retained limits below.** The user-authorized recorded-purchase extension now has actual four-target functional/layout, Studio/strict-health and synthetic-pixel evidence. This is QA acceptance of the reviewed source, not permission for this reviewer to merge/deploy or a claim of gameplay verification.

- Published head: `16442d9ae8c670d442bb1b858b0651e91ecf7675`.
- Tree: `c02bb8f7405a3f4637258e201c2cd86a120a7738`.
- Hosted CI merge: `940484fbb665de31a5af0fe5bcc014d1009e33ca`; independently checked equal tree and clean local checkout.
- Quality run [40410700580](https://github.com/woodkill00/dmz_guide/actions/runs/40410700580): independently queried six jobs, all completed/success. Actual native browser/Studio/packaging on Ubuntu and Windows; Firefox/WebKit browser/Studio; repository checks on both OSes; Node24 compatibility.
- Map run [40410700429](https://github.com/woodkill00/dmz_guide/actions/runs/40410700429): independently queried both Node22/24 jobs, including actual map browser steps, completed/success.
- No production or reviewer-module difference from the pixel capture head `d5283565f14b3fc7b4454a02d6d14b6909d47ddf`; only Studio test/exception cleanup and ledger changed. Current-head artifacts were still reconciled directly, not accepted merely by source inference.

Reviewer-owned integrated modules are byte-identical to outside originals:

| File | SHA256 |
|---|---|
|`independent-upgrade-journeys.mjs`|`f6240ddff213b17dd35abaef27e954759d96d7cf1ad5fc4da899bff2d991618c`|
|`independent-upgrade-advice-ui.mjs`|`914ab21154de728382ce9db70f8acfb752a0ac28c9c658fb4fa6dbbad7ee5aaf`|
|`independent-upgrade-spending.mjs`|`8dd14c6a67d27c6200a60de136f99bdf04a13e54b2c2de4f29d27ba509dee002`|

## Directly reconciled current artifacts

All ZIP digests below were checked against GitHub metadata before safe extraction. All spending/journey/Studio/performance reports identify the exact CI merge above. Advice JSON has no embedded source field; it is attributed through the same exact-head artifact metadata and successful suite, not falsely described as containing a source field.

| Artifact | Target/content | ZIP SHA256 |
|---|---|---|
|12692983542|Ubuntu spending|`9d549d5af8566c807044d052058f23ba2f3cb1b579c84d985d0caaae112ecc08`|
|12693798076|Windows spending|`c15bd9cdccfc0c8e503d07b4fe80efe8e8403cc2adc76779236890e639f20226`|
|12693089082|Firefox spending|`c75d157441e4b63c62b8dc70a9a58a591afddb4b3cca66e5d1daea6aeb2c8193`|
|12692794285|WebKit spending|`c789107c1098c98e8901fd74cfb12fa209f03495e80847fa2ece50c32f45d8d8`|
|12693278369|Ubuntu baseline/Studio/performance JSON and other pixels|`65e9e66d87de6f60e46198b547925289837d0cef56ad9b692ad8be8c3ae681d2`|
|12693857710|Windows baseline/Studio/performance JSON and other pixels|`32a01fcd8b42bda4c40fefa49d777edbec390ad0df47ca2414dcb2cb5b0c44ce`|
|12693273904|Firefox baseline/Studio/performance JSON and other pixels|`50dd9f5b12f51b4b42ce36a39d3826490297afef9b71d38424efb4943e3ac728`|
|12693104208|WebKit baseline/Studio/performance JSON only|`e4a7d95a3e675f719ae609a3ca5da590272e8e8c2bab18420d5d2c825ce8e160`|

Every target reports6 baseline journey groups,7 advice groups and18 spending groups PASS. Targets are Ubuntu Chromium155.0.8059.39, Windows Chromium156.0.8078.48, Firefox146.0.1 and WebKit26.0. The18 spending groups actually exercise both surfaces, one atomic deduction, repeated activation/reload, status-only correction/alias/reset guards, four quota/CAS combinations, stable failure export/explicit retry, dirty/missing/zero/reserve/retained stock, navigation recovery, actual observed Bank IV with synthetic2M cash, v1/v2/v3 migration/file replacement/recovery, immutable changed/retired snapshots, hidden history/units/currencies,61-record50-row keyboard paging and responsive keyboard dialogs/counters.

Each current Studio report records schema1 and2 guided/advanced/save/restart/export-import/no-field-loss coverage. Source review confirms the consumed observed field is first checked, then a deliberately synthetic unknown guided field is included in full equality roundtrips and original restoration. Whole actual Studio health steps pass; a helper JSON written before later tests would not alone prove whole Studio success.

The5,766-root performance reports contain5 warmups/50 measurements and current p95 values18.6ms Ubuntu,26.4ms Windows,70ms Firefox,37ms WebKit, below the250ms reference target. Each reports121 unique materials, maximum50 rendered rows, keyboard pagination and zero injected goals. These are CI-machine reference numbers, not physical-device guarantees. Rebind helper execution is supported by complete browser-step success; it does not emit its own compact JSON, so none is invented here.

## Pixel review and complete-capture continuity

Two signed scoped reports cover all16 Chromium/Firefox route×width/theme/text states, each with complete modal, populated-summary and empty-summary representations:

1. `spending-d528356/independent-spending-inventory-pixel-review.md`, reviewer this lane; SHA256 `547e2423a3c8e72aaa7208e3a257ac5b038ddaf61bde6627380ce5c349694581`.
2. `spending-d528356/independent-progression-spending-pixels.md`, reviewer `/root/verify_upgrade_player_journeys/review_spending_fresh_pixels`; SHA256 `43cfdb5b63f54c24ccc669ddf23eeb8f60cb62fc8b52d98b53f837e3cd6713ce`.

These are **48 complete component representations personally inspected across the two reviewers**, not an assertion that each PNG was independently opened. Full unscaled content strips derive from complete overlapping captures; original first/footer/seam frames were also inspected. An initial derived-grid native-frame seam was resolved against original Firefox tiles and excluded via already-covered overlap in the review aid; original evidence PNGs remain untouched.

Current artifacts independently re-audit:

| Target | Modal + summary manifests | Tiles / overlaps | Exact overlaps | PNGs |
|---|---:|---:|---:|---:|
|Ubuntu Chromium|8+8|98 /82|82|106|
|Firefox|8+8|98 /82|82|106|
|Windows Chromium|8+8|90 /74|72|98|
|WebKit|0|0|0|0|

All referenced files exist; all modal initial scroll positions are0, viewport/root text metadata and bounds pass, and every vertical section is covered. Windows's two156-pixel overlap changes are confined to the native40px unchecked-checkbox outline; I inspected both affected source frames and found no missing text/region. Windows complete visual certification is not claimed.

Pixel continuity to the reviewed production-identical d528 set is directly measured: **all8 empty +86 modal PNGs per Ubuntu/Firefox engine match exactly**, plus2/12 populated-summary tiles each. I personally inspected difference crops for the remaining10 summary tiles per engine: only recording timestamp glyphs differ. Windows likewise has8 empty+78 modal+4 summary tiles identical, with8 timestamp-only summary differences inspected. Thus current-head spending images are reconciled rather than merely assumed unchanged.

Observed repairs are real:320/200 dialog now sits at12px top/bottom rather than−24px top; entry visibly starts at the focused review heading/purpose, not footer Cancel. Exact deducted/before/after/retained/reserve values and material5 versus cash100 are readable; unchecked acknowledgement, disabled Apply, Cancel and status-only controls are intact. Empty summaries omit empty paging scaffolding and remain below three844px viewports. Historical baseline route/advice pixels remain attributed to55b and the compact-empty04d recheck, not misrepresented as all freshly re-opened current full-page images.

## Independence, failures and limits

QA authored fixtures outside the integration worktree; sole writer copied exact hashes. Pure fixture admission/numeric/alias/LIFO/privacy probes passed against actual validators/domain code, separately from browser execution. This lane independently reran3 summary/entry and7 Studio ownership tests; full domain/capacity/property testing is attributed to the separate domain reviewer and successful CI, not relabeled as browser coverage.

Retained deliberate discovery logs independently show native/engine `FEATURE023_SPENDING_DISCOVERY_SENTINEL` before startup (SHA256 `6988b701f4daf4dc87b5a4744a714f1439c6266031d6ea2a1251afdee08b4924`) and one runtime sentinel failure (`59f2302a0841071166a4d083ca3ce80ada9364e4192cc4ec0f577204f2653667`). Exit1 is evidenced by builder tool results, not embedded log text. Sentinels were confined to an isolated archive and removed before real acceptance.

Earlier failures remain distinct: active-draft versus durable-state test ownership; premature async Cancel and focus snapshots; stale equivalent-copy regexes; original unexplained Windows purchase-opening timeout; genuine overlong empty scaffold, negative modal top and bottom-focused entry; Studio's stale unknown expectation and leaked current-server ownership. D528 logs actually exposed `ERR_SERVER_NOT_RUNNING` and timeout; the stale assertion was independently source-proven but masked in those terminal logs. The final pass does not fabricate a trace for the original Windows timeout or call it a proven product repair. Original baseline theme-toggle timeout likewise remains unexplained historical evidence.

Explicit residuals: meaningful full audit content is long at200% (~14 internal viewports at320px), narrow labels can wrap mid-word, and populated single-page disabled pagers add height. No missing/clipped content was established, but this is not an optimized touch UX claim. No physical-device, screen-reader, universal zoom or full WCAG certification; reversal/failure/partial/migration conditional states have functional tests, not a separate complete responsive visual set. WebKit is functional/computed-layout only under the unchanged pinned-tool/CSP policy. Local browser startup was genuinely sandbox-blocked before application startup, Docker unavailable; no bypass/relaunch was used.

All holdings are fictional synthetic/fresh. Owner-reported consumption is scoped to8 admitted definitions/31 costs and does not certify capture date, build applicability, complete prerequisites, game state or lifetime spending. No raw private screenshots or actual holdings were admitted. Independent source diff confirms no map020/root-dependency/native-close-helper change in the amendment. Final documentation-only records and exact-head check carryover remain the integrator's next reconciliation; this report is immutable attribution for the source above.

Signed: `/root/verify_upgrade_player_journeys`.
