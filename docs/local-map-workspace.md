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

Sources & Layers organizes imported points by website and category. Visibility changes retain a source's custom mix. Selecting one icon from a hidden source displays that category alone. Preferences are browser-local; storage failure falls back safely, and browser storage is not a backup. Private authored markers and Reviewed map have their own controls. My workspace provides point editing, icons, source inspection/calibration, evidence review and private backups; see the [workspace workflow](../tools/hajin-map/README.md).

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

Original integration scope is in [feature 019](../specs/019-local-map-workspace/spec.md). Current source/private-workspace acceptance and remaining external gates are in [feature020 evidence](../specs/020-map-source-fusion/verification.md). Run the repository's unchanged native checks separately; workspace tests do not substitute for them.

## Find and review locations

**Find locations** opens Explore for cross-site/private search, jump highlights, duplicate details, saved viewing presets, completeness checks, private discrepancy notes and backup status. Matching-row `*` controls open source/position comparisons; mistaken matches can be kept separate without deleting any evidence. Jumping to a hidden result preserves your layer selection. Backups include authored usability metadata while restricted captures remain external dependencies. See [feature021 acceptance](../specs/021-map-usability/verification.md) and the [workspace workflow](../tools/hajin-map/README.md).


## Source links and local updates (feature022)

Click a website name in Website layers, its icon key or its snapshot group to open that website's map in a new tab. The separate checkbox still controls visibility.

In the owner-enabled local viewer, choose **Update map sources** in Map key. It checks Call of Duty, CODMunity, WZStats and CODCentral only after that action. Review each site's added/changed/missing locations, category changes and expandable icon notes; choose **Apply source update** or dismiss it. Site errors retain the last good capture. A changed source image or coordinate frame requires alignment review instead of applying the old calibration. Existing icon art is reused when an inert current-page icon is unavailable; new types get an explicitly reported generic fallback.

Updates retain source-specific evidence and older snapshots. Existing name-and-location duplicate checks still hide copied markers without deleting source records. Repeated identical source content reuses its workspace capture, including a fresh check after failed activation. Your private points, icons, flags and views remain separate.

The browser saves its workspace first, then the server activates the capture files. If that second step fails, **Resume pending update** retries activation without importing again. Reserved jobs and the pending receipt survive browser/server restart. If another update superseded it, keep your workspace evidence, clear the pending receipt and run a fresh check. **Manage staged updates** can dismiss abandoned previews. A damaged browser receipt has an explicit metadata-discard action; this leaves workspace data intact. Do not clear browser storage as an update-recovery shortcut.

The update API runs only in Vite development on `http://127.0.0.1:5175`, with same-origin checks and a per-server token. It is absent from the production/static/preview server. Existing local source setup is required: `VITE_LOCAL_PROVIDER_SNAPSHOTS=1` and `DMZ_ENABLE_SOURCE_UPDATES=1` in ignored `tools/hajin-map/.env.development.local`, the reviewed provider manifest/registrations and an ignored `public/maps/hajin/update-authorization.local.json`. That authorization file records version1, the four fixed authorized source IDs, the canonical image digest, reviewed provider image URLs/SHA256 values and all256 distinct original official zoom4 tile URLs/SHA256 values. Obtain these from reviewed local inputs, never from the replacement being checked. Install this tool's Playwright Chromium if needed: from `tools/hajin-map`, run `npx playwright install chromium`. No Python/OpenCV runtime is needed for updates.

Capture generations, pointers, permission declarations, raw downloads and browser receipts stay private/ignored. A check permits at most5000 records and100 categories per site, with bounded downloads/time and two waiting previews. Workspace retention remains20 snapshots/20000 source records/20MiB; exceeding it blocks the save and preserves active data. Download a private backup and review old snapshots before pruning. The updater retains generation files because browser evidence can reference them. After64 local check jobs it asks for maintenance rather than growing staging indefinitely: with all map servers stopped and backups saved, review `.local/source-updates/*.json`; old cancelled/activated job bookkeeping may be removed after confirming no pending receipt references it. Keep generation assets referenced by the current/previous pointers or any saved workspace.

After a server crash during a file transition, stop **all** map servers before removing only `tools/hajin-map/.local/source-updates/update.lock`, then restart. A live lock is never stolen automatically. The previous pointer remains in `previous-captures.local.json`; generation files are immutable. Source collection permission is owner-local and does not authorize public redistribution.


## Tactical coordinate grid (feature023)

The local map now shows A1–J9 cells, grid lines and labels such as **G6** by default. Use **Coordinate grid (A–J /1–9)** in Map key to hide/show it. This preference is independent of website layer masks and Show/Hide all, so you can keep a reference grid while changing icons.

The footer shows the grid reference under your pointer, or at the map center after panning, alongside separately labelled image pixel coordinates. Unlabelled margins show `—`. Grid lines do not intercept clicks or right-click POI creation. The grid remains aligned through zoom, pan, reset, resizing and fullscreen.

Alignment follows [CODCentral's drawn tactical grid](https://codcentral.net/blog/mw4-dmz-map/) registered to the existing official terrain image. It uses the source's inset/cropped footprint, rather than dividing the entire4096 image into equal sections. The source registration has a measured maximum residual of4.337 canonical image pixels; independent in-game screenshot verification is not claimed. Some upstream marker grid strings conflict with the source's own drawn lines, so the viewer computes the footer reference geometrically and retains original source claims unchanged. Source imagery and private smoke screenshots remain ignored.


## MapGenie integration (feature024; live import pending)

[MapGenie Hajin](https://mapgenie.io/call-of-duty-modern-warfare-4/maps/hajin-dmz) is registered as a fifth source, with a tracking-free name link in Website layers. Until its specific collection permission and coordinate registration are confirmed, its entry is unavailable with an explanation. Existing four-source owner configuration remains valid; adding this registry entry does not silently authorize collection.

The prepared adapter supports source groups/categories, sprite icons, independent masks, existing name-and-position duplicate checks, update previews, first-capture bootstrap and retry/no-op behavior. Synthetic fixtures verify those paths. Actual MapGenie POI schema verification, terrain calibration and live icon/data acquisition are still pending; no real MapGenie markers are claimed imported yet.

Once owner permission is confirmed, its geographic coordinates need WebMercator projection and independent registration against the canonical terrain, rather than reusing another site's scale. The updater requires exact reviewed v5 tile-layout/hash bindings and a digest-bound `providers/mapgenie/registration.local.json`, referenced by `update-authorization.local.json` under `mapgenie.registrationDigest`. Sprite crops are bounded, decoded dimensions checked and re-encoded as local PNGs. No account/private endpoints or source writes are used. New frame/artwork or unsupported schema retains the last good capture.

Five raw source captures can each contain5000 records, but the combined source view/search/duplicate budget remains20000. Imported workspace heads take priority. Remaining captures prefer selected websites, then the official source, with MapGenie last on ties. Whole excess captures show an unavailable warning and remain retained; select the desired website and hide another if needed to make room. No partial source truncation or record deletion occurs. Private workspace/history limits remain unchanged.
