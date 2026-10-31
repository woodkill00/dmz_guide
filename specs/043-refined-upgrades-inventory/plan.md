# Implementation plan — compact lists before more features

## Observed current state
Reviewed the native /inventory/, /progression/ DMZ-upgrades, /items/ directory and shared upgrade-advice/spending controllers. Inventory uses one large fieldset/panel per item, with sequential Owned/Clear/Reserve controls. Progression renders every description, prerequisite, effect and source block inside each upgrade card. Search and50-row windows already exist: retain and refine them, do not present them as new.

Read-only isolated Chromium review at1440x1000 using observed:upgrade-review-20261026, after catalog load and two paint frames: first inventory page50rows, first3 fieldsets306px each;28upgrade cards, first3 heights1907/1907/1939px. These are fixture/current-content measurements, not universal row heights or complete game counts. Original screenshots ignored in .local/nav-repair/design-*-sourced-current.png.

## Chosen interaction model
Inventory is 'what I have'; Upgrades is 'what I need next'; Items remains 'what exists and what uses it'. Add a focused /upgrades/ page backed by the existing progression controller/profile, not a copied data store. Keep Progress for the other tracks and existing links. Shared nav/Sitemap includes the new page when implemented.

Both lists use a single compact row plus an optional inline full-width Details expansion (one open at a time). Do not add a side drawer/nested modal stack in the first slice. Name remains a real exact-record link; Details expands requirements/reasons without navigating. Purchase/status confirmations use the existing native dialogs and controller guards. Position of numeric controls does not move during updates. Units and catalog scope remain explicit.

Inventory columns: Item | Owned | Reserve | Needed | Missing | Details. Unit/category under name; available/kept-for explanations in expansion. Owned steppers are draft actions, not boss-style autosave. Not entered is distinct from0. Save/Cancel bar retains existing batch persistence. Draft-derived advice is labelled as a preview, disabled when invalid; purchase stays blocked until saved.

Upgrade columns: Upgrade/tier | Manual status | Known requirements | Blocker/readiness | Track/Details. Coverage is explicitly known requirements, not an invented full-cost percentage. 'Unknown price' remains visible even if all known material lines are met. Manual completed does not manufacture spending history. Colors support text badges; keep dark/light tokens, modest accents, tabular numbers and restrained separators rather than repeated boxed cards.

## Build order
1. Shared row/stepper/status/expansion design and minimal synthetic prototype. Agree visual hierarchy; validate mobile/200%text and both themes before wiring mutation controls.
2. Inventory vertical slice: adapt existing createInventoryDraft/filterInventoryIds/inventoryPage/profile controller, preserve50-row bound, raw draft identities/validation, Save/Cancel/CAS/export recovery. Add compact needed/unknown filters and source-safe derived columns using canonical planning engine. Preserve current page/filter/anchor on save.
3. Focused Upgrades page and compact upgrade rendering, reuse progressRows/upgradeAdvice/shared-plan/spending controllers. Wire existing confirmation flows; /progression/ compatibility and all other tracks remain reachable. Register new route in shared navigation/Sitemap and coverage tests.
4. Align Keep/Search and all-item directory styles/links; expose exact 'used by' context and verified location references without syncing guide/map stores. Move secondary diagnostics/history below lists while keeping warnings visible.
5. Regression/visual/capacity review, analyze/fix cycle, independent implementation approval, local preview. No production completion claim from this planning package.

## Ownership and touched areas (future work)
Shared primitives/styles: src/styles.css and small reusable client/view module if reuse merits it. Inventory: src/ui/private-pages.mjs, src/client/profile.mjs, src/client/inventory-window.mjs. Upgrades: src/ui/progression-page.mjs/newfocused-route component, src/client/progression.mjs, src/client/upgrade-advice-view.mjs. Reuse domain modules without changing arithmetic: src/domain/shared-plan.mjs, upgrade-advice.mjs, upgrade-progress.mjs, upgrade-spending.mjs. Navigation: src/ui/site-navigation.mjs/navigation-page.mjs/build route registration. Existing spending contract in specs/023-character-upgrade-planner/contracts/upgrade-spending.md remains authoritative.

## Verification before shipping
Capture comparable current/proposed screenshots with same catalog, viewport, theme and state. Check closed-row heights only on bounded representative fixtures; long names and larger text may expand. Test actual fixed-coordinate clicks and keyboard focus, not only values. Cover raw invalid and blank stock,0, reserve>owned, mixed units/currencies, shared needs, filtered/offpage drafts, empty/no results, missing imagery, source/version changes, spoilers and changed eligibility.

Run all affected inventory/progress/spending/domain/browser checks, native guide unit/build/check/format, shared navigation coverage and three-engine journeys. Test5000-item catalog with existing50-row window; retain existing performance budgets (record before/after, no arbitrary tolerance increase). Verify failed saves/purchases remain exportable and no duplicate debit/automatic refund occurs. Actual phone/screenreader/gameplay checks remain separate until performed.

## Boundaries
Plan only. No new catalog collection, source claims, automatic stock spending, cross-app sync, per-row autosave, bulk discard/sell or game actions. Advanced bulk tools and a unified cross-app data layer are deferred, not prerequisites for a clean first release. Feature041sharedgame-board starter order is still pending owner sequence and unrelated to this redesign.
