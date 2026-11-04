# Feature Specification: Map Key Scrolling and Resizing

**Feature Branch**: `065-map-key-scroll-resize`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "need to come up with a fix for this section, when its there unable to scroll down as well, need to make it so each section is resizeable and easy to scroll"

## User Scenarios & Testing

### User Story 1 - Browse and resize map-key sections (Priority: P1)

When the map key is open, a user can see and scroll the controls and long layer list without either section consuming nearly all of the sidebar. The user can adjust the space between the controls and list to suit the current task.

**Why this priority**: The map key is the primary way to find and control map layers; a nearly collapsed list makes the map-key experience difficult to use.

**Independent Test**: Open the map key with a long synthetic layer list, scroll the list to its beginning and end, and resize the controls/list split using pointer and keyboard input.

**Acceptance Scenarios**:

1. **Given** a viewport with limited height and a long layer list, **When** the map key is opened, **Then** the controls and list each retain a useful visible area and the list can be scrolled to its first and last entries.
2. **Given** the map key is open, **When** the user drags the section divider, **Then** space moves between the controls and list without hiding either section or changing map-layer selections.
3. **Given** the divider has keyboard focus, **When** the user adjusts it with the keyboard, **Then** the split changes, its accessible value is updated, and both sections remain usable.
4. **Given** the viewport is resized or the map key is opened on a narrow screen, **When** the available height changes, **Then** both sections remain within the sidebar and their overflow remains independently scrollable.

### Edge Cases

- The list or controls exceed their allocated height; each section remains independently scrollable.
- The viewport is too short to fit both sections at their preferred sizes; both retain a minimum usable height and the divider respects those bounds.
- Pointer resizing is interrupted or the viewport changes during resizing; the divider and sections remain within the available sidebar.
- Hiding or reopening the map key does not change layer visibility, map position, or private workspace data.

## Requirements

### Functional Requirements

- **FR-001**: The map-key controls and layer list MUST each be scrollable when their content exceeds their visible area.
- **FR-002**: Users MUST be able to resize the vertical space allocated to the controls and layer list without collapsing either section.
- **FR-003**: The resize control MUST be operable by pointer and keyboard and expose its orientation and current bounded value to assistive technology.
- **FR-004**: Resizing MUST preserve all existing map-key controls, category visibility, map state, and private workspace data.
- **FR-005**: The sidebar MUST keep both sections reachable after viewport resizing and at narrow screen widths.

## Success Criteria

### Measurable Outcomes

- **SC-001**: At a 620px-high browser viewport, at least 120px of visible layer-list area remains available when the map key opens with a synthetic long layer list.
- **SC-002**: In a long-list browser check, users can scroll from the first to the last layer and back without the document or map moving instead of the list.
- **SC-003**: Pointer and keyboard resizing both change the split while maintaining non-zero, bounded visible areas for the controls and list.
- **SC-004**: Existing layer-selection and map-key regression checks pass with no changed visibility or workspace state caused by resizing.

## Assumptions

- “Each section” refers to the map-key controls area and the layer-list area shown in the shared element context.
- Section sizing is a display-only, current-session adjustment; no new persisted preference or private-data format is required.
- Existing source/category controls and map behavior remain unchanged.
