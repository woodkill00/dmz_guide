# 078 · Hajin Loot Run map

## Scope

- LR-01: A dedicated `/loot.html` map shows positioned source-reported safes and clinics from the same reviewed local captures as Safe Run, with visually distinct marker types. The Safe Run page keeps only safes.
- LR-02: Players can choose a reported spawn or manual start, include or exclude individual safes and clinics, reorder stops, and request an efficient visit order. Route geometry offers direct lines and the existing partial local road graph, with missing legs disclosed.
- LR-03: Loot Run selections persist separately from Safe Run and do not change the main map's layers, annotations, or routes.
- LR-04: The page is reachable from the main map toolbar and shared navigation, and remains usable at narrow viewports and with keyboard controls.
- LR-05: Source attribution, capture dates, uncertainty, duplicate handling, and safe access warnings remain visible. No complete or live loot coverage is claimed.

## Acceptance

The page loads locally, includes both categories when valid captures provide them, excludes unrelated categories, supports a chosen start and mixed route, preserves separate plans across reloads, and leaves Safe Run unchanged.
