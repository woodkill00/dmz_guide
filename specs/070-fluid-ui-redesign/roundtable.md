# Design roundtable record

5 November2026. Actual agent review/discussion, summarized by integration owner. These are AI design reviewers, not human designers or player research participants. No production source was edited by reviewers.

## Participants and first round

- `design_map_ux`: map interaction/layout review. Found overlapping top controls at390/1440px. Proposed layout-owned tool rail/task pane, one selection surface, reserved route status and mobile inspection states. Initially allowed later expert floating layout and suggested65%viewport-area budget.
- `design_information`: information architecture/list workflows. Found competing navigation taxonomies, oversized mobile shell and long reference pages. Proposed canonical five hubs, simpler Home, shared list/detail patterns and truthful companion transitions. Initially prioritized catalog pilots before map.
- `integration_review`: accessibility/design engineering. Independently measured mobile chrome and small map labels. Proposed semantic tokens/adapters, readable typography, focus/draft/scroll preservation and explicit modality. Rejected framework migration as a prerequisite.
- Root/integration owner: audited current source/research, challenged options, consolidated decisions, wrote plan and isolated prototype. Owns production contracts and distinguishes proposed from shipped behavior.

## Second round: disagreement and resolution

| Question | Challenge | Agent response / concession | Final proposal |
|---|---|---|---|
| Top navigation or permanent app rail? | IA favored width preservation; map rail plus toolbar risked another duplicate | Map agent explicitly rejected rail+contextualbar duplication | Five-hub global header plus ONE contextual map-task navigator; no parallel rail |
| Can one pane replace all panels safely? | Visual simplicity alone could discard a route draft or list context | All reviewers required tool-specific view state and Back stack; map reviewer disagreed with one-pane-as-state-reset | One visible task/detail body, retained independent tool state, Save/Discard/Stay before dirty replacement |
| Does route tracking disappear when inspecting? | Hiding next/reached harms active task | Agreed route progress is a limited exception to one-pane content | One layout-reserved slot with route/stop identity, actions, Minimize/Restore and manual-progress labels |
| Are mobile sheets appropriate everywhere? | Catalog details and long forms behave poorly as perpetual bottom sheets | IA accepted sheets for brief map inspection only; a11y required explicit buttons and intentional focus semantics | Real mobile reference detail pages; map Peek/Half inspection; full editing page/sheet; no nested sheets or required swipe |
| Which phase follows shell/Home? | User repeatedly reports map obstruction; catalog-first postpones it | IA explicitly conceded earlier sequence | Map vertical slice before catalog rollout, with preservation tests before broad migration |
| Free-floating expert windows? | Adds collisions/state migration during first redesign | Map reviewer withdrew initial optional-expert inclusion from first scope | Defer new floating mode; preserve/reset existing display preferences reversibly |
|65%map visibility means what? | Viewport area confuses width and vertical chrome | Map reviewer withdrew original area target; a11y warned text preferences may change split | Proposed65%usable-workspace WIDTH at1280+, measure heights separately; not a universal conformance rule |
| Make everything smaller? | Tiny labels undermine comfort/touch | Accessibility reviewer explicitly opposed shrinking type to achieve density | Reduce repeated content/padding/decorations;14–16px operational text,44px primary touch targets |
| Require calc everywhere? | Arithmetic offsets can become brittle | Accessibility reviewer rejected blanket requirement | Grid/Flex/rem/clamp/minmax; calc only for derived constraints |
| Seamless single app? | Current origins/databases do not automatically synchronize | IA and engineering rejected pretending common state | Shared shell/adapters and honest cross-service transitions; consolidation is separate migration project |

## Tradeoffs accepted

The single-pane default adds an occasional tool switch and removes simultaneous filter/detail comparison. Clear contextual tabs, restored list state and route status mitigate it. A compact mobile Sections menu adds one navigation action but returns vertical space. Bounded catalog results reduce initial DOM/scan length but require exact Back/context restoration. Restrained opaque surfaces sacrifice flashy game imitation for reliable terrain contrast.

## What is preserved

Native/public detail links, no-JS reference access, public/private search boundaries, source/unknown/*WZ evidence, dirty-draft/import recovery, source dedup/masks across snapshots, current upgrade/collection calculations, key prerequisites, stable boss counters/order, route worker lifecycle and manual tracking. Neither source coverage nor gameplay verification increases merely because the interface improves.

## Review gates

First/second rounds are completed expert proposals. Final artifact/prototype review checks plan consistency and concept honesty; it does NOT approve an unimplemented production redesign or substitute for player validation. Independent checklist is reviewer-owned. Future phases need exact implementation/browser/recovery review.
