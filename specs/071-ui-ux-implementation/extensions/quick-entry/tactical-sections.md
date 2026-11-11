# Tactical item grouping correction

2026-11-08, feature071 / quick-entry. User requests Snapshot Grenade, Smoke Grenade, Shock Stick and Stim under Tacticals. Assessment: the starter's four printer-item records already say Tacticals; the older observed catalog uses generic equipment. Cached snapshots can retain those old labels.

Requirement/plan: correct the shared presentation classification for the eight exact starter/reported identities, preserve canonical IDs, quantities, blueprint flags and pack/profile versions, and avoid fuzzy name merging. Needed uses this same helper. Keep the underlying sourced snapshot as a reference rather than silently mutating a versioned catalog or forcing profile rebind for a display change. Arbitrary custom records named Stim are unaffected.

Tasks/analysis: add an exact-ID tactical classification before the normal metadata aliases; test stale generic category records and non-mutation; verify both real catalog views, Gear exclusion and quantity/blueprint draft retention through filters. No numerical/crafting/mission semantics, profile migration, source collection or independent approval claimed.

Verification follows below; reviewer-owned checklists remain untouched.

Verified/converged: all eight exact identities resolve to Tacticals even with old equipment metadata; unrelated custom Stim records keep their own metadata. 29 inventory metadata/draft/capacity runtime tests passed, zero failed (`.local/quick-entry/tactical-runtime.log`). Live browser verified all four entries in Tacticals in both starter and observed catalogs, absent from Gear, with raw quantities and applicable blueprint drafts retained across filters (`tactical-browser.log`). Existing exact section order/dropdown/draft/Needed browser test passed (`tactical-order.log`). Formatting and Python repository checks passed; whitespace check passed with pre-existing line-ending notices only. Modern build emitted 1516 routes plus 404 (`tactical-build.log`). No production code changed afterward, and no actual player profile was opened or edited by tests.
