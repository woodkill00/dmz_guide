# Implementation plan

## Architecture and invariants

Keep static guide generation, existing client controllers and the map companion app. Share presentation contracts, not persistence owners. `src/ui/layout-tokens.css` owns the spacing/type/geometry vocabulary; guide `workspace-shell.css` and map theme adapters consume it. Existing `item-card`, navigation registry, route helpers, recovery controllers and source-icon hydrator remain authoritative.

A presentation refresh cannot call a write API, clear a draft, replay a committed operation, alter recipe/upgrade/order/camo/manual counts or reset map selection. Styling changes must not invalidate hashes, map registration, custom SVG sanitization or image validation.

## Calc-backed responsive contract

Illustrative target contract, not installed CSS:

```css
:root {
  --ui-space-unit: 0.25rem;
  --ui-space-2: calc(var(--ui-space-unit) * 2);
  --ui-gutter: clamp(0.75rem, calc(0.5rem + 1vi), 1.5rem);
  --ui-gap: clamp(0.5rem, calc(0.4rem + 0.3vi), 0.875rem);
  --ui-viewport-block: 100vh;
  --ui-available-inline: max(0px, calc(100vi - var(--ui-gutter) * 2));
  --ui-pane-inline: clamp(14rem, calc(var(--ui-available-inline) * 0.24), 26rem);
  --ui-overlay-inline: min(34rem, calc(100vi - var(--ui-gutter) * 2));
}
@supports (height: 100dvh) {
  :root { --ui-viewport-block: 100dvh; }
}
.bounded-tool {
  inline-size: var(--ui-overlay-inline);
  max-block-size: max(0px, calc(var(--ui-viewport-block) - var(--ui-top-offset) - var(--ui-gap) - env(safe-area-inset-bottom, 0px)));
}
```

Define `--ui-top-offset` at the owning shell from actual visible header geometry; use measured ResizeObserver-backed custom properties when wrapping changes it. Grid/Flex own ordinary flow; overlays own intentional bounds. Content can grow beyond nominal row height. Prefer rem text and logical properties, preserve browser font preferences, and do not use viewport-only type that defeats text enlargement.

Maintain a property/exception ledger: primitive token constants; hairlines/focus rings; breakpoint/container thresholds; percentages/intrinsic sizes; image aspect/pixel data; drag/map library transforms and world coordinates; vendor styles. Literal calc wrappers are not evidence of compliance. The linter checks approved source declarations/owners, while browser geometry proves the result. Test the feature flag/legacy presentation variants actually shipped; retire an unused variant only through a separate explicit compatibility decision.

Do not add a low-priority CSS layer beneath still-unlayered legacy overrides and assume it wins. Map current selector/import ownership first, then migrate old rules with their consumers. Prefer deleting a proven obsolete override to adding another `!important`.

## Delivery sequence

1. **Baseline and release isolation:** preserve108, create an isolated feature109 implementation checkout after a reviewed checkpoint; regenerate route ownership and CSS inventory. Capture populated/empty/error/draft screens and real readiness signals. Record current store snapshots and exact artifact hashes for controlled fixtures.
2. **Foundation:** token contract, compact/comfortable density, type/spacing scale, control states, layering/scroll owners and geometry guards. Introduce a reference component page covering long names,7-billion cash, missing art, unknown/partial counts and error/recovery.
3. **Shell/navigation:** one registry-driven main menu and consistent secondary tabs/current state. Clean header/toolbar duplication, responsive breadcrumbs and contextual status. Preserve bookmarks and service capability notices.
4. **Tracking:** shared cards/table anatomy across Dashboard, Inventory, Items, Needed, Quick Collect, FOB/upgrades, Orders and weapons. Keep all aggregate-versus-per-build distinctions. Keep all 24+5 order pages discoverable, earliest pending instructions and manual disclosure preferences intact.
5. **Reference and editing:** keys, item/weapon/order/upgrade details, story/audit, photos/recipe relationships and page/content editors. Put tracking near identity; move repeated provenance into optional context. Preserve schema/form validation and drafts.
6. **Map workspaces:** Hajin/X01 floors/Safe/Loot variants; unify bounded panels and Inspector, reclaim terrain, keyboard resize/reorder/reset and safe restored panel positions. Preserve accurate registration, grouping/deduplication and routes, and prove selection survives pan/zoom/save.
7. **Consolidation and final verification:** migrate all remaining management/help/recovery families, remove covered CSS/markup duplication, run full verification tiers and independent implementation/visual reviews. Re-run analyze→repair owning artifact/task→analyze after scope changes.

## Concrete interface work

| Area | Changes to plan and verify |
| --- | --- |
| Global shell | Compact consistent header; retractable main navigation; location/breadcrumb; one search entry; discoverable overflow for infrequent management tools |
| Home/Dashboard | Actionable summaries first; matching item/weapon cards; counts visibly labelled; collapsed completed work; full-roster indexes; bounded section customization |
| Inventory/Items | Aligned category tables, readable quantity cells, sticky names/headings where justified, icon/name variants, filters with clear reset, no duplicate manual tracking |
| Needed/Quick Collect | Consistent required/owned/missing facts; compact build groups; preserve shared-stock explanation; stable Add found controls/Undo and row-exit focus |
| Upgrades/Orders | Current tier/page at a glance; expandable costs/instructions; visible checkboxes; auto-advance with manual override; completed work reachable |
| Weapons | One workspace and detail anatomy; grouped selectors; separate normal/prestige camo lines; manuals +/-; compact attachment/stats panels and explicit unknown data |
| Keys | Numeric/map/location context; dependency links; readable list/detail without nested vertical scroll containers; direct map return |
| Detail/editor | Identity+tracking near top; concise linked recipe/upgrade/mission/location sections; contextual edit/photos; sticky save only when it does not obscure fields |
| Maps | Narrow resizable sidebar; source/category show/hide; stable bounded Inspector; draggable panels clamped/reset; compact route tracker and floor switch |
| Management | Quiet catalog/private/source scope summaries; explicit local capability status; backup/recovery previews and errors remain prominent; no raw JSON/HTML dumps |

## Risks and mitigations

- Broad CSS change breaks saved control IDs/owner logic: migrate family by family, preserve DOM hooks and run real writes with adverse cases before removing old selectors.
- Compactness creates tiny targets/fonts: separate visual density from hit area, test24/44 CSSpx targets and user text settings; review screenshots rather than imposing a smaller global font.
- Sticky headers/panels obscure active input: measured shell offsets, scroll padding, short-height/keyboard tests and dismissible overlays.
- Disclosure/lazy rendering loses state: explicit UI-only preferences, stable IDs and owner-held drafts; no DOM replacement of active edits.
- Drag state restores off-screen: version/bound/reclamp preferences to the current viewport; keyboard recovery and Reset layout always reachable.
- Hidden browser or concurrent tab settles a save during layout work: preserve acknowledged/uncommitted distinctions and canonical monotonic reconciliation, never auto-retry on resume.
- Screenshot changes hide regression: compare fixed fixtures/themes/viewports with pinned engine versions; manual approve meaningful changes and keep failures visible.

## Rollout and completion

Each phase has an independent artifact/test gate and reversible implementation commits; no application-wide CSS replacement in one change. A phase is complete only after its route owners and interactive states pass. Final rollout follows full runtime, guide/map builds, registry/route audits, three-engine journeys, representative screenshots/accessibility and scoped performance budgets. No application implementation or fresh passing-suite claim is made by these planning files.

Map selection boundary: preserve selection during passive terrain/navigation geometry work and noninvalidating repaint. Existing renderMarkers/source/filter/data invalidation and active-edit guards remain authoritative. A design change must not keep stale marker identity after explicit data/source/filter/deletion/context transitions; test the guarded close/review/clear result as well as no flicker on passive pan/zoom.
