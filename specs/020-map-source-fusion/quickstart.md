# Feature020 verification quickstart

Status: implemented on `feat/020-map-workspace-implementation`. These steps reproduce acceptance; see verification.md for recorded results.

1. Select context with `$env:SPECIFY_FEATURE_DIRECTORY='specs/020-map-source-fusion'` in PowerShell. Read spec.md, plan.md, contracts/workspace.md and latest analysis report.
2. At repository root run `npm run map:install`, then `npm run map:dev`. Preserve existing owner-local map assets; none are supplied or licensed by this feature.
3. Use Sources to preview the existing owner-local official capture, or authorized synthetic official-compatible files. Synthetic multi-provider fixtures exercise gated internals only; they do not enable restricted providers in the product. Confirm CODMunity/WZStats/CODCentral remain reference-only without permission and generate no acquisition traffic.
4. Open Map key directly before Layers; toggle category/source/global controls and search, then reload. Verify shared masks, labels and raw/reviewed counts. Include empty and blocked providers.
5. Stage invalid or undocumented crop/axis/floor fixtures; ensure unregistered records stay unplotted. Register valid synthetic data, including documented crop/axis changes, using fit and hold-out anchors, inspect residuals and accept explicitly. Stage an authorized synthetic background; switch at fixed camera and adjust opacity with keyboard, checking invariant marker positions. Unlicensed backgrounds remain reference-only.
6. Review a candidate pair, choose field evidence, retain disagreement, undo/split, then refresh with changed and missing evidence. Confirm stale flags and untouched original snapshots/custom points.
7. Offline, create a private point using keyboard numeric inputs, add an owned icon, edit/move/cancel/delete/undo and reload. Try malformed/animated/oversized images and deleting a referenced icon. No partial saves.
8. Export a private backup; restore to an empty test workspace with omitted source dependencies. Confirm all custom data and descriptions survive, unresolved evidence remains pending, and public export is absent. Exercise quota, multitab conflict and versionchange recovery in a disposable browser profile.
9. Run `npm run map:test`, `npm run map:test:browser`, `npm test`, `npm run build` and `py -3 scripts/check.py`. Also run `npm run map:test:capacity`, `npm run test:browser` and `npm run test:engines`. Capacity uses the production build and reports separately measured first paint and persistence. Record exact results and browser/hardware; do not mark an unexecuted command passed.
10. Run read-only Spec Kit analysis, repair owning artifacts separately, rerun; then implementation/converge and independent review. Real-provider ingestion remains gated even when artifact analysis is clean.

Open **My workspace** for My points, Sources, Review, Icons and Backups. Export a private backup before moving browser profiles or ports: IndexedDB is origin-local. A backup restore requires downloading the current backup first; restore previews disclose omitted dependencies. Use a disposable browser profile for destructive acceptance exercises.
