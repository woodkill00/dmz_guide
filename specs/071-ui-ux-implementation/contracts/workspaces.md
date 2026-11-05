# Workspace, list, feedback and scope contract

## Search and feature identity

Global Search indexes the current public/allowed reference content, respecting private/spoiler boundaries. Map Find has labeled Map locations / My workspace scopes; its private query/results stay in that tool's memory/store and never public index/history/share link. Empty query, no matches, partial/limited index, missing catalog, protected-content exclusion and no-coordinate result are distinct states. A route result opens the exact route, a record its detail, a mission its scoped mission surface. No-coordinate result stays readable without enabled Locate. Switching pack or index version invalidates late results and stale references.

Feature identity is not just a destination title: native Missions versus map Mission tracker, Guide/profile Settings versus Map Settings, profile/key/map/armory backups, public versus Workspace search, Map-source versus Weapon updates have explicit scope labels and ownership. Current77registry entries are mapped in feature-coverage.md; tests activate allowlisted targets with JS and verify exact feature ID. No-JS acceptance applies native reference/navigation/fallback, not working Leaflet or every private editor.

## Required directory content

| Family | Required initial identity/data | Expanded content / actions | Owner safeguards |
|---|---|---|---|
| Items/inventory/collection | item identity, owned, needed next, needed total, labeled collection state | recipe/mission/upgrade/crafting uses and allocation explanation | stable counters/rows, no recalculation from UI density |
| Upgrades | family, current lowest unfinished tier, completion, needed next | remaining I/II/III tiers/full requirements | alphabetic then Roman tier order, unfinished-only quantities |
| Missions/story | exact mission/page/chapter identity, manual status, applicable requirements/spoiler state | narrative/rewards/source and progress | no protected text leaked into public search; no full24page completeness claim |
| Keys | icon/name, region/grid, owned/key requirement and access warning | prerequisite chain, screenshots, source, stash/trip | exact key/grid links, no inferred coordinates/access rules |
| Bosses | named LT/Commander group, stable kills and allowed tags | boss page, order and milestones | no page jumping, LT tags5+ status, Commander no tags, drag/UpDown parity |
| Maps/locations | location identity, map/grid/floor when supplied, coordinate/spawn uncertainty | exact map/list/detail/source links; unknown position stays text, no enabled Locate | calibrated/actual coordinates only, no inferred spawn certainty |
| Recipes/Crafting | recipe identity, inputs/output, consumed versus retained tools, requirement-completeness/unknown flags | exact current requirements/uses and supported crafting/collection actions | no free crafting from omitted ingredients; preserve existing allocation/consumption semantics; primary hub DMZ FOB/Crafting |
| Guides | topic/identity, source/evidence, spoiler/applicability state | native guide detail and related entity links | protect spoilers/private content, preserve reference no-JS reading |
| Heterogeneous Catalog | type + stable identity + evidence/current pack, coverage/unknown state | exact typed detail/action target and supported filters | do not coerce different record types or replace unknown with zero |
| Weapons/attachments/builds | weapon/class, comparable values where known, mode/*WZ/untested DMZ, build/source/evidence | full gun/attachment/build/detail/source/patch history | unknown≠0; no unlabeled statistic or automatic patch application |

Initial page size50, choices25/100; existing smaller bounded domain limits take precedence. Show total and coverage/partial label accurately. All matching versus This page is explicit for data-affecting bulk operations; category/source Show/Hide all ALWAYS means all categories of selected capture/source, not only currently paginated/filtered rows. It does not clear search or alter own/reviewed layers unless explicitly targeted. Two desktop/mobile forms may not be mounted/editable simultaneously. Sticky heading/identity cells share offsets and preserve rightmost keyboard actions; per-cell text wraps and long related uses expand in flow. Native full detail URL remains available. No virtualization until a separately measured need/review.

## State presentations (apply to every matrix row)

- **Loading:** labeled owned status; previous valid results remain identified when retained; no fake ready/count.
- **Empty/no match:** explain difference and provide Clear/filter/next action; preserve current query.
- **Partial/limited/stale:** visible coverage/version/capture badge with details; unknown not zero.
- **Unavailable service/catalog:** exact service/owner help and safe return; do not auto-start server or contact provider.
- **Read-only/denied storage:** disable actual mutations with explanation, keep reading/session view controls where possible, no false saved state.
- **Validation/save/source/route error:** linked field or persistent recovery/status detail; no success overwriting unresolved failure.
- **No JS:** native links/reference reading and startup/help remain useful; private/map unavailable functionality is honestly labeled.

Every implementation family tests applicable variants, and records N/A with actual reason rather than dropping rows silently. Management tasks audit exact capability, not common visual labels alone.

## Management / authoring matrix

| Surface | Origin/data owner | Preserved boundary and recovery |
|---|---|---|
| Guide private editor/reader/profile |4173existing profile/private stores | dirty guard, catalog binding, restore/rebind, no public writes/search leak |
| Key stash/trips/backup |4173key store | separate stash/packing state, prerequisites, import preview and reversible recovery |
| Armory builds/evidence/backups |4173armory store | exact private build, applicability and supported recovery |
| Content Studio |4174repository authoring controller | exact file/revision/preview identity, reference-checked Remove, staged save/recovery |
| Map POI/icons/images/geometry |5175map workspace/store and validated owned assets | preserve SVG/image limits/sanitization, coordinates, rights declarations, transactional previews |
| Map background registration/source review |5175source/registration/review owners | exact image/frame/hash/affine registration and source lineage, no auto trust |
| Map provider check/activation/backup |5175existing source-update/backup services | allowlist, preview token/digest, atomic activation, CAS/cancel/deadline and retained data |
| Weapon check/apply manager |4176existing manager via4173updates launcher | explicit startup/availability, review then apply, no auto provider fetch from new nav |

Do not merge domains to make menus look seamless. Real operations retain the existing security/rights/bounds guards; no new data collection/provider authorization arises from this redesign. Read-only diagnostics do not expose original user notes/media/credentials in public receipts.
