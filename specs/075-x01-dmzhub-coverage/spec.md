# X01 DMZHub coverage

Status: implemented and locally verified, 2026-11-11. The owner identified missing markers and icons compared with the DMZHub X01 map. The existing collection permission covers DMZHub. Public map API responses are accessible in a headed browser; captured assets remain local and ignored.

## Player outcomes

- FR-001: Open the linked DMZHub X01 view on either floor and see all public markers from the reviewed snapshot in their own coordinate frame, with the source's category icons where available.
- FR-002: Switch between the linked DMZHub and COD Central X01 views without plotting one provider's coordinates on the other's floor image. Source and floor are visible; category filters are independent and persistent.
- FR-003: Search, select, inspect and directly link to DMZHub markers, including unnamed markers identified by category. Selection remains visible until changed or explicitly closed.
- FR-004: Use the X01 map offline with locally captured floor tiles and category icons. Missing local imagery gives a recovery instruction while the list remains usable.
- FR-005: Capture bounded public DMZHub metadata, both complete floor feature responses, and pinned assets with validation. Preserve raw capture privately and a reviewable sanitized marker snapshot in Git. Do not infer cross-source duplicates or exact same-location matches without calibration.

## Boundaries

This adds source-specific viewing and category controls. Cross-provider merging, same-place deduplication, road routing and private map edits require calibrated shared geometry and are not implied by matching names or grid labels.
