# Acceptance: Map Key Scrolling and Resizing

## Requirement traceability

| Requirement | Implementation and evidence |
|---|---|
| FR-001, SC-001–SC-002 | The controls and layer list are independent contained scroll regions. The focused synthetic workflow verifies at least 120px of list area at a 620px viewport, scrolls the controls and long list independently, and checks visibility of the first and last synthetic rows. |
| FR-002–FR-003, SC-003 | The labelled horizontal separator supports bounded pointer dragging and Arrow/Home/End keyboard resizing, reports its current range through ARIA values, and retains non-zero section sizes. The focused workflow exercises these paths. |
| FR-004, SC-004 | The focused workflow snapshots layer checkbox state and map position before resizing and verifies they remain unchanged. No persisted sizing or workspace data was added. |
| FR-005 | Viewport changes and narrow layout are exercised by the focused workflow. A real pointer click opens the map key at a 390px viewport after raising the map controls above the overlapping field toolbar; both sections remain independently scrollable. |

## Verification

- `npm --prefix tools/hajin-map run test:workflows` — **PASS**. Chromium, Firefox, and WebKit passed the synthetic map-key scroll/resize/state-preservation regression and the surrounding map workflow.
- `npm run map:test` — **PASS**. 202 tests passed; 0 failed.
- `npm run map:build` — **PASS**. TypeScript check and Vite production build succeeded.
- `npm run map:test:browser` — **FAIL** in `tools/hajin-map/scripts/upgrades.browser.cjs:70`. The suite now gets past the mobile map-key opener, but a synthetic marker-popup hover is intercepted by the selected-location inspector. This is outside the map-key split and was not changed in this repair.

## Touched paths

- `tools/hajin-map/src/main.ts`
- `tools/hajin-map/src/styles.css`
- `tools/hajin-map/tests/field-workflow-browser.mjs`
- `tools/hajin-map/help.html`
- `docs/local-map-workspace.md`
- `specs/065-map-key-scroll-resize/`

The UX checklist remains reviewer-owned and unchecked; implementation and test results do not authorize changing its markers. No physical-device or screen-reader testing was performed.
