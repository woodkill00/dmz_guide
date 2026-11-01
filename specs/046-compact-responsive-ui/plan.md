# Plan

Manual pinned Spec Kit lifecycle per docs/spec-kit-cycle.md; no claim of automated skill execution. Constitution reviewed; no amendments/dependencies/data/schema changes.

1. Capture representative current visual measurements. Review definition independently before implementation.
2. Edit existing Guide and companion navigation styles in place; use scoped compact rules for mature data layouts. Share a small DOM-only navigation interaction module across Guide/Studio and Vite map/help, respecting CSP and existing catalog propagation.
3. Keep native details fallback and all authored links. Group link markup without changing link destinations. Bound columns/scrolling intrinsically; no sticky global header that obscures existing table headers.
4. Apply bounded compact Studio/map panel spacing; preserve coordinate transforms/drag offsets and 44px action targets. Do not alter game or storage modules.
5. Verify responsive/keyboard/JS-disabled behavior, functional regressions, accessibility, before/after measurements and independent review. Resolve failures in owning artifacts/tests; never relax existing assertions to fit a visual change.

Risks: cascade overrides in mature layouts, 200% text wrapping, focus departure races, companion stacking and Studio CSP. Prefer semantic groups, no absolute card controls and no dimension animations. Rollback is a local feature commit revert; user data unaffected.

Verification amendment: the independently reviewed Studio HTTP functional response bound is now 90 seconds, after phase-corrected and exclusive 30-second failures and an isolated 29.25-second full-catalog save. This is an explicit relaxation of that historical functional test bound, not a performance improvement. All original content, recovery, dispatch/readiness, raster five-second and performance assertions remain. Acceptance records the failed runs and the amended result separately.
