# Validation guide
1. Node22+: npm ci --cache /tmp/dmz-npm-cache; npm run build; npm start.
2. Open /maps/: real starter shows 13 entries and zero markers. Select a location; verify source/build/grid/unknown coordinates.
3. Explicitly choose fictional training pack, use ground/upper floor filters, select list and markers, use arrow keys and zoom/reset controls.
4. Filter query/category/source and enable goal-only, with and without a supported local goal. No verified relation must be explicit.
5. Import a validated owner raster/bounds/floor edit via editor, reload maps and confirm current metadata and placement. Remove/fail image and retain full list/details.
6. Run node --test tests/runtime/locations.test.mjs. Hosted sandboxed Chrome CI invokes runMapsTests; record actual result and screenshot paths in acceptance.md. Local browser denied by socket sandbox remains blocked, not passing.
