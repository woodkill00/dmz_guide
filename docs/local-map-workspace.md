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

In the owner-enabled local viewer, choose **Update map sources** in Map key. It checks Call of Duty, CODMunity, WZStats, CODCentral and MapGenie (when configured) only after that action. Review each site's added/changed/missing locations, category changes and expandable icon notes; choose **Apply source update** or dismiss it. Site errors retain the last good capture. A changed source image or coordinate frame requires alignment review instead of applying the old calibration. Existing icon art is reused when an inert current-page icon is unavailable; new types get an explicitly reported generic fallback.

Updates retain source-specific evidence and older snapshots. Existing name-and-location duplicate checks still hide copied markers without deleting source records. Repeated identical source content reuses its workspace capture, including a fresh check after failed activation. Your private points, icons, flags and views remain separate.

The browser saves its workspace first, then the server activates the capture files. If that second step fails, **Resume pending update** retries activation without importing again. Reserved jobs and the pending receipt survive browser/server restart. If another update superseded it, keep your workspace evidence, clear the pending receipt and run a fresh check. **Manage staged updates** can dismiss abandoned previews. A damaged browser receipt has an explicit metadata-discard action; this leaves workspace data intact. Do not clear browser storage as an update-recovery shortcut.

The update API runs only in Vite development on `http://127.0.0.1:5175`, with same-origin checks and a per-server token. It is absent from the production/static/preview server. Existing local source setup is required: `VITE_LOCAL_PROVIDER_SNAPSHOTS=1` and `DMZ_ENABLE_SOURCE_UPDATES=1` in ignored `tools/hajin-map/.env.development.local`, the reviewed provider manifest/registrations and an ignored `public/maps/hajin/update-authorization.local.json`. That authorization file records version1, an authorized subset of the five fixed source IDs, the canonical image digest, reviewed provider image URLs/SHA256 values and all256 distinct original official zoom4 tile URLs/SHA256 values. Obtain these from reviewed local inputs, never from the replacement being checked. Install this tool's Playwright Chromium if needed: from `tools/hajin-map`, run `npx playwright install chromium`. No Python/OpenCV runtime is needed for updates.

Capture generations, pointers, permission declarations, raw downloads and browser receipts stay private/ignored. A check permits at most5000 records and100 categories per site, with bounded downloads/time and two waiting previews. Workspace retention remains20 snapshots/20000 source records/20MiB; exceeding it blocks the save and preserves active data. Download a private backup and review old snapshots before pruning. The updater retains generation files because browser evidence can reference them. After64 local check jobs it asks for maintenance rather than growing staging indefinitely: with all map servers stopped and backups saved, review `.local/source-updates/*.json`; old cancelled/activated job bookkeeping may be removed after confirming no pending receipt references it. Keep generation assets referenced by the current/previous pointers or any saved workspace.

After a server crash during a file transition, stop **all** map servers before removing only `tools/hajin-map/.local/source-updates/update.lock`, then restart. A live lock is never stolen automatically. The previous pointer remains in `previous-captures.local.json`; generation files are immutable. Source collection permission is owner-local and does not authorize public redistribution.


## Tactical coordinate grid (feature023)

The local map now shows A1–J9 cells, grid lines and labels such as **G6** by default. Use **Coordinate grid (A–J /1–9)** in Map key to hide/show it. This preference is independent of website layer masks and Show/Hide all, so you can keep a reference grid while changing icons.

The footer shows the grid reference under your pointer, or at the map center after panning, alongside separately labelled image pixel coordinates. Unlabelled margins show `—`. Grid lines do not intercept clicks or right-click POI creation. The grid remains aligned through zoom, pan, reset, resizing and fullscreen.

Alignment follows [CODCentral's drawn tactical grid](https://codcentral.net/blog/mw4-dmz-map/) registered to the existing official terrain image. It uses the source's inset/cropped footprint, rather than dividing the entire4096 image into equal sections. The source registration has a measured maximum residual of4.337 canonical image pixels; independent in-game screenshot verification is not claimed. Some upstream marker grid strings conflict with the source's own drawn lines, so the viewer computes the footer reference geometrically and retains original source claims unchanged. Source imagery and private smoke screenshots remain ignored.


## MapGenie integration (feature024)

[MapGenie Hajin](https://mapgenie.io/call-of-duty-modern-warfare-4/maps/hajin-dmz) joins the website layers with its own category masks, source icons, name-and-location duplicate checks and update previews. The authorized local capture contains283 entries:162 terrain markers and121 mission/item reference cards. Reference cards are searchable in Explore with notes, but have no terrain pins.

The live updater was applied and repeated for all five sites; unchanged captures were reused without adding snapshots or records. Existing four-source configurations remain valid. New installations still require owner-local authorization, reviewed tile fingerprints and digest-bound `providers/mapgenie/registration.local.json`; downloaded assets are not distributed in Git. Changed imagery/frame/schema retains the last good capture.

Five raw source captures can each contain5000 records, but the combined source view/search/duplicate budget remains20000. Imported workspace heads take priority. Remaining captures prefer selected websites, then the official source, with MapGenie last on ties. Whole excess captures show an unavailable warning and remain retained; select the desired website and hide another if needed to make room. No partial source truncation or record deletion occurs. Private workspace/history limits remain unchanged.

## Create your own SVG icons (feature025)

Open **My workspace → Icons → Create SVG icon**. Choose General, Loot cache, Medical, Danger, Objective or Extraction, then change the frame/symbol, colors, border width, symbol size and rotation. An optional1–3letter/number label replaces the symbol. The enlarged preview and32px previews on dark/light backgrounds show how it will look.

Enter an accessible description and choose **Save icon to library**. In My points, select it under **Icon override**, or use the saved icon's **Set category icon** action for a category default. **Edit a copy** opens a saved design for a new variant; existing points keep their original appearance. Identical image content reuses the existing library entry; a raster-only match gains the editable settings without changing its image or references.

**Download SVG** saves a scalable self-contained vector. **Download PNG** saves a transparent256px image. SVG creation uses original built-in shapes; arbitrary SVG uploads and freehand/path editing are outside this version. Existing PNG/JPEG/WebP uploads remain available. Only one icon form can be edited at a time: save or use **Cancel draft / preview** to switch forms without silently discarding edits.

Editable designs remain local and are included in private backups alongside the marker PNGs. Existing raster-only backups still restore. The library retains its32icon/8MiB limit. Cancellation and failed saves preserve existing icons; a storage failure retains the draft for retry/export. Before reverting to an older application that cannot read recipes, keep a new private backup; an older-format copy must omit only optional `icons[].design` fields while retaining all image data/IDs/references.

## In-app help (feature026)

Use **Help** in the local map header, or open http://127.0.0.1:5175/help.html. The handbook explains navigation/grid, website masks, duplicate checks, source updates/recovery, custom points/icons, Explore/saved views/discrepancies, source review/calibration, comparison backgrounds and private backups. Its contents links jump to each topic; tool links open the corresponding panel directly without running an update, changing filters or saving data.

Help opens in a separate tab to preserve an existing draft. Tool links return to the map in the help tab; use one map tab for saving at a time. The page remains readable without JavaScript or downloaded terrain and is included in the local workspace production build. Unknown/duplicate tool parameters are ignored; workspace startup failures show an explanation. No public deployment is implied.

## Advanced search and private fieldwork (feature027)

Find locations now searches notes/evidence/captions as well as names/categories/sites, with phrases, bounded typo matches, source/category/type/floor/build/visibility/location/verification filters and grouped source copies. Capture map center, enter grid/XY or use a result's Nearby button; set radius/sort nearest, select a title/Jump to highlight the location. Distances are canonical image pixels. Query examples: `near:G6 clinic`, `"blue door"`, `source:mapgenie has:location`, `floor:2`. Standalone G6 restricts to the cell; near:G6 uses its center without restricting to it. Category suggestions are bounded to200; any exact typed category remains searchable. Query limits256characters/eightterms; lists page50results. Approximate/group work limits are reported without deleting evidence. Source claims are explicitly unverified; Observed refers to owned gameplay observations.

Health shows actual backup/count budgets, source freshness, protected prune/stage/backup links, storage estimates and a metadata-only recovery manifest. Read recent update history fetches bounded job summaries through the same-origin/token-protected GET endpoint; it never prepares a source check or deletes files. Background image presence is checked separately; source files and generations remain external dependencies, not automatically garbage-collected across unknown profiles/backups. Ask browser to protect storage is advisory, never a substitute for a backup.

Private points support an observation date, sanitized captioned screenshots and optional routes/areas. Screenshot input8MiB/8192px/32MiPixels, outputPNG<=1600px/2MiB (adaptive downsize),4perpoint/32total/8MiB, within the20MiBbackup. Keep full-resolution originals separately. Geometry2/3..200vertices per route/area,500shapes/20000vertices total; shared canvas rendering, mean-vertex search anchor, editable numeric vertices/map picking, image-pixel lengths only. Old points/backups remain valid; optional owned fields travel private backups. Older versions need an older-format backup copy without unsupported optional fields; preserve the original backup.

Icons support reusable saved-design starters,50-state designer undo/redo and recipe-only JSON packs (32entries/256KiB) with preview/atomic import/dedup. ArbitrarySVG input remains unsupported. Test-only @axe-core/playwright/axe-core4.14.0 retain theirMPL-2.0 license; no runtime inclusion.

Run `npm --prefix tools/hajin-map run test:engines` for Chromium/Firefox/WebKit smoke and Chromium WCAG-tagged axe scans. Physical touch devices, actual screen readers and gameplay accuracy are separate manual checks; use the [verification worksheet](../specs/027-field-guide-upgrades/manual-verification.md). Existing local-only source permissions do not imply redistribution or deployment.

## Map planner (feature029)
Open `/?tool=planner` for private tracking/confidence, duplicate queue, road routes, road-network authoring, gameplay shortcuts and public-view link previews. Popup Add waypoint/My tracking actions work from source and owned/reviewed/search markers. Drag stops or use Up/Down; source-bound stops retain exact-capture references and become unresolved after changes instead of following moved source data silently.

Road routing requires an explicit connected canonical-image graph. Unknown roads are not inferred from POI positions or sent to Earth routing services. Solid lines are shortest geometry on known allowed edges; off-road connectors are dashed, limited160pixels, and no safe access/meters/ETA is claimed. Disconnected, missing or changed stops report leg errors. Optional owner-local `public/maps/hajin/roads.local.json` is a separately retained partial/unverified visual reference, ignored and excluded from backups by default. Road-editor owned/imported networks are backed up. Trace/preview files up to2MiB,5000nodes/10000edges/20000vertices; explicit endpoints/junctions only, with direction/block controls. Real road passability and bridges/gates need gameplay evidence.

Tracking is additional owned evidence, not promotion of source possible-spawn claims. Owner-confirmed requires a date and evidence. Duplicate decisions are reversible and capture-bound; stale ones are inactive. Density grouping lists every admitted visible record and retains source filters. Public links carry only position/zoom and source-scoped website/category masks; unknown/private/unavailable targets disable Apply. They omit private queries/routes/coordinates/tracking/screenshots. Update review lists stable-ID additions, moves, renames and removals, capped/paged before existing explicit application.

### Visible waypoint tracking (feature030)
The map Routes button opens the current saved route directly. Numbered stops have progress popups; the on-map panel provides Show next, Mark next reached, Reset progress and revision-bound session Undo reset. Reached tokens bind to location/version, not row index; reordering retains progress and reselecting a changed source clears it. The active route and reached flags persist in private backups. Missing/stale next stops cannot be focused or marked until resolved. Progress is a manual owner action, separate from source activity claims and live player position. Existing partial road coverage limits remain.

The on-map tracker has Minimize tracker / Show waypoints controls. The compact restore button stays available, remembers the display choice across reloads where localStorage is available, and never changes saved route/progress/source masks. Storage failures retain a usable in-memory toggle.

### Move small map menus
Drag the dotted handle on map navigation, map tools, My workspace, Routes, the waypoint tracker or gameplay toolbar to move it out of your way. Each position is saved in this browser and restored after refresh. The tracker keeps its position while minimized or expanded. Window changes keep menus within the map; larger menus scroll.

Keyboard: Tab to a Move handle, then use arrow keys (10 pixels) or Shift+arrow (1 pixel). Home resets that menu to its responsive default; double-click the handle also resets it. Escape cancels an unfinished drag. Positions are display preferences, separate from map-data backups and progress. If browser storage is unavailable, movement still works for the current session. The docked map key, modal editors and location popups retain their existing layout.
