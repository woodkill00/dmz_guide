# Location requirements review
Owner: independent reviewer /root/review_dmz_release_quality. Created 2026-10-21. All checks generated unchecked; implementer cannot approve.
- [x] CHK001 Are default real content and explicit fictional opt-in unambiguous? [Clarity, LI-001]
- [x] CHK002 Is map/list parity defined including unknown/outside coordinates? [Completeness, LI-002/003]
- [x] CHK003 Are coordinate origin/axes/version and floor behavior testable? [Measurability, LI-003, data-model.md]
- [x] CHK004 Are keyboard and image-independent details specified for all actions? [Coverage, LI-004/008]
- [x] CHK005 Are provenance and uncertainty fields explicit without spawn promises? [Clarity, LI-005]
- [x] CHK006 Are safe imagery boundaries and editor integration defined? [Security, LI-006, contracts/ui.md]
- [x] CHK007 Is goal relevance constrained to actual relations and unmet need? [Clarity, LI-007]
- [x] CHK008 Are unavailable/stale/empty/context-change states defined? [Coverage, LI-007/008]
- [x] CHK009 Are parent-owned hooks and hosted-browser evidence dependencies clear? [Dependencies, plan.md]

Independent evaluation, 2026-10-21: All9 requirements-quality criteria satisfied after explicit projection formulas/origin pairs, nonzero/x-y/inversion/version tests, defensive out-of-bounds behavior, confirmed shared-plan adapter and retainedMissing/currency exclusion mapping. Requirements approval only; map/list parity, actual raster replacement, keyboard/mobile imagery fallback and hosted-browser evidence remain execution gates.
