# Independent implementation-scope review — 2026-10-28

## Verdict
Focused content/domain regression review PASS. **Overall release acceptance remains incomplete:** this review does not substitute for actual browser journeys, screenshots, full aggregate checks or remote CI. Publication and merge remain separately authorized actions.

## Reviewed
- `tests/runtime/sourced-catalog.test.mjs`
- Adaptations to `tests/runtime/upgrades-content.test.mjs` and `tests/runtime/upgrades-spending.test.mjs`
- `docs/quickstart.md` and `docs/content-contributing.md`
- Actual catalog and source evidence separately reviewed in `002-source-data-review.md`.

## Independently executed
`node --test tests/runtime/sourced-catalog.test.mjs tests/runtime/upgrades-content.test.mjs tests/runtime/upgrades-spending.test.mjs`

Result: 27 tests passed, zero failed/skipped, exit 0. This is a focused run, not the full repository suite.

## Findings
- Original 8/31/22 assertions now deliberately select the preserved observation subset, while new tests assert expanded counts and unknown-price rows. This does not replace the original eight definitions with a weaker aggregate assertion.
- Six original fully known direct-cost upgrades remain recordable; the two newly explicit unknown cash prices refuse atomic purchase recording. New unverified-consumption tiers also refuse. Refused candidates leave player state unchanged.
- Historical Vendor I and MIA III entries retain their original spending snapshots and inventory through content rebind. Duplicate purchases remain blocked after status correction. A review flag initially blocks reversal; explicit confirmation of unchanged completion permits reversal under the existing exact-state safeguard, without rewriting the original event.
- New recipe and level records use progression rather than purchase tracks. No executable recipes, implicit prerequisite conjunctions, automatic inventory grants or fabricated historical spending are introduced.
- Reference aggregates are separated from personal Keep/Search. Unknown source-only consumption correctly withholds affected exact personal quantities.
- Documentation explains backup/rebind, source uncertainty, corrected unknown prices, manual progress and retained history without claiming current-build verification or deployment.

## Outstanding verification
- Browser tests are being authored separately. They must actually run before being counted as passed, including item/upgrade/recipe/level/source navigation, mobile claim wrapping, spoiler disclosure, and rebind/manual-progress behavior.
- Full repository/schema/runtime/build/format results and any platform/browser limitations belong in acceptance; this focused review does not certify them.
- Any subsequent change to reviewed content/tests requires affected recheck.
