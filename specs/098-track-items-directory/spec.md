# Track Items directory

FR01 Add an Items submenu beside Quick Collect across tracking workspaces and the parent planner. Resolve submenu labels/destinations from stable feature IDs in the shared navigation registry; selected tab is identity-based. Add a dedicated /track/items/ page without replacing the existing reference /items/ directory.

FR02 List every visible item in the selected bundled catalog exactly once, grouped by recorded rarity, alphabetically by name within each section. Requested order Common, Rare, Epic, Legendary, Ultra is retained; genuine Uncommon belongs between Common/Rare, other recorded rarities get their own section, and missing/unknown rarity is explicitly Not recorded. Never infer or rewrite rarity. Pack identities remain separate; fictional catalogs remain marked and are not the default.

FR03 Compact icon/name item links, category hints and existing small crafting previews. Multiple rarity sections can remain expanded independently. Search and catalog selection show accurate counts, omit empty sections and preserve alphabetical order without detaching already ordered rows. Item links retain selected pack identity; submenu links retain applicable catalog context and existing weapon-context boundary.

FR04 Read-only browsing: no inventory/profile writes or automatic profile creation. Reuse validated catalog loading and existing icon fallback/hydration. Hidden records/names do not leak into rows or search metadata. All source/fixture content remains attributed through item detail pages; no new game facts or remote collection.

SC01 Test exact visible-item coverage, known/unknown/Uncommon rarity grouping, name sort, duplicates, immutable content, spoiled endpoints and dynamic submenu IDs/labels/query/fragments.
SC02 Build registry/topology and actual Track/Inventory/Quick Collect→Items navigation; three-browser search/pack/filter/collapse/item-link/keyboard/mobile checks, no-profile-write proof, current local service ready and independent review.
