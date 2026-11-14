# Existing contracts and source research

Reviewed 2026-11-13. This file records planning inputs; linked site claims are not imported game facts.

## Repository findings

- `src/domain/progression.mjs:ordersPageCoverage` already models 24 Orders slots and distinguishes recorded from unrecorded. `src/client/progression.mjs` shows them on Missions, but an unrecorded slot is an inert span and there is no per-section editorial queue.
- At initial planning, bundled `official:mw4-dmz-starter` contained 110 objective records and **zero** DMZ Order or Story Mission records. On 2026-11-14, 66 corroborated Hajin Orders and six named Story Missions were admitted as `observed` after comparison in `mission-source-review.md`; seven fixed page rosters are recorded and 17 page slots remain unassigned because chapter order can vary. Story rewards, prerequisites, complete item needs and current-build behavior are unresolved. `observed:upgrade-review-20261026` has no Order/Story entries. The imported 66 identities match the named providers, but complete-game coverage and current-build verification are not claimed.
- `src/domain/data-review.mjs` reports some missing requirements/conflicts. It does not represent section-level editorial state or a 24-page mission backlog.
- `src/domain/backup-scope.mjs` explicitly excludes map workspaces, armory workspace and named run plans from guide-profile backups. The companion map uses a different localhost origin, so a guide page cannot silently read its local storage.
- Existing home, search, item, recipes, progression, key, map, match and editor surfaces should be linked through stable IDs; the new feature must avoid a duplicate catalog or a second player-progress store.

## External scope signals

- [Official COD Season 1 patch notes](https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes) say new DMZ Orders were added for X01, and record a Hajin Story Mission progression fix. Therefore the existing 24 slots are not a permanent complete-game denominator; audit coverage needs a build/map scope.
- [Official FOB guide](https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide) distinguishes Story Missions, Dynamic Operations and Free Roam. The audit must not flatten all activity types into Orders.
- [COD Central Orders guide](https://codcentral.net/blog/mw4-dmz-orders/) and [DMZTracker Orders guide](https://www.dmztracker.gg/orders/) are potential reviewed inputs for page/mission details; their descriptions differ in scope and certainty. Capture claims with source, date and build, then compare before adding records. Do not infer missing pages from a third-party count alone.
- [W3C consistent navigation guidance](https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation) supports keeping repeated menus in the same relative order. [MDN storage guidance](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) explains why local data still needs an explicit portable backup.

## Decisions from this review

1. Launch the mission audit with honest empty slots and editorial states, then source-review mission records into the catalog in a separate task. Audit usability must not depend on complete mission ingestion.
2. Bind a recorded mission by pack/objective identity and treat page number as display placement. Chapter-dependent page order and X01 additions require scoped page sets.
3. Keep player completion, catalog verification and editorial review in separate stores and labels.
4. For cross-origin recovery, start with user-selected validated exports and a combined manifest. Automatic companion reads require a separately reviewed exact-origin handoff and must not be presumed available.
