# Architecture and implementation plan

## Ownership and dependencies

Reuse `src/client/common.mjs` for selection, loading and save state; the context helper only moves existing DOM and observes presentation state. Keep `pack-select`, `pack-note`, `save-status` and error IDs, exports, draft guards and unavailable-catalog behaviour. Remove long tracker summary wording rather than introducing a second selector or new preference store.

Keep `src/ui/render.mjs` and the shared item summary/source helpers as the sole native/private reference renderer. Introduce an explicit item-shell helper rather than styling every global panel. Private `/local/` supplies its existing profile-aware actions and validated picture resolver; the native page supplies authored repository links. Reuse current item icon hydration, `build-target-control`, `build-target-controls`, collection budget, blueprint logic and source/loot-reference IDs. Data, images and state remain in their existing stores.

Use an item view projection to assemble identity, display categories, supporting notes, source labels and typed relationship groups once. Keep canonical catalog records unchanged. Display category aliases can normalize spelling/plurals; they cannot merge the items or replace source facts. Directory projection and detail projection share display helpers.

Section navigation should use ordinary fragment links initially. It preserves browser back, source deep links, reading without JavaScript and discoverability. If tabs are later used, implement roving tab index, arrow/Home/End keys, aria-controls/selected, deep-link restoration and visible errors outside hidden panels. The concept demonstrates the section grouping; implementation should choose navigation only after native/private tests agree.

## Delivery slices

0. Immediate compact context: all common-reader pages; keep healthy status accessible but visually unobtrusive; preserve visible errors/drafts/fixture labels. Test switching inside the disclosure, denied switches with dirty forms, backups and unavailable selection. This slice can ship independently of the redesign.
1. Item shell: icon/title/summary/actions and consistent native/private item heading. Dedicated `/local/?id=` should focus on the selected item; retain library navigation as a breadcrumb/link. Data version/coverage moves to context/evidence, not the hero. Prove screenshots before touching other pages.
2. Core sections: scoped shell CSS, anchor navigation, shorter metadata, collapsed source notes/evidence and grouped uses. Integrate existing editable loot-type pages and pictures. Keep source disagreement and all measured stats accessible.
3. Profile actions: compact owned/build/blueprint controls using existing write owners. Required/missing figures use current models. Verify real Add/save/cancel, source version review, reload and return-to-item navigation.
4. Directory: searchable category/type grouping, stable compact rows and exact item links; preserve fixture/archive distinctions and current catalog context.
5. Validation: visual, interaction, storage and accessibility evidence; inspect representative long/short/no-data/photo/weapon/blueprint pages in both themes and browser engines. Correct issues and rerun only affected checks until resolved.

## Design rules

Use shared spacing/type/density variables, not per-page pixel fixes. Main width: `min(100% - 2 * pagePadding, maxContentWidth)`; responsive padding and text via calc/clamp; grids via minmax. Avoid fixed absolute coordinates, universal CSS overrides, oversized floating menus and multiple sticky surfaces. Keep one clear primary action per group and a stable place for save feedback. Never truncate a count or essential item name.

Retain game artwork only through existing validated local assets; fallback icons explicitly indicate missing art. Photo primary/additional behaviour uses Content Studio and current raster limits/recovery; the visual redesign is not a new image storage feature.

## Rollout and recovery

Work in the active feature extension; keep old data/store contracts. Apply shell changes behind an item-specific class and verify native/private parity before broader styling. Small reversible code slices, source snapshots and normal profile backups remain available. No automatic data migration is necessary for a presentation-only redesign. Do not restart a live author server with potentially unsaved work just to refresh its preview renderer; communicate that process requirement separately.


## Review artifacts

- Read the [specification](spec.md), [implementation queue](tasks.md), and [analysis with executed evidence](analysis.md).
- Clickable local concept: http://127.0.0.1:4180/ (preview.html, separate from the live site).
- To run the persisted concept later: `node scripts/serve-item-design.mjs 4180`.
- Concept includes item detail and compact directory views. It uses illustrative art and explicit preview-only values, without reading or writing saved player data. Links labelled as live pages open existing site pages.


## Implemented ownership and IP-8 extension

`src/ui/item-workspace.mjs` and its scoped stylesheet provide the native/private item shell. `src/ui/render.mjs` supplies canonical detail/claims/evidence once, while `src/client/item-workspace.mjs` reads existing profile state and reuses Inventory's upgrade/mission projection for Needed/Missing and blueprint grants. Inventory is the exact-item edit destination; additional build controls retain their existing save owner. The private reader hides only the focused item's generic library hero, preserves non-item heading levels and validates repository destinations against the published catalog. `/editor/?pack=…&record=…` selects an existing exact private record without writes. Specialized gunsmith/map layouts retain their own surfaces.

The item directory retains its existing paging/search/sort/history owner. Display categories reuse `itemSection`; category filter choices occupy the existing validated type-filter namespace. Local icon hydration remains byte/hash/MIME/dimension checked, supports exact-pack directory rows and cleans up before navigation. Unmapped catalog items keep explicit image-needed fallbacks.

IP-8 adds `src/domain/item-map-areas.mjs` and its renderer. Associations come from explicit IDs or full named-area mentions in retained item reference text; they do not change catalog records or assert coordinates. Hajin buttons open the existing map Explorer with a bounded literal area query. A native exact-location fallback remains available. The map parser rejects duplicate, blank, oversized and control-character area values; search text is quoted and rendered as text. No layer masks or persistent map selections are rewritten.
