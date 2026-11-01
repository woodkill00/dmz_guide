# Collection workbench

Open **Collect** in the shared navigation, or visit `/collection/` on the running guide. Select the same catalog you use for Inventory and Progress. The workbench reads that private profile; it never modifies the game or automatically completes a mission or upgrade.

## Shopping and priorities

The shopping list includes unfinished upgrades, all four supported mission tracks and ingredients for their declared crafting recipes. Completed uses drop out. An item you have enough of remains needed until those uses are completed; **Hide covered** can remove it from your current view.

Filter by red shortages, green covered quantities, yellow uncertainty or crafting ingredients. Search item names and units. Prioritize next upgrade tiers, tracked missions, the number of known unfinished objectives helped, or shortages within each unit. Currency, resource units and ordinary item counts are never added together or numerically compared as interchangeable resources.

The list labels direct requirements, crafting ingredients and unknown requirements. Required and Missing describe the combined collection scope; they are not additional amounts to add to Inventory's separate Next/All upgrade columns. Known lower bounds remain qualified when other costs are unknown. List pages mount50items; the complete filtered list remains available across pages.

**Export filtered shopping list** downloads private plain text for the full filtered result, not just the current page. It includes quantities and is therefore private even though it is not a full profile backup. Exports over2MiB require narrower filters. View preferences are stored per catalog without search text; blocked preference storage leaves the filters usable for this session.

## Why needed and recipe choices

**Why needed / locations** shows exact known unfinished root records, source references and recipe steps leading from an ingredient to its needed output. Links open the corresponding record; parent output buttons let you inspect the next step. Roots, chain steps and locations each have50-entry pages. Cycles, incomplete source data or safety limits are labelled rather than filled with guessed paths or quantities.

**Compare recipes** opens the same explanation and producing-recipe chooser. An explicit saved recipe uses the existing private recipe route setting and updates collection advice and selected planning routes. **Automatic sole visible recipe** restores the collection advice default; it does not add a goal, craft anything or invent an alternative. The Planner's own raw-item/selected-goal behavior remains separate.

## Recipe readiness and local crafting

The recipe section shows batch yields, per-batch listed inputs, retention and evidence. Search recipes/outputs, filter known ingredient coverage, or show recipes ready for a confirmation preview. These are independent previews: stock sufficient for one recipe does not promise enough stock for all displayed recipes simultaneously.

A craft preview lets you enter batches and inspect output, consumed inputs, retained tools, held stock, reserves, missing quantities and blocking reasons. Original stock after reserves must cover consumed amounts **plus** retained floors before output is credited. Retained tools do not multiply with batch count. Even when a recipe produces its own input item, that output cannot pay for the initial inputs.

Blank stock is unknown, including existing output stock; enter a deliberate zero only when you checked it. Unknown consumption, incomplete costs/evidence, missing supporting references, unknown input-pool eligibility, unsatisfied prerequisites, incompatible scope or stock limits block confirmation. Observed/verified recipes and typed inputs require supporting source references. Legacy input facts inherit their parent recipe's supported evidence. Fictional fixtures remain labelled software examples.

After checking station, access and input-pool eligibility in game, acknowledge that your saved stock is from before the craft and confirm. This atomically saves one private inventory transition. Goals, reserves, mission/upgrade progress and upgrade purchase history stay separate. Nothing is crafted in the game or automatically granted as a reward.

**Cancel** makes no stock change. **Undo last craft** previews an inventory-only reversal of the exact last saved craft during this page session. It expires on reload, catalog switch or any later profile save, including saving a recipe route. Reversal requires the exact saved profile and original recipe/item identity; it cannot overwrite intervening changes. The previous saved profile snapshot in Settings and explicit private backups remain separate recovery tools, not a permanent crafting audit log.

If saving is not confirmed, the separate candidate stays exportable. Export it for reconciliation or explicitly discard it before another craft or leaving/changing catalogs. An interrupted save may already have committed: compare the saved profile before replacing anything. The app never retries against a newer revision automatically. An export request alone does not mean the candidate was saved or discarded.

## Collection routes and known locations

Why needed lists declared locations and their uncertainty. Add calibrated stops to one collection route, move them up/down, remove individual stops or explicitly clear all. Up to50unique stops are saved per catalog/content version. Stops must share a map and floor, with valid positions; unknown coordinates stay list-only. Changed calibration invalidates the old route rather than relocating it silently.

**Open route on map** opens the native Guide map with an ordered accessible stop list and straight-line connections. These are **not roads, optimized travel or guaranteed spawns**. The route uses a short-lived same-origin opaque context, not raw coordinates in a URL. It expires after two hours and rejects changed content/calibration, tampering and unavailable storage.

The separate Hajin map workspace still owns its own markers, roads and route tools. Guide inventory is not automatically synchronized to that app. Use [the map workspace guide](local-map-workspace.md) for that separate workflow. Real guide catalogs with unknown coordinates cannot draw a route until calibrated location data is supplied.

## Progress and data review

The dashboard reports visible listed upgrade/mission records and covered, short or uncertain collection items. It does not assume a complete game catalog or turn an unknown total into a completion percentage. Equivalent completed upgrade observations follow the existing canonical identity rules; per-record manual reports are not automatically rewritten.

Data review highlights unknown costs, consumption, eligibility, unresolved evidence, missing proof/source dates and acquisition-reference candidates. A missing producing recipe is not proof an item should be craftable. Broken references are normally rejected during catalog admission; the defensive audit does not enable invalid content. Choose a **Sources reviewed before** date to find older source reviews without assuming an arbitrary freshness deadline. Source links preserve attribution; this view does not scrape or update game facts automatically.

Unlock descriptions do not become executable recipes unless actual input quantities, consumption, batch yield and eligibility are provided. A real catalog may correctly have no ready recipes. Improve those records through the existing evidence/Content Studio workflow; never replace unknown data with guessed costs.

## Verification and boundaries

See [feature045 acceptance](../specs/045-collection-workbench/acceptance.md) for executed checks and review. The new domain tests cover shared provenance, recipe/craft accounting, privacy, proof/scope guards, work budgets, routes and receipt identity. Browser tests use fictional disposable profiles, include quota/CAS failures and held-digest races, and exercise a5000-item collection with50mounted rows and full filtered export. No owner profile or game file is used for tests. Automated checks are not physical-device or screen-reader certification.
