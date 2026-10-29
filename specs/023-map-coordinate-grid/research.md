# Source review
Primary guide:https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin
Reference grid:https://codcentral.net/blog/mw4-dmz-map/

On2026-10-28, primary source HTML declares canonical4096x4096/v1 imagery but no data-grid-rows/cols; its generic equal-image grid helper therefore does not establish game grid bounds. CODCentral explicitly displays A–J/1–9 and says it matches the in-game tac map. Its inert HTML contains nine vertical/eight horizontal internal line percentages and A–J/1–9 label centers. Reuse the existing reviewed image registration instead of a guessed full-image division. All source assets/raw HTML remain ignored. CODMunity map-chunk research returned403 and was not bypassed.

A check of194 source point grid claims found186 matching drawn cells and8 disagreements, so raw source strings are not used to shift grid boundaries or rewritten. Grid provenance and observed registration residual are documented. A direct game screenshot can provide future independent verification; none is invented here.
