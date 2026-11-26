# Clarifications and decisions

1. This request is planning, not implementation. Application code and the existing local service remain unchanged.
2. “Site-wide” includes companion maps and management/editor/recovery surfaces, not just the homepage. Existing092-feature/2278-route audit is historical input; regenerate before implementation acceptance.
3. “Everything uses calc” means shared calc-backed layout arithmetic throughout maintained application UI. Intrinsic layout, unitless line heights, percentages/auto, aspect ratios, actual map coordinates, raster sizes and vendor internals are not replaced by fake arithmetic. Bound calc expressions using clamp/min/max and accessible minima. Document exceptions, do not waive them silently.
4. Extend existing layout-tokens/workspace shell and item-card primitives; no new UI framework or second design-system owner.
5. Compact desktop is the default tracking presentation; touch/comfortable density preserves larger hit areas. Text remains user-resizable. Typography proposals require side-by-side review before adoption.
6. Keep one vertical page scroller for reading/tracking. Map terrain, editor text areas and necessary 2D data regions may have an explicit owned scroller. Test each exception with focus and short viewport constraints.
7. Private state stays in its current owning stores and origin. View preferences can change only through versioned, bounded UI-only settings with reset and storage-unavailable fallback. Existing drafts and acknowledged operations outrank layout preference changes.
8. Feature108 has uncommitted application changes in the current checkout. Do not move/reset/stash them for planning. Implementation starts in an isolated worktree from a checkpoint containing them; branch setup is an implementation prerequisite, not a claim completed here.
9. Existing source rights and source-truth limitations persist. Planning research uses primary web-platform/accessibility documentation; no new game facts or assets are collected.
10. Manual pinned Spec Kit lifecycle applies. No claim that a CLI/skill workflow ran merely because its instructions were read. Reviewer-owned review criteria stay separate from implementer task checkboxes.
