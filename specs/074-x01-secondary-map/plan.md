# Plan

1. Add an exact-source importer for the accessible COD Central map HTML. Admit only X01 floor 1/2 marker buttons, bounded names/IDs/layers and normalized positions. Write a reviewed snapshot with source URL, capture date and floor asset URLs. A repeat run produces a diff for human review.
2. Add an opt-in local asset script that fetches only the two pinned raster URLs, checks image type, size and WebP header, and writes beneath ignored `tools/hajin-map/public/maps/x01/`. Keep the source URLs and attribution in the app.
3. Build `/x01.html` as a separate two-floor Leaflet surface with layer controls, search/list, persistent selection, grid, source references and missing-image recovery. Store only UI preferences in an X01-specific localStorage key. Do not migrate Hajin private data.
4. Register X01 in the map build and shared navigation, then test importer validation, floor/marker behavior, direct route, keyboard and 390px layout. Record exact results and source limits.

Alternative considered: refactor the Hajin workspace into a multi-map store now. Its basemap, route, backup, applicability and source contracts are all Hajin-specific; changing them in this slice would risk player data. A separate map with explicit X01 identity is the smallest usable vertical slice. Shared multi-map editing can follow with an explicit migration plan.
