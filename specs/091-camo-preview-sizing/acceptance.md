# Acceptance — Native-size camo previews
2026-11-18, bounded CSS-only repair on fix/091-camo-preview-sizing.

## Reproduction and repair
Registry source swatches are128x128px. Actual Rezi12 at1280 viewport beforefix: Military164.015625px, Special225.484375px. TwoCSS declarations now cap four/three grid tracks at120CSSpx while retaining min0 for mobile shrinking. Actual after: allfourprimarytier images107.625CSSpx. Mode mastery uses the same cap; no artificial sharpening, newassets or higher-resolution claims.

## Executed checks
- Related camoprogress/reference/media runtime17/17PASS,0failures/skips.
- Classic and modern builds2079routes+404PASS. Final configured-default restoration buildPASS2079+404; liveRezi12 confirms legacyvariant andmaximumpreview107.625CSSpx.
- Extended actual tracker browser runPASS Chromium/Firefox/WebKit in bothvariants. Numeric assertions check visible primary/mastery previews>0and<=128CSSpx at320/390/768/1280/1920; cross-tier/mastery equality at1280/1920; Military2x4 preserved. Nooverflow at200%text.
- Same runs retain click/checkbox/save/reload/undo, parallelSpecial/Gold, sharedcompletion, acquisition/workbench/legacybackup preservation, quota/stale/denied/corrupt/futureversion/lateack recovery, keyboard, dark/lightaxe0violations and actualtextcontrast>=4.5. NoJS25references/localpictures/noDB creation alsoPASS.
- Original089referencejourneyPASS all3engines inclassic, preserving all25entries/source links/filtering/art-fallback/private-data preservation.
- Scoped Prettier/repositorycheckerPASS; git diff whitespacecheckPASS. Parent viewed realafterRezi12capture test-results/camo-previews-091-after.png; automatedmatrix also saved desktop/mobile dark/lightcaptures. These artifacts stayignored.

## Scope and limits
Only two productionCSSlines changed; image files/hashes, sourcefacts, privateformats and save logic unchanged. Mobile four/three-column grids can shrink differently; neither upscales beyond128CSSpx. At highDPI/browserzoom the original128px compressedsource still limits available detail; this repair removes oversized CSS stretching rather than inventing newimage detail. No full1070suite or releasearchive rerun claimed for this smallstyle repair; historical090evidence remains unchanged.

Final reviewer-owned disposition is separate in final-review.md. Local commit and default-build terminal receipt follow final review.

Independent scopedrepairreviewPASS. Finaldefault build/livecheckPASS. No new unbuiltrepair work remains; localcommit completesdelivery.
