# Tasks and release gates

Planning deliverables:
- [x] P001 FR001–007: audit current files/live surfaces and primary guidance; three independent design reviewers.
- [x] P002 FR007: actual second-round challenge, concessions and decision record.
- [x] P003 FR001–006: coherent design plan, service/state contracts, alternatives and phased backlog.
- [x] P004 FR008: original isolated clickable concept; no production edits/private data/assets.
- [x] P005 FR006–008: concept smoke/layout/accessibility sampling, artifact consistency analysis and independent final planning review.

Future production implementation — intentionally not completed by this planning task:

| ID | Requirement | Work / touched ownership | Depends on | Exit evidence |
|---|---|---|---|---|
| I001 | FR001,006 | Registry/route inventory, service boundary and workflow baseline; screenshot/geometry harness | approved direction | Every registered feature mapped; baseline machine/state/viewport recorded |
| I002 | FR004 | Semantic color/type/spacing/focus/layer tokens and adapters; contrast/theme fixtures | I001 | Both themes, readable control scale, reduced motion; no global override regression |
| I003 | FR001 | Shared five-hub nav/Home; legacy labels as synonyms; no-JS links and unavailable states | I001,I002 | All destinations/deep links/modified clicks/dirty departure; first-screen hub access |
| I004 | FR002,003 | Map pane host/selection/back contract; one taskbar; preserve per-tool context | I002,I003 | Layers→Find→detail→Back, camera invariance, focus/scroll restored |
| I005 | FR002–004 | Route status slot/mobile explicit states, safe-run adapter, old layout preference recovery | I004 | Manual target identity, reorder/progress/Undo/worker fixtures; no collision; denied storage |
| I006 | FR005 | Keys/upgrades list/detail pilots; then items/collection/missions/bosses | I003–I005 | Counts/current tiers/needs/prerequisites/spoilers/counters stable; bounded result DOM and Back |
| I007 | FR004,005 | Weapon roster/attachment/build/evidence views and Studio/manager forms | I002,I006 | *WZ/unknown/patch review, real save/conflict/import recovery retained |
| I008 | FR006 | Cross-engine/theme/zoom/short landscape/keyboard/touch/screenreader/performance/user-task review | each slice | Exact-head evidence, independent review, rollback and no lost private state |

No calendar duration or speedup is promised without measuring scope and baseline. Shell+map is the first implementation candidate, not all phases in one branch. Preserve existing assertions/fixtures; new geometry/state tests must supplement, not erase, current failures. Complete production gates separately from prototype checks.
