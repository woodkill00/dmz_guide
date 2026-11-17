# Progress dashboard acceptance — 087

Implementation: `feat/087-progress-dashboard`, based on main `716cfcc`. Local Windows / Node 24 / Playwright 1.58.2. Synthetic profiles only; no player inventory, credentials or private content are committed.

## Delivered behavior

Home renders the same six-section dashboard in classic and modern UI variants: build ingredients, other outstanding needs, current upgrade tiers, Hajin/X01 Orders, weapon acquisition records and item blueprint/recipe ownership. Item buttons show names, known pictures and missing quantities, with explicit unknown/estimate qualifiers. Inline Add found saves through the existing profile revision transaction and atomic history ID. Failed confirmation offers verification without replaying the quantity.

Counts delegate existing Quick collect, build-target, upgrade-family and blueprint rules. Private validated catalog overlays take precedence, including same-ID/version edits. The dashboard reads existing stores without creating absent player databases. Layout collapse/reorder/reset affects only bounded local preferences. Search, hubs, direct tools, pins/recent and local services remain available.

## Evidence

- Repository checker: 0 failures.
- `npm run format:check`: PASS.
- `git diff --check`: PASS.
- Classic dashboard `node tests/browser/dashboard-run.mjs --engines --a11y`: PASS in Chromium, Firefox and WebKit. Includes 320/390/768/1280/1920 widths, 200% text sizing, keyboard selection, no-write absent-profile discovery, Add found/history parity, independent drafts, 100 build targets and bounded pagination, printing/mission/upgrade/armory changes, private catalog parity, quota failure, committed/read-failure, single-flight verification, persisted-return and interrupted-module fallback. Axe reports zero violations on seeded desktop/mobile dark/light contexts.
- `npm test`: 1047/1047 PASS, zero skipped/canceled, 412726.9249ms. Includes existing content, storage, transaction, dashboard and capacity contracts.
- `npm run build`: classic and modern production builds PASS, each 2042 HTML routes plus 404; final default rebuild is recorded below.
- Modern `node tests/browser/dashboard-run.mjs --engines --a11y`: PASS in Chromium, Firefox and WebKit with the same dashboard journeys and zero axe violations. Viewport assertions explicitly wait for the requested innerWidth before geometry/screenshot capture.
- Modern `node tests/browser/ui-shell.mjs`: all three engines PASS for shell/preferences/no-JavaScript; this is not a claim of all 77 activation targets.
- `npm run test:home`: all three engines PASS with strict browser health, existing Home/pins/recent/search workflows, key journeys, navigation directory, 96 compact layout/theme/zoom cases per engine and upgrade dashboard regression.

Screenshots are synthetic local artifacts under ignored `test-results/dashboard-*-desktop.png` and `test-results/dashboard-*-mobile.png`; WebKit screenshots are excluded per repository policy. Desktop and genuine 390px mobile screenshots were visually inspected; automated geometry checks supplement this review and do not assert every possible device layout.

## Convergence repairs and limits

Independent review repaired overlapping verification, unrelated draft clearing, stale detail figures, canceled-pagination mutation, interrupted initial loading and private catalog precedence. Broad checks restored direct Safe Run navigation. The complete modern topology measured 321111 JSON values / 8035093 bytes; its endpoint-only budget is now 350000, retaining byte/depth/string/graph and generic reader bounds. No graph controls or links were discarded.

Weapon records have no invented complete missing-blueprint denominator. Provider/catalog coverage and unknown stock remain labelled. Build-group and other-needs estimates are not summed as one stock allocation. Existing overlay preflight plus profile CAS does not claim an atomic content-and-profile transaction. A rejected module import exposes reload recovery with usable static links. Browser-local progress still needs private exports for backup and is not synchronized between browsers/origins. No new game facts, source scraping, account integration or asset downloads are included.

Final default production rebuild: PASS, 2042 routes plus 404 (local session74737 exit0). Final full format gate: PASS. Existing local guide returns HTTP200 at http://127.0.0.1:4173/. The runtime/full-home log files are temporary local receipts and will not be committed. Cross-platform GitHub CI is a separate delivery gate and is not claimed by these Windows receipts.
