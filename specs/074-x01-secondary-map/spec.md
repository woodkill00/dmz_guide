# X01 secondary map

Status: implemented and locally verified, 2026-11-11. The owner requested a separate X01 map and research into additional map sources. Existing collection permission covers DMZHub and COD Central; local basemap copies are excluded from public history.

## Player outcomes

- FR-001: Open X01 from the shared Map navigation without changing the Hajin map or private Hajin workspace.
- FR-002: Switch between the two X01 tactical floors while retaining zoom and marker filters. Show the source's floor names and optional source-aligned A–J / 0–8 grid with marker references.
- FR-003: Search and filter source-attributed markers by category. Selecting a marker keeps its details visible until another selection or an explicit close.
- FR-004: Keep provider claims separate. Plot only coordinates calibrated to the displayed basemap; show other provider reports as unplotted references when their grid/coordinate frame is not aligned.
- FR-005: Acquire a bounded, reviewed COD Central snapshot of X01 markers and optional local-only floor rasters. Preserve provenance and do not bundle third-party map images in Git.
- FR-006: Remain usable with keyboard and at 390px. If local basemap imagery is absent, show a clear setup instruction rather than a broken image.

## Boundaries

DMZHub's X01 page is the requested source and remains linked. Direct automated access currently returns a browser challenge, so its live marker feed is not bypassed or imported. COD Central provides two accessible floor rasters and positioned markers. DMZHub and COD Central use conflicting grid labels for some rooms, so their locations must not be deduplicated by grid alone. X01 starts as a distinct map surface; Hajin road routing, safe runs and workspace backup are not silently reused on an incompatible coordinate frame.
