# Feature Specification: Location intelligence
**Feature Branch**: `006-location-intelligence`
**Created**: 2026-10-21
**Status**: Draft pending independent requirements review
**Input**: Complete roadmap location intelligence with honest map/list parity, private imported map support, and goal relevance.

## User Scenarios & Testing
### User Story 1 — Find trustworthy locations (P1)
A player filters a location list without needing imagery or gestures.
**Independent Test**: Open the default real starter, search a known POI, inspect its source and unknown coordinate notice.
**Acceptance Scenarios**:
1. Given the real starter, when opened, then its 13 POIs are listed and unknown coordinates are not plotted.
2. Given any pack, when map, floor, category, search or source filters change, then list and markers represent the same matching records except explicitly unplottable records, which stay listed.
3. Given a selected location, when selected through list or map, then the same named detail panel exposes floor, grid, directions, spawn uncertainty, source, pack/build/version and coordinates or unknown.

### User Story 2 — Explore a calibrated map (P1)
A player explicitly chooses the fictional pack or privately imports their own map.
**Independent Test**: Choose the fictional pack, switch its two floors, pan and zoom by keyboard/buttons, and select each of its three locations.
**Acceptance Scenarios**:
1. Given the fictional pack, when viewed, then the original schematic is unmistakably labeled fictional, not a game map.
2. Given calibrated coordinates, when plotted, then declared bounds, axes, origin and floor are respected; out-of-bounds locations remain listed with an explanation.
3. Given absent or failed imagery, when inspecting a location, then the list and details remain complete and usable.
4. Given a validated private raster replacement, bounds or floor edit, when the pack reloads, then the current map and coordinates use that version without remote image fetching.

### User Story 3 — Find locations related to a goal (P2)
A player narrows locations to declared item relations matching unmet plan needs.
**Independent Test**: Set a supported fictional goal, then enable goal-related filtering and compare matches to the actual declared item relations.
**Acceptance Scenarios**:
1. Given unmet needs and declared location item relations, when filtering, then only their intersection is shown.
2. Given no verified relation, no goal, or unsupported planning, when filtering, then an explicit explanation appears rather than invented locations.

### Edge Cases
Unknown coordinates, bounds changed, floor removed, empty maps, no matches, unavailable storage, stale profile binding, conflicting sources, failed raster decode, invalid raster references, mobile narrow view and keyboard-only interaction retain a useful list or explicit recovery notice.

## Requirements
### Functional Requirements
- **LI-001**: Default to real starter unless the player explicitly selects another pack; never invent real coordinates or spawn guarantees.
- **LI-002**: Provide pack, map, floor, category, text, source and coordinate-version filters, with current content and coordinate versions visible. Filters and selected details must be shared by map and list.
- **LI-003**: Transform finite coordinates according to declared extent, origin and axes; unplottable records remain in the list with reason. No fastest-route claims.
- **LI-004**: Provide keyboard and button pan/zoom/reset, focusable location controls and list selection; every location action and detail must work without dragging or imagery.
- **LI-005**: Show source title/link, review date, applicable build, content/coordinate version, grid, floor, directions, status and spawn classification. Clearly distinguish unknown/possible/fictional evidence.
- **LI-006**: Render only explicit fictional original schematic or validated local raster assets from the active private overlay; never automatically fetch source URLs or remote imagery. Owner bounds/floor/asset edits must be reflected after reload.
- **LI-007**: Goal relevance must intersect actual location item relations with positive unmet shared-plan consumable or retained-tool needs, excluding currency; missing relations, unsupported plans and stale bindings must explain why no verified recommendation is available.
- **LI-008**: Preserve useful list/details for missing images, empty filters, unknown coordinates and storage failures; changing pack/map/floor clears incompatible selection and camera state.

### Key Entities
Map: declared extent, origin, axes, floors, coordinate version and optional local asset. Location: stable ID, coordinates or unknown, floor, category, item relations, evidence and uncertainty. Filter state: active pack/map/floor/category/query/source and goal-only choice. Selected location and camera: shared view context, never game progress.

## Success Criteria
- **SC-001**: All 13 real starter POIs are discoverable with zero invented markers.
- **SC-002**: All three fictional locations are selectable via list and map on their declared floors, with identical details.
- **SC-003**: Every filter combination produces matching list/marker sets after subtracting explicitly unplottable records.
- **SC-004**: Keyboard-only users can filter, select, zoom, pan and reset; all essential information remains available when imagery fails.
- **SC-005**: Every goal-related result is backed by both an actual item relation and an unmet plan need; no-match scenarios state the limitation.

## Assumptions
The approved 001 roadmap FR10/A11/A12 remains baseline. 003 supplies valid packs and local profiles; 004 supplies shared planning; 005 supplies validated private overlays and raster payloads. No game artwork, external tile server, geolocation, navigation routing, public deployment or schema expansion is included. Imagery edits occur in the owning content editor, not duplicate map editing forms.
