# Read-only analysis iteration 01

Completed before repairs. Reviewers: integration_review (Spec Kit analyze workflow), design_map_ux, design_information. They returned reports without editing artifacts; integration prerequisite script resolved071 with require-spec/require-tasks/include-tasks; extensions.yml absent. Root records the completed outputs here as a separate documentation step. User explicitly authorized task/artifact repair between read-only passes.

## Consolidated findings

| ID | Aliases | Severity | Location | Finding / required repair |
|---|---|---|---|---|
| A001 | I1,MAP-A02 | HIGH | tasks T006/T019/T033/T034/T061; layout issue slot | US2 depends on shared priority/retention issue-summary primitive only implemented in US5. Move primitive+tests into foundation; one visible workspace aggregate, not one banner for every owner. Keep US5 owner adapters later |
| A002 | I2 | MEDIUM | tasks T042; plan catalog ownership | Boss renderer actually lives in workspace/checklist-ui.ts, delegated from field-guide-ui.ts. Include actual owner and named existing board/order/counter tests |
| A003 | U1,MAP-A01 | HIGH | FR-025; plan rollout; T009/T019–T022/T034/promotion | Default-off flags lack authority/activation/variant proof. Define per-surface flag precedence, static/no-JS output, test opt-in/identity and rollback; distinguish baseline legacy geometry from redesigned preservation cases and exclusive legacy fallback |
| A004 | MAP-A03 | MEDIUM | layout coordinate/overflow rule; T019/T063/T064; SC-002 | Layout document overflow versus visual viewport clipping conflated. Define separate measurements/coordinate conversion; pinch/keyboard should not falsely fail as body overflow |
| A005 | IA-A1 | MEDIUM | feature-coverage recipes row; navigation expectations | Recipes assigned Guide, conflicting with reviewed FOB Crafting. Set primary FOB/Crafting and explicit secondary alias if retained |
| A006 | IA-A2 | LOW | plan technical context | Performance budget references workspaces.md where it is absent. Correct to actual plan performance/layout stress sections |
| A007 | IA-A3 | MEDIUM | workspaces required-column matrix; T035/T043 | Maps/locations, recipes, guides and heterogeneous catalog missing normative fields/actions despite migrations. Add existing important completeness/consumption/coordinate/spawn/unknown/source/spoiler requirements |
| A008 | IA-A4 | MEDIUM | T011/T012/T066; SC-001 | Registry/runtime checks alone cannot prove all77 real JS target handlers. Add explicit browser-mounted feature identity checks across all77 and nested families without mutation actions, with meaningful scoped identity rather than URL/title alone |

## Coverage and metrics

28FR +6SC =34buildable requirements;70future tasks, all unchecked. Explicit coverage34/34(100%); no unmapped tasks; registry77/77,0missing/extra; all task references resolve; no duplicate IDs. Ten reviewer finding records consolidate into8distinct findings:2HIGH,5MEDIUM,1LOW,0CRITICAL. No direct constitution conflict or duplication finding. Semantic readiness is NOT established merely by explicit coverage.

Next step: repair owning spec/plan/contracts/tasks/matrix (not source implementation), then independently rerun read-only analysis with the same scope and preserve this report. No production implementation until unresolved planning findings are zero.
