# Quickstart: Verify Map Key Scrolling and Resizing

## Prerequisites

- Node.js 22.x or 24.x and the existing dependencies from the map workspace.
- Playwright browser installations required by the existing map browser checks.
- No downloaded map imagery or owner-local workspace files; tests use synthetic browser data.

## Automated checks

From the repository root, run:

```text
npm --prefix tools/hajin-map run test:workflows
npm run map:test
npm run map:build
npm run map:test:browser
```

Expected outcomes: the focused browser workflow verifies a long list scrolls to both ends, the separator changes size by pointer and keyboard without changing layer state, and a narrow viewport remains usable; unit tests and the strict production build pass; the full synthetic map browser suite reports no regressions.

## Manual reproduction

1. Start the optional local map workspace with `npm run map:dev` and open its printed loopback address.
2. Open **Map key** and use a viewport near 620px high with a long list of source categories.
3. Verify both controls and the list have visible space; scroll each section independently.
4. Drag the divider or focus it and use Up/Down, Home or End. Confirm neither section disappears and layer visibility remains unchanged.
5. Resize to a narrow viewport and repeat the scrolling and divider checks.

The selected split is intentionally not persisted across reloads.
