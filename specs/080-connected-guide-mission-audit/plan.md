# Implementation Plan: Connected guide and mission audit

**Branch**: `feature/080-connected-guide-mission-audit`
**Spec**: `spec.md`
**Status**: Implementation complete on feature branch; independent review and release evidence tracked in `acceptance.md`

## Summary

Build one connected player journey while adding a separate editorial mission-coverage workbench. The audit began with a zero-record Orders/Story gap; the current starter has 66 source-reported Hajin Orders and six source-reported Story Missions; seven fixed rosters are recorded and 17 variable page slots remain unassigned. Connected inventory, upgrade, mission, key, item, weapon and map views use stable IDs and explicit user actions. Recovery and source-review controls precede the final release gates.

## Technical context and constitution check

- Existing static guide: Node 22/24, generated HTML routes, browser modules, validated content packs and private profile. Map companion: Vite/TypeScript/Leaflet on a different localhost origin. Content Studio is another explicit local authoring service.
- Preserve local-first operation, existing schemas, spoiler projection, source attribution and unknown-value semantics. Derived views read existing stores; new audit state does not alter catalog or player completion.
- Validate bounded imports, preview changes, preserve previous valid state, and report storage failure. A shared backend or account link is not required.
- The current 24 Orders slot projection is launch/Hajin-scoped. Official Season 1 notes add X01 Orders; page sets must be extensible and evidence-backed.

## Architecture and surfaces

| Slice | Surface and owner | Contract |
| --- | --- | --- |
| A — Mission audit | New `/missions/audit/` generated page, `src/domain/mission-audit.mjs`, `src/client/mission-audit.mjs` | Read pack and `ordersPageCoverage`; write only validated local editorial state. Exact links to `/missions/`, `/local/`, and Studio. |
| B — Connected preparation | Home, `/planner/`, `/missions/`, `/upgrades/`, item/recipe/key details, `src/domain/collection-workbench.mjs` and related projections | One derived action list with stable IDs, stock/reserve math, unknowns and bidirectional links. No duplicate quantities. |
| C — Match lifecycle | Existing Field desk/operations and map handoff modules | Stage owner observations; preview; atomic guide-profile apply; explicit map transfer with identity/version checks. |
| D — Recovery | Existing profile/map/armory exports plus new bundle manifest | User supplies companion exports to a validator; preview and apply modules individually with outcome report. No silent cross-origin read or all-or-nothing claim. |
| E — Content health | Existing `data-review`, source review, Studio and patch checker | Computed coverage, contradictions, pending updates, exact editor links; separate source claim from verification. |
| F — UX/release | Shared navigation/home/search and browser suites | Compact next-action dashboard, predictable controls, task journeys, performance and accessibility evidence. |

## Ownership review (2026-11-14)

- Catalog record IDs are interpreted within a selected pack. Audit targets bind pack ID, page-set ID or objective ID, and section. The public catalog manifest carries the exact repository pack key for Content Studio; an unlisted private pack has no repository author link.
- Guide inventory/progress/field operations share the versioned guide profile and its guarded save path. Match staging must preview and commit through that existing profile transaction; a separate match store must never impersonate a successful profile save.
- Collection/run-plan handoffs already have bounded validators. Map and armory run at other local origins, so unavailable or wrong-origin transfers need explicit file fallback and no implicit storage reads.
- The current profile backup explicitly excludes discovery photo bytes, map workspace/source captures, armory workspace and named run plans. FR-013 therefore needs a manifest of user-supplied module exports with an omission list and per-module outcomes; it cannot claim one browser-atomic restore.
- Weapon patch proposals and map source updates have their own review paths. FR-014 needs a shared read-only finding projection and explicit source-specific decisions, without applying a proposed claim directly to the published catalog or private profile.

## Mission audit page layout

1. **Header**: selected pack and scoped page set; recorded/unrecorded page counts, known Story Mission count, and editorial work counts. Warn when the catalog lacks mission records.
2. **List**: Orders pages 1–24 with recorded/unrecorded state and Story Mission sections as a separate group. Later X01/seasonal sets stay separately scoped until their denominator is evidenced. Status filters and search use spoiler-safe labels; computed missing/stale warnings remain visible in detail. Source conflicts are reviewed in Data review.
3. **Detail pane**: selected page or mission, compact section rows, computed presence/evidence badge, editable editorial state and note, last reviewed date, source/build signal, exact content/edit links. An unrecorded page shows only its roster task and a blank add-record path.
4. **Footer/actions**: Save with truthful local status, Undo last audit change, Export audit, Preview restore, and a link to the current Missions player tracker. Bulk state changes require a scoped preview and do not mark content verified.

## Data flow and failure behavior

`catalog pack → spoiler-safe audit projection → computed section warnings + private audit entries → filter/detail UI`. Audit writes validate schema, version, counts, text lengths and target identity before committing. A catalog update retains old audit events; changed/missing targets show a stale binding and require explicit rebind or archive. Import preview identifies added/changed/stale entries; cancel is inert. A private editorial note is excluded from public search and generated content.

For player preparation: `selected goals + existing profile + catalog → one explanation projection → exact deep links`. Match staging holds temporary deltas until preview/apply. Source updates never mutate private inventory, progress or audit statuses. Cross-origin map actions use an explicit validated handoff; unavailable companions show a copy/export fallback.

## Alternatives considered

- **Put audit states in the player profile**: rejected because mission content review and gameplay completion are different identities and retention rules.
- **Treat page number as mission identity**: rejected because chapter selection can change display order and seasons add new sets.
- **Show 72 placeholder missions from third-party claims**: rejected because chapter placement and individual steps remain unresolved. The names are staged in the editorial source review; only checked records are admitted, while empty page slots remain honest.
- **One-click backup by reading every local origin**: rejected as a planning assumption; browser same-origin storage prevents direct reads. Explicit exports plus a manifest are the initial contract.
- **New global database/backend**: unnecessary for the first local-first slices; revisit only after measured transfer or recovery limitations.

## Verification plan

- Pure-domain tests: section target generation, 24 slots, story separation, spoiler projection, status transitions, stale binding, malformed/oversized import, source/evidence independence, shared shortage math, link integrity.
- Browser journeys: audit empty and populated synthetic packs; section status/save/reload/export/restore; mission→item→recipe→map→match; keyboard/390px/200% text and screen-reader status; storage denial/quota and companion unavailable; source-update conflict and recovery.
- Existing regression: `npm test`, `npm run build`, map typecheck/unit/browser suites, actual page activation and navigation fixture; report exact results and unavailable checks. Real-game mission facts and gameplay outcomes require separately recorded player/source evidence.

## Delivery order and release gates

Implement A, then B, then C, then D/E, then F. Each slice needs its own acceptance evidence and can be reviewed without claiming the remaining slices shipped. Run tasks→read-only analysis→task fixes→analysis until there are no critical/high unresolved gaps before implementation; repeat after code and tests. Reviewer checklists remain reviewer-owned. Do not merge a slice that loses private data, leaks spoilers or turns unknown facts into game claims.
