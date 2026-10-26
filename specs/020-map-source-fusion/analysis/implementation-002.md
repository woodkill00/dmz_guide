# Full implementation review and remediation ledger

2026-10-26. Feature020, implementation branch. All findings below were repaired before final acceptance; historical definition/foundation reports remain intact.

| Finding | Repair and regression evidence |
|---|---|
| FULL001 canonical coordinate version | Canonical placement uses accepted registration; registered noncanonical-frame test |
| FULL002 refresh across historical snapshots | Review heads and evidence versions persist; three-snapshot refresh regression |
| FULL003 dense incompatible comparison took seconds | Grid groups plus250,000 examined-entry cap; adversarial unit and production capacity tests |
| FULL004 pretty JSON could exceed admitted backup bytes | Export uses exact compact UTF-8 projection; exact20MiB restore boundary test |
| FULL005 authored field choices absent | Explicit authored evidence/declaration and private corrections; unit/browser review journey |
| BACKUP006 omission projection could exceed graph limits | Validate projected manifest counts before admission; boundary regression |
| REVIEW007 undo could erase staleness | Dependency freshness recomputed on history operations; refresh/undo/reconfirm regression |
| REVIEW008 unknown floor/build could bridge incompatible known values | Review rejects multiple distinct known values; unknown-bridge regression |
| UI-R1..R9 calibration/draft/provenance/inspection defects | Invalidate staged calibration on edits/picks; draft guards; owned background identity; correct crop/image picking; complete paginated raw inspection; authored review and alternative inspection; canonical imagery above base and below markers; browser regressions |
| UI-R10 rerender lost focused source controls | Stable IDs on source masters and per-source Show/Hide controls; focus restoration |
| UI-R11 delayed search/masks could overwrite newer visibility or undo | Coalesce current visibility and cancel timers on all authoritative replacements; intercepted-worker and timer race browser tests |
| UI-R12 mirrored background selector stale on canonical/failure | Synchronize both controls after clearing/failure; opacity/selection browser regression |
| UI-R13 delayed resource read could resurrect superseded imagery | Request epochs across reads/rendering/state replacement; actual gated IndexedDB read then Canonical regression |
| COV020 incomplete visibility algebra coverage | All16 boolean combinations plus global/per-source all/none/mixed/master preservation;39 units pass |
| Save form remained editable during preparation | Inert body/nav plus safe processing cancellation; intercepted worker test |
| Empty workspace could thaw legacy storage | Machine-local migration flag in same transaction, never removed by restore/undo; atomicity and application regression |
| Main-thread validation exceeded UI budget | Bounded preparation worker, separate first-paint/durable-save measurements; production timing passes |

No source policy was weakened and no fixtures were removed to obtain a pass. Native application modules were reused through typed raster adapters without changing native behavior. No personal pixels or data are tracked. Independent reviewers performed separate domain and UI re-reviews; final verdicts are recorded in the final report.
