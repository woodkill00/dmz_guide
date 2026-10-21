# Run, extend and release the guide

## Local run (no account, hosting or paid service)
Use Node.js 22 or newer; development uses Node 24; hosted Chrome jobs have been verified on Node 22.23.3. From a clean source checkout run `npm ci`, `npm run build`, then `npm start`. Open `http://127.0.0.1:4173`. The server binds loopback by default. Stop it with Ctrl+C. Do not open pages using `file://`: browser modules and local fetches require a server.

The production `dist/` is static HTML/CSS/JavaScript/JSON. Runtime does not need npm dependencies, external fonts, a CDN, login or an API. Copy `dist/` plus `scripts/serve.mjs` in the same directory structure and run `node scripts/serve.mjs`; Node alone is sufficient. Build output currently expects the host root `/`, not a `/dmz_guide/` subpath. No hosting was enabled. Configure a host-root static site yourself only after rights and content review; do not assume drop-in repository GitHub Pages support.

## Offline means local server running
With the local server running, the guide and saved portable pictures work without external internet. New navigation fails when the server stops. There is no installable PWA, service-worker cache or cross-device synchronization. Browser storage can be unavailable, cleared, evicted or scoped to a different origin/port/profile. Export backups before changing browsers or origins. Do not rely on browser cache as a backup.

## Add items, weapons and stats
Open Editor and explicitly select the real starter or fictional training pack. Choose Items and weapons, Add record, enter a unique namespaced ID, label, kind and category. Weapon numeric stats require a typed metric and matching unit, build/mode scope, measurement context, status and evidence. Unknown numbers remain null, not zero. Source-supported weapon identity does not verify combat statistics.

Use the same guided editor for resources/currency, recipes, objectives, guides, maps, locations, sources and disputed claims. Reference existing IDs; consumed costs and retained tools are separate. Unknown recipe eligibility never becomes guaranteed executable. Campaign and spoiler labels remain separate from DMZ progression. Edit the pack content version when facts change. Validate, inspect the exact diff and explicitly save. Cancel preserves the prior pack. Private edits never publish automatically.

The Private reader supports newly created IDs immediately, including typed stats, recipe/guide links and pictures. Public pre-rendered routes remain a published snapshot. To publish a reviewed update, export a content pack and add it to `content/packs/`, with permitted assets and evidence, then rebuild and use a normal reviewed repository PR. See the checked-in raster convention below.

## Portable pictures and recovery
Attach only rights-cleared PNG/JPEG/WebP, never raw player screenshots or private data. Bounds: 32 pictures, 2 MiB each, 8 MiB aggregate, 2048 pixels per dimension, 4 million pixels each and 16 million combined. Animated and executable formats/ZIP are rejected. New attachments are re-encoded; imported picture bundles may retain metadata. Review visible AND embedded metadata before redistribution.

Content-only export contains records but not raster bytes. Picture-bundle export includes actual image bytes and rights metadata. Private-profile backup contains personal inventory/reserves/goals/progress and must not enter public history. Unsaved draft recovery may contain invalid unfinished data and is not a successful save. Import validates before preview; explicit apply checks pack/version and stale revisions. Failed quota/save leaves prior persisted data intact. Rollback previews the retained prior snapshot. Export before reload if persistence fails.

## Maps and uncertainty
The real starter includes known place names but unknown coordinates, so it does not invent markers. The training map is an original fictional schematic, never gameplay advice. Owner-supplied calibrated bounds, floors and coordinate versions are editable; the equivalent list remains available when imagery fails. Item relations indicate possible relevance, never guaranteed spawns or an optimal route.

## Corrections and Discord
Community exports a bounded correction packet containing record/version, old/new value, reason, public evidence and rights. Local review decisions are self-reported metadata, not authentication or publication. Apply accepted changes deliberately through the validated editor and a reviewed PR. Never attach profile data or private screenshots.

Set `content/site.json` `discordInvite` only after the owner supplies and verifies a destination. Accepted forms are HTTPS `discord.gg/<invite>` or `discord.com/invite/<invite>`, without credentials/query/hash. Null displays an honest unavailable state. No Discord bot, chat, login or remote moderation is simulated.

## Release checks and external boundaries
Run unit/adversarial tests, production build, browser suites and repository checks. Inspect actual desktop/narrow/200% text screenshots; emulated sizes are not physical-device tests or WCAG certification. Rebuild after tests so test-only zoom CSS and screenshots never ship. Inspect ZIP contents and internal links from clean extraction.

The starter catalog is intentionally small and source-backed, not a complete verified live-game dataset. Printer level conflicts remain explicit. Real map-art/coordinate rights, catalog enrichment, a verified Discord invite and any hosting are external owner decisions. Original code is MIT; third-party game names/evidence and owner images retain their own rights.

WebKit functional browser tests do not capture screenshots: the pinned automation tool injects an inline animation-sync stylesheet when capturing WebKit, which correctly conflicts with the site CSP. CSP and console-health assertions remain enabled. Chrome and Firefox provide visual captures; WebKit results are functional/computed-layout evidence, not physical iOS Safari certification.

## Checked-in public pictures

Public images use the same validated asset metadata as portable packs. Put each original, rights-cleared raster at `content/assets/<pack-key>/<asset.path>`, where pack-key replaces the single colon in the pack ID with an underscore. For example, `demo:bundled-pictures` and `assets/original-token.jpg` map to `content/assets/demo_bundled-pictures/assets/original-token.jpg`. The separate fictional public-picture pack is a complete editable example, not game imagery.

A picture-bundle export contains `pack` and base64 `payloads`; a content-only export has no pixels. Decode each payload's base64 into its matching asset path, retaining the exact bytes and metadata. Do not copy an entire export folder or private backup into the repository. Review metadata, source rights and redistribution permission before committing. The build validates pack IDs, paths, symlink exclusion, MIME, actual bytes, SHA-256, intrinsic dimensions, animation exclusion and aggregate bounds. It publishes only pack JSON, site configuration and validated images, never arbitrary source-folder files. Browser decoding is additionally tested in hosted browsers.

Generated immutable image URLs and a manifest are internal build output. Do not hand-edit them. Public detail pages display validated raster pictures without JavaScript; map and private-reader views can use matching published bytes when IndexedDB has none. Local payloads take precedence, and a different local pack version never silently borrows stale public bytes. An unchanged public pack can be exported from Editor as a complete portable picture bundle and imported into a clean profile. First private edits retain the original published pixels for rollback. Missing or invalid pictures leave readable content and the equivalent location list available, with a visible error.
