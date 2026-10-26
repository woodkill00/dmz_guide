# Research and decisions

Research date: 2026-10-26. Public pages and bounded HTML metadata only; no authentication bypass, game-file access, dataset harvesting or asset download. UI counts are observations, not validated game facts.

## Source assessment

| Source | Working well | Gaps/opportunities | Acquisition status |
|---|---|---|---|
| [CODMunity](https://codmunity.gg/dmz/map) | Search, nested extraction/services/bosses/missions/loot/key/vehicle/hazard groups, all/none, review and personal-map navigation | Preserve provider verification claims separately from our evidence; expose provenance and registration; category and pin counts must remain distinct | Permission-required. [Terms](https://codmunity.gg/legal/codmunity/terms) restrict automated collection and content reuse. No cleared export/feed found |
| [WZStats](https://wzstats.gg/mw4/dmz/map) | Search, show/hide all, add/check/my pins, visible guest state | Explicit revision history, coordinate metadata and disagreement review would help fusion; guest persistence and export were not verified | Permission-required. [Terms](https://wzstats.gg/terms) sections 5.1, 5.3 and 7.1 reserve rights and prohibit scraping/harvesting/bulk export/automated access |
| [CODCentral](https://codcentral.net/blog/mw4-dmz-map/) | Search, category toggles, quiet defaults, deep links, fullscreen, pinch/zoom, distinction between possible spawns and active objects | Need per-record timestamps, alignment metadata, consistent evidence lineage and reversible curation | Permission-required: no affirmative reuse grant found; footer reserves rights. [Robots](https://codcentral.net/robots.txt) crawl allowance is not a reuse license |

CODMunity displayed 103 pins labelled verified by that site. This is neither our verification nor a coverage denominator. WZStats displayed category groups; category totals are not pin totals. CODCentral article counts were not independently validated. Do not copy these into product accuracy claims.

CODCentral credits the [official Hajin guide](https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin) for background and station/compound/tower positions and its own runs for some additional objects. Multiple copies of official evidence count as one upstream lineage, not independent confirmations. Other providers' upstream lineage remains unknown.

## Coordinate registration decision

Existing viewer uses a 4096-square canonical frame. CODCentral HTML advertises 2880x2700 imagery; equal normalized fractions cannot establish alignment. WZStats preview dimensions do not establish native coordinate extent. Actual coordinate units, origin, crops and transforms for all new providers remain unverified. Preserve raw values; require registration and hold-out validation before placing imported points. No guessed grid or fabricated meter conversion.

## Reuse and alternatives

- Reuse `tools/hajin-map/src/map/source-markers.ts` source/category hierarchy and `coordinates.ts` validation. Refactor shared state so Map key opens independently and stays synchronized.
- Reuse the behavior of `src/client/raster-editor.mjs` normalization and `src/content/portable.mjs` bounded raster validation through a narrow compatibility wrapper; avoid importing native UI or mutating its database. Native raster limits are stricter than general map images.
- Reuse transaction/revision patterns from `src/storage/store.mjs`, in a separate map database. localStorage is inadequate for icon blobs and atomic multi-store curation.
- Choose explicit human review over nearest-neighbor auto-merge: floors, buildings/doors and possible spawn positions can legitimately coincide.
- Choose provider adapters with capability states over live scraping. Written source permission or an explicitly licensed export can enable a future reviewed adapter; do not implement a manual-copy loophole.
- Choose private backups and defer public export, rather than attempting to infer rights for derived canonical values.

## Delivery dependency matrix

Source registration, masks, synthetic snapshot ingestion, calibration, review and custom authoring can be built now. Real provider ingestion requires permission evidence, an authorized input contract and tested coordinate registration. No permission is currently cleared for the three new providers. If permission is unavailable, leave the source reference-only and use the user's own gameplay observations. Do not contact providers automatically.

## Clarify record

Resolved from user context: each website is a top-level source; its original categories are sublayers; combined curated output is a separate layer; original evidence stays intact. Custom work is private, local and point-based initially. Existing key direct-open behavior is a regression requirement. No runtime implementation has been claimed. Pending optional scope steering does not block planning. Unsupported game facts, source accuracy and reuse rights remain explicitly unknown rather than guessed.
