# Implementation Plan: Local Hajin Map Workspace

**Branch**: `feat/019-local-map-workspace` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

## Summary

Integrate original viewer code from local commit 84b793c as `tools/hajin-map/`, an independent opt-in package. Preserve native guide code, public build and content packs. Root commands delegate to this package; docs explain local setup. Do not transplant the unrelated local root commit into the destination's ancestry or overwrite existing files.

## Technical Context

TypeScript 5.9.3, Leaflet 1.9.4, Vite 7.3.7, pinned package lock; Node 22.18+/24. Local server uses 127.0.0.1:5175, distinct from the guide/Studio and original preview. Browser preferences are local storage, not catalog/private-profile migration. Coordinate tests use Node's runner; Playwright browser tests own their loopback server and use generated original raster/synthetic records. Existing root Python, Node and browser gates remain intact. Add an Ubuntu Node 22/24 workspace CI job; this does not replace existing gates.

## Constitution Check

Pre-design: player navigation/key outcomes retained; responsive/keyboard controls retained; unverified assets excluded; imported content inert/validated; local preferences isolated; original guide preserved. No constitutional amendment or exception needed. Public publication rights remain unresolved and asset distribution stays explicitly outside this integration. Post-design: same outcomes, with clean-checkout synthetic evidence and independent review required before merging.

## Research and Structure

See [research.md](research.md), [data-model.md](data-model.md), [contracts/workspace.md](contracts/workspace.md), and [quickstart.md](quickstart.md).

Touched paths: `tools/hajin-map/{src,scripts,tests,index.html,package.json,package-lock.json,tsconfig.json,.gitignore,README.md}`, root `package.json`, `README.md`, `docs/local-map-workspace.md`, `.github/workflows/local-map.yml`, `THIRD_PARTY_NOTICES.md`, and `specs/019-local-map-workspace/`.

Copy original authored viewer files only. Keep downloaded resources ignored. Research acquisition helpers are excluded: this viewer reads local inputs, and adding a transactional remote acquisition tool is outside the integration scope. Use existing owner-local assets only in ignored paths for manual viewing. CI routes local generated test responses; no source site contact is needed.

## Integration and Rollback

Root `map:install`, `map:dev`, `map:build`, `map:test`, `map:test:browser` delegate to the isolated package. Public `npm run build` continues to generate the existing guide alone. Documentation links the two workflows without adding a second live app link to the public guide. Roll back by reverting this additive feature commit/merge; original app/content contracts and local user state are not migrated.

## Verification

Requirements FR-001/003: existing structural/Python/Node/build checks and tracked-output audit. FR-002/004–008: workspace install, coordinate/typecheck/build, isolated browser tests for navigation, key opening before Layers, source controls and key synchronization, saved custom selection, source isolation, malformed/missing data, empty assets and image retry. Existing native browser suite runs using installed Edge where supported; CI remains responsible for its full OS/engine matrix. Record unavailable local environments honestly. Request independent artifact and final code/visual review; do not self-approve custom checklists.
