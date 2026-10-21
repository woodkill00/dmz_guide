# Research and decisions
- Decision: reuse native static/client modules. Rationale: small reversible existing architecture. Alternative map SDK rejected because remote tiles and unnecessary dependency/gesture complexity.
- Decision: SVG viewBox and presentation attributes; accessible HTML list is complete. Rationale: CSP forbids inline styles, keyboard camera controls require no drag. Alternative absolute-positioned HTML markers rejected.
- Decision: declared coordinate axes govern normalization; origin/axis mismatch is unplottable. Rationale: cannot fabricate placement. Map replacement always reuses current bounds/version, never a cached transform.
- Decision: only local validated raster payloads accepted from 005. Rationale: imported SVG/scripts and arbitrary remote assets remain inert. Original schematic is authored first-party SVG markup, not imported artwork.
- Decision: shared plan positive deficits are intersected with itemIds, with unknown/block/stale reasons surfaced. Rationale: no inference from names or guaranteed spawns.
