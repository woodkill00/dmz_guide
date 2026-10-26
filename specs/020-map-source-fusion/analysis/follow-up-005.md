# Duplicate source display follow-up

2026-10-26. T023/T024 implement the user-requested reversible display check across website layers. No source record or canonical decision is merged or removed.

## Implementation

Pure display-duplicates.ts uses explicit category aliases, matching normalized names within24 canonical pixels or recognized facility kinds within8 pixels, known floor/build exclusions, deterministic official-first ordering and enabled-source fallback. Groups are anchored rather than transitive, with at most one member from each site. Only active registered snapshots participate. Source/category/search masks are applied before choosing a visible representative. Matching is capped at250,000 examined group entries; remaining records are shown with an overflow explanation. Single-source views retain every record.

Loaded controller and promoted snapshot render paths share the plan. Category rows in Map key and Layers show `*` counts, with muted all-matching categories. Show duplicate markers restores all selected copies for inspection; it is a session-only display switch. All raw data, private annotations and canonical review/history remain untouched. Reusing source icons also works after snapshot promotion.

## Independent review and repair

Reviewer identified DEDUP-R1: nearby same-source facilities could be suppressed. Added a per-group source set and same-source/third-source-bridge regressions; no official site record is hidden merely because another official record is nearby. Independent focused re-review found R1 resolved and no remaining findings.

## Executed evidence

45 unit tests passed, including deterministic ordering, preferred-source fallback, inspection mode, floor/build/category/name exclusions, nontransitive matches, same-site preservation and dense20,000-record bounded matching. Strict production build passed. Fresh offline browser and production capacity results are recorded in verification.md after execution; prior follow-up results remain historical.

Actual owner-local read-only smoke:245 visible markers from543 raw records,298 likely cross-site copies hidden. Inspection mode restored543, then returning to normal restored245.60 category rows across key/Layers show matching counts. Actual capture assets and browser screenshots remain ignored. These counts describe display candidates, not verified game completeness.

## Analyze/convergence assessment

Read-only consistency review reconciles the new spec/plan/tasks with existing FR002/006/007/010/012/013: this feature is expressly display suppression, not an automatic canonical merge. All evidence stays available and inspection/fallback paths preserve completeness checking. No change to acquisition rights, export rules, source datasets or coordinate registration. Source-only scope intentionally leaves private and Reviewed layers independently controlled. No additional actionable gap found after the R1 fix. Reviewer-owned checklists are unchanged.

Final executed browser run20:56:57Z passed33 groups with0 errors/0 external requests, including promoted snapshot suppression; production capacity run20:57:44Z passed95.5/55.7ms toggle/search p95 and all five worker comparisons below171ms. Repository checks and diff whitespace checks passed. T023/T024 complete.
