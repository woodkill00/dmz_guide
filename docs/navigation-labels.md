# Navigation labels and destinations

Edit `navigationConfig` in [feature-registry.mjs](../src/ui/feature-registry.mjs); [navigation-config.mjs](../src/ui/navigation-config.mjs) re-exports the same definitions. The former Prepare primary menu is Track; the former Track category is Progression. Primary feature IDs, group keys and anchor IDs are routing identities: keep them stable when renaming labels. Existing feature paths remain in [feature-registry.mjs](../src/ui/feature-registry.mjs), resolved through featureURL/navigationHref for guide and companion contexts.

The legacy group key Prepare keeps anchor `prepare` while showing Track; key Track keeps anchor `track` while showing Progression. This preserves bookmarks and saved feature IDs. Breadcrumbs and the features directory use explicit configured anchors. Orders-page enhancement selects stable data attributes, so changing visible text cannot move its pages into another group. Duplicate primary/group labels are rejected.

After source edits, rebuild/restart through `npm run local` as needed; an already-running service can require an explicit restart when its source is stale. Static pages and the namespaced map must be rebuilt together for shared navigation edits. Tests inject alternate labels and compare destinations/IDs, then exercise actual menus in three browsers. Editing route paths is a routing change requiring route/alias verification; changing labels is separate.

Existing running companion HTML can be refreshed by the client using stable feature IDs, including legacy group markup. This uses the already-served registry module and does not restart an editing session.
