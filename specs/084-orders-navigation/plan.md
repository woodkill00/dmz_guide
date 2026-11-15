# Plan

Use the existing `/missions/` route as the Orders landing page. Expose it in the primary navigation and render a nested Orders section in the all-features disclosure: one top link, Hajin page links, and X01 page links. Reuse existing roster element IDs for deep links. Keep pack query on guide links. Add explicit section IDs and handle anchor scrolling after client-rendered rosters appear. Test shared navigation and real browser destinations.

Alternative considered: a new `/orders/` route. It would duplicate static pages and require migration of existing mission links without improving the requested navigation. Retain the route and change its presentation instead.

The 071 feature registry has a historical, admission-tested identity and label. Keep its internal `missions` / “Missions” record stable; use the existing presentation label mapping and shared navigation labels to display “Orders” to users.

Risk: menu crowding. Use native collapsed details for each page set. The first static-link implementation exceeded the build's topology and data-node limits because the shared navigation repeats across 2,042 routes. Populate the nested page links when the all-features menu opens, keeping the generated HTML compact and the menu search complete. Risk: client-rendered anchors may not scroll on initial load; explicitly test and handle them.
