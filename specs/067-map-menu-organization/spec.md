# Organized map menu and stable selections

Manual pinned Spec Kit v1.2.2 full cycle. Builds on 066.

FR001: Main map/tool views have a top Combined categories disclosure and individual source disclosures containing existing category controls, links and duplicate evidence. Combined switches update corresponding categories across captured sources in one visibility transaction; mixed state is explicit. Missing captures remain labelled. Private/reviewed controls remain available.
FR002: Existing Close map key retracts sidebar and map expands; explicit Map key opener restores it without resetting scroll. Keyboard/focus and mobile remain usable.
FR003: Marker popups remain compact, scroll internally and do not pan the map on opening. Secondary inspector starts minimized unless user chose another saved preference. Actions remain accessible.
FR004: Map movement while a popup is open does not rebuild/remove selected markers. Refresh deferred until popup closes. Explicit filter/data edits still take effect. No data/schema/source changes.
FR005: Synthetic three-browser coverage for combined/mixed selection, disclosure state after rerender, collapse/reopen, stable popup during movement, constrained popup bounds and existing workflow regression; units/typecheck/build/check. Independent review required.

Clarification: combined means category visibility across available captures, retaining existing deduplication; no fabricated merged game data. Scope is main map and shared tool views, not safe planner's purpose-specific list.

Clarified FR003/005: Edge cards are translated inside the map viewport without camera movement; test corners, 320px and200% text/long notes. Explicit filters and data edits bypass redraw deferral, removing stale selection/summary; test hide-selected and removal after pan with no stale masks or selection.

Refined FR003: secondary inspector is explicitly opened through Selected details, avoiding a second automatic popup obstructing marker actions; remembered size/collapse preferences still apply once opened.
