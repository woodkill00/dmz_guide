# Card reflow verification

Completed locally on 2026-11-27. No storage migration or game-data changes.

- Before-change reproduction: test-results/109-card-reflow-before.log records the missing separate controls row.
- Final `npm run test:cards`: Chromium, Firefox and WebKit PASS (test-results/109-card-reflow-final.log). Covers real weapon cards at 180/220/260/320px, 200% text, long labels, bounded open help, keyboard/Escape, hover descriptions, increment/decrement and saved reload, Dashboard parity, shared item cards, and dark/light scoped accessibility checks. Screenshots are in test-results/card-reflow/.
- Existing extraction, prestige and camo browser regressions: all three engines PASS in test-results/109-card-reflow-extractions.log, 109-card-reflow-prestige.log and 109-card-reflow-camos.log.
- Affected runtime tests: 10 passed, zero failed/skipped (test-results/109-card-reflow-runtime.log).
- Guide build: 2277 routes plus 404 (test-results/109-card-reflow-item-wrap-build.log). Map bundle rebuilt successfully after the shared CSS change.
- Final UI audit passed: 36 stylesheets, 863 raw layout declarations, 423701 CSS bytes within the unchanged 423763-byte budget. Full formatting check and git diff whitespace check passed.
- Independent source and visual review accepted the bounded repair; see review.md.
- `node scripts/local.mjs --skip-build` confirmed the current unified site already running at http://127.0.0.1:4173/. Weapons are at /armory/ and the Dashboard at /.

The new browser regression is also wired into the existing three-engine focused CI job. GitHub CI has not been run for this uncommitted repair. Physical touch devices are not included in desktop engine evidence. Help uses native hover titles and click/keyboard disclosure; Escape, repeated summary activation and another card action dismiss it. This does not promise document-wide outside-click handling.
