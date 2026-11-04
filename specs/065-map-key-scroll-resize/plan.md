# Implementation Plan: Map Key Scrolling and Resizing

**Branch**: `065-map-key-scroll-resize` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Repair request and browser reproduction in the session; see the linked specification.

## Summary

Restore usable space for the map-key layer list by bounding the controls area and adding an accessible, draggable split between the controls and list. Keep both areas independently scrollable, preserve responsive behavior and all map/workspace state, and avoid persisting display sizing.

## Technical Context

**Language/Version**: TypeScript 5.9; Node.js 22.x or 24.x for repository checks  
**Primary Dependencies**: Existing Vite and Leaflet app; no dependency changes  
**Storage**: None; panel sizing is transient display state  
**Testing**: Synthetic Playwright browser journey, map unit tests, strict TypeScript/Vite build  
**Target Platform**: Existing desktop and narrow-screen browsers supported by the local map workspace  
**Project Type**: Browser application  
**Performance Goals**: Divider movement updates only the two panel sizes and accessible value; no map redraw or workspace write  
**Constraints**: Controls and list remain bounded by the sidebar; pointer and keyboard resizing; preserve the existing 44px controls and touch behavior  
**Scale/Scope**: One sidebar split with two independently scrollable sections and a long, dynamically rendered layer list

## Constitution Check

- **Player usefulness and simplicity**: Pass. The repair makes existing layer controls reachable without adding unrelated capability.
- **Accessibility and mobile**: Pass with implementation gate. The divider must be named, keyboard-operable, focus-visible and touch-operable; narrow layouts must retain bounded scrolling.
- **Trust, privacy and data boundaries**: Pass. No source data, map state, private workspace, or persistent profile is changed by resizing.
- **Tests and evidence**: Pass with implementation gate. Add a synthetic browser regression for list scroll and divider interactions; run documented map build and browser checks.
- **Small, reversible change**: Pass. Limit runtime changes to map-key layout and its resize interaction; no schema or dependency changes.

## Design Decisions

1. Treat the controls and layer list as the two resizable sections indicated by the supplied DOM.
2. Use a horizontal separator between the vertically stacked sections. Pointer/touch dragging and arrow/Home/End keyboard commands adjust the same bounded split.
3. Give both sections their own vertical overflow region with overscroll containment. A long controls area can scroll without taking the layer list's space.
4. Compute the separator bounds from the current sidebar height and fixed heading/footer/separator sizes. Re-clamp after sidebar resizing; no storage or map interaction is introduced.
5. Add a synthetic browser regression to the existing map workflow browser suite and update local help text.

### Risks and Mitigations

- **Short viewports leave little room for both sections**: derive split bounds from available height, preserve a minimum share for each section, and verify a constrained viewport.
- **Pointer capture or wheel handling interferes with map controls**: keep the divider inside the sidebar, contain scrolling in each section, and verify map state remains unchanged in the browser regression.
- **Source/category content is re-rendered dynamically**: keep the resize control outside the dynamic content root and verify existing key-opening, mask and responsive flows.

## Project Structure

```text
tools/hajin-map/
├── src/
│   ├── main.ts                          # Map-key divider markup and bounded interactions
│   └── styles.css                       # Split layout and independent scroll regions
├── tests/
│   └── field-workflow-browser.mjs       # Synthetic scroll, resize and state-preservation regression
└── help.html                            # User-facing resize and scroll instructions

docs/
└── local-map-workspace.md               # Local workspace map-key behavior

specs/065-map-key-scroll-resize/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
├── checklists/ux.md
└── tasks.md
```

**Structure Decision**: Extend the existing map application and synthetic browser workflow. No external interface contract, persistent data model, or dependency is required.

## Verification Gates

1. Reproduce the original constrained-height issue and verify the layer list has at least 120px of visible area with a synthetic long list at a 620px viewport.
2. Verify first-to-last-to-first scrolling, pointer/touch and keyboard divider movement, resize bounds, mobile layout and unchanged map/layer state using synthetic data.
3. Run map unit tests, strict build, map browser suite, and repository-documented checks appropriate to this UI repair; record exact outcomes and unavailable checks.
4. Converge the implementation against FR-001–FR-005 and SC-001–SC-004. Do not claim physical-device or screen-reader testing.
