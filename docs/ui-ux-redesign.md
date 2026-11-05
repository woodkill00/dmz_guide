# UI/UX redesign: a calmer DMZ workspace

> Feature071 now implements the modern presentation as a local opt-in preview. See [preview instructions](tutorials/modern-workspaces.md) and [current implementation evidence/open gates](../specs/071-ui-ux-implementation/implementation-status.md). Repository defaults remain legacy pending acceptance. The proposal and observations below are the historical design basis, not a claim that saved data or a deployed site changed.

**Proposal, 5 November 2026.** This is a research-backed plan and isolated interactive concept, not a deployed redesign. The current app and its saved data remain unchanged. [Open the concept locally](http://127.0.0.1:5180/) or read its [source](../specs/070-fluid-ui-redesign/prototype/index.html). The [roundtable](../specs/070-fluid-ui-redesign/roundtable.md), [research](../specs/070-fluid-ui-redesign/research.md) and [implementation backlog](../specs/070-fluid-ui-redesign/tasks.md) contain the detailed record.

The recommendation is a consistent, compact application shell with **one obvious task at a time**. Most improvements should come from removing competing navigation, duplicated controls and stacked panels. A new color palette alone will not solve the recurring obstruction problems.

## What the audit found

Three design agents independently reviewed map interaction, information architecture, and accessibility/engineering, then challenged each other's proposals in a second round. These are expert heuristic reviews and fresh-context browser observations, not usability studies with players.

| Observed problem | Concrete evidence | Implication |
|---|---|---|
| Map controls compete for the same space | Fresh-context Chromium at390×900: task toolbar `(14,71,362,56)` overlaps map tools `(73.7,86,300.3,36)`. Desktop1440 also showed intersection | Give controls owned layout regions instead of repairing each with z-index offsets |
| Mobile navigation consumes too much height | Independent agents measured about225–233px before main content on sampled390px guide pages; header/navigation dominate first viewport | Replace stacked brand banner, wrapped links and repeated hub strips with a compact shell |
| Global hierarchy is inconsistent | Shared menu uses Prepare/Track/Reference/Manage; main hubs/mindmap use DMZ Guide/FOB/Weapons | Align all navigation with the user's requested hubs |
| Dense reference pages are long and expensive to scan | One fresh keys view had23tables/367main-content links and approximately13,330px mobile document height; armory had3,025DOMlinks but only9in the first mobile viewport | Bound results/groups and use common list/filter/detail patterns, not another card for every attribute |
| Small text substitutes for true compactness | Map CSS includes many8–12px labels; sampled Map key control was10px text | Reduce repetition and decoration before reducing legibility |
| Tools have accumulated multiple presentation models | Layer key, modal Layers view, search/find launchers, floating trackers, selected popup and optional summary | Consolidate presentation while preserving each tool's domain behavior |

Measurements depend on viewport, selected catalog and fresh profile. One map audit response did not include companion navigation while later previews did; that response is recorded as an observation, not a universal missing-navigation defect. Counts are UI observations, not game-catalog completeness claims.

## The visual direction

A contemporary field tool rather than a replica of every in-game screen:

- Opaque charcoal surfaces, restrained sage accent, soft separators and modest8–12px corners. Optional light theme uses the same semantic roles. Preserve weapon imagery as content, not a permanent full-screen background.
- System/UI sans-serif type, clear headings and tabular numbers. Operational body text starts around14–16px; secondary metadata around12–13px, subject to actual zoom/contrast checks. Do not use tiny uppercase copy for essential facts.
- Compact and Comfortable density adjust row padding and nonessential spacing. They do not alter quantities, filters, order or stored progress. Primary touch actions target44px; density must not make controls hard to activate.
- A small spacing/type scale and semantic tokens for surfaces, text, accent, borders, errors, warnings, focus and selected state. Different services use adapters to these tokens instead of one global CSS patch.
- Short, restrained color/opacity transitions. No parallax, looping shimmer, unnecessary blur, animated page zoom or moving terrain on selection. Reduced-motion preference disables nonessential movement.

Use CSS Grid/Flexbox, `minmax()`, `rem`, `clamp()` and container-aware layout. Use `calc()` for actual derived constraints, such as the workspace height remaining after owned header/status rows. Requiring `calc()` on every dimension would recreate brittle arithmetic rather than guarantee fluid sizing.

## One navigation hierarchy

| Main destination | Contents and second-level navigation |
|---|---|
| Home | Continue, four hub entry points, bounded pins/recent work, concise read-only progress |
| Map | Find, Layers, Route, and More for trackers/safe runs/other field tools |
| DMZ Guide | Missions, Story, Keys, Locations, Reference |
| DMZ FOB | Overview, Upgrades, Inventory, Collection needs, Crafting |
| DMZ Weapons | Roster, Attachments, Builds, Stats and updates |
| Utilities | Search, All features, Settings, Backups, Studio and source/update management |

Keep Home plus the four principal hubs in the global header. Keep the current hub/task and Search visible; siblings are one deliberate action away. Mobile uses a clearly labeled Sections control rather than a full set of wrapped links. Tools/settings is a bounded utility disclosure, not a second primary navigation system.

Keep the existing registry, URLs, detail links, mindmap, `?tool=` links, modified-click behavior and native no-JavaScript links. Prepare/Track/Reference/Manage remain useful search synonyms and contextual language. Do not rename every route just to rename the menu. The full feature index remains searchable so reducing first-screen clutter does not remove access.

Home should launch or resume work, not repeat the complete feature directory. Show four primary cards, one Continue action, at most the existing bounded eight pins/recent entries, and brief progress/next-needs summaries. Unavailable local services need an honest state and startup instructions, not a pretend successful transition.

## Map layout: controls live beside the terrain

Desktop composition:

```text
GLOBAL HEADER: Home · Map · Guide · FOB · Weapons     Search · Tools
MAP TASK BAR: Find · Layers · Route · More              Focus map
┌────────────────────────┬──────────────────────────────────────┐
│ ONE TASK / DETAIL PANE  │ MAP CANVAS                           │
│ header + Back/Close    │ markers and terrain                  │
│ one scrolling body    │                                      │
│ essential actions     │ reserved camera-control corner       │
├────────────────────────┼──────────────────────────────────────┤
│ contextual status     │ active route progress / next actions │
└────────────────────────┴──────────────────────────────────────┘
```

There is no parallel global app rail or duplicate map command rail. The contextual bar is the one map-task navigator. Find locations and Search map become one Find entry; Layers/modal/key converge into one layer workspace. Grid and attribution remain accurate and accessible.

The task pane owns Layers, Find, Route or another tool. Selecting a marker opens its detail subview in that same pane. **Back to Find/Layers/Route** restores its prior query, group/disclosure state, result position and focused result. Close returns to the map. No popup plus inspector plus modal displaying the same record.

Each tool retains independent view state. A single visible pane is a visual policy, not permission to discard an editor. Before replacing a dirty POI/route editor, use existing Save / Discard / Stay protection. Pane Back is distinct from browser Back: navigation/deep links have history; checkbox, size and peek-state changes do not flood it. Private notes/drafts/profile values never enter URLs.

Preserve the recently verified behaviors: combined/per-site Show/Hide all, mixed category switches, nested lists, inactive-snapshot masks, source links, duplicate evidence, location/name deduplication, no-autopan selection, selection surviving panning, and authoritative filters removing stale selections. Explicit Locate changes camera; selection or Mark reached does not.

One route status slot remains available while another item is inspected. It must identify the **route and next stop**, not silently retarget to the selected marker. It contains progress, Locate next, Mark reached and Open route, with Minimize/Restore and inline Undo. Tracking remains manual. Stale/unresolved/recomputing routes display text and disable unsafe actions. The slot consumes layout space; it is not another floating window. Existing free-floating positions need a reversible preference migration/reset before the new layout becomes default; do not silently erase them.

Proposed desktop pane width: roughly280–360px, bounded by readable content and viewport. At1280px and above, aim for at least65% of usable workspace width for the map in a standard one-pane state. This is a design hypothesis, not a universal standard or a viewport-area claim. Comfortable text/long labels may require an adjusted split. Below that budget, use one replacing pane/sheet, not two simultaneously docked320px panels.

Mobile map inspection uses explicit **Peek / Half / Full details** buttons with optional gestures. Closed/peek exploration aims to retain at least70% of available workspace height for terrain, excluding deliberately active route/status space; test the combined allocation rather than add conflicting fixed percentages. Half/full states are deliberate exceptions. Long editing belongs in an explicit full page or full-height editor with Save/Cancel, safe keyboard handling and draft guards. A nonmodal inspection sheet leaves the map reachable; modal editors make the background inert. Height alone never determines modality. No nested sheets and no extra global bottom navigation over map controls.

## Catalogs: one family of list and detail patterns

Each directory gets a short heading/count, one search/filter toolbar, optional filter region, result rows, clear empty/loading/error states and a reliable detail destination. Keep one scrolling table region when needed; avoid a scroller inside every cell/card. Sticky headings must not cover focused controls. Semantic tables remain for comparisons; narrow layouts use fewer important columns plus labeled details, with a full-detail-page option.

| Workspace | Visible at a glance | Expand/open for detail |
|---|---|---|
| Upgrades | Family, current lowest unfinished tier, completion, next shortage | All I/II/III tiers, full requirements and use links |
| Inventory/items | Item, owned, needed next, needed total, collection state | Recipe, mission, upgrade and crafting uses; allocation explanation |
| Missions/story | Mission/page/chapter group, status, key objectives | Requirements, rewards, source/spoiler-controlled story |
| Keys | Key icon/name, area/grid, owned state, access warning | Room/prerequisite chain, source screenshots, route/trip actions |
| Weapons | Name/class, relevant comparable values and mode/verification | Individual gun/attachment/build details; source/patch history |
| Bosses/trackers | LT/Commander group, kills, tags where applicable | Per-boss page, evidence and history |

Preserve existing ordering, compact counters, no page jump during increment/decrement, draggable order plus keyboard alternatives, Commander tag exceptions, LT milestones, upgrade grouping and unfinished-mission/crafting need logic. Visual changes must not recalculate domain meaning.

Use bounded result pages/groups before introducing virtualization. Virtualization can improve huge lists but complicates keyboard focus, browser find, stable row identity and accessibility; introduce it only after measurement proves pagination insufficient. Preserve filters/sort/group/scroll and actual detail URLs on Back. Do not mount duplicate desktop/mobile interactive forms simultaneously.

Keep *WZ, untested DMZ, unknown damage, build/version and uncertainty visible next to relevant stats. Optional historical provenance can be disclosed, but essential warnings and source identity do not disappear behind decorative icons. A successful mission journey does not certify completeness of all24mission pages.

## Consistent feedback and safe interruption

| Event | Presentation | Rule |
|---|---|---|
| Ready / ordinary saved state | Small inline status near the relevant action or workspace edge | No automatic floating startup banner |
| Short reversible action | Inline confirmation and Undo; optional brief bounded toast | No focus theft; no stacked repeated messages |
| Long update/import progress | Progress in the owning pane, cancellable when supported | One job identity/status; don't block unrelated reading |
| Validation problem | Error beside field plus linked summary for long forms | Keep input values and focus; remain until resolved |
| Source unavailable / stale / unsaved recovery | Persistent actionable notice in its workspace | Do not auto-dismiss important failures |
| Destructive change, transactional import, conflict, unsaved departure | One deliberate accessible dialog | Explicit consequence/actions, Escape where safe, focus return |

A small tooltip is for optional explanation, not critical requirements or a hidden action. Do not label every surface a popup. Persistent docked panels are nonmodal regions; modal dialogs have a real focus/inert contract. Prefer no more than one active modal; subsequent steps replace its contents or have a deliberate return path.

These choices follow the distinction between side-by-side and overlay drawers in [Fluent](https://fluent2.microsoft.design/components/web/react/core/drawer/usage), structured map layout in [Esri](https://developers.arcgis.com/javascript/latest/creating-app-layouts/), and sparse, purposeful [notification guidance](https://design-system.service.gov.uk/components/notification-banner/). They are adapted principles, not a recommendation to import those frameworks.

## What the roundtable rejected or changed

| Option | Benefit | Cost | Resolution |
|---|---|---|---|
| Permanent global rail plus map rail | Fast expert access | Width loss, duplicated navigation and another mobile transformation | Reject as default; top header plus one contextual navigator |
| Two always-open map panels | See filters and details together | Insufficient terrain at common widths | One pane first; future wide-screen comparison only after evidence |
| Everything as a floating panel | Personal arrangement | Collisions, hidden controls, preference migration and focus complexity | Defer; retain old preference recovery during migration |
| Glass/neon game UI | Strong theme | Unstable contrast over terrain; visual noise | Opaque restrained panels; theme through accent and imagery |
| Shrink every label/button | More rows | Harder reading/touch and more errors | Density from padding/hierarchy; readable operational text |
| Command-palette-first navigation | Very fast for experienced users | Poor discovery/touch parity | Optional shortcut later; visible links remain |
| Rewrite as a single SPA | Potentially smoother transitions | High risk to origins, storage, no-JS pages and verified workflows | Shared shell/adapters first, no framework migration prerequisite |
| Catalogs before map | Reusable list foundations sooner | Leaves the user's recurring map obstruction unresolved | Agents conceded map first after shell/Home |
|65% viewport-area map target | Simple-sounding metric | Confuses header height and pane width | Withdrawn; proposed workspace-width budget plus separate height tests |

## Implementation sequence and stop gates

| Phase | Deliverable | Representative owners/files | Risk and acceptance gate |
|---|---|---|---|
|0 · Baseline/contracts | Route/tool inventory, theme/tokens, overlay/state contracts, baseline screenshots and preservation tests | feature registry, existing navigation/layout tokens, specs070 | No runtime replacement yet; no missing destination or untracked data migration |
|1 · Shell/Home | Canonical hubs, compact responsive header, search/utilities, simplified Home; shared adapters | `src/ui/site-navigation.mjs`, `main-hubs.mjs`, `hub-page.mjs`, navigation CSS | Existing links, no-JS reading, dirty departure and service availability stay truthful |
|2 · Map vertical slice | Layers→Find→selected detail→Back plus route status, replacing duplicate launchers | map main/styles, field toolbar/menu layout, workspace app, safe-run adapter | Zero control collisions;067–069selection/mask/route/worker tests retained; no data schema changes |
|3 · Shared list/detail | Pilot Keys and Upgrades, then inventory/collection/missions/bosses | keys, collection, progression/private views and map planner UIs | Counts/order/shortages/prerequisites/spoilers/counters remain correct; compare real workflows |
|4 · Weapons/management | Same roster/detail conventions; Studio/update/import/error surfaces | gunsmith/armory/manager, Studio and source-update UIs | *WZ/unknown/source/patch review and transactional recovery unchanged |
|5 · Hardening/rollout | Cross-engine, zoom/keyboard/touch, migration/recovery, performance and visual review | current browser/runtime/map suites plus new layout cases | Independent review for each slice; rollback instructions and exact-head evidence before changing default |

Use small feature branches, not one enormous styling commit. Add tokens/components alongside the old shell, pilot one surface, then replace only its adapter. A phase can roll back its shell without rolling back user progress. No schema or service consolidation is needed for the first redesign. Each phase gets its own Spec Kit implementation artifacts;070 is the umbrella plan, not a claim all phases are approved/shipped.

## Verification and success criteria

**Functional:** every registered feature remains reachable through the registry/directory; preserve modified clicks, exact detail/tool links, native Back, per-tool view state, source differences, private data isolation, dirty drafts and import recovery. No false zero for unknown values, no invented map coordinates, no implication of live tracking or complete game catalog.

**Geometry:** zero unintended intersections of interactive controls in default, selected, route-active, loading and error states. User-opened navigation is assessed separately. One main task body scrolls; sticky headers/action bars do not cover focus. Proposed browsing chrome budget≤10%of actual canvas area excludes deliberately opened panes/sheets and reserved route slot; measure separately from workspace width rather than conflating denominators.

**Responsive/accessibility:**320/390/768/1024/1280/1440/1920 widths, short landscape heights, both themes, text spacing,200%text and actual browser zoom/reflow checks. Root-font scaling is not proof of real browser zoom. Maps/tables may need intentional2Dscroll, but surrounding controls/cell text must reflow. Keyboard, focus return, Escape, mouse, touch, screen reader sampling and on-screen keyboard need explicit cases. Default44px operational targets are a project goal; WCAG2.2AA's24px minimum has defined exceptions and must not be confused with that stronger preference. See [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) and [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

**Journeys:** Home→FOB→upgrade→needed item→map; Home→Guide→key→prerequisite room→map; weapon→attachment/build→stat source; Map→Layers hide/show→Find→detail→Back; route reordered→inspect unrelated marker→Mark next reached→Undo→reload; source update→review→apply→no duplicate; interrupted/failed save→recover retained data; mission/story→spoiler and requirements→manual progress→Back; LT kills/tags5+→Commander no-tag exception→reordered list with stable counters; inventory→craft allocation→outstanding upgrade needs. Run existing regression fixtures, extend presentation assertions deliberately, never delete failing cases to make the redesign pass.

**Performance:** capture DOM count, first usable task timing, layout shift and input responsiveness on a declared machine/fixture before freezing numeric budgets. Aim to reduce initial catalog DOM and chrome, but do not invent baseline speedups. If route solving or large filtering currently runs in a worker, keep that separation. No new remote fonts/UI kits required.

**User validation:** review the clickable concept, then test the vertical slice with representative tasks. Proposed goals: common hub visible immediately, frequent sibling task within one action, no unprompted camera movement, no row jumping, no lost draft or scroll context. Record task success/errors and user preference; do not claim a user study from agent agreement.

## Prototype boundaries and next step

The concept demonstrates the five hubs, a calm palette, responsive shell, one map pane, synthetic marker inspection/Back, layer controls, route status minimization, compact/comfortable spacing, theme, simple directory search and example draft/validation states. It uses original schematic geometry and synthetic records, writes no storage and performs no provider collection. It is not a real map, routing engine, complete catalog, state-migration implementation or accessibility certification. Some detailed controls are explanatory rather than full production features; those gaps are listed in the acceptance record.

Recommended first implementation is **Phase0/1 shared shell plus Home, followed immediately by the Map Layers→Find→detail vertical slice**. Keep the remaining app working during that process rather than restyling everything at once.
