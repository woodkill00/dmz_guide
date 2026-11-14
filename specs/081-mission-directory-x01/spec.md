# Mission directory and X01 Orders

## Scope

Make `/missions/` the entry point for the reported Hajin 24-page and X01 five-page Orders sequences. Each recorded Order links to its individual catalog page, which has a direct edit action for the local Content Studio. The mission audit links to the same pages and includes X01 pages/sections without changing existing Hajin audit IDs. Source-reported facts remain separate from player progress and in-game verification.

## User stories and requirements

- **FR-001 / US1:** Show all 24 Hajin and five X01 page slots, in order, with linked recorded Orders and explicit unassigned/unknown states. A reported sequence must not be presented as the player's fixed chapter order.
- **FR-002 / US2:** Populate 15 X01 Order records from named, dated sources with original short task summaries, provenance and unknown requirements/rewards where not independently verified. Existing Hajin records and saved player progress retain stable IDs.
- **FR-003 / US3:** Individual mission pages provide a direct, exact-ID edit action to Content Studio, plus an audit link. Saving repository content requires an explicit Studio save and rebuild; private player completion is unaffected.
- **FR-004 / US4:** The audit supports distinct X01 page targets and mission sections, direct links to individual pages, spoiler protection, stale-source detection, and legacy Hajin audit restoration.
- **FR-005 / US5:** Search, navigation, page links and generated routes resolve; browser tests cover page grouping, edit/audit handoff and private-state isolation.

## Boundaries

No invented reward grants, unlock order, required item counts, exact coordinates or gameplay certification. Existing player profile and audit storage are not reset or migrated automatically. Provider text/images are not copied verbatim. Source rights are limited to the previously authorized local factual collection; public asset licensing is not inferred.
