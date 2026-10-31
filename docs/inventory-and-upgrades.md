# Inventory and upgrades

Open **Inventory** or **Upgrades** in the main menu. These pages use the same private guide profile for the selected catalog. The separate map workspace has its own storage; these pages do not synchronize with it or the game.

## Inventory

Search item names, categories or exact IDs. Filter by section, owned/reserved, not entered, selected-goal need or catalog use. Each page contains at most 50 items across all sections. Collapse sections to reduce clutter; edits remain in the draft when you filter, collapse, sort or change pages. Compact/comfortable density is a local view preference.

Edit Owned and Reserve, then choose **Save inventory** or **Cancel inventory edits**. Blank Owned means **not entered**, while 0 means you explicitly counted none. Clearing stock leaves its reserve unchanged. A reserve can exceed current stock. Wide-screen quantity steppers edit the draft only, and remain disabled for unknown or invalid stock. Incomplete numeric text stays invalid after filtering; Save reveals the affected field so you can correct it. Browser number controls cannot expose their incomplete text verbatim after remount, so the field explicitly says **Invalid entry** and requires correction rather than silently clearing stock.

Needed and Missing are previews for your selected planner goals. The two amounts are **consumed / retained**, keeping consumable demand separate from retained tool floors. Unknown quantities or an invalid/content-mismatched profile withhold exact advice. This is not a combined upgrade shopping budget or permission to spend stock.

On wide screens, Recipes, Upgrade uses, Mission uses and Crafts show direct catalog links. Use **+N** or **Uses** to inspect the lists; on smaller screens those columns are available inside Uses. Lists show up to 50 references per page. Reference links open in another tab to preserve your draft.

- Recipes use this item as an input/tool; role labels say consumed, retained or unknown.
- Upgrade uses are direct DMZ-upgrade requirements.
- Mission uses are explicit Orders/story/campaign records with separate track labels.
- Crafts lists distinct output items from directly related recipes. Multiple recipes producing one item do not duplicate the output.
- Producing recipes **for obtaining this item** are listed separately below.

Known completed uses remain visible with a completion badge. Hidden spoiler endpoints are omitted before counts/links. No known links does not mean an item is safe to discard, and unlock reports do not invent executable crafting recipes.

## Upgrades

The focused Upgrades page shows the selected catalog's DMZ upgrades. Progress remains available for Orders, story, campaign and other separate tracks. Search/filter known records and open one Details section at a time. **Track** adds a planner goal once; manage/removing goals happens in Planner. It never changes stock or records a purchase.

Details retain the sources, evidence, authored tier, prerequisites, manual state and listed costs. The requirement preview uses the existing advisory engine for this upgrade and its known unfinished prerequisite chain, including owned/reserve/available, known consumed/retained amounts and contributor links. It is not your shared-goal allocation. A recorded completion can remove unfinished advice while its listed costs remain visible.

Manual completion/availability changes require the existing **status-only** confirmation and never debit/refund stock. **Record in-game purchase** remains a separate acknowledged operation using saved pre-purchase stock; blocked/unknown costs, duplicate protection, save conflicts, retained snapshots and explicit recovery remain enforced. Meeting known material lines alone does not certify readiness or current-build accuracy. History and recovery remain below the list. Export a private backup regularly; browser storage is not a backup.

Upgrade rows offer a compact **Completed** checkbox directly in the list. Check it to mark complete or uncheck it to mark incomplete. Confirm the status change to save it locally; Cancel keeps the previous status. These actions never deduct or refund items. Use the separate purchase flow when recording spending.

The Upgrades list sorts alphabetically by upgrade name, then by Roman version (I, II, III, IV, etc.) within each name. Filtering and pagination retain that order.

Upgrades use compact bordered rows with sticky desktop column headings. Smaller screens show labelled requirement/readiness groups and a compact sticky list title; full information stays in Details / progress.

## Upgrade checklist workspace

- The catalog summary counts visible upgrades in the selected catalog, independently of filters. It is not a complete-game percentage.
- **Upgrade view** offers All, Not completed, Tracked, Missing materials and Needs review. It combines with search, source, evidence and manual-state filters. Missing materials means a known positive shortage; unknown-only records remain under Needs review, never treated as covered.
- **Materials / missing** previews independent direct listed requirements using saved stock after reserves. It does not allocate stock between upgrades or certify readiness. Unknown prices, consumption, stock and conflicting scope evidence remain unknown; different units are never totalled together. Shared planning and full prerequisite advice are separate views.
- Click an upgrade name or **Details / progress** for its focused material cards, prerequisites, full costs and sources. Material cards link to item records, producing recipes, other uses and source-backed location references where recorded. References are bounded, respect spoiler settings and do not guarantee a spawn; the map workspace remains a separate store.
- Completion shows a text badge and subtle row accent. A successful completion correction offers **Undo last progress change**, which asks for confirmation and restores only the exact previous completion state. It never refunds stock or rewrites spending history. Any newer local save, catalog switch or reload expires this shortcut; durable compare-and-swap still protects changes from other tabs.
- **Row spacing** and **Visible columns** let you choose compact/comfortable rows and materials/readiness/evidence columns. Name, completion and actions stay available; hidden information remains in Details, while critical unknown/conflict warnings remain visible. View filters and layout are remembered per catalog in this browser. Search text is not saved. If preference storage is blocked, the controls still work for the session.

Verification commands for this slice: `node --test tests/runtime/upgrade-overview.test.mjs` and `node tests/browser/upgrade-dashboard.mjs` (local guide on4173, or `TEST_BASE`). The dashboard journey is also part of both aggregate browser runners.

## Tier groups and next/full material needs

Upgrades now default to **Upgrade groups**. Each group shows its lowest visible listed unfinished tier. **Other tiers** expands the earlier/later versions in Roman order without duplicating the current row; long sublists have50-tier pages. Completing a tier advances the header; Undo restores it. This is display ordering from known records, not verified unlock order. Missing tiers remain unknown. If every known identity is completed, the group says so. Ambiguous duplicate/conflicting tiers remain separate for review; equivalent source identities are explicitly labelled and do not create duplicate costs or change your own per-record checkbox automatically.

Filters find groups when any tier matches, while the header keeps the actual current tier for context. **All tiers (flat list)** remains an optional remembered layout for comparing individual records. Only one Other tiers list is expanded at a time, with at most50 group heads plus50 other tier rows mounted.

Inventory has two automatic upgrade columns, even with no tracked planner goals:

- **Next upgrade tiers:** one lowest unfinished root per group, plus its declared unfinished prerequisites.
- **All unfinished upgrades:** all known remaining upgrade costs and declared unfinished prerequisites.

Each shows required quantities and additional missing stock (including a fixed reserve shortfall). All already includes Next: compare these scopes rather than adding them together. Goal need/Goal missing remain your separate selected-plan preview. Consumed quantities add; shared retained tools use a maximum floor; observation aliases and shared prerequisites count once. Unknown quantities, consumption, inventory or evidence stay Unknown, and numeric partial facts carry a visible qualifier.

An item remains in **Needed by goals or unfinished upgrades** until its known unfinished uses are completed, even when you own enough and Missing is0. Next/all filters narrow that membership. Completion removes only finished demand; it never consumes/refunds stock. Item Uses shows bounded per-scope contributors and existing recipe/mission references; no arbitrary quantities are invented for unselected missions or recipes. Draft edits update previews; Save/Cancel retain their existing meaning.


## Collection colors and crafting ingredients

The **Needed by unfinished upgrades / missions** filter includes unfinished upgrades and missions (DMZ orders/story, mission records and labelled campaign records), plus their recipe ingredients. Completed roots and unrelated planner-only goals are excluded. Completing the final use removes its ingredients from Needed; owning enough keeps the item listed as covered. Selected-plan columns still describe your separate planner goals.

Each item has a text status as well as color:

- **Red — Short (more needed):** a known positive stock shortage.
- **Green — Met (listed amount covered):** the known required quantity is covered after reserves.
- **Yellow — Check (amount unresolved):** quantities, evidence, stock, recipe choice or a dependency cycle need review.

The **Craft** tag identifies an indirect crafting ingredient even when its quantity state is red or green. Open **Uses** for the combined collection requirement, missing quantity and contributors. The Next/All upgrade columns remain upgrade-only; the separate collection explanation includes mission and crafting demand. Do not add these alternative summaries together.

The projection uses listed batch yields, stock held in intermediate outputs, shared consumed quantities and retained-tool maxima. It uses your explicit recipe route, or the sole fully visible producer. Alternatives, hidden recipe endpoints and unknown costs are never guessed. Covered quantities do not certify crafting access, unlocks, location, input-pool eligibility or complete current-game costs. Advice never crafts, consumes stock, adds goals or marks progress automatically. Save/Cancel and private browser storage work as before.
