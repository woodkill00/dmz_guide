Implementation authorized 2026-11-08. See [implementation record](implementation.md) and [verification receipt](verification.md) for shipped scope and evidence; the original proposal below is retained for traceability.

# Page layouts and implementation plan

Status: proposed, not implemented. See spec.md for QE1–QE10 and research.md for evidence. Existing 071 preservation contracts apply. Review this proposal before production implementation; no independent reviewer approval is asserted.

## Shared view

Use the existing five-hub site shell. Directly below it: `Inventory | Weapons | Upgrades | Needed`, current pack/context menu, one-line saved/dirty/error status. A short title replaces the large introductory block. Search, category selector and basic view filter occupy one wrapping toolbar; More filters holds secondary controls with an active-filter count. Catalog/source prose, backup and explanation move into labelled disclosures/Tools while version mismatch and failed-save recovery stay prominent. Source provenance is never removed from detail views.

Desktop wireframe:

    Home  Map  DMZ Guide  DMZ FOB  DMZ Weapons      Search  Tools
    Inventory  Weapons  Upgrades  Needed          [Catalog/context]
    Inventory                            Saved locally / Unsaved edits
    [Search all inventory........] [Category] [Show] [More filters]
    Materials ▾                      29 matching   [Collapse groups]
    icon  Item / rarity              [−] [quantity] [+]   Remaining  Details
    icon  Item / rarity              [−] [quantity] [+]   Remaining  Details
    ... bounded rows and explicit paging ...
    [Save changes] [Discard]          3 edited items (only while dirty)

Do not reserve a permanent empty side panel. At wide widths an explicitly selected read-only inspector may use spare width only after the main list fits; phase one uses inline details to avoid shifting controls. Mobile stacks toolbar fields, keeps names and quantity controls on two stable lines, and expands details in normal flow. No fixed bottom bar covering the software keyboard. Short viewport fallback unpins chrome. Optional icon grid follows named-row delivery and is not required for phase one.

## Page-by-page

| Page | Main action and default view | Secondary information |
|---|---|---|
| Inventory `/inventory/` | Category/type groups with direct count entry; material and weapon-item quantities remain catalog-specific | Reserves, all uses, rarity, edit definition, source and catalog context in disclosures |
| Weapon tracking existing `/armory/workbench/` tracker section | Class-grouped roster; Manual found checkbox; acquired attachment and blueprint counts | Inline acquisition details; links to unchanged gunsmith/detail/build tools. Move existing workbench controls only after its other tabs and deep links are inventoried |
| Upgrades `/upgrades/` | One family row with current tier, explicit Completed checkbox, ready/blocked label and compact material list | Expand other tiers, full requirement math and sources. Existing purchase/spending confirmation stays separate |
| Needed `/needed/` | Searchable material rows with saved/remaining and goal-use counts; update stock via shared inventory editor | Total/next progression, protected reserves and printing alternatives; explicit partial/unknown coverage |
| Recipes / X01 | Link from the shared preparation navigation and item uses | X01 remains a separate carried-material reference; no changes to source semantics |

Quantity on an upgrade requirement means global stock, never local stock allocated independently to that upgrade. If stock editing is requested while another edit is dirty, resolve or preserve the current inventory draft explicitly before a separate completion/purchase operation. Needed uses saved values until Save succeeds; show Unsaved inventory edits rather than silently mixing draft and saved forecasts.

## Architecture and touched-path plan

1. QE1/2/8/9: shared compact tracker renderer/style primitives under src/ui and src/styles.css, using existing workspace-shell/site-navigation/feature registry. Prefer existing routes; only add a canonical weapon-tracker route if existing workbench routing cannot expose the roster without hiding its current functions. Any new URL must register topology/navigation and preserve the old entry point.
2. QE3/4: refactor src/client/profile.mjs inventory binding, inventory-window.mjs and inventory-save.mjs around stable keyed row inputs and one shared raw draft. Render pure row metadata separately from input values; patch changed status/count cells instead of replacing the list on each input. Keep 50-row bound, source limits, invalid-number sentinel, prospective cash format preview, CAS and previous-snapshot recovery. A before/after draft lifecycle inventory is required before changing render ownership.
3. QE5: build the compact acquisition roster against src/domain/armory-workspace.mjs, src/storage/armory-store.mjs and src/client/armory-workbench.mjs. Preserve weapon IDs and unknown/deleted attachments. No parallel ownership map in guide profile. Reuse exact commit/error handling; bulk edits are out of phase one.
4. QE6: adapt progression-page.mjs and progression.mjs family presentation without changing upgrade-budget.mjs completion or spending semantics. Requirement quantity editing delegates to the inventory adapter; serialization and clear saved-versus-draft labelling required. Preserve existing confirmation and tier grouping review.
5. QE7: compact needed-page.mjs/needed.mjs presentation; reuse budget output. Do not sum alternative print inputs with direct outputs or reimplement allocation in UI. All numerical colors remain semantic.
6. QE10: inventory existing exports/imports, armory backups, content binding, local preferences and revisions. Add migrations only through a new explicit reviewed contract, not as an incidental UI refactor.

## Delivery slices

A: inventory vertical slice + shared chrome, including failure/dirty tests. B: weapon acquisition roster on existing storage. C: upgrades family view + explicit global-stock editing. D: Needed compact view and cross-page journeys. E: regression, visual/accessibility/performance receipts, preservation audit and independent review. Each slice can be reverted separately; data never depends on the new layout. Do not land a CSS-only compression pass that hides features without delivering the fast input journey.

## Verification contract

Use fresh seeded test contexts, never the user's real browser profile. Baseline and final compare at identical viewport/catalog/density. Core checks: stable element identity/focus/caret and scroll during 20 repeated increments; ten quantity keyboard edits, one Save, reload; invalid raw entry/filter/page/expand round trip; global counts across duplicate requirement views; dirty departure and catalog switch; concurrent-tab stale revision and denied/quota storage; legacy cash1,333,601; exact restored quantities/progress/armory after backup; stock availability cannot auto-complete; confirmed completion advances tier and removes only its costs; reserved/shared inputs not double counted; X01 excluded from FOB execution. Test standard loaded, loading, empty, no matches, uncertain cost, error and version-update states.

Chromium/Firefox/WebKit; dark/light; compact/comfortable; 320×400,390×844,667×375,768×1024,1280×800,1440×900,1920×1080; keyboard, reduced motion and 200% text. Measure no unintended document overflow, no obscured controls and bounded 50-row inputs. Real keyboard/zoom and physical touch remain manual evidence, not simulated certification. Target a ten-item entry task with no detail-page navigation or per-row confirmation; measure time against current UI rather than promise an unmeasured speedup. Normal first viewport must meet QE2's row visibility target. All full runtime checks, affected existing browser regressions and format/repository/build checks run after implementation. No production tests executed for this planning-only change.
