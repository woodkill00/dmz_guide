# Acceptance evidence

2026-11-21, Windows/Node24.15.0. Parent-executed checks, with independent review in review.md. No current-game completeness or remote CI claim.

- `096-runtime.log`: 30/30 affected item-use, clarity, shell, source-intel, author-preview and navigation tests passed. `096-final-domain.log`: six current domain/view tests passed after the retained-tool/access-level corrections and conservative station wording. These sets overlap.
- Exhaustive bundled coverage: 303 item pages; 209 recorded methods; 490 ingredient-to-output edges (223 catalog,81 source crafting,164 source blueprint,22 X01). Every edge resolves to a catalog output and appears in both item HTML and inventory crafting-use links. All source-only output anchors exist. No profile or content mutation in tests.
- 19 additional captured blueprint identities have neither output mapping nor ingredient requirements. They are explicitly counted as identity-only source gaps, excluded from inferred recipe edges. Their names are not used to guess outputs or costs. The490-edge completeness claim does not establish missing blueprint recipes or complete live-game coverage.
- `096-browser.log`: actual generated303-page/490-edge/all-source-anchor audit passed, then Chromium/Firefox/WebKit passed product links, keyboard disclosure, source/X01 fragment navigation and ingredient return,390px no overflow, and private saved-pack product navigation. Mobile screenshots retained under ignored test-results; inspected Chromium image for readable wrapping.
- `096-build.log`: 2,108 guide routes plus404 built. `096-map-build.log`: eight-entry namespaced map artifact rebuilt for the shared source fingerprint. Existing local4173 reader remains ready with maps; no source collection or activation.
- Formatting, structural and diff checks recorded in096-format.log and096-structure.log. No public deployment, provider scrape, new asset, schema change, planner allocation change or saved-inventory edit.

Implementation review found CRAFTUSE01/02; fixes use retained maximum versus consumed sum and show reported DMZ access levels. Source station is unknown unless recorded; X01 remains separately labeled as carried materials. Final independent disposition is authoritative in review.md.

## Requested icon-button refinement

FR02b: output, recipe and ingredient links in the crafting section now use compact button-style anchors with the existing item-icon loader/fallback and visible item name. Recipe buttons use their output-item icon. Icon decoration stays outside the accessible name. Loader avoids injecting a source hyperlink inside existing navigation links; item-page source attribution stays available. Keyboard focus and original relative/private URLs remain intact.

`096-buttons-runtime.log`23/23 affected tests passed, including full protected-title regression after reviewer CRAFTUSE03. `096-buttons-domain.log`7/7 passed (overlapping scope). Current rebuilt `096-buttons-browser.log` passes303-page/490-edge audit and all three engines: button icons hydrate, no nested anchors, clicking actual icon opens the exact item, keyboard/source/X01/private links and390px layout remain correct. Rebuilt guide2108routes and all8mapentries; formatting/structure/diff receipts in096-buttons-* logs. No recipe, profile or game-data changes. Reviewer disposition in review.md.

## Concise crafting refinement

FR02c/T007 consolidates the item page's producing recipes into one Make this item section. The separate Recipes making this item list and covered duplicate source unlocks are removed. Used to craft shows one icon/name button per output with its variants collapsed; own recipe variants keep the first expanded and preserve source/access/cost differences. Source/X01 fragment navigation opens its targeted disclosure, including private rendering. Manual/collectible/identity-only references not represented by an output recipe are retained.

`096-concise-runtime.log`:24/24 affected tests pass, including one production section, no duplicate source recipe display, one product button with multiple variants and retained blueprint collectible references. `096-concise-browser.log`:generated303-page/490-edge/all-anchor audit plus Chromium/Firefox/WebKit actual navigation, target expansion, icon buttons, keyboard, private links and390px width pass. Guide2108routes/map8entries rebuilt; format/structure/diff checks pass. Latest mobile screenshot inspected: compact cards and collapsed variants replace repeated button/paragraph blocks. Local4173 status ready/maps true. All prior counts are historical where superseded; no provider or saved-profile writes.
