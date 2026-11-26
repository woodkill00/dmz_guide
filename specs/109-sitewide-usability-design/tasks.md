# Implementation tasks

Status: planning work only. Tasks T00–T02 can close in this planning turn; application tasks stay unchecked. Dependencies are serial unless a future worktree plan explicitly assigns disjoint files. Requirement IDs refer to spec.md.

| ID | Requirements | Work and owning paths | Depends on | Required exit evidence |
| --- | --- | --- | --- | --- |
| T00 | FR01–FR18 | Specify scope, clarify calc/compactness, collect local observations and primary references | — | Linked planning artifacts; no claimed application changes |
| T01 | FR01–FR18 | Independent planning review and analyze→owning-artifact repair→analyze | T00 | Reviewer-owned criteria and analysis with no unresolved blocking planning finding |
| T02 | FR01–FR18 | Reconcile final planning ledger/implementation entry conditions | T01 | Consistent spec/plan/tasks/coverage/review status |
| T03 | FR01,FR18 | Isolate implementation branch/worktree after a checkpoint containing108; record base commit and clean task scope | T02 | No lost/stashed/reset existing changes; reproducible checkout |
| T04 | FR01,FR15 | Generate complete registry/build-route and CSS/import/selector owner inventory; classify every route | T03 | Machine-readable inventory, no unclassified features/routes; known capability/alias cases |
| T05 | FR05,FR07,FR10,FR14,FR15 | Baseline populated/empty/error/draft screens and geometry/performance; select fixture-bound budgets | T04 | Exact engine/viewport/state artifacts, agreed measurable budgets and initial issue list |
| T06 | FR02,FR03,FR13,FR14 | Calc-backed space/type/size/offset token contract; extend layout-tokens and map adapters | T05 | Component/token examples plus browser computed geometry; exception ledger |
| T07 | FR02,FR03,FR16 | Map cascade/import ownership and introduce scoped token-adoption check without blanket override replacement | T06 | Legacy rule consumers and approved exceptions; meaningful lint failures |
| T08 | FR03,FR07,FR09,FR13 | Component reference fixtures: cards, rows, quantity/checkbox/actions, status, disclosure, empty/error/loading | T06 | Long names, missing art, large cash, unknown/partial facts; keyboard/light/dark/zoom review |
| T09 | FR03,FR04,FR05 | Unify shared navigation/shell/current state/search/breadcrumb/toolbar adapters | T07,T08 | Registry destinations/bookmarks unchanged; all shell variants and overflow navigation work |
| T10 | FR05,FR11,FR12,FR13 | Shared compact feedback placement and bounded panel/dialog/scroll/layer rules | T09 | Expanded errors/recovery remain visible; no obscured focus or competing vertical traps |
| T11 | FR06,FR09,FR11,FR12 | Refine Dashboard sections and full-roster/remaining/completed discoverability | T10 | All sections and 24+5 Order pages reachable; counts/actions/focus parity |
| T12 | FR03,FR07,FR11,FR12 | Inventory/Items category tables, sticky heading/column behavior and narrow stacked alternative | T10 | Quantity/blueprint/reserve saves and staged raw drafts preserved; no clipped7-billion cash |
| T13 | FR03,FR06,FR07,FR11 | Needed/Quick Collect/build group cards, filters and compact shared-stock explanation | T12 | Exact planner totals preserved; Add found/Undo row stability and recipe ambiguity retained |
| T14 | FR06,FR08,FR09,FR11 | FOB/upgrades current-tier cards and Orders/story instruction/disclosure refinements | T10 | Complete/undo/next tier, all page labels, earliest pending defaults and explicit overrides |
| T15 | FR03,FR06,FR08,FR09 | Unified weapons/selectors/manuals/camos/prestige/attachments/stats presentation | T10 | Single store owner, extraction controls and independent camo/prestige progression retained |
| T16 | FR07,FR08,FR09 | Keys/map dependency list and item/weapon/order/upgrade detail anatomy | T12,T14,T15 | Exact relationships/edit targets, source visibility, photo and build draft preservation |
| T17 | FR05,FR08,FR11,FR12 | Page/content editor and local-service shells; compact validation/save/recovery controls | T16 | Full field/photo/dynamic section edits remain possible; dirty-navigation and failed save recovery |
| T18 | FR02,FR03,FR10,FR14 | Shared map chrome tokens, available terrain/viewport geometry and bounded inspectors | T10 | Hajin/X01 floor/Safe/Loot layouts; terrain/control geometry and marker visibility |
| T19 | FR09,FR10,FR11 | Map source/category/layer/search/inspector interactions and popup lifetime preservation | T18 | Same marker details stay open during pan/zoom/re-render; no accidental recenter/selection loss |
| T20 | FR10,FR11,FR14 | Movable/resizable/retractable panels with keyboard alternatives, clamp/reset and safe restored preferences | T19 | Screen resize/zoom/short-height invalid saved placement recovery; all handles reachable |
| T21 | FR06,FR10,FR11,FR12 | Route/waypoint/reached controls and Safe/Loot/X01 floor-specific tool layouts | T20 | Road routing/reorder/removal/minimize/next reached and restore unchanged |
| T22 | FR04,FR05,FR08,FR12 | Remaining guide/reference/help/quality/audit/settings/backup/manager shell migration | T17,T21 | Capability-gated actions honest, backups/restore previews usable, no raw HTML/JSON dump |
| T23 | FR01,FR04,FR17 | Regenerate all navigation/feature/route/editor/service links and aliases audit | T11–T22 | Zero unexpected broken/misbound links; all registered surfaces accounted for |
| T24 | FR02,FR03,FR16 | Remove superseded CSS/duplicate chrome only where preceding family gates pass | T11–T22 | Owner/rule coverage and before/after screenshots; calc adoption/exception inventory reconciled |
| T25 | FR11,FR12,FR15,FR17 | Shared lifecycle/concurrency/quota/committed-unverified regression against all migrated writers | T11–T22 | No replay/draft loss/automatic retry; current canonical revision and inventory parity |
| T26 | FR07,FR10,FR13,FR14 | Three-engine responsive/textzoom/short-height/keyboard/touch accessibility matrix | T23–T25 | Validation tiers below; expanded states; documented genuine2D exceptions |
| T27 | FR03,FR05,FR13 | Independent visual review of baseline comparisons across all family/state representatives | T26 | Meaningful changes reviewed, failures repaired without blind screenshot replacement |
| T28 | FR15 | Re-measure DOM/interaction/layout-shift and asset/CSS budgets on fixed fixtures | T24–T27 | Baseline-selected budgets met; no duplicate owners/listeners/mounts introduced |
| T29 | FR01–FR18 | Full runtime tests, guide/map builds, topology/sitewide and applicable owner suites | T28 | Exact commands/heads/logs, no unexecuted suite called passing |
| T30 | FR01–FR18 | Converge with independent implementation review; repair tasks/artifacts and recheck affected evidence | T29 | No unresolved confirmed P1/P2; requirement→task→test mapping complete |
| T31 | FR01–FR18 | Document token/component/exception usage, user layout reset and maintenance guidance | T30 | Reviewable delivery record, reproducible verification and scoped commit/merge readiness |

No implementation task authorizes a deployment, credential change, external message or data-provider collection. Final Git commit/merge is separate from this planning request.

Traceability closure: FR17 is owned by T05/T23/T25/T29/T30 (baselines, route/lifecycle/full verification) and FR18 by T03/T24/T30/T31 (isolated rollout, safe consolidation, independent acceptance and documentation). Full-scope planning/final tasks cover FR01–FR18.

Planning status: [x] T00 artifact creation; [x] T01 independent review/analysis repair cycle; [x] T02 planning reconciliation. T03–T31 remain unimplemented and unverified.
