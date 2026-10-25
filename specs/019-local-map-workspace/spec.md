# Feature Specification: Local Hajin Map Workspace

**Feature Branch**: `feat/019-local-map-workspace`

**Created**: 2026-10-26

**Status**: Proposed integration; actual implementation/review evidence recorded separately.

**Input**: Integrate the previously built local viewer into woodkill00/dmz_guide, commit, push and merge main.

## User Scenarios & Testing

### User Story 1 — Keep and run the viewer (Priority: P1)

As the maintainer I can run the local viewer from this repository without replacing the existing native guide or its map/list workflow.

**Independent test**: Both apps build independently; a clean-checkout workspace explains missing assets instead of inventing imagery.

**Acceptance scenarios**:
1. Given the existing guide, when the workspace is added, then existing routes, authoring, map/list, private-state, packaging and content contracts are preserved.
2. Given no local background/snapshot, when the workspace starts, then missing files produce recoverable errors and no fabricated points.
3. Given the owner's existing local assets in the documented ignored paths, when the viewer starts, then its full-source fit, pan/zoom/reset, keyboard controls and attribution work.

### User Story 2 — Select icons through key or sources (Priority: P1)

As a player I can open Map key directly, select categories or all/none, and use the same source/category state in Sources & Layers.

**Independent test**: Explicitly synthetic local data exercises the real renderer without redistributing game assets.

**Acceptance scenarios**:
1. Clicking Map key before Layers on desktop/mobile opens the key; repeated clicks never hide it.
2. Category selections and global show/hide synchronize in both views and survive refresh or source visibility changes.
3. Two website sources with matching record IDs remain independent; the authored overlay stays separate.
4. Zero-location icon categories remain listed without fabricated points.

### Edge Cases

Missing or corrupt files, invalid coordinates/version, disabled browser storage, image decode failure, repeated key clicks, hidden sources, mobile resizing and occupied local ports have bounded outcomes.

## Requirements

- **FR-001**: Preserve the established guide's source, dependencies, routes, content packs, private-state contracts and public build output. Add an opt-in local workspace.
- **FR-002**: Document root commands for workspace installation, start, build/typecheck, coordinate tests and synthetic browser checks.
- **FR-003**: Keep downloaded imagery/icons/full source datasets, private screenshots, logs, preferences and credentials out of tracked integration files and normal public build/release artifacts. No rights grant or deployment is inferred.
- **FR-004**: Retain versioned normalized positions, full-source fit, pan/zoom/reset, keyboard navigation, responsive controls, attribution and recoverable image/source failures.
- **FR-005**: Map key opens directly independently of Layers and lists supplied icon names/counts with individual and global show/hide controls synchronized with source sublayers.
- **FR-006**: Scope website identity, selections, snapshots and preferences separately. Hiding a source preserves its mix; selecting a key category from a hidden source displays that category alone. Unavailable storage cannot break filtering.
- **FR-007**: Validate and bound local snapshots/images/coordinates, keep imported content inert, and do not include remote acquisition helpers. No arbitrary scraper, source-site runtime request or account access is introduced.
- **FR-008**: Clean-checkout tests use explicitly synthetic local data without downloading game resources. Preserve existing gates and add workspace-specific automation.

### Key Entities

- Workspace: independently runnable local viewer and dependency lock.
- Source: stable website identity, provenance, local snapshot/icons and category layers.
- Position: map/version IDs and finite normalized x/y.
- Selection: website visibility and all/none/mixed categories, private to the browser.

## Success Criteria

- **SC-001**: Existing guide checks and build pass without replacing application/content contracts.
- **SC-002**: Clean-checkout tests demonstrate desktop/mobile direct key opening, individual/all/none selection, synchronization, persistence and source isolation without runtime errors.
- **SC-003**: Tracked files and normal releases contain no downloaded game imagery, icon/point datasets, private state or credentials.
- **SC-004**: Documented startup and missing-file recovery do not require changing the guide's normal server port.

## Assumptions and Clarifications

The destination reply explicitly authorizes integration, commit/push/merge. Integration is additive: the native guide stays authoritative and this workspace is opt-in local tooling. Existing downloaded assets remain local; unknown rights block their public inclusion, not original viewer code and synthetic tests. No marker authoring, hosted service, live game access or arbitrary website import is added. Clarification coverage scan found no remaining blocking ambiguity; implementation choices use these bounded defaults.
