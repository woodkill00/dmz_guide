# Planning/concept acceptance — 5 November2026

Scope: research, read-only current-state audit, actual AI design-agent roundtable, phased specification/backlog and original isolated interaction concept. Production redesign is unimplemented. Manual pinned Spec Kit v1.2.2 planning/documentation cycle; no skill or production test execution is invented.

## Delivered

- `docs/ui-ux-redesign.md`: concrete audited direction, visual/navigation/overlay/list/status contracts, pros/cons, responsive hypotheses, preservation journeys and phased rollout.
- `research.md`: primary sources checked live, with explicit distinction between external guidance and project proposals.
- `roundtable.md`: three named AI design roles, first-round findings, actual second-round disagreement, corrections/concessions and negotiated resolutions. Human/player validation remains outstanding.
- `plan.md`, `tasks.md`, `spec.md`: requirements/architecture/dependencies; only planning tasks can complete here. Future I001–I008 production tasks remain unimplemented.
- `prototype/`: local synthetic Home/Map/Guide/FOB/Weapons concept at127.0.0.1:5180, no third-party imagery, provider requests, storage or profile reads. This is separate from the guide/map runtime. Documentation index links the proposal under Product planning.

## Executed checks and repairs

1. Read-only live production audit: agents sampled current native/map services in fresh browser contexts and source. Header/toolbar/table observations appear in research/roundtable; they are heuristic evidence, not player studies or a full production certification.
2. Concept browser smoke: Chromium, Firefox and WebKit functional flows pass;45axe scans total (fiveviews ×threewidths1440/390/320 ×threeengines) report zero violations and no page errors/document overflow. `.local/design070-smoke-final.log`, `.local/design070-smoke.json`. Root-font scaling, actual browser zoom, both-theme exhaustive accessibility, physical touch, virtual keyboard and screenreader certification are not implied by these scans.
3. Separate all-three-engine roundtable regressions pass: layers and checkboxes remain consistent after task return; explicit task opens hidden Focus map pane; same-task route draft survives; Save continues to requested hub; detail Back restores focused result and query; completion clamps3/3; mobile390×844 reserved route strip82–82.8px. `.local/design070-review-regressions.log/json`. Agents independently reproduced repaired flows in Chromium.
4. Actual concept layout/screenshots:15initial Chromium view/width combinations, no errors/overflow. `.local/design070-layout.json`, `.local/design070-{home,map,fob}-{1440,390,320}.png`. Screenshots after final semantic labels refreshed before final review. These are original synthetic scenes, not owner/game assets.
5. Prototype JS syntax check passed; files formatted. Python repository checker0failures (`.local/design070-check.log`) and `git diff --check` passed. Existing production791runtime/map suites were not rerun because runtime/source/data were not edited.

Repairs were not waived: agent review found same-task draft reset, lost pending hub intent, detail Back focus loss, inconsistent checkbox/marker state, invisible task after Focus map and modulo route reset. All repaired with explicit regression flows. Mobile route slot reduced from126px toapproximately83px. Initial axe sampling found a notice outside landmarks and narrow visible/accessibility label issues; added a named notice region and preserved accessible brand text at320px/consistent visible route label, then45final scans passed. One early smoke used an overly exact Back-button name and a shorthand browser context incompatible with axe; corrected test setup, not product assertions.

## Prototype boundaries

The schematic does not implement real routing/road diagnostics, provider imports/dedup/source snapshots, route Undo/Locate next, all category values, full mobile editor/sheet states, state migration, actual stock/mission calculations, live game tracking or complete catalogs. Route names/records/counts are synthetic; some contextual actions explain intended production behavior. Demo layer scope is simplified, not evidence that069parity is complete. Minimize/Focus and Half/Peek illustrate allocation; not every final width/landscape/zoom budget is proven. Camera controls merely scale synthetic geometry, not a GIS solution. The project44px operational target is a future implementation gate; a few compact concept camera affordances remain36px on mobile and should not be taken as production touch acceptance. No new game facts/source-rights claims.

## Gate

Map and IA reviewers passed the repaired planning/concept scope. Independent final document/identity/receipt review passed; all four manifest hashes match. Only docs and the isolated070package are changed. Hash manifest `.local/design070-sources.json` covers the three concept files and central design document. Original production features and app services are preserved; no remote publication/deployment requested.
