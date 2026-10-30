# Requirement verification map
All data in automated scenarios is synthetic, in isolated browser contexts. This is a traceability map, not substitute pass evidence.

| Requirements | Entry point | Executed coverage |
| --- | --- | --- |
| FR001 | Planner Recovery; existing Backups/reminder | Toolkit Undo/point restore/metadata + quota/retry browser; bin limits/backup unit tests; inherited backup browser |
| FR002 | Field tools Route reliability; Routes intermediate stops; Road network tracing | SHA graph avoidance/replacement/reset browser; graph identity/nonmutation unit; inherited route leg/graph solver tests |
| FR003 | Map right-click/long-press; Field tools typed/picked X/Y | Quick waypoint browser; existing right-click POI/grid journeys updated only for explicit menu choice; simulated long-press/move/multitouch/Escape |
| FR004 | Planner Missions | Create/objective/location/completion/route browser; strict bounds/reference domain tests |
| FR005 | Planner Collections; waypoint/tracking selection controls | Create/member selection/show-hide/route browser; duplicate/bounds unit tests |
| FR006 | Planner Source comparison; Duplicate queue; main key updates | Bounded duplicate queue/unit regressions and existing source-update review browser; source-comparison panel/a11y |
| FR007 | Settings Field mode; gameplay toolbar; Field tools | Existing gameplay/progress tests; session mark add/cancel/clear/reload and unchanged persistent data; menu drag/touch/minimize regression |
| FR008 | My points metadata fields, existing screenshots/floors/build | Metadata save/restore/browser; strict date/tag/backup units; existing screenshot/search tests |
| FR009 | Field tools measurement/quick actions |100px two-point path, coordinate controls, session persistence boundaries; existing coordinate/grid/copy tests |
| FR010 | Planner Packs | Selected download, no-op/repeat/remap/malformed/cancel/CAS browser; privacy/changed-content/stale/omitted-ref collision/limits units |
| FR011 | Routes and Tracking/confidence search/status/selection | Waypoint live search/select/collection and confirmed removal; inherited tracking/stale/pagination tests; source handles untouched |
| FR012 | Settings additional routes | Selection/preference browser; same routing modes via isolated bounded worker, active route progress separate |
| FR013 | Planner Settings/section selector | Marker size/reset, keyboard entry,320px configured axe; any-dialog guard and original movable-menu regressions |
| FR014/015 | All persistence/import and Help/docs |131unit baseline plus full browser,3engine smoke, capacity/build/repository checks and independent review; exact receipts in acceptance |

Physical devices, screen readers, real gameplay road passability and complete topology remain unverified. No user browser profile is seeded or edited by tests. No source assets are exported or committed.
