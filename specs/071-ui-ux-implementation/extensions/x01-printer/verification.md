# Verification

Source: GameRant, MW4 DMZ: How to Print Legendary Materials, published 2026-11-06. Retrieved HTTP 200 and parsed inertly; nine recipe rows normalized with ingredient quantities. Raw source evidence remains private under .local/x01/. No article artwork or prose imported.

- Targeted runtime checks: 25 passed, zero failed (.local/x01/runtime.log).
- Chromium, Firefox and WebKit X01 browser journeys passed: nine recipes/five groups, links, location disclosure, no craft controls, unchanged saved inventory, 390px overflow check, clean runtime diagnostics. Logs: browser-final.log, firefox.log, webkit.log under .local/x01/.
- Existing upgrade checklist/needed-item color regression passed (upgrade-regression.log).
- Desktop and mobile Chromium screenshots visually reviewed; tables wrap within the viewport.
- Python repository checks: zero failures. Formatting and whitespace checks passed before final test-runner adjustment.
- Initial full suite with CPU-count concurrency hit the Windows build subprocess deadline under load; the known-failing run was stopped through its verified process tree. No deadlines, assertions or fixtures were weakened. package.json now limits test-file concurrency to four; final result pending below.

Canonical FOB recipe count remains 95. X01 recipes are references, not executable crafts or automatic FOB ingredient forecasts. No carried-backpack inventory is inferred from saved stash quantities. Exact X01 map coordinates, output yields and unlisted effects remain unverified.

Final complete runtime suite: npm test, 867 passed, zero failed/skipped/cancelled (251165ms); evidence .local/x01/bounded-runtime.log. Final formatting passed and Python checks reported zero failures; git diff --check passed with only line-ending notices. No assertions, fixtures or deadlines changed.

Final modern build succeeded: 1516 independent HTML routes plus 404. Post-build Chromium journey passed (.local/x01/browser-final-build.log). An immediate post-resize overflow check transiently failed once and passed on rerun; the test now waits two animation frames before asserting the same zero-overflow condition, and passed again. No production layout change or assertion relaxation. Final build/FOB inventory behavior unchanged.
