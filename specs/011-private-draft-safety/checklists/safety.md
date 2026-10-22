# Reviewer-owned requirements quality: draft safety
- [x] CHK001 Are dirty baseline and exact invalid-value retention semantics defined consistently? [Clarity, FR-001, FR-002]
- [x] CHK002 Are Save/Discard/Stay, repeat intent and save-error transitions fully specified? [Coverage, FR-002, FR-003]
- [x] CHK003 Are native unload limitations distinguished from in-app decisions? [Clarity, FR-004]
- [x] CHK004 Are pre-module startup and load-failure action states defined? [Completeness, FR-005]
- [x] CHK005 Are both export validation, filename and non-guarantee semantics specified? [Consistency, FR-006]
- [x] CHK006 Are keyboard/focus and exact-head independent validation requirements measurable? [Measurability, FR-007, SC-004]

## Independent review

Reviewed by independent requirements/source reviewer on 2026-10-22 against spec, plan, tasks, research, data model and UI contract. CHK001–006 approved for requirements quality only. Repeat intent is first-wins with further departures ignored while deciding/saving; exact raw reversion and dirty export status are now explicit. No production implementation, browser execution, visual, CI or merge approval is implied. Baseline reproduction must precede production repair; exact-head implementation review remains required.
