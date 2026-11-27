# Delivery

The directory now uses page-flow tables/cards instead of height-limited inner list scrollboxes. Filters scroll with the page; full source context remains in a native disclosure. Trip content expands naturally on directory and key detail pages. Area bulk actions toggle existing details only, retain nodes/quantities and move focus before collapse. Private refresh does not override area collapse. Source comparisons have mobile labels and no redundant scroll-wrapper tab stops.

Scope is `.key-directory-page` plus the existing key-workspace trip panel; inventory/weapon table scrolling is unchanged. Explicit author/manager CSS allowlists include the new stylesheet dependency. No catalog, ID, key graph, quantity, schema or storage migration.

Evidence:

- `107-owner-runtime.log`:19/19 affected key/access/stock/reference tests PASS.
- `107-flow-final.log`: Chromium/Firefox/WebKit PASS for actual wheel-driven page scrolling, no nested containers, non-overlay filters, focused-input pointer collapse, original-node/value retention, save/reload, expanded14-key trip and source comparisons,320/390/768/1024/1440px, dark/light/200% text. Modern check activates the CSS cascade on the same directory markup; it does not claim a separate complete modern build/browser rollout.
- `107-retained-keys.log`: Chromium/Firefox/WebKit key-workspace, backup/CAS/quota/corruption, hospital access/source links, no-JS and layout regression PASS with browser health checks.
- `107-build.log`:2275 guide routes+404 built. `107-map-build.log`: unified map bundle built; live status ready. Shared map behavior is unchanged.
- `107-owner-format.log`: full formatter check PASS; `107-owner-structure.log`:0 repository failures. Visual inspection of desktop and mobile captures confirms page-flow rows and no overlay filters.
- Accessibility scan is recorded in `107-accessibility.log`; terminal completion and final independent acceptance are appended after the running checks finish.

Final accessibility receipt: `node tests/browser/key-accessibility.mjs` exited0 with36 axe scans, no violations, across Chromium/Firefox/WebKit, dark/light and390/1440px on the directory and two key detail pages. Zoom is covered by the separate flow journey, not claimed for those36 scans. Final formatter and structural commands exited0; native lists and saved stock remain available at the live unified site.

The first WebKit pointer check failed visible focus; it was fixed before the terminal three-engine PASS. Prior1163-test aggregate belongs to feature106, not a new full107 run. No remote push, merge or deployment implied.
