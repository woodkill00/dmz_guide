# Implementation Plan: Connected guide and mission audit

**Branch**: `feature/080-connected-guide-mission-audit`
**Spec**: `spec.md`
**Status**: Planning; no feature code or game data imported yet

## Summary

Build one connected player journey while adding a separate editorial mission-coverage workbench. The mission audit is the first usable slice because it exposes the current zero-record Orders/Story gap without pretending the catalog is complete. Subsequent slices connect existing inventory, upgrade, mission, key, item, weapon and map services through stable IDs and explicit user actions. Recovery and source-review controls follow before release-polish gates.

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

## Mission audit page layout

1. **Header**: selected pack and scoped page set; recorded/unrecorded page counts, known Story Mission count, and editorial work counts. Warn when the catalog lacks mission records.
2. **Left list**: Orders pages 1–24 with recorded count and strongest unresolved state; Story Missions as a separate group; later X01/seasonal sets as separate labelled groups. Filters for Not checked, Needs correction, Fill later, Ready for review, Checked, Missing content, Stale and source conflict. Search names only after spoiler projection.
3. **Detail pane**: selected page or mission, compact section rows, computed presence/evidence badge, editable editorial state and note, last reviewed date, source/build signal, exact content/edit links. An unrecorded page shows only its roster task and a blank add-record path.
4. **Footer/actions**: Save with truthful local status, Undo last audit change, Export audit, Preview restore, and a link to the current Missions player tracker. Bulk state changes require a scoped preview and do not mark content verified.

## Data flow and failure behavior

`catalog pack → spoiler-safe audit projection → computed section warnings + private audit entries → filter/detail UI`. Audit writes validate schema, version, counts, text lengths and target identity before committing. A catalog update retains old audit events; changed/missing targets show a stale binding and require explicit rebind or archive. Import preview identifies added/changed/stale entries; cancel is inert. A private editorial note is excluded from public search and generated content.

For player preparation: `selected goals + existing profile + catalog → one explanation projection → exact deep links`. Match staging holds temporary deltas until preview/apply. Source updates never mutate private inventory, progress or audit statuses. Cross-origin map actions use an explicit validated handoff; unavailable companions show a copy/export fallback.

## Alternatives considered

- **Put audit states in the player profile**: rejected because mission content review and gameplay completion are different identities and retention rules.
- **Treat page number as mission identity**: rejected because chapter selection can change display order and seasons add new sets.
- **Show 72 placeholder missions from third-party claims**: rejected until names/objectives are captured and reviewed. Empty page slots are honest and already supported.
- **One-click backup by reading every local origin**: rejected as a planning assumption; browser same-origin storage prevents direct reads. Explicit exports plus a manifest are the initial contract.
- **New global database/backend**: unnecessary for the first local-first slices; revisit only after measured transfer or recovery limitations.

## Verification plan

- Pure-domain tests: section target generation, 24 slots, story separation, spoiler projection, status transitions, stale binding, malformed/oversized import, source/evidence independence, shared shortage math, link integrity.
- Browser journeys: audit empty and populated synthetic packs; section status/save/reload/export/restore; mission→item→recipe→map→match; keyboard/390px/200% text and screen-reader status; storage denial/quota and companion unavailable; source-update conflict and recovery.
- Existing regression: `npm test`, `npm run build`, map typecheck/unit/browser suites, actual page activation and navigation fixture; report exact results and unavailable checks. Real-game mission facts and gameplay outcomes require separately recorded player/source evidence.

## Delivery order and release gates

Implement A, then B, then C, then D/E, then F. Each slice needs its own acceptance evidence and can be reviewed without claiming the remaining slices shipped. Run tasks→read-only analysis→task fixes→analysis until there are no critical/high unresolved gaps before implementation; repeat after code and tests. Reviewer checklists remain reviewer-owned. Do not merge a slice that loses private data, leaks spoilers or turns unknown facts into game claims.
