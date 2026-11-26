# Independent visual comparison — Feature109

Review date: 2026-11-26 (Europe/Budapest). Reviewer: weapon_card_design. This is screenshot/source-informed design review only, not runtime, accessibility, build or feature-completion approval.

## Inspected evidence

Viewed baseline Home, Inventory, Missions and Hajin Map screenshots at390px and1440px. Compared the three available `109-accepted-{home,inventory,missions}-390.png` images and the corresponding `109-final-*-1440.png` images. Also viewed final Map390/1440 images. Accepted Map and desktop images were not available at this review checkpoint.

## Confirmed findings

- **V109-01 — P2, mobile map controls obstruct each other.** `test-results/109-final-map-390.png`: the top Search/Layers/Routes/Trackers toolbar is partly covered by the floating Map key/drag/fullscreen/Find locations controls at roughly y225–270. The baseline390 image has the same collision, so this is an existing issue not resolved by the Feature109 candidate; it remains relevant to FR10/FR14. Require a settled current screenshot and non-overlapping controls before map visual acceptance. Owning layout surfaces include `tools/hajin-map/src/styles.css` `.map-top-right` and the workspace toolbar placement.
- **V109-02 — P2, compact missing-art text clips.** `test-results/109-final-home-1440.png` and `109-final-inventory-1440.png`: fallback `No image` text in small icon slots is visibly clipped (Inventory breaks it into narrow `No / imag / e` lines). Baselines contain loaded artwork, so those exact images cannot establish missing-art before/after parity, but clipping is directly visible in the candidate. Check `src/ui/item-card.css` `.std-item-icon` small/inline sizing against the new shared metadata type floor. Recheck current accepted images with missing-art fixtures; do not shrink general readable metadata to solve an icon-only layout.

## Positive scoped observations

- Accepted Home390 makes Open map a full-width readable action; its baseline awkward multiline button is resolved.
- Accepted Inventory390 and Missions390 keep navigation, labels and primary controls within the viewport. New Hide menu/Reset layout actions increase mobile chrome height but remain reachable and do not overlap content.
- Desktop Home/Inventory/Missions retain readable heading hierarchy, controls and linked instructions. No other confirmed clipping or control overlap was found in those inspected images.

## Readiness limits

Final Map1440 still displays `Preparing the terrain`, so it is not valid settled-map acceptance evidence. Parent's accepted sweep is intended to require hidden `#map-status` and rendered markers; await its output. Map baseline/final screenshots also contain different source marker counts, so this review does not infer data/layer changes from marker density. No light-theme,200% text, expanded error/recovery, alternate-map/floor or full page-family screenshot set was independently reviewed here. UI/core/runtime suites were still executing. Feature109 is not marked complete by this review.

## Repair recheck — verified sweep

Viewed all eight current `109-verified-{home,inventory,missions,map}-{390,1440}.png` images. These supersede the previous final captures for this checkpoint. The Map images now show populated terrain and markers with no loading veil; the earlier settled-readiness screenshot limitation is resolved for these two views. Parent reports38 captured route/viewport cases and three-engine marker/safe-popup regressions; those commands were not independently run by this visual reviewer.

- **V109-02 closed for the reviewed small-slot issue.** Current `src/ui/item-card.css` hides fallback small text inside icon/inline/compact slots, preserving the symbol, full neighbouring item name and `Image needed` tooltip. Thus the32px slot cannot clip the previous multiline text. Verified desktop Home/Inventory show loaded art and no clipped fallback strings; they are not a separate missing-art fixture. General readable metadata remains at its shared size.
- **V109-01 mobile collision resolved.** Verified Map390 allocates separate rows to Search/Layers/Routes/Trackers and Map key/fullscreen/Find locations. All labels are visible without the prior collision. The populated map is usable below them.
- **V109-01 desktop follow-up remains pending.** Verified Map1440 still appears to put the floating map-tools drag grip over the right side of Advanced in the workspace toolbar (approximately x1040–1075/y160–194). Both controls are visible but their hit regions appear to intersect. Requested a measured desktop pair check or fresh detail capture before closing map-control obstruction overall. This overlap was also present in the baseline; it is not asserted as a newly introduced regression.
- Home390 Open map remains readable/full width. The six guide verified screenshots retain legible metadata/navigation and no other confirmed overlap. No full Feature109 acceptance or completion is inferred.

## Desktop toolbar closure

Viewed `test-results/109-desktop-toolbar-fixed.png` after the final placement repair. The Search/Layers/Routes/Trackers/Safe Run/Loot Run/Advanced toolbar is now clearly below the floating drag/Map key/north/fullscreen/Find locations row; Advanced is fully visible and unobstructed. Parent's measured rectangles corroborate the visible separation: field toolbar y221.8–275.8/x330.4–1020.4, top-right actions y158–200/x1037.7–1416 (21.8px vertical and17px horizontal separation). The rectangle probe is parent-run evidence; this reviewer independently viewed the screenshot.

**V109-01 closed** for the inspected390px mobile and1440px desktop default layouts. **V109-02 remains closed.** No confirmed blocking visual finding remains in the reviewed comparison set. This is scoped visual disposition only; expanded/alternate states and unreviewed families retain the verification limits above, and this does not mark Feature109 complete or approve a merge/deployment.
