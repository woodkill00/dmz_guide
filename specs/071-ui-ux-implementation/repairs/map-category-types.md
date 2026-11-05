# Repair: combined map categories represent marker types

Assessment: the combined category list currently keys every literal source name/path, exposing named fortresses and duplicate singular/plural aliases as separate categories. Reproduced on the live map with71 literal rows, including eight named fortress sites.

Scope/requirements (FR-006/011/027): build stable semantic type rows (Keys, Locations, Fortresses, Safes and facility/equipment/mission types) using existing category IDs, declared groups/path metadata and explicit aliases. Never infer types from marker titles or promote arbitrary location names into types. Unknown source types belong to Other, retaining original labels in each source section. Preserve original source masks/IDs, source selection, duplicates, calibration and original records. Checking a type updates all represented source-category masks once, with correct mixed state. Existing combined/per-source Show/Hide all remains capture-wide, not search-limited.

Plan: pure presentation grouping helper, existing combined-view integration, deterministic unit fixtures and actual three-engine marker/checkbox/mixed/persistence/bulk tests. No source acquisition, domain migration or changes to duplicate matching.

Pre-implementation analysis: existing displayKind provides reviewed category-ID aliases without touching duplicate matching. Declared Keys/Missions/recipe ancestors take precedence over individual room names; explicit fortress IDs/group collapse named fortress categories. Existing mutation owner remains changeVisibility. No values are written on initial regrouping. Source-specific rows remain available for detailed inspection.

- [x] C1 Implement bounded semantic grouping and integrate combined controls.
- [x] C2 Verify named locations, aliases, unknowns, original source IDs, mixed state, bulk scope and persistence.
- [x] C3 Run relevant browser/runtime/type/build checks and record exact evidence.


Reload reproduction exposed an existing adjacent persistence defect: combined visibility writes are durable in the workspace, but an unmigrated source still reads authoritative legacy filters on startup. Confirmed final user changes now mirror those filters through the existing setLegacyPersistence gate. Pending/unconfirmed changes are not mirrored; after explicit migration that gate remains disabled, preserving old rollback bytes. No implicit migration, new schema or source acquisition.


## Executed verification / convergence

The full-app modern category fixture passes Chromium, Firefox and WebKit: individual fortress and key-room source categories collapse to types, major/minor locations combine, original source names remain available, combined masks affect all members, per-source partial selection is indeterminate, Show all restores all members, and reload preserves choices. The same fixture explicitly previews/commits the existing source-mask migration, then proves old localStorage rollback bytes remain exact while private grouped masks persist. Source snapshots and custom record counts are unchanged by grouping/filter actions (`tools/hajin-map/.local/071-category-types-migration-final-2.log`).

The original legacy organized-menu suite passes all three engines (`071-category-menu-regression-final-2.log`), preserving bulk/disclosure/focus/camera/pan/popup/deletion/geometry assertions. Its synthetic category label is now a declared Gas Stations type so the source-ID and label agree. WebKit exposed two fixture races: optimistic marker redraw precedes visibility acknowledgement, and deleted-marker absence precedes the owning confirmation's cleanup. Tests now await those actual owning completion states before unrelated edits/closing the dialog; no forced clicks, deleted assertions or timeout increases.

Map runtime, typecheck and production build are recorded in `071-category-runtime-final.log` / `071-category-build-final.log`. Repository validation reports0 failures (`.local/071-category-static.log`); whitespace check passes. Existing bundle advisory remains unchanged. Local live inspection shows24 type rows instead of71 literal labels; named fortress sites no longer appear as top-level categories. Unknown types appear under Other rather than inventing facts. No remote collection, data migration by regrouping, domain limit change or default-promotion claim.
