# Plan

1. Capture DMZHub's public map metadata and both floor feature responses with a normal headed Playwright browser. Validate map slug, surface IDs, normalized point geometry, category IDs, bounded counts and public CDN URL patterns before writing a sanitized snapshot.
2. Acquire 16 level-2 tiles per floor and the public category icons to ignored local assets. Keep the exact provider tile frame (4096 square) and its source-specific coordinates.
3. Add a directly linked DMZHub X01 view alongside the existing COD Central view. Render each source's markers on its own floor image. Keep source-specific filters, selection, search and direct links. Avoid any cross-source coordinate transform.
4. Test counts per floor/category, icon rendering, source/floor switches, stable selection, missing assets, direct links, keyboard and mobile layout. Record exact evidence and unresolved merge limits.

Alternative considered: transform DMZHub points onto COD Central images. The two providers' grids and raster frames differ, and a name-only control-point set cannot establish a trustworthy transform; separate source views preserve position accuracy.
