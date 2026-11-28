# Verification requirements checklist: Reference gaps

**Purpose**: Independent requirements-quality gate for bounded follow-up research/content correction.
**Created**: 2026-11-28
**Feature**: [Specification](../spec.md)
**Reviewer**: `/root/review_112`

`[x]` means the reviewer assessed the written criterion as satisfied. It does not mean source collection, implementation or actual verification is complete. Implementers must not modify reviewer markers.

## Scope and evidence

- [x] CHK001 Is the exact current finding baseline bound to stable identity/evidence rather than a zero-warning target? [Clarity, Spec FR01]
- [x] CHK002 Are source-supported corrections distinguished from examined/unchanged/unresolved fields and complete-game claims? [Acceptance quality, Spec Acceptance]
- [x] CHK003 Are admitted sources, bounded existing adapters and comparison-before-apply required? [Dependencies, Spec FR02; Plan]
- [x] CHK004 Are rarity, cost, consumption, spatial and prerequisite inferences explicitly excluded without support? [Completeness, Spec FR03]
- [x] CHK005 Are separate catalogs, aliases and artwork rights preserved? [Consistency, Spec FR02–03]

## Failure, safety and sequencing

- [x] CHK006 Does DMZHub failure preserve old data without bypassing access or guessing floors/positions? [Edge cases, Spec FR04/Acceptance]
- [x] CHK007 Are available floors, stable source identities and repeated import comparisons included? [Coverage, Spec FR04]
- [x] CHK008 Are schema/calculation/readers, negative cases and independent review required for changed behavior? [Coverage, Spec FR05; Tasks T005]
- [x] CHK009 Are owner-profile writes/restoration, physical testing and recovery excluded consistently? [Consistency, Spec FR01/06; Tasks completion]
- [x] CHK010 Must a research-driven code repair acquire a concrete reproduction, exact scoped task and reanalysis before implementation? [Dependencies, Plan; Tasks T002]
- [x] CHK011 Is the concrete key-rarity batch restricted to exact canonical keyId/mapId and explicit provider rarity evidence, with missing-only updates, dated/hash provenance, conflicts preserved and no glyph-as-photo substitution? [Clarity/Coverage, Plan concrete first batch; Data model; FR02–03]

## Notes

Assessed against the initial and updated uncommitted planning artifacts on HEAD `14ca242bbcb6afe56c7be1b0e296ec247b9182c4`. [Analysis](../analysis.md) records exact-key batch reanalysis, coverage and limits. All11 criteria pass for requirements quality. Actual source/game facts, implementation and acceptance remain unverified by this checklist.
