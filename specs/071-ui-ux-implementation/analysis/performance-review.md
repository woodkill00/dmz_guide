# T065 measured Guide performance review

Production source: `0eb682e`; test-only populated-upgrade fixture corrections: `29b8fd8`, `5fab8ee`. Both measured builds used HEAD `5fab8eeb4c8e1d6cb752ddc86fa83c41a752fbdb`, Node24.15.0, Windows and Chromium145.0.7632.6 on the same machine. This review covers five Guide fixtures, not Map, Safe Runs, Studio or Manager latency.

## Evidence and admission

Twenty fresh browser contexts per fixture/viewport and variant produced **300 legacy +300 modern observations**, with zero geometry/health failures. Content fixture digest matches exactly: `76f187fce1425025213bfba75480181cefd2f8c8596f52f850a8efb7ec10b6ad`. Owner full counts match:62keys,48inventory items,9upgrade groups,33weapons. Positive initial results, exact zero-result owner status/rows, unchanged input focus and exact cleared-result restoration were asserted. Home submits to a separate search page, so inline-filter completion is N/A. Input values are not serialized. Text200 means CSS root text200%, not native browser zoom or physical-device verification.

Local raw receipts are under `.local/worktrees/071-performance/.local/`: `ui-layout-baseline-measured.json`, `ui-layout-modern.json`, `layout-baseline-final.log`, `layout-modern-final.log`. The original historical18-row baseline was preserved unchanged. Two incomplete baseline attempts produced no promoted timing receipt: the default starter had no upgrades; then the grouped-upgrade selector missed its actual section containers. The populated shipped catalog and exact family selector corrected those prerequisites, and the entire baseline restarted. Failure evidence: `layout-baseline-attempt01-failure.md` (retained-terminal transcript, not original bytes) and `layout-baseline-attempt02-failure.log`.

## Results: investigation required

Navigation-to-owner-ready median/p95 milliseconds (D1440px, C320px, T320px/text200). These wall timings include Playwright transport and scheduling.

| Fixture | View | Legacy | Modern |
|---|---|---:|---:|
| Home | D |111.1/140.0|110.0/146.5|
| Home | C |108.2/114.9|105.6/142.9|
| Home | T |107.8/114.5|106.2/126.4|
| Keys | D |158.4/166.9|176.9/195.9|
| Keys | C |151.4/158.1|169.7/209.6|
| Keys | T |150.0/157.3|171.3/200.6|
| Inventory | D |150.8/155.7|179.1/229.4|
| Inventory | C |145.5/154.2|247.0/295.5|
| Inventory | T |145.2/158.1|264.2/340.4|
| Upgrades | D |138.9/142.9|207.3/251.7|
| Upgrades | C |136.5/147.9|268.2/300.7|
| Upgrades | T |137.8/168.5|264.8/300.1|
| Armory | D |248.1/296.8|432.3/452.8|
| Armory | C |227.8/240.2|388.2/413.8|
| Armory | T |231.1/238.3|400.4/448.5|

The original comparison remains **investigate**;14of15 groups cross the10% navigation threshold. Exact rendered-filter completion medians were approximately0.5–3.2ms legacy and1.0–3.1ms modern. Six groups cross a10% completion median/p95 threshold; these include submillisecond absolute differences and remain disclosed, not waived.

## Bounded investigation

A separate diagnostic alternated actual legacy/modern pages in AB/BA order,20contexts per variant for three representative scopes, without screenshots during sampling. It retains the original600 observations unchanged. Median/p95(ms):

| Scope | Legacy | Modern | Median/p95 change |
|---|---:|---:|---:|
| Keys desktop |221.1/252.5|228.5/246.5|+3.3%/-2.4%|
| Inventory compact |198.3/223.0|201.8/225.7|+1.8%/+1.2%|
| Armory desktop |322.7/341.5|328.4/356.0|+1.8%/+4.2%|

CDP median script/layout/style CPU(ms): Keys13.5/76.4/15.2→14.9/70.9/21.4; Inventory8.4/36.0/12.3→8.8/36.2/12.7; Armory9.2/128.9/22.2→9.3/123.8/27.0. A five-read Inventory ablation with consistent request interception measured175ms actual versus174ms without shell CSS,178ms without directory CSS and176ms without shell JS. Live wrappers do not mount the generic directory observer because they deliberately lack its owned-row container.

The large sequential gap did not reproduce under balanced order. This supports a timing/order confound and modest extra style work; it does not establish a product regression cause or turn the original gate into a pass. Diagnostic-only evidence: `layout-interleaved-diagnostic.json/.log`, `layout-readiness-diagnostics.json`. No product optimization or threshold change was made from these measurements.

## DOM and visual findings

Initial DOM: Home345→210; Keys4292→4249; Inventory4921→4928; Upgrades961→968; Armory12126→12133. The **+7-node hard-budget gap remains explicit**. Armory domain main is exactly12000nodes in both variants; additions are2stylesheet links,1shell-module script and4navigation nodes (mobile disclosure/summary/primary-link container and density control). Both retain77native navigation anchors. `layout-dom-diff.json` records the static parse. No records/features were removed to manipulate the count; any budget exception needs independent review.

`view_image` review covered actual Home desktop and viewport screenshots for Keys, Inventory, Upgrades and Armory at320px/text200, under `ui-layout-modern-screens/`. Home has clear workspace hierarchy. Narrow layouts retain controls and wrap without page overflow. Follow-ups: Inventory splits “Unknown” across a narrow value column; Keys requires deliberate horizontal row scrolling beside its sticky filter; Upgrades remain tall; Armory header uses most of a568px-high viewport. These are density/readability observations, not physical-device or complete visual approval. The Inventory full-page screenshot is67837px tall, so viewport evidence was inspected instead of treating its tiny scaled preview as review.

No default promotion or completed T065 acceptance is claimed by this report. The timing and DOM findings above remain available for owner and independent-review disposition.

