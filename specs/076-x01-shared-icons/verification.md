# Verification · 2026-11-11

- Map `npm test`: 228/228 pass. New unit checks cover exact category mapping, X01-only category exclusion, unsafe path rejection and missing-capture fallback.
- Map `npm run build`: exit 0 with typecheck and both X01 HTML outputs.
- Focused Chromium browser journeys for COD Central and DMZHub X01: pass. Synthetic local Hajin capture fixtures make the actual shared icon paths and category-list icons visible; DMZHub missing-icon simulation loads its source icon and preserves all 76 first-floor markers. Existing direct links, floor switching, filters, 390px layout and missing basemap behavior pass.
- Live local desktop visual check: COD Central shows 15 shared Hajin pins and four shared category images on its first floor; DMZHub shows 24 shared pins and five shared category images. No page errors. Their source-only symbols remain visible.
- Full map `npm run test:browser`: exit 0, including both X01 journeys; no runtime errors or external requests in its controlled context. Staged whitespace check: pass. A new root guide `npm run check` is not needed for this map-only icon display change; it passed on the preceding X01 feature commit and no guide code changed here.
