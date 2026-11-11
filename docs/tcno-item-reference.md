# TroubleChute item reference update

The local guide now links TroubleChute-reported descriptions, rarity, loot-container types and crafting/unlock references from individual item pages. Open an item from Inventory, Quick collect or Items; its **Item information & loot sources** section shows the provider facts and source link. Existing recipe/objective uses remain below it. Both native item pages and private `/local/` item views use the same renderer.

The 2026-11-10 snapshot contains 256 provider item identities, 157 unlock references (33 manuals, 37 crafting references, 87 blueprints), and 34 FOB upgrades. It enriched 125 existing identities and added 131 missing references, bringing the starter catalog to 303 items. Equipment and collectible blueprints/manuals remain separate. Source-supplied short names are reconciled through reviewed aliases; existing inventory/recipe IDs are preserved. All 34 upgrade costs, effects and prerequisite links matched the previous capture and current catalog. No quantities were guessed or spending rules changed.

185 provider records list loot sources; missing lists explicitly say not listed. Container labels do not establish coordinates, guaranteed loot, or an independently verified current game build. Data absent from this source stays supported by earlier sources or unknown. This is provider coverage, not a claim to contain every in-game item. Newly listed references may lack a local icon; artwork was not downloaded by this text-data update.

## Refresh and preview

From the repository root:

```text
node scripts/capture-tcno-items.mjs
node scripts/capture-tcno-items.mjs --write
node scripts/enrich-tcno-items.mjs
node scripts/enrich-tcno-items.mjs --apply
npm run build
```

The first command previews provider counts and bundle hash; `--write` captures a dated source snapshot. The enrichment preview validates the whole candidate and reports additions/conflicts before the explicit apply. Changed upgrade costs/effects/prerequisites, ambiguous item matches or unexpected dataset shape stop collection application for review. The current snapshot count expectations are intentional review gates, not assertions that future provider coverage cannot grow. The parser reads static data with Acorn and rejects executable expressions; it does not import or evaluate downloaded scripts. Network capture is restricted to the provider origin and bounded response sizes.

Applied changes are backed up under ignored `.local/tcno-import-backups/` before writes; a caught write failure restores exact previous bytes and removes only newly created records. The backup `before.json` lists relative paths and their previous bytes as base64 (`null` denotes a new file), and `state.txt` records completion/rollback. Retain these backups for manual recovery after process interruption. Reapplying the same data produces zero changes. No browser profile, quantities, blueprint ownership or completed upgrades are written by these scripts.

The enriched catalog version is `2026.11.10.4`. If an existing tracker requests a content-update review, use its normal review flow; stable IDs preserve existing inventory/progress. Private catalog overrides retain their own data and require deliberate reconciliation rather than automatic replacement.

## Provenance and permissions

Source: https://tools.tcno.co/dmz/fob (its shared DMZ dataset also supplies unlock references). Reviewed 2026-11-10. Exact bundle URL and SHA-256 are preserved in `content/references/tcno-items-20261110.json`; structured page facts and stable mappings are in `src/content/tcno-item-intel.json`. The user explicitly authorized collection from additional providers earlier in this conversation and requested this update. This is local use authorization, not independent public redistribution approval. No artwork or private browser data was added. Acorn is a development-only static JavaScript parser under its upstream MIT license.

## Loot-source type pages and photographs

Loot labels on item pages are buttons. Open one to see its dedicated reference page and associated item list, or browse [all loot-source types](http://127.0.0.1:4173/guides/mw4--loot-types/). There are 20 source-reported types, from loose loot and lockers to safes and toolboxes. They are reference concepts with no invented map coordinates.

Each type page has **Edit loot type** and **Add photos** actions. Open its exact record in local Content Studio, edit the notes or select a local PNG/JPEG/WebP, review its description/rights/privacy fields, validate, and **Save to repository**. The saved preview shows changes immediately. Rebuild the reader to display saved changes on its static pages. Primary and additional pictures use the existing validated media database and recovery flow; private player inventory is separate. The running Studio is at the address printed by `npm run author` (default port 4174).

Type pages are saved guide records in the catalog's Locations category. A source refresh preserves edited titles, notes, photograph references and custom related-item links while merging reported associations. It does not replace these with invented location records. The directory and type IDs are stable, so links survive refreshes.

Item pages now consolidate descriptions, loot information and grouped crafting/mission/upgrade uses. Additional notes and complete source/verification evidence are expandable; nonempty weapon measurements remain visible. Reimport does not append repeated source text to item descriptions or replace authored notes.
