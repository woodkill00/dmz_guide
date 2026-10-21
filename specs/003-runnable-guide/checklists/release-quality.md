# Release-quality requirements checklist: Runnable guide foundation

**Purpose**: Independent pre-implementation requirements review for S0–S2, focusing on correctness, private-state safety and usable multipage reading.
**Created**: 2026-10-21
**Feature**: [Specification](../spec.md), [plan](../plan.md)
**Review Ownership**: Reviewer-owned; implementers must not change checkbox markers.
**Marker Semantics**: An approved item means its requirements are sufficiently specified, not that the application passed a test.

## Completeness and scope
- [x] CHK001 Are S0–S2 outcomes and separate follow-on commitments clearly bounded? [Completeness, Spec Input/Assumptions]
- [x] CHK002 Are stable readable routes, no-script content and search/filter restoration specified for all seeded entity types? [Coverage, Spec F003-01/06, SC003-01]
- [x] CHK003 Are fixture labels, unknown statistics, disputed/stale claims, provenance and image rights requirements explicit? [Clarity, Spec F003-02, Edge Cases]
- [x] CHK004 Are empty, invalid-route, offline and missing-image fallback requirements defined without implying unsupported caching? [Coverage, Spec F003-07, Edge Cases]

## Planning correctness
- [x] CHK005 Are batch yields, rounding, alternate selection, tool nonconsumption and typed currency accounting unambiguous? [Gap, Spec F003-04]
- [x] CHK006 Are locked, unknown and disputed gates distinguished from material sufficiency and executable-now status? [Clarity, Spec F003-04]
- [x] CHK007 Are cycles, invalid references, numeric limits and overflow rejection specified before planning? [Coverage, Spec F003-03/04]
- [x] CHK008 Are conservation and deterministic property criteria measurable for one-goal planning and reserves? [Measurability, Spec SC003-02]

## Recovery and untrusted data
- [x] CHK009 Are import byte, nesting, collection and string limits numeric and enforced before unsafe resource use? [Gap, Spec F003-05, US3]
- [x] CHK010 Are hostile object keys, imported text and unsafe URL schemes addressed at all rendering boundaries? [Gap, Spec Edge Cases]
- [x] CHK011 Are restore preview, cancellation, explicit application and all-or-nothing failure requirements defined? [Coverage, Spec F003-05, SC003-03]
- [x] CHK012 Are storage failure, unsaved edits, export recovery and stale-tab conflict behavior specified without silent overwrites? [Coverage, Spec F003-05, US3]
- [x] CHK013 Are content/profile version binding, unsupported schema handling and unknown-ID retention requirements consistent? [Consistency, Spec F003-03/05, Key Entities]
- [x] CHK014 Are reset scope, confirmation and backup/undo recovery requirements explicit? [Coverage, Spec F003-05, US3]

## Accessibility and evidence
- [x] CHK015 Are keyboard focus, semantic names, live updates, zoom, narrow layouts and dark/light contrast requirements measurable? [Coverage, Spec F003-06, SC003-04, Gap]
- [x] CHK016 Are local start/build commands, output boundaries and reproducibility requirements defined? [Completeness, Spec F003-07]
- [x] CHK017 Are browser/device profiles, screenshots, actual functional evidence and exact-head CI distinguished from unrun physical-device or comprehensive WCAG claims? [Clarity, Spec F003-08, SC003-04/05]
- [x] CHK018 Are architecture deviations from the approved baseline explained with storage atomicity, migration and future-slice compatibility implications? [Consistency, Plan, Gap]

## Notes
Generated through the pinned checklist protocol after its prerequisite/template command on 2026-10-21. No extension hooks file was present. Focus and depth were explicit in the review assignment, so no redundant clarification questions were asked. Items begin unchecked; subsequent independent evaluation records the evidence for approval. Functional acceptance evidence belongs in a separate review report, not these markers. The built-in requirements.md remains owned by specify/clarify.

Independent review, 2026-10-21: CHK001–003/006–013/016–018 approved against the clarified safety/planning boundaries, plan, data model and browser contract. CHK004/005/014/015 remain open for explicit missing-image/404 behavior, retained-and-consumed shared-item accounting, reset snapshot recovery and measurable zoom/contrast/focus/live-region expectations. Exact schema lock remains T003 before domain implementation. Approval is only requirements quality, not executed functionality.

Follow-up independent review, 2026-10-21: CHK004/005/014/015 now approved after explicit specification and UI-contract additions for fallback, joint consumed/retained accounting, reset recovery, 200% zoom, contrast thresholds and live error/focus behavior. All 18 requirements-quality criteria are satisfied for bounded 003. This authorizes implementation after the exact schema lock, not merge/release. S3–S7 remain required separate increments.
