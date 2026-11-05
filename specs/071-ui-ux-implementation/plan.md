# Implementation plan: fluid UI/UX

Branch `plan/071-ui-ux-implementation`,2026-11-05. Input:spec.md; design direction070. Planning only: no runtime/prototype code is changed by this feature-plan turn.

## Summary / technical context

Implement in reversible vertical slices: shared tokens/shell/Home → map layout/lifecycle and Safe runs → reference/FOB/boss lists → weapons → authoring/management → final promotion. Retain native static pages, MJS/DOM controllers, TypeScript5.9/Leaflet1.9.4 and current workers/stores. Supported repository Node22/24 and Windows PowerShell/Git Bash. Current root/map Playwright versions remain as installed; no dependency/framework/backend/service consolidation required.

Storage: existing domain databases remain owners. New generic view cache is memory-only; UI preference validation is separate from all player/domain records. No domain schema migration or automatic replay. Shared pure MJS presentation helpers plus `.d.mts` typings are emitted by existing build/Vite adapters, not fetched across local origins. Shared semantic CSS is bundled separately on each surface. Tests: current node/runtime/map suites, synthetic cross-engine browser fixtures and new layout/lifecycle/journey suites, explicit all-target browser identity activation, plus explicitly manual actual-zoom/screenreader/physical-keyboard cases. No performance improvement number is assumed: performance/admission policy in this plan and stress/geometry rules in contracts/layout.md and regression thresholds below.

## Source structure and ownership

- Shared foundation: existing `src/ui/layout-tokens.css`, `src/ui/site-navigation.mjs`, `src/ui/feature-registry.mjs`, `src/ui/compact-navigation.css`, `src/ui/companion-navigation.css`; new `src/ui/presentation-flags.json`, `src/ui/issue-summary.mjs` with `.d.mts` typing, `src/ui/workspace-shell.mjs`, `src/ui/workspace-shell.css`, `src/ui/presentation-state.mjs`, `src/ui/presentation-state.d.mts`, `src/ui/operation-ownership.mjs` and `.d.mts` typing. Helpers coordinate presentation/ownership only; they never write player data directly.
- Build/adapters: `scripts/build.mjs`, `scripts/build-identity.mjs`, `tools/hajin-map/vite.config.mjs`, manager/Studio existing renderers and static servers. Emit allowlisted local assets; preserve CSP and exact source identity, no runtime CDN/import.
- Map: `tools/hajin-map/src/main.ts`, `src/styles.css`, new `src/map/workspace-layout.ts` and `src/workspace/pane-host.ts`; existing `field-toolbar.ts`, `menu-layout.ts`, workspace app/search/field-guide/toolkit/operations/UI-context, safe-run app/style/worker adapters. Path prefix for these map files is `tools/hajin-map/`. Preserve domain workers, geometry/source/dedup logic and stores.
- Catalogs: existing `src/ui/keys-page.mjs`, `key-workspace-view.mjs`, `key-access-view.mjs`, `private-pages.mjs`, `collection-page.mjs`, `progression-page.mjs`, `maps-page.mjs`, `render.mjs` and map `workspace/checklist-ui.ts` (boss directory/counters/order), `workspace/field-guide-ui.ts` (delegating host) and `workspace/toolkit-ui.ts`. New `src/ui/directory-view.mjs`/CSS is presentation, never a second domain model.
- Weapons: existing gunsmith/armory/workbench/codmunity/manager views and styles. Authoring: existing private editor/localreader, Studio page/CSS, source/registration/review/owned-assets modules. Existing package/recovery code retained.
- New checks: `tests/runtime/presentation-state.test.mjs`, `operation-ownership.test.mjs`, `tests/browser/ui-shell.mjs`, `ui-directory.mjs`, `ui-authoring.mjs`, `ui-layout-contracts.mjs`; map tests `tools/hajin-map/tests/ui-layout-browser.mjs`, `ui-lifecycle-browser.mjs`, expanded menu/workflow/safe-run tests. Existing fixture assertions stay intact.

## Constitution gate, before/after design

PASS planning: player tasks drive layout; readable/accessibility/no-JS/native-link behavior is required; unknown/source/*WZ/spoiler facts remain truthful; private state/ports stay separate; imports remain inert/bounded/reviewed; explicit lifecycle and small reversible slices satisfy simplicity and safety. No source collection, account/deployment or asset rights exception. No constitution amendment. Production gates remain unchecked until executed evidence exists.

## Decisions and contracts

- `contracts/layout.md`: intrinsic/height-first allocation, exact mobile states/scroll ownership, error/status slots and intentional overlap exclusions.65%width/70%height are diagnostics, not override rules.
- `contracts/lifecycle.md`: frozen-first intent, save/unknown/recovery states, operation ownership and focus policy, atomic route bindings and current resolved-point guard.
- `data-model.md`: bounded task cache/preferences/intent/operation identities; no player-domain schema changes.
- `contracts/workspaces.md`: required columns, state/feedback/search scopes, precise bulk semantics and authoring ownership.
- `feature-coverage.md`: current77registry entries plus generated-detail families, manager launchers and nested backup owners; mapping to story/task/journey.
- `quickstart.md`: future executable validation commands/cases and declaration of checks not run in this planning task.

Foundation includes the priority/retention-aware issue-summary primitive and tests before any story; later tasks integrate additional owner adapters. contracts/rollout.md defines authoritative flags, effective adapter markers, legacy/modern tests and exclusive fallback. Each surface has a default-off presentation flag; registry routing still reaches existing handler while its adapter is unmigrated. New map shell must not intercept unsupported tools then show blank content: map More/directory resolves exact legacy handler until migrated. Default promotion is per-slice only after its preservation tests pass. Serial ownership for shared modules/contracts/build files; no `[P]` edits to shared files. Parallel work uses isolated worktrees and only the disjoint examples in tasks.md.

## Performance / admission

For declared synthetic fixtures, measure baseline maximum input-to-visible-result and initial DOM count before edits. New presentation cannot increase initial DOM count on equivalent catalogs or load remote UI assets. Use fixed fixture sizes already admitted by each domain; proposed list page default50, optional25/100, full matching count remains exact within existing completeness limits. Filtering is debounced150–250ms presentation work or existing worker, with cancel/version guard; do not impose a new wait on immediate counters/checks. Benchmark action latency with the same fixture/machine20runs, report median/p95 and flag >10%regression for investigation before promotion; timing jitter alone is not silently waived or replaced by a fabricated speedup. Deterministic DOM/control/identity tests remain hard gates. Any justified exception requires written independent review, never a weakened domain limit.

## Delivery and rollback

US1 is independently usable MVP after foundation: compact shell/Home with every old destination available. US2 follows urgently for map obstruction; Safe runs stays distinct. US3–5 adapt remaining families while legacy fallback remains. Each feature slice keeps source flags and previous preference bytes. Rollback disables only presentation flags and restores old adapter; no stock, route, source mask, profile, backup or progress rollback. Unknown writes use existing recovery, never presentation rollback as a substitute.

Hardening is within each story, with final cross-surface/state matrix before promotion. Feature071 may coordinate several child PRs; no huge all-at-once styling merge. This turn produces spec/plan/contracts/tasks/analysis only, with implementation task boxes untouched.
