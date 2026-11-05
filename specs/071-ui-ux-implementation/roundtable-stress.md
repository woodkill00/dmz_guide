# Final layout/feature stress roundtable

2026-11-05, after approved070concept and before071plan generation. Roles: design_map_ux (layout/map), design_information (full-site/scope), integration_review (accessibility/lifecycle). These are actual AI-agent read-only reviews and two challenge/consensus rounds, not player research.

## New observed stress evidence

Map reviewer reproduced on synthetic070concept: Save name→Find→Discard within650ms caused detached-status null write and revived discarded name;320×568/root-text200% produced380px document width and route/task intersection≈95px;844×390/root-text200% had inadequate height but **zero2Dintersection area for the side-by-side columns** despite overlapping y-ranges. Ignored receipt `.local/design071-map-stress.json` binds concept hash and actualBrowserZoom=false. No production/private data changed. Prior070acceptance covered different declared states; these newly reproduced conditions are not silently claimed passed.

## First-round hazards / agreed enforceable decisions

| Hazard | Agreed prevention | Tradeoff / future validation |
|---|---|---|
| Width-only layout/min-height sums fail on short/enlarged screens | Intrinsic/height-first Map/Task fallback, no automatic departure from focused editor, one scroll owner | User sometimes switches view; preserve context and test actual keyboard/zoom separately |
| Late Save/reply revives discarded work | Real commit owner/context/generation; distinguish preparing, committing, confirmed, failed and unconfirmed; no timer success or blind replay | Requires explicit controller adapter/recovery; noncancelable writes remain noncancelable |
| Navigation guard retargets unexpectedly | Freeze first intent with origin/context; revalidate target after confirmed Save; Stay retains draft | Later requested destinations require another deliberate action; new tabs remain native |
| Detail Back lost under cache pressure |8entries INCLUDINGactive, detail within its originating entry, minimal valid return anchor, no drafts/operations owned by cache | Old clean display preferences may expire with a quiet fallback; domain state never rolls back |
| Route action targets inspected/newly active marker | Atomically validate route/revision/waypoint token; Undo exact prior action | Stale action refuses rather than guessing; existing resolved-point/write guard retained |
| Blanket road-error disable changes manual tracking | Road solving is independent of authorization for otherwise valid manual Reached | Incomplete roads remain clearly labeled and undrawn; no invented route/GPS behavior |
| Multiple errors erase useful space | Single visible workspace issue aggregate, owner-specific linked details and blocking-write priority | Some full error detail requires disclosure, but never transiently hides failed saves |
| Generic nav loses similarly named features/owners |77ID+generated-family matrix, explicit public/private Map/native/backup scopes, real JS handler identity checks | More precise contextual labels, not more primary navigation items |
| Lists drop important meaning | Normative per-family fields/columns, stable row identity and explicit bulk scope | Bounded lists and details require Back/context retention; unknown remains unknown |
| Safe runs treated as generic main-route UI | Dedicated state/road/source/access/worker preservation cases | Separate adapter remains; no automatic main-road/profile sharing |

## Challenge-round concessions

- Map reviewer accepted frozen first intent but required destination revalidation and failed/unknown recovery, not a permanent disabled Save trap.
- Accessibility reviewer required cache byte/UTF-16 bounds, focus-owner generation and atomic mutation validation rather than display-time checks only.
- IA reviewer accepted cache8only if detail remains inside its originating entry, not evicted by a separate detail entry; reiterated separate search/backup identities.
- Root inspected baseline field-guide-ui.ts: marking reached already requires a resolved point. Plan preserves that guard; it does not add road-solver-success gating or relax missing-location constraints.
- Root's live registry export gives77IDs (28guide,48map,1studio,including45map-tool targets); older76destination prose is superseded. Matrix counts are UI inventory, not game completeness.
- The visual direction stays approved. No new top-level navigation, floating pane system, database consolidation or framework rewrite was added.

## Hand-off and analysis

After roundtable closure root created071spec/plan/model/contracts/tasks using pinned Spec Kit setup and template instructions. First independent analysis found8distinct actionable planning gaps; report preserves all aliases in analysis/iteration-01.md. Root repaired artifacts in a separate authorized stage. Second independent analysis from all3roles found0new/unresolved findings, with8/8closed (analysis/iteration-02.md). Implementation remains future work; final checklist is separately reviewer-owned.
