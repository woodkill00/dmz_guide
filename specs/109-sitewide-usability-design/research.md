# Research and repository assessment

Planning evidence collected 2026-11-26; all measurements are current local observations, not universal UX benchmarks or acceptance tests.

## Existing foundations

- `src/ui/layout-tokens.css` already defines calc/clamp gutters/gaps/padding and minimum controls. Extend it instead of creating an unrelated token layer.
- `workspace-shell.css`, `compact-navigation.css`, `site-navigation.mjs`, `feature-registry.mjs` and route helpers already implement shell/density/navigation. Inspect and consolidate owners before changing their contracts.
- `item-card.mjs/.css` already centralize item identities/icons and sizes. Use those patterns in remaining cards; preserve the single validated icon hydrator.
- Companion maps use distinct theme/workspace/sidebar/popup styles. Shared guide tokens alone cannot establish map coverage.
- Existing runtime, sitewide workflow, home accessibility, topology, map, tracker, weapons and recovery browser suites are useful regression owners, not evidence that this new design already passes.
- Current checkout is feature/108-unified-weapons with extensive uncommitted prior work. Preserve it. Feature109 is planning only; implementation needs an isolated reviewed starting point.

## Static observation

A recursive source inventory of `src` plus `tools/hajin-map/src` found 35 CSS files, 195 calc occurrences and 64 !important occurrences. Main `src/styles.css` contains 4492 lines at assessment. Counts are rough text matches, not parsed semantic defects; repeated selectors and font/control rules need ownership analysis before removal. Regenerate these numbers for the implementation baseline.

## Local page observation

`test-results/109-planning-baseline.json` records16 read-only page observations in isolated fresh Chromium contexts,390and 1440wide,250mssettle. All8sampled destinations returned200 and matched document/viewport widths in those snapshots: Home, Inventory, upgrades, Orders, armory, keys, Hajin and X01. This does not prove complete reflow, readiness, populated states or interactions.

DOM inventory includes hidden controls: Inventory308 buttons, Orders191 details, keys207 details and armory210 buttons in these snapshots. These figures motivate review of disclosure/filter/mount strategy; they do not prove every control was visible or should be deleted. No actual user browser profile was used.

## Primary platform references

- [MDN calc](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/calc): use arithmetic to combine layout quantities; this is a value calculation, not an automatic responsive-layout solver. Match units and keep expressions valid.
- [MDN clamp](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp): bound fluid values with meaningful minimum/preferred/maximum sizes. Pair with calc-backed tokens and intrinsic layout rather than forcing every property into artificial arithmetic.
- [MDN length/viewport units](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/length): distinguish dynamic viewport sizes from fixed assumptions about mobile chrome; retain fallbacks and test actual keyboard/viewport behavior.
- [W3C Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): plan320 CSSpx-equivalent reading without lost content/functionality; scope necessary2D map/table exceptions to their own region, not the whole page.
- [W3C Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html):24 CSSpx AA minimum with defined exceptions; this product should prefer44 CSSpx touch/primary actions while reviewing compact repeated controls individually.
- [W3C Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum): sticky/overlay content must not fully hide keyboard focus. A simple overflow assertion is insufficient.

These inform the plan. They do not establish WCAG certification, physical-device compatibility or app test results. No new gameplay/provider data was collected.
