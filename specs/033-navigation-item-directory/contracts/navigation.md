# Interface contracts
- `/items/` retains `catalog-filters` and `data-record-card` rows. Optional `catalog-sort` accepts name, type or status. The pack selector supports all bundled packs. Query text is not retained in the URL.
- `/sitemap/` lists workspace routes and grouped bundled detail links. It does not enumerate private browser records or original evidence images.
- `/map-workspace/` provides local startup instructions and an explicit default port 5175 link. It does not automatically contact the separate server or share private state.
- Studio `intent=remove` uses the existing exact pack key, pack ID and record ID validation. It opens `requestRemoval` preview after startup with Cancel focused. It never automatically confirms or saves.
- A rendered record's owning pack takes precedence over a conflicting URL pack query. Other intermediary pages carry only a bounded pack ID to same-origin navigation links; no query text or opaque private token is propagated.
