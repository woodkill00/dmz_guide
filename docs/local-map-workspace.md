# Local Hajin map workspace

The optional workspace under `tools/hajin-map/` carries the owner's separate local viewer into this repository. It does not replace the guide's native `/maps/` list/map, catalog or Content Studio. It has its own dependency lock and loopback server. Public guide build/release commands do not bundle this workspace or its owner-local resources.

## Start it

Use Node 22.18+ or Node 24. From the repository root:

```text
npm run map:install
npm run map:dev
```

Open the printed URL, normally http://127.0.0.1:5175/. Keep the terminal running. An occupied port reports an error instead of terminating another process. The normal guide and Studio keep their existing ports and commands.

The workspace intentionally ships without downloaded game imagery, icon files or point datasets. Missing local inputs produce visible retry states; this is not a complete real-map distribution. Owners with separately reviewed local resources can copy them to:

```text
tools/hajin-map/public/maps/hajin/v1/background.webp
tools/hajin-map/public/maps/hajin/official/markers.json
tools/hajin-map/public/maps/hajin/official/icons/
```

These paths are ignored. Never force-add unknown-rights assets, private screenshots or game datasets. The original workspace's research acquisition scripts are not distributed here; there is no automatic scraper/downloader. Public redistribution permission remains unverified and is not granted by this integration, external source links or attribution. See [asset policy](licensing-and-assets.md).

## Map controls

Map key always opens the legend directly, including before Layers. Clicking Map key again leaves it visible. Close with × or Escape within the panel. Every supplied category shows its icon, name and count; zero-count categories remain listed without invented markers. Individual checkboxes and Show all / Hide all share state with Sources & Layers.

Sources & Layers organizes imported points by website and category. Visibility changes retain a source's custom mix. Selecting one icon from a hidden source displays that category alone. Preferences are browser-local; storage failure falls back safely, and browser storage is not a backup. The future authored-marker layer remains separate.

Drag, scroll or pinch to navigate; keyboard arrows pan and +/− zoom. Reset fits the complete image. Coordinates are background-relative, not an independently verified in-game grid. Baked-in source shading is not live match information. Source claims/positions require their own evidence and asset rights.

## Verify it without game assets

```text
npm run map:test
npm run map:build
npm --prefix tools/hajin-map exec playwright install chromium
npm run map:test:browser
```

Alternatively set `CHROMIUM_PATH` to an installed compatible Chromium/Edge executable before the browser check. The browser runner starts and closes its own loopback server on 5275 and uses clearly labeled synthetic records and original raster bytes. It never fetches source-site resources. Evidence is local/ignored under `tools/hajin-map/.local/browser-checks/`. Synthetic evidence does not establish factual map accuracy, rights clearance, physical-device quality or public launch readiness.

Snapshot reads are capped at 2 MiB with a 10-second deadline, 100 categories and 5,000 records. Category IDs are at most 80 characters, names 120, groups 80, icon paths 260; record IDs are at most 100 and names 200. Image fetch/decode is bounded by 15 seconds and 32 MiB. Invalid maps/versions/positions and unsafe icon paths reject the snapshot. No imported script is executed.

Integration scope, requirement traces and actual acceptance are in [feature 019](../specs/019-local-map-workspace/spec.md). Run the repository's unchanged native checks separately; workspace tests do not substitute for them.
