# Plan

1. Derive a per-floor axis-affine COD Central → DMZHub transform from uniquely named same-floor landmarks only. Report residuals and refuse overlay if insufficient anchors or excessive error. Compare candidate records by name/type/floor and transformed distance; retain all raw source records.
2. Add a dedicated `/x01-workspace.html` with a DMZHub base map and switchable COD Central comparison overlay/list. Keep source-specific layers and per-floor controls. Nearby marker selection operates on rendered screen positions and can be opened by click or list.
3. Store bounded private state in an X01-specific IndexedDB object. Support custom POI CRUD, photo blobs, observations, duplicate decisions, route plans and active source snapshots. Export full backup including photos; validate and preview an import before atomic replacement. Keep unsaved form state on quota failures.
4. Add source-update file review for either provider, using their existing snapshot validators, bounded reads and identity-based diffs. Apply only to private active snapshots. Source asset refresh stays a separate reviewed local capture command.
5. Plan waypoint order on normalized coordinates. For floor changes, form proximity hypotheses from source-reported stairs/ascenders across floors; draw dashed schematic connector suggestions. Mark every leg and pair as unverified and name missing access/geometry. Preserve manual order and allow keyboard Move up/down.
6. Add direct map links from known X01 guide records and printer reference. Avoid guessed locations. Verify all existing guide routes still render.
7. Exercise data validation, transform error, backup round trip, import failures, marker crowding, floor/route states, 320/390px and 200% zoom, keyboard/screen reader semantics. Document physical-device and gameplay evidence as pending until actually supplied.

Alternative considered: transplant Hajin's full private workspace store into X01. Hajin uses a 4096-specific canonical frame, road graph and provider applicability. A separate X01 state schema is safer until a reviewed multi-map migration exists.
