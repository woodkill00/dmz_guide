# Technical plan and delivery slices

## Selected architecture (proposed)
Use a TypeScript static-first web application with prerendered public guide routes and interactive client islands for planner, editor and maps. Astro with React islands is the preferred starting candidate; confirm integration and routing constraints in a one-day-equivalent spike before locking versions. A pure React/Vite SPA is simpler for application state but weakens no-JavaScript guide reading and requires explicit prerendering; a server-heavy framework adds operations not justified yet. This is a trade-off, not a claim Astro is universally fastest.

Use JSON Schema as the portable contract; select one reviewed validator and derive TypeScript types instead of maintaining two independently authored schemas. Pure domain modules implement graph validation and allocation without UI/storage imports. IndexedDB stores local profiles, inventory and overlays through a transactional adapter. Public pack compilation resolves references, checks provenance and emits small route/search payloads. Local packs use the same validation pipeline but remain private overlays. Search is local and chunked; add a worker only if profiling justifies it; map and editor code load only when needed.

Suggested boundaries:
- `src/domain/`: quantities, gates, recipes, allocation, version semantics.
- `src/content/`: pack validation, evidence policy, graph compilation.
- `src/storage/`: IndexedDB transactions, migrations, backups, recovery.
- `src/features/{search,planner,editor,maps,progress}/`: user journeys.
- `src/components/` and `src/styles/`: accessible primitives and semantic tokens.
- `schemas/`, `content/packs/`, `tests/{unit,property,integration,e2e,fixtures}/`.

For private editing, use fork-and-replace packs with explicit conflict recovery first, not automatic overlay rebasing. No backend, credentialed integration or remote user data collection in phase one. Deployment target remains a decision, not a commitment. A later backend receives a separate threat model and authorization plan.

## State rules
Public content version + private profile revision + selected goal priority deterministically define a plan. Separate currencies from item quantities, inventory pools from totals, consumption from possession, unlock prerequisites from material shortages, and effects from produced items. Explicitly distinguish unknown, locked and unlocked. A bookmark, map visit, item pickup and objective completion are different operations. Completion never silently changes inventory. Every destructive action previews its scope and supports undo or backup restore.

A content update cannot silently rewrite old player state. Migrations preserve unmatched IDs in a recovery area, show renamed/retired entities and allow export before apply. Browser-local storage is neither guaranteed persistence nor encryption; show this plainly.

## Responsive information architecture
Candidate tabs: Home, Search, Map, Saved/Plan, More. Validate Saved vs Plan with representative tasks; do not lock labels from opinion. Home has an obvious “Plan my next upgrade” action. Community lives under More, not an in-run primary tab. Item detail links uses, recipes and locations; guide detail answers the question before background reading. Dark design uses charcoal surfaces, restrained accent, high-legibility text and labeled rarity/status. Do not copy screenshot art or unreadable all-caps density.

At narrow widths use one column, readable quantities and a non-obscuring action area. At larger widths use list/detail and map/sidebar layouts. Sticky summaries collapse and do not stack with a map sheet or keyboard. Essential map details remain in the list when imagery fails.

## Vertical slices and release boundaries
S0 Evidence and contracts: resolve semantics needed for first slice; approve constitution, rights register, schema and synthetic fixtures. Deliver validated example pack and visual token prototype, not game claims.
S1 Find and understand: public dark-first shell, search, item/recipe detail, sources and stable URLs. Acceptance: a new player can find a known item and its uses on mobile without login or JavaScript-dependent article reading.
S2 One useful plan: single goal, local inventory, missing requirements, currency and gates, backup. Acceptance: update a quantity and see an explainable shortage that survives reload.
S3 Shared collection planning: multiple ordered goals, shared ingredient allocation, now/later reservations, unknown-gate handling and dependency safety. Acceptance: scarce resources are never spent twice.
S4 Safe creator workflow: guided local editing, diff preview, JSON round trip and bounded picture-pack portability. Acceptance: edit a recipe and picture reference, export, import on a clean profile, preserve semantics; malformed input changes nothing.
S5 Location intelligence: original/licensed map, canonical coordinates, list parity, filters and selected-plan context. Acceptance: reach the same relevant location details with or without map imagery and gestures.
S6 Progression and story: independent tracks, prerequisite graph, spoiler controls, completed vs planned state and reset policy. Acceptance: unknown unlocks stay unknown and progress changes do not fabricate inventory.
S7 Community launch: verified Discord link, correction workflow, moderation/attribution and publication checks. Acceptance: submit a reviewable correction without making it public automatically.
S8 Reliability expansion: explicit offline packs and optional multi-device sync only after demand, rights, quotas and ongoing ownership are established. Not a launch blocker unless user reprioritizes.

Each slice has a separate feature directory when implementation begins. This pack's initial `001-guide-foundation` deliberately supplies the roadmap plus first-slice contracts; do not ask one agent to implement all slices in a single run.

## Parallelism
After S0 contracts, public UI/search and storage/domain test harness can proceed in parallel. Multi-goal planner depends on one-goal invariants. Editor consumes the stabilized pack contract. Maps can prototype with synthetic coordinates in parallel but cannot publish unverified imagery. Progression shares gate semantics and therefore follows that contract. Security and accessibility review every slice, not just S7.

## Proposed budgets (calibrate, then enforce)
First guide route <=200 KiB compressed JS; initial HTML/CSS/text payload <=350 KiB excluding responsive images. Lazy map/editor payloads have separate measured budgets. Representative pack: 5,000 items, 2,000 recipes, 5,000 POIs, 100 active goals (200 is an explicit over-limit stress fixture). Planning p95 <=100ms on a documented mid-range phone profile or revise scale/UI honestly. Search p95 <=100ms after index ready. Measure against cold and warm loads; do not advertise benchmark results before execution.

## Planner semantics agreed after adversarial review
The all-goals requirements plan is not a claim of present feasibility. The executable-now schedule separately trial-simulates complete goals against actual owned stock. Default strict priority reservation protects higher-priority materials even when that goal lacks something else. An explicitly chosen work-conserving mode may skip blocked goals; show the trade-off before spending their reservations. Neither mode is called globally optimal.

Aggregate shared intermediate demand before rounding batch yields. Deduplicate one-time prerequisite upgrades by stable objective ID across dependency closure; already-completed prerequisites cost zero in the current plan. Example: shared unlock U costs two chips, A and B each one chip: A+B costs four chips, or two if U is completed. Retained tools are requirements, not consumed ingredients; durability is unsupported until specified. Capacity effects and unlock flags are not produced item yield. Projected future batch surplus is contingent, never owned inventory or evidence of craftability. Reject cycles before any recursive plan, including one-goal mode. Disputed prerequisites permit conditional requirements but cannot certify “ready.”
