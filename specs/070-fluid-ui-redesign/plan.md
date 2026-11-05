# Implementation planning and architecture

Status: planning package. Manual pinned Spec Kit cycle, no invocation claim. Spec/clarify:070spec and current user direction; research:primary references and current-state source/browser audit; checklist:independent review; tasks/backlog below; analyze:cross-artifact consistency and reviewer challenge; implement:only isolated concept/documentation; converge:repair plan/prototype issues and record checks. Production phases remain unimplemented.

Use the existing static MJS renderer, separate TS/Leaflet map, DOM controllers, native links/disclosures, storage and workers. No new runtime dependency. Semantic tokens extend `src/ui/layout-tokens.css` through per-service adapters. Navigation continues through feature registry, preserving feature IDs/URLs. Shared viewstate/overlay contracts sit above domain state and do not combine databases.

Presentation contracts:

1. Shell slots own global header, context navigator, content, task pane and active route/status region. Surfaces cannot independently reserve the same corner. One registry defines destination labels/availability; all features still map to IDs.
2. Pane host supports task ID, selected-record ID, bounded public query/group/sort, scroll/focus return and explicit Back. Private editor values stay in existing stores/drafts, never URL/history. Dirty guards run before replacement. One main scrolling pane body; header/actions remain reachable.
3. Selection emits record identity; view adapter chooses pane/detailpage. Camera changes only through explicit intent; filter/data refresh clears stale selection. Existing067/069contracts remain fixtures.
4. Route status receives route ID/next-stop identity, manual progress and computation/staleness state. It cannot retarget to currently inspected POI. Existing worker ownership/timeouts and Undo/transaction rules remain.
5. Feedback has inline status/field errors/persistent notices/one deliberate modal. Live roles are preserved; routine startup does not generate an automatic floating banner. A status area cannot become an unbounded stack.
6. Layout preference migration is versioned/bounded/reversible, with old panel placements retained until the new default is independently accepted. Density/theme only affect display; they never alter domain state. Storage-denied mode remains usable.

Constitution check: serves player decisions, accessibility, provenance, portable private state, safe imports, simplicity, reversible slices and honest evidence. No account, backend, paid asset, provider fetch or production deployment needed. Asset policy satisfied by original synthetic SVG. Future data/service migration needs its own contract/review, not implicit authority here.

Dependencies: phase0contract/baseline→phase1shell/Home→phase2mapverticalslice→phase3directories→phase4weapons/management→phase5hardening/defaultrollout. Hardening begins in every phase, not only at end. Each can roll back presentation without touching saved progress.

Potential blockers to implementation: unmapped destination, lost draft/progress, false data synchronization, hidden uncertainty, inaccessible focus/keyboard, overlapping controls, unreviewed source assets or data migration. New visual preference questions are prototype validation work, not an excuse to discard existing verified behavior.
