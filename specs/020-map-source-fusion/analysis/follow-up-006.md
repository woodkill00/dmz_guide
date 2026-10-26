# Name AND location matching correction

2026-10-26. User clarified that duplicate suppression requires both marker name and map location. T025 supersedes the earlier facility-proximity exception and singular/plural inference from follow-up005.

Added a regression first and reproduced the failure: differently named police markers at the same point were suppressed. Removed all proximity-only facility matching. Names now use nonempty Unicode NFKC/case/punctuation/whitespace normalization only; different words/plurals and distinct non-Latin names remain separate. Existing24px canonical distance, category compatibility, known floor/build exclusions, same-source preservation and official-first fallback remain. No source data is modified.

46 unit tests and strict production build passed. Regressions cover different names at identical coordinates, plural changes, matching names farther apart, harmless case/spacing differences and distinct Chinese names. Independent focused review found no remaining findings. Browser result is recorded in verification.md after execution. The narrower rule introduces no new acquisition/export behavior.

Actual private capture calculation:370 shown from543 raw records,173 copies hidden under the stricter name-plus-location rule. Previous245/298 figures are historical behavior and no longer describe the current display. Source data remains complete and the inspection switch restores all selected copies.

Read-only artifact assessment found the updated specification, T025 and implementation consistent; no further convergence task is required. Reviewer-owned checklists remain unchanged.

Final correction verification:46 unit tests and strict build passed;33 browser groups passed2026-10-26T21:42:18Z with0 runtime errors and0 external requests. Actual local browser showed370 selected markers with all four source controls available. T025 complete.
