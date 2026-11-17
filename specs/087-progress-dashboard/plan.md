# Implementation plan — Progress dashboard

## Technical context
Static HTML builder with browser ES modules, CSS and IndexedDB; Node 22/24; existing runtime and Playwright suites. No new framework, backend, remote provider, or package dependency. Source inventory: `src/ui/hub-page.mjs`, `src/client/hub.mjs`, `src/domain/home-progress.mjs`, `src/domain/build-targets.mjs`, `src/domain/quick-collect.mjs`, `src/domain/item-blueprints.mjs`, `src/domain/armory-workspace.mjs`, `src/storage/summary-read.mjs`, `src/storage/armory-store.mjs`, `src/client/build-collect-view.mjs`, `src/client/quick-collect.mjs`.

## Architecture and ownership
1. A pure `src/domain/dashboard.mjs` produces independently stateful section models from validated selected pack/profile plus optional validated armory data. Delegate calculations to existing modules; add tests before rendering.
2. Keep home routes and hub navigation in `src/ui/hub-page.mjs`. Extract section markup to `src/ui/dashboard-page.mjs`, styles to `src/ui/dashboard.css` and include through the existing build shell. Both presentation variants use it.
3. A `src/client/dashboard.mjs` controller owns loading/refresh generations, disclosures, pagination and add-found draft lifetime. `hub.mjs` retains pins/search/service behavior and delegates dashboard initialization; remove the old overlapping summary writer so two controllers never render the same element.
4. Read with `readExistingRecord` using actual validated store keys; existing readArmory can create a DB, so do not call it for home discovery. Inspect its schema and add a read-existing armory adapter if necessary. Armory keys remain distinct from profile item IDs.
5. Extract or reuse the existing Quick collect save/history operation through a shared action adapter; never copy a second profile persistence protocol. Action input includes pack identity/version, item ID, amount and expected revision. Refuse absent/stale contexts. Persist via the actual repository storage transaction; emit refresh only after commit.
6. Namespaced layout preferences have version 1, at most six known section IDs, boolean collapse flags and one validated pack ID; no inventory values. Denied preferences fall back to session memory. Reuse dirty-draft navigation behavior for catalog switch/leave.
7. Safe icon resolution uses the existing inventory icon loader/bundled assets. View all links go to exact catalog-qualified destinations. Keep the all-features directory behind a single link below the dashboard.

## Layout and flows
Header/search -> compact Map/Guide/FOB/Weapons links -> section anchors and summary strip -> collection grid -> upgrades/Orders -> weapons/recipes -> pins/recent/all-features/service details. Summaries are bounded and expand independently; CSS grid/min()/calc() use existing tokens with intrinsic sizing. No fixed canvas heights or global inline popovers. Every item panel has an explicit close action and a deterministic focus return.

Collection flow: open tile -> inspect name/owned/required/missing -> enter found count -> validate -> save exactly once -> reread committed revision -> update affected sections without replacing focused input/group nodes. Conflicts/quota failures keep the draft and unchanged committed counts. Dirty drafts on background refresh are preserved and flagged stale; retry must reconcile the new revision explicitly, never silently rebase.

## Constitution checks
Pre-design: PASS. Scope is local, provenance stays visible, unknowns stay unknown, schema/store ownership is preserved, tests cover state writes and layout. Post-design: PASS subject to reviewer checklist; no constitutional exception requested. No private fixtures/screenshots in published artifacts.

## Risks and alternatives
Duplicated demand calculations: reject; delegate to domain modules and test parity. Embedding complete tracker pages: reject due to bulk and competing storage writers. New universal store: reject migration risk. Dashboard editing every tracker state: defer; deep links preserve existing completion guards. Preloading armory observation images: reject; extract validated acquisition summary only. Unknown blueprint universe: show recorded ownership with explicit scope.

## Verification and rollout
Implement in task order, first pure projections and zero-write loading, then rendering, then guarded Add found. Add focused runtime/browser tests and regression gates documented in quickstart.md. Run read-only analysis before implementation and independent review after. No production code changes belong in the planning commit. Existing home remains shipped until implementation gates pass.

## Preference controls
Provide small Move up/Move down buttons inside section options, with keyboard equivalents and live reorder announcement, to make persisted section order usable without drag gestures. Collapse and order controls preserve focus. Preferences never contain player inventory or acquisition values.

## Analysis repair design
FR-013 adds an explicit commit/verification lifecycle. Inspect atomic history evidence in T003 before collection writes; never retry a delta whose commit may have succeeded. FR-014 pins Quick collect options and preserves assumed-zero qualifiers. FR-015 bounds aggregate nested DOM, uses replacement pagination, and retains 1500ms read deadlines/abort/close behavior. These supersede any earlier loose phrase about generic failed-save retry or unbounded independent expansion. No data-model migration is approved by this plan.
