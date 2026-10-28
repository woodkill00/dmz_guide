# Feature023: Hajin coordinate grid
Created2026-10-28. Status: implemented and locally verified; see acceptance.md.

US1: See the Hajin A–J/1–9 tactical reference grid aligned with terrain and existing markers, including labels such as G6. Pan/zoom/reset/resize/fullscreen retain alignment. Grid is visible by default and independently switchable from Map key.
US2: Read the grid reference under the pointer (and map center after keyboard/touch pan) beside existing image pixel coordinates. Outside the calibrated footprint display unknown, never extend invented cells over the full4096 image.

FR001 Use reviewed CODCentral grid line percentages and the existing reviewed source-to-canonical affine registration. Preserve the offset/crop; never subdivide the entire canonical image into ten/nine equal sections. Derive outer edges by the immediately adjacent cell interval; document provenance/uncertainty and bind to canonical v1 image digest.
FR002 Draw11 vertical and10 horizontal boundaries and90 cells A1–J9 above backgrounds and below markers, with noninteractive/untabbable labels and readable screen-constant strokes/text. Lines/labels remain within1screenpixel of their canonical projections after navigation.
FR003 Provide a keyboard-labelled Map key grid checkbox, default on; persist its preference independently and tolerate unavailable storage. Website Show/Hide all and workspace backups/masks do not change the grid preference.
FR004 Exact unrounded canonical point lookup uses the inverse calibration; internal boundary belongs to the cell right/below, outer right/bottom edge belongs to last cell; nonfinite/outside footprint/image yields null. Pixel readout stays separately labelled. Pointer leave clears hover reading; pan uses center reading for keyboard/touch.
FR005 Preserve source markers, duplicate rules, right-click authoring, basemap comparison and import/update behavior. No source acquisition in runtime grid code and no third-party image/data capture enters Git. Grid geometry/reference labels are source-backed; point labels with conflicting source grid claims are not silently changed.
SC001 Synthetic unit/browser checks cover all90centers and edges, G6 control, known offset, visibility/persistence/storage failures, noninterception, navigation alignment and360px layout. Existing unit/build/browser checks pass; production capacity regression remains within budgets.
SC002 Spec Kit analysis/convergence and independent requirements/domain/UI review close actionable findings with executed evidence; physical game/device certification is not claimed.
