# Validation quickstart

## Use the implemented branch

Run the ordinary reader setup (`npm ci`, `npm run build`, `npm start`) from this feature-branch checkout. Open `http://127.0.0.1:4173/progression/?pack=observed%3Aupgrade-review-20261026`, or select **Observed upgrade requirements · build unverified** in the content chooser. Inventory and Planner share that selected per-pack profile. This is a local branch build, not a deployed site.

For an older profile, export its private backup first, then use Settings → **Preview upgrade progress migration** → review → **Apply replacement** or **Cancel**. The original saved profile remains recoverable. Complete/Undo never changes stock; consumption and readiness gates remain unknown. See [acceptance](acceptance.md) for exact tested source and limits.

## Historical planning verification

The following initial planning commands remain useful; implementation evidence is now recorded in acceptance.md. From the repository root with feature023 selected:

```bash
python3 scripts/select-feature.py 023-character-upgrade-planner
.specify/scripts/bash/check-prerequisites.sh --json --require-spec --require-tasks --include-tasks
python3 scripts/check.py
python3 -m unittest discover -s tests -v
npm test
npm run build
git diff 407fa56afa43104c3342f4ed73b800f292bacf33..HEAD --check
```

At the planning checkpoint these commands checked artifact wiring and unchanged baseline behavior. On implementation source they exercise registered runtime behavior, but do not replace the browser/Studio/accessibility gates below. Review [source inventory](source-inventory.md), [progress contract](contracts/upgrade-progress.md), [advice vectors](contracts/keep-recommendations.md) and traceability. Keep `.specify/feature.json` machine-local.

## Implementation environment and gates

Node22.x or24.x; `npm ci`; supported Playwright browsers per repository setup. Existing documented aggregate/release checks:

```bash
npm run format:check
npm run check
python3 -m unittest discover -s tests -v
npm run test:browser
npm run test:engines
```

Register the new browser file in the existing harness before relying on these commands. Add deliberate failing fixtures briefly to confirm discovery, remove them and rerun. Record exact head/runtime/platform/exit codes; mark blocked or never-run gates honestly. Existing passing suites do not verify a missing feature. Also run `npm run test:studio` for the actual v1/v2 Studio guided/advanced-JSON/save/restart/export/reimport journeys, not merely the generic editor path.

## Manual acceptance journeys (synthetic state only)

1. Select observed pack: eight definitions, required rows, source observation/review metadata, unknown build/prerequisites/consumption, no prefilled holdings. Check exact “to” versus “by” effects.
2. Edit the same upgrade state from /inventory and /progression and confirm a single state. Mark availability available while completion unknown: record stays not marked complete. Mark completed; verify stock/reserve/goals unchanged and reminder; reload, undo and repeat clicks.
3. In a clearly synthetic compatible pack with mechanics/prerequisites verified, run A01–A20. Set stock blank/absent vs explicit0, deliberately clear it, cancel/save/page/reload, and assert dirty tracking preserves presence; test fixed reserves above stock, collect-to-target recompute, enough stock and a shared prerequisite. Route-aware crafting stays separate from direct-only advice. Reconcile totals and contributor rows.
4. Switch All-known/Focused and item detail; confirm focus goals unchanged, Keep remains when Search0, pin remains after completion, no safe-to-sell language or invented location.
5. Preview v1 migration with each legacy state; ambiguous unlocked requires review. Cancel then commit, restore original snapshot. Preserve non-upgrade progress and existing single/shared behavior.
6. Change content cost/version; preview rebind, preserve completed identity and pins; new tier remains unknown. Reject malformed/oversized/cross-pack backup. Trigger quota/stale-tab conflict and preserve draft/previous state. Navigate/close/cancel during pending UI actions; stale confirmation cannot mutate another pack.
7. Keyboard-only,320px/390px,200%text, light/dark, reduced motion, visible focus and labels. Verify spoiler uses do not leak through item totals/counts/search/reasons. Use synthetic fixtures for any saved screenshots.
8. Measure50 warmed advisory recomputations at supported bound; report p95, exact environment and over-limit behavior. Check native catalog/progression/inventory/planner/editor/backup and unrelated map startup still work.

Real-data exact known-cost allocation stays disabled for affected unknown quantities/consumption/stock. Missing prerequisites/tiers or unverified live build allows qualified partial observed direct-cost totals but never readiness/current/exhaustive claims, even if every synthetic test passes. Independent review and authorized implementation/convergence are required before any release-ready claim.
