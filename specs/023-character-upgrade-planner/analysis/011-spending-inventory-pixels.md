# Independent spending artifact and Inventory pixel review

Reviewer: `verify_upgrade_player_journeys` · 2026-10-26 22:18 UTC.

**Scoped verdict: PASS for the reviewed spending functional artifacts, full capture integrity and Chromium/Firefox Inventory pixels. This is not whole-PR/Studio acceptance.**

## Exact evidence and carryover

Quality run `40406999584`, published `d5283565f14b3fc7b4454a02d6d14b6909d47ddf`, CI merge `45b135bbf92897a215d7d9ef6828cf1d600f91e0`, tree `3d7316d11cae17489969f442a0a1d0e28fd121b3`. Current `16442d9ae8c670d442bb1b858b0651e91ecf7675` / tree `c02bb8f7405a3f4637258e201c2cd86a120a7738` changes only Studio tests/ownership cleanup and the evidence ledger. Production and the reviewer spending module SHA256 `8dd14c6a67d27c6200a60de136f99bdf04a13e54b2c2de4f29d27ba509dee002` are unchanged, so this scoped visual review carries over, not the failed whole-run verdict.

Downloaded ZIP digests independently verified against GitHub artifact metadata:

| Artifact | Target | ZIP SHA256 |
|---|---|---|
|12692433881|Ubuntu Chromium155.0.8059.39|`e25cbdd435ac3882f075a9debdf12272a3e4bb1736256acad253154b41fa90dc`|
|12692014738|Windows Chromium156.0.8078.48|`e0f7dddc34fe85aed91dfd658d78e2bcaf437fe61cff319ef14e211a42c78214`|
|12693545944|Firefox146.0.1|`e9b2823f555c341c2dd582c17a2e47dd44d8b4222b9f0ece6abf8ddcb9cf5881`|
|12692394472|WebKit26.0|`fc5e3148d2c7c0ffaeae6dfc9c3584ac8ada7958780f3971455fbcf59408ef46`|

All four JSON reports identify the same CI merge, explicitly mark synthetic state only, and report **18 scenario groups PASS**. They cover both purchase surfaces, repeat/CAS/quota/retry/Cancel/navigation, status-only separation, stock/reserve/retained/alias guards, reset/history migration/restore/rebind, snapshot reversal, privacy/unit-safe counters and bounded paging, plus320/390px actual100/200% text keyboard/layout. This is direct report verification, not an inference from screenshot presence.

## Complete capture audit

The independent audit checks every referenced PNG, source identity, viewport/root font, initial dialog scrollTop0, all dialog bounds, contiguous vertical coverage and pixel overlaps. Chromium and Firefox each contain8 dialog manifests +8 populated-summary manifests,98 tiles and82 overlaps; every overlap is pixel-identical. Each has106 PNGs including8 compact-empty captures. Windows has90 tiles/74 overlaps,72 exact; the two156-pixel differences are confined to the40px native unchecked-checkbox outline. I inspected both affected Windows frames: no lost text or missing region; no whole-Windows pixel review is claimed. WebKit has18 passing groups and0 screenshots, as required by the existing pinned-tool/CSP policy.

Full modal content was stitched only into consecutive **unscaled** review strips from verified overlapping captures; summary strips likewise preserve every source pixel. An initial derived-grid seam repeated a native frame-edge row; comparison with original Firefox390/200 tiles01–02 confirmed it was not a production line. Regenerated review grids use the already-covered overlap to exclude that edge paint. The original first/final viewport frames were also viewed to check actual centering and control placement. These derived strips are review aids, not replacements for original artifacts.

## Personally observed Inventory pixels

I viewed all four complete modal grids, all four complete populated-summary grids, and all four compact empty captures **for both Chromium and Firefox**:320 and390px, dark100% and light200% text. I also viewed original320/200 first/last modal frames in both engines.

- The former−24px top is repaired: the native dialog visibly sits12px from top/bottom at200%, with readable heading focus outline and purpose beginning at its top. The manifest records initial scrollTop0, not the former footer position2756. No purchase action is focused or activated on entry.
- Saved before/deduct/after quantities, retained tool floor and protected reserves are distinct. The synthetic cash500→400, part A10→7, part B6→4 and retained tool1→1 are consistent with the separately labeled counter change.
- Acknowledgement is visibly unchecked and Confirm disabled before the explicit keyboard acknowledgement. Cancel and status-only correction are readable and within the dialog's horizontal extent at both widths; no control overlap or missing footer was found.
- Net/gross material5 and reversed0 are separate from cash100; per-item A3/B2/tool0 rows and original-record history are legible. The guide-only/non-lifetime, unrecorded earlier spending, unknown-availability and no-game-synchronization caveats are visible.
- Empty summaries contain zero metrics and history caveats without empty pager scaffolding. Inventory heights are528/2175/482/1700px in Chromium and528/2176/482/1701px in Firefox (320dark100/320light200/390dark100/390light200 respectively), satisfying the three-viewport bound.

## Limits and residual usability

At320/200%, complete four-row purchase audit content is approximately11,600px (~14 dialog viewports); populated summaries are also long. They contain meaningful before/after/reserve/unit/history detail rather than the former empty scaffolding. Long labels/headings wrap mid-word at the narrowest enlarged setting, and single-page populated summaries retain disabled pager buttons. These are retained touch-scroll/readability limitations, not established clipping, missing-content or inaccessible-control blockers. Geometry and complete capture alone are not claims of ideal mobile usability.

This review does not claim physical-device, screen-reader or full WCAG certification; WebKit pixel review; actual gameplay purchases; private player holdings; or complete lifetime spending. All quantities are fictional synthetic test data. Reversal and failure behavior have actual functional assertions but no separate full responsive reversal/failure screenshot set. Progression visual review is separately attributed to the pixel subreviewer.

The old d528 run advanced through browser checks but stalled in Studio; builder terminal logs show `ERR_SERVER_NOT_RUNNING` and job timeout. Source inspection separately established the stale consumed/unknown assertion and exceptional server ownership defect. The current fresh run `40410700580` must still pass actual complete Studio/strict health/package and all checks before final implementation acceptance. No failed attempt is relabeled as successful.
