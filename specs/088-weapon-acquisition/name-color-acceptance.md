# Weapon-name progress colors

## Current correction — 2026-11-20 / T018

An owned manual with explicit0/3 is now yellow. Unchecked ownership with0 stays red;1–2 stays yellow;3+ stays green; an absent/unrecorded count remains neutral. This supersedes only the owned-zero-neutral interpretation in the initial T017 record below. No saved values, CSS palette, schema or source facts change.

Current focused receipts: existing acquisition runtime5/5 PASS (`088-owned-zero-runtime.log`); real acquisition/browser adverse journeys Chromium/Firefox/WebKit PASS with `--engines --a11y` (`088-owned-zero-browser.log`), including actual owned0 yellow→unchecked0 red→owned0 yellow colors in both themes, all earlier count/reload and mobile/axe safeguards. Build2108 routes plus404 PASS; format PASS and repository0 failures (`088-owned-zero-build.log`, `088-owned-zero-format.log`, `088-owned-zero-repo.log`). Reader4173 serves the current build. Tests use isolated synthetic armory data, not the owner's saved inventory. Independent T018 review is in `name-color-review.md`.

## Initial T017 acceptance — historical

2026-11-19 owner display amendment / T017. Implemented on the existing acquisition route; earlier088/093/094 aggregate receipts remain historical.

Name color follows saved observations: explicit0 plus unchecked Manual owned → red;1–2 → yellow;3+ → green. Absent counts remain neutral/unrecorded; checked ownership with explicit0 stays neutral. Existing count/ownership wording remains available independently of color. This transient row state does not write storage on load, infer ownership, cap counts, change schemas or affect blueprint names.

`src/client/weapon-acquisition.mjs` derives state during existing sync. `src/ui/weapon-acquisition.css` applies theme-specific colors only to each weapon's summary name. Existing save/reload/filter/focus behavior is preserved.

Executed local receipts under ignored `test-results/`:

- `node --test tests/runtime/weapon-acquisition.test.mjs`:5/5 PASS; zero failures/skips/cancellations (`088-name-colors-runtime.log`).
- `node tests/browser/weapon-acquisition-run.mjs --engines --a11y`: Chromium/Firefox/WebKit PASS, including exact rendered colors in both themes, unknown/owned-zero/red ownership toggle,1/2/3/4 and reverse transition, reload,320–1920px/200% text, dark/light axe with all three color states visible. Existing dashboard/workbench/backup, quota/retry/stale writes/corrupt/denied-storage checks also pass (`088-name-colors-browser.log`). Uses isolated synthetic private records; no owner's saved data edited.
- `npm run build`:2108 routes plus404 PASS (`088-name-colors-build.log`). Existing reader4173 serves the rebuilt files.
- Format PASS and repository0 failures (`088-name-colors-format.log`, `088-name-colors-repo.log`).

Independent scoped planning/source/test receipt acceptance is in reviewer-owned `name-color-review.md`. Final consistency/convergence finds no additional unbuilt work for this name-only display request. No new full aggregate/package/remote-CI execution, commit, merge or deployment is claimed.
