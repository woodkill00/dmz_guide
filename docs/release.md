# Run, extend and release the guide

## Local run (no account, hosting or paid service)
Use Node.js 22.x (supported baseline) or 24.x (development/compatibility); other majors are not claimed supported. CI explicitly selects Node 22.x on Linux/Windows and Node 24.x on Linux without multiplying full browser suites. From a clean source checkout run `npm ci`, `npm run build`, then `npm start`. Open `http://127.0.0.1:4173`. The server binds loopback by default. Stop it with Ctrl+C. Do not open pages using `file://`: browser modules and local fetches require a server.

The production `dist/` is static HTML/CSS/JavaScript/JSON. Runtime does not need npm dependencies, external fonts, a CDN, login or an API. Copy `dist/` plus `scripts/serve.mjs` in the same directory structure and run `node scripts/serve.mjs`; Node alone is sufficient. Build output currently expects the host root `/`, not a `/dmz_guide/` subpath. No hosting was enabled. Configure a host-root static site yourself only after rights and content review; do not assume drop-in repository GitHub Pages support.

## Failed or interrupted rebuilds

A build generates and validates an unpublished candidate before replacing `dist/`. Write, copy or validation failure retains the previous reader at `dist/` and labels it **OLD** in the build/Studio diagnostic. A successful repository Save is not a successful reader rebuild or public deployment. Success is printed only after complete promotion.

Directory replacement is not universally atomic: a promotion failure attempts rollback. If rollback also fails, the diagnostic reports the complete retained OLD tree and whether the normal `dist/` path is unavailable. A hard process exit between moves can also leave `dist/` unavailable. The local `.build-state/` folder keeps the candidate/previous trees and ownership lock for explicit inspection; a later build refuses rather than guessing or deleting this material.

For manual recovery, stop relevant build/reader processes first and confirm no active process owns the lock. Inspect the reported tree and `.build-state/current.lock`; preserve a copy of both candidate and previous trees before making changes. If `dist/` is missing and the complete OLD tree is identified, restore that tree to `dist/` deliberately. Never overwrite an existing `dist/` without reviewing it. Only after the outcome is verified should you explicitly archive resolved build-control material outside `.build-state/` and retry. Do not confuse build-control material with `.author-state/` transaction recovery; never delete or automatically prune either to bypass a warning.

This provides rollback-aware preservation, not power-loss atomicity or guaranteed uninterrupted serving during a path switch. A cleanup warning after successful promotion means the NEW build is current but retained output/control material needs inspection; it is not an OLD-build success claim.

## Offline means local server running
With the local server running, the guide and saved portable pictures work without external internet. New navigation fails when the server stops. There is no installable PWA, service-worker cache or cross-device synchronization. Browser storage can be unavailable, cleared, evicted or scoped to a different origin/port/profile. Export backups before changing browsers or origins. Do not rely on browser cache as a backup.

## Add items, weapons and stats
Open Editor and explicitly select the real starter or fictional training pack. Choose Items and weapons, Add record, enter a unique namespaced ID, label, kind and category. Weapon numeric stats require a typed metric and matching unit, build/mode scope, measurement context, status and evidence. Unknown numbers remain null, not zero. Source-supported weapon identity does not verify combat statistics.

Use the same guided editor for resources/currency, recipes, objectives, guides, maps, locations, sources and disputed claims. Reference existing IDs; consumed costs and retained tools are separate. Unknown recipe eligibility never becomes guaranteed executable. Campaign and spoiler labels remain separate from DMZ progression. Edit the pack content version when facts change. Validate, inspect the exact diff and explicitly save. Cancel preserves the prior pack. Private edits never publish automatically.

The Private reader supports newly created IDs immediately, including typed stats, recipe/guide links and pictures. Public pre-rendered routes remain a published snapshot. To publish a reviewed update, start the separate repository Content Studio with `npm run author`, import or create the public records and rights-cleared pictures, then explicitly save the repository files. Rebuild and use a normal reviewed repository PR. See [Content Studio](content-studio.md); private browser Save does not write those files.

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

Public images use the same validated asset metadata as portable packs. The canonical source is now per-record JSON under `content/catalog/<catalog>/`, with binary pictures under `media/<catalog>/<category>/<stable-asset-id>/`. Source descriptors hold generated paths, rights and provenance; the build preserves each catalog’s schema version in emitted runtime packs and hashed public image URLs. Do not recreate the retired whole-pack editable source or manually copy base64 into records. The separate fictional public-picture catalog is a complete editable example, not game imagery.

Use the [Content Studio](content-studio.md) for file selection, guided references, validation, optional crop/thumbnail and explicit repository save. A picture-bundle export contains `pack` and base64 `payloads` only for transport; a content-only export has no pixels. Never copy private profile backups into public content. New Studio uploads normalize to PNG and reject unsupported embedded metadata; imported private picture bundles can retain metadata, so review both visible and embedded information before redistribution. The build checks paths, symlinks, MIME, byte counts, SHA-256, dimensions, animation exclusion and the separate published catalog budgets. PNG checks include checksums and bounded decompressed scanline geometry.

Generated immutable image URLs and a manifest are internal build output. Do not hand-edit them. Public detail pages display validated raster pictures without JavaScript; map and private-reader views can use matching published bytes when IndexedDB has none. Local payloads take precedence, and a different local pack version never silently borrows stale public bytes. An unchanged public pack within the portable limits can be exported from Editor as a complete portable picture bundle and imported into a clean profile. Large published catalogs remain readable but cannot be silently forced through smaller portable-import limits. First private edits retain the original published pixels for rollback. Missing or invalid pictures leave readable content and the equivalent location list available, with a visible error.

## Upgrade-planner verification and rollback

Feature023 adds a separate observed requirements catalog, private v3 progress and recorded purchase/spending bookkeeping. A separate owner report confirms consumption for eight upgrades/31 costs; capture/build applicability and exhaustive prerequisites remain unresolved. It is not a current-game release certification; synthetic fixtures prove software accounting only. Keep/Search is direct-only, bounded to20,000 pack records/500,000 counted work steps and safe aggregates<=10^12. It can advise beyond100 roots without changing the existing100-focus-goal execution cap or reusing stock in batches.

Before calling an implementation ready, run the feature023 quickstart checks including native/Firefox/WebKit and actual Studio v1/v2 guided→advanced→save→restart→export/import journeys. Inspect the compact `upgrade023-evidence-*` and `upgrade023-spending-*` CI artifacts: source-head metadata, synthetic mobile/text-zoom screenshots, recovery journeys and50-run capacity timings. VM smoke or a blocked browser launch is not browser acceptance. Preserve one platform-specific local skip honestly until its supported CI platform executes it.

Rollback must preserve/export v3 private profiles, append-only spending snapshots and retained previous profiles. Do not downgrade by deleting upgradeProgress, watchPins or spendHistory. Original v1 state can be explicitly restored from the retained pre-migration snapshot; new clients accept v1/v2/v3; migration never invents earlier purchases. Whole-profile reset retains spending history; only an explicitly previewed whole-backup restore replaces it. Compact profile JSON and exact post-revision validation keep backups within the same 1MiB restore bound. Keep the PR draft/unmerged until independent implementation and evidence review; merge, public deployment and game-asset publication require separate authorization.

Spending acceptance additionally requires actual confirmed purchase/Cancel, pre-stock acknowledgement, no duplicate debit, reserve protection, latest-safe snapshot reversal, quota/CAS retained-candidate recovery, unchanged status-only controls, private unit-separated counters, protected-history projection, and 50-row paging. Inspect Chromium/Firefox pixels; WebKit remains strict functional/computed-layout only under the existing capture policy.
