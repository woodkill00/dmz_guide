# Independent measured-pagination requirements gate
Reviewer-owned, approved 2026-10-22 after the measured amendment and clarifications. This is requirements approval only, not production/runtime acceptance.

- [x] CHK001 Actual after-index five-sample evidence triggers bounded inventory windowing; changed CPU limitations are explicit and native-picker NO CHANGE is separately justified.
- [x] CHK002 Fixed50 mounted-row maximum, full stable filtering, truthful total/range/page, zero and boundary states, and compatible small inventories are specified.
- [x] CHK003 All-entry raw/checkpoint maps survive unmount, failed saves/exports, Stay and failed Discard; checkpoint advances only after actual save or successful activation/reset/restore.
- [x] CHK004 Synchronous input captures browser-exposed raw strings before unmount; full-model validation covers offscreen entries and no private query/view/page URL or storage writes occur.
- [x] CHK005 Filter and page focus remain stable, boundary aria-disabled handlers no-op, and first-invalid reveal/focus follows explicit failed user operation only; valid storage failure does not reposition.
- [x] CHK006 Requirements FR010–014 map to T015–019 with red unbounded-row reproduction before code, same fixture/timing methods, actual full platform/visual and exact source gates retained.

Production scope is the narrow inventory helper/profile/static page controls plus optional existing draft-guard invalid-reveal callback. No native picker replacement, custom combobox, density mode, schema limits, storage migration or unrelated refactor is approved. Source review must independently verify every Save/export path and raw/checkpoint lifecycle. Actual hosted post-window measurements and normal/200% keyboard/visual acceptance remain mandatory; parent owns merge and exact-main verification.
