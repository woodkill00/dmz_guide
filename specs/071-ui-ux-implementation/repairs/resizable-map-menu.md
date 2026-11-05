# Repair: resizable modern map side menu

Assessment: modern workspace allocation replaced the legacy split and fixes the docked menu width at24rem. The user requests resizing on the live map. Owning feature071 is explicitly selected; this is a bounded restoration of layout control, not default rollout or domain changes.

Requirements (FR-003/004/006/023/025): drag the docked menu boundary with pointer capture; offer keyboard arrows/Shift/Home/End and accessible separator values; preserve original forms, drafts, exact explicit camera and domain records. Persist only a small versioned width preference, preserving invalid/unknown/denied existing bytes. Clamp against readable menu and terrain minimums; preserve the preferred width across temporary viewport changes. Hide the divider in full/half/peek/narrow fallback with valid focus. No effect on legacy split behavior.

Plan: isolated allocation-only helper, existing layout integration and scoped styles. Verify actual full-app pointer/keyboard/reload/bounds/fallback/camera/form/nonmutation cases in Chromium, Firefox and WebKit, then existing geometry/mode regressions and TypeScript/build checks. No new provider/game files.

Pre-implementation analysis: no new store/schema, no common origin, no domain serialization. Use existing map ResizeObserver camera protection. Handle pointer cancellation/disposal without retaining global listeners. New preference admission is exact-key/version/finite bounded numeric validation; never overwrite rejected bytes. Existing rollout/manual gates remain unchanged and the user explicitly authorizes this scoped repair.

- [x] R1 Implement separator and bounded width preference.
- [x] R2 Verify real pointer/keyboard/storage/fallback and original state/camera.
- [x] R3 Run relevant existing geometry/mode/type/build regressions and record results.


## Verification and convergence

Actual full-app resize fixture passes Chromium, Firefox and WebKit (`tools/hajin-map/.local/071-task-resize-final-2.log`): captured pointer drag, native keyboard steps/min/max, readable terrain bound, exact original dirty form/value and explicit camera, no domain record mutation, reload persistence, viewport clamp without rewriting preferred width, narrow fallback, actual lost-capture cancellation, denied storage session fallback and invalid original-byte preservation. An initial test assumed pointer ID1; Firefox exposed that fixture error, corrected to record its actual native pointerdown ID. No product assertion was weakened.

The unchanged21 geometry cases pass (`071-task-resize-layout.log`), all three engines pass the original named mode/boundary/dirty-guard cases (`071-task-resize-modes.log`), and TypeScript/production build pass (`071-task-resize-build.log`). The existing >500kB bundle advisory remains unchanged. Repository validator reports0 failures (`.local/071-task-resize-static.log` at root); whitespace check passes.

Live smoke check on port5175 confirms a visible modern separator, default384px, minimum288px and maximum1120px at1440px viewport. No live owner profile was used. Defaults and unrelated feature071 acceptance gates remain unchanged. No physical touch-device claim or remote publication.
