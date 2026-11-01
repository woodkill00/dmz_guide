# Contracts

## Local figures

`/local-weapon-art/{weaponId}.webp` accepts GET/HEAD only through the existing reader loopback service. Exact decoded pathname must match a current33-ID registry; encoded path components, query strings, separators, traversal and unknown IDs are rejected. No URL/path/body input controls the source. Fixed mapping lives in `src/ui/weapon-figures.json`: weapon ID, exact official URL, SHA256, dimensions and SVG viewport. IDs without established figures have null entries and an explicit unavailable notice. Figures remain base weapon illustrations; selections never imply rendered attachment or3D updates.

Source URLs are only `https://imgs.callofduty.com/content/dam/atvi/callofduty/cod-touchui/blog/body/mw4/rfl-ops-and-weapons/MW4-RFL-OPS-WEAPONS-NNN.webp` with registryNNN. Collection is an explicit local maintenance action, no browser/server remote fetch. Require exact HTTPS host/path, reject redirects, max20s/request, four requests concurrently, max2MiB/file and64MiB collection. Existing collected33 figures totalunder4MiB; ignored `.local/weapon-art/provenance.json` retains URLs/hashes/local-use/date. No original screenshots used as assets. Figure mappings are visually reviewed for identity. Initially misleading Cronen Squall/PM40 captions are resolved by direct figure inspection; no borrowed art.

Runtime fixed `.local/weapon-art/{id}.webp` uses existing catalog safe-path/bounded-file helpers rejecting symbolic/reparse paths, regularfiles only, max2MiB. Match tracked hash, WebP signature and exact1920x1080 dimensions. At most four in-flight reads (8MiB raw maximum), with at most64 bounded waiting requests and2s total response deadline; stalled reads retain concurrency ownership until settlement. No pixel editing or server decoder; browser performs normal inert image decoding, real figures verified in browser. Missing/corrupt/mismatched art returns a fixed project-authored SVG unavailable notice with200. Unknown paths400/404 and overload503. Return exact image MIME, `nosniff`, `no-store`; no directory/provenance/private file exposure or external fetch. Art files never copied into dist/release/Git; static-only deployments may lack local endpoint and must visibly fall back without a broken layout. Local server fallback works with no JS; client error handling reveals the same notice for static-only requests.

SVG viewport displays only the upper base-weapon figure. Perfigure crop must remain within established dimensions; JOKR uses a taller viewport to preserve its grip and be visually checked, including different launcher/pistol/melee silhouettes. Attribution links remain outside imagery, no fabricated watermark/license.

## Builder handoff

Only `?weapon={known current database ID}#builder` initializes a new unsaved draft after storage load completes. Unknown/repeated IDs are ignored with explicit status; other hashes do not alter the builder. No storage write, profile change or savedbuild replacement. Initialization happens once on page load, respects failed/corrupt startup and existing beforeunload/draft guards, and never reruns on reloadsavedworkspace or hash navigation. Query selection does not claim compatible attachments are owned.

## Directory/filter semantics

Known class/order derives from current roster. All/search/class jointly determine visible rows. Selected preview must be among visible rows; otherwise select the first visible row, and zero matches hides preview/actions with an explicit empty message. Native detail link persists per row for no-JS. Livepreview includes name/class/scoped known launch values, unknown qualitative metrics and honest supportedattachment count. No game purchase/prestige UI without established values.

Native project-authored fallback text is drawn behind each SVG image so a failed image before module initialization or with JavaScript disabled never leaves a blank figure. The normal error listener may additionally reveal an HTML notice. Official supported slots remain visible even if no compatible attachment records exist; their select options still yield an honest empty list.
