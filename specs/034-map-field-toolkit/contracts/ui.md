# UI contracts
Planner tabs add Missions, Collections, Tools, Recovery, Packs, Settings alongside existing tabs. Each has labeled fields and semantic buttons, stable IDs toolkit-*. Changes go through draft/guard/revision services; no direct storage bypass.
Waypoint/tracking controls offer text/status filters, checkboxes and confirmed remove-selected/add-to-collection. Inactive routes use noninteractive overlays; only active route mutates progress.
Right-click/long-press opens safe actions, Add POI leads to existing guarded editor. Keyboard Tools coordinate/pick gives same actions. Temporary marks are explicitly session-only. All controls have narrow viewport scroll behavior.
Pack preview reports additions, duplicates and unresolved dependencies before apply; no imported executable data/URLs. Download includes only selections; unselected entries excluded. Source update and comparison entry points keep review/apply separate.
