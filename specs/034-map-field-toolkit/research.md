# Research and decisions
- Reuse retained previous valid workspace snapshot for explicit Undo, rather than retaining unbounded copies. Trash separately retains at most20owned records/2MiB and never evicts silently.
- Source locations keep capture-bound RecordHandle, resolved only against available records; pack export excludes restricted source titles/coordinates/images.
- Reuse existing route graph, edge blocking, road editor, backup reminder and source delta preview; route-specific avoid IDs filter graph edges without changing global network. Preferred-path stops stay explicit manual waypoints.
- Missions/checklists owner-authored, no invented mission catalog or unlock logic. Collections have independent display overlays rather than altering website/category masks.
- Native pointer/Leaflet interaction and Clipboard API fallback; no library/dependency change or unstable external API research needed. Long-press cancels on movement/multitouch and never auto-saves a point.
- Existing screenshot attachment/floor/build editor already supports richer evidence; add structured text/date metadata and search coverage.
