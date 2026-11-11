# Implementation tasks

- [x] T1: Import nine source-reported X01 recipes into a bounded, validated reference; preserve existing item IDs and add seven missing items transactionally.
- [x] T2: Add the dedicated X01 page and separate Collection section with grouped recipe tables and carried-material context.
- [x] T3: Connect Recipes, Needed, FOB, feature navigation and related item detail pages.
- [x] T4: Verify source parity, malformed data rejection, inventory preservation, browser navigation, mobile layout and existing upgrade/color behavior.

Analysis/fix cycle: separated X01 reference data from the 95 executable FOB recipes to avoid incorrect inventory/access forecasts; bound item names through explicit aliases; corrected access wording to avoid an unsupported claim. Desktop and mobile screenshots reviewed. Three browser engines passed. Full runtime verification is recorded in verification.md.

Test-runner follow-up: default CPU-count parallelism reproduced a Windows build subprocess timeout. Bound test-file concurrency to four without changing test assertions, fixtures or subprocess deadlines; rerun the complete suite.
