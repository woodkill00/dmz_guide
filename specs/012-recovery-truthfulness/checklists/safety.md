# Reviewer-owned requirements quality
- [x] CHK001 Are all replacement categories and spoiler-only changes explicitly covered? [Completeness FR-001]
- [x] CHK002 Is current-spoiler masking defined for readable and optional raw summaries? [Privacy FR-002]
- [x] CHK003 Are content versus storage failure states distinguishable without misleading recovery guidance? [Clarity FR-003]
- [x] CHK004 Are reopen, versionchange, late success and no-uncertain-write-retry semantics complete? [Coverage FR-004]
- [x] CHK005 Are both guided hosts and unchanged failed drafts covered? [Completeness FR-005]
- [x] CHK006 Are successful and failed planner focus targets defined including boundaries/removal? [Clarity FR-006]

## Independent requirements review

Approved CHK001–006 on 2026-10-22 after reviewing spec/plan/tasks/contracts and clarifying conservative unknown-reference handling and masking across all preview metadata, keys, values and version-status surfaces. Requirement quality only: corresponding baseline reproductions, implementation/source review, exact-head browser/visual and CI evidence remain mandatory. This is not runtime or merge approval. No uncertain write retry, schema migration or recovery deletion is authorized.
