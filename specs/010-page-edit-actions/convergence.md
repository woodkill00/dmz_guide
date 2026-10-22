# Convergence record

2026-10-22: evaluated all nine functional requirements, four measurable outcomes, two user stories, architectural boundaries and ten constitution principles after implementation. No hooks installed. No scope expansion beyond the six public groups and necessary location image references.

CONV-001: HIGH, partial FR-001/002 and SC-001. Percent-encoded colon guidance directory did not match decoded public requests. Appended T013 before repair. Implementation now uses the established filesystem-safe colon-to-double-hyphen route convention. Focused regression and full release native-link verification pass.

No additional source behavior gap is identified in this pass. Existing T011/T012 verification and independent release gates remain incomplete; hosted browser acceptance and actual visual review have not run locally and are not a clean release verdict. Continue implementation/verification on those existing tasks, repair any real findings with new traced tasks, then rerun convergence on the final candidate.

CONV-002: MEDIUM, verification harness for SC-004. Initial hosted candidate e2b0eb1 (run39712188482) passed repository/runtime/reader checks and reached feature visual capture after actual record/image workflows. Screenshot readiness incorrectly tried to scroll hidden workbench placeholders. T014 narrows readiness to rendered images only, leaving pixel/decode/health assertions intact. Complete hosted rerun is required; initial run is not acceptance evidence.

CONV-003: MEDIUM, verification harness for SC-004. Candidate c365f61 (run39713362353) reached mobile visual capture, where DOM Range measurements included unpainted descendants of closed disclosures. Artifact inspection confirms New catalog/Where used/Advanced JSON panels were closed. T015 excludes only those unpainted descendants (not visible summaries or open content), improves bounds diagnostics, and exercises opened disclosures. Final rerun remains mandatory.

T016 additionally constrains media-card action buttons to available width with ordinary wrapping for enlarged narrow layouts. No clipping, hidden overflow or smaller text is used. The opened-disclosure matrix must validate this presentation hardening on the next candidate.

CONV-004: MEDIUM, verification transport for SC-004. Candidate70da304 (run39714691750) passed opened-disclosure reflow through the first enlarged narrow view, but Firefox cannot encode a full-page screenshot taller than32767px. T017 replaces oversized bitmaps with complete deterministic tiles plus geometry evidence; assertions and visible coverage must remain unchanged. This is not a release acceptance pass.

CONV-005: MEDIUM, real SC-004 layout gap exposed by opened-disclosure coverage. Candidate70da304 Linux Chrome reports339px document width at320px/200% text, from the Advanced JSON explanatory paragraph's long additions/removals token. T018 adds ordinary overflow-wrap:anywhere to Studio paragraphs, without clipping, removing text or weakening assertions. Full matrix and independent visual review remain required.

CONV-006: MEDIUM, test isolation. Candidate f06a265 (run39715733610) passes the complete new feature journey on both Chrome platforms and Firefox, then existing saved-preview no-build assertion catches the helper's leftover generated dist. T019 tracks/verifies ownership and removes only this test-generated build after closing its reader, preserving the existing assertion. WebKit and complete-suite acceptance still pending; real feature screenshots are available for provisional review.
