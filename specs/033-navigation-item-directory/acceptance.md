# Acceptance evidence
Status: local source/domain verification passed; integrated browser/visual/CI gate OPEN.

2026-10-29: `npm run check` passed repository/schema validation, 600 runtime tests with one Windows-only skip, and 216 generated HTML routes. This final local aggregate includes the navigation-context regression and authoritative record-pack precedence.
`python3 -m unittest discover -s tests -p 'test_*.py'`: 40 passed. Expected owned-server interruption diagnostics were exercised by the suite, not unexplained test failures.
`npm run format:check`: passed. Focused navigation, author-target and reader-flow tests passed after extending the existing VM mock for an optional sort control; the original assertions were retained.

Actual local browser stages: NOT RUN. Chromium launch failed before assertions because its singleton socket was forbidden by the sandbox. The authorized escalation then failed runtime setup with a read-only filesystem error. No browser sandbox or source security policy was weakened. The first throwaway launcher also used the wrong cleanup method; it was corrected to the documented owned-server `stop()` before the explicit launch failure was recorded.

New browser journeys are wired into Chromium and Firefox/WebKit suites and local Studio acceptance. They cover search/filter/sort/empty state, all-pack scope, 320/390px at 200% text, exact author links, nondefault pack navigation, conflicting detail query, external-map separation, no-JavaScript reading, reference-blocked removal, cancellation/focus, unsaved draft preservation, and unreferenced draft-only removal. Writing/wiring these scenarios is not evidence that they passed.

Independent design and source review are recorded in reviewer-owned checklist/analysis files. Physical touch devices, assistive technology certification, live game data and deployment are not claimed. Parent integration must run exact-commit CI, inspect browser artifacts and record post-merge checks before declaring delivery complete.
