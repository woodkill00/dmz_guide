# Research: Map Key Scrolling and Resizing

## Findings

- The supplied panel reproduction is confirmed in the local viewer: with a 620px-high browser viewport, the sidebar is about 541px high, the toolbar occupies about 382px, and the layer-list scrollport has only 30px of usable height. Its content is very long, so it is technically scrollable but difficult to reach and use.
- The sidebar is a vertically stacked flex layout. Its key toolbar does not shrink or scroll, while the key list is the only scroll container. This lets the toolbar crowd the list even though the list has overflow enabled.
- The toolbar, list root, and resize control can remain outside dynamically replaced source/category descendants. Existing key visibility and map selection handling need not change.
- `src/map/menu-layout.ts` already uses bounded pointer capture, keyboard controls, focus styling and `ResizeObserver` for browser-local display behavior. It is related interaction prior art, not a suitable shared splitter abstraction.
- No existing accessible splitter implementation was found in the map app. A small map-key-specific separator is simpler than coupling this control to draggable map overlays.

## Decisions

- **Decision**: Add a separator between the map-key controls and layer list, and make both sections independently scrollable.
  - **Rationale**: This directly addresses the measured collapse and gives users explicit control over the tradeoff between the sections.
  - **Alternatives considered**: Keep a fixed controls height (does not let users choose the split); allow only whole-sidebar scrolling (does not keep both controls and list available); apply CSS native resize handles independently (less discoverable and no consistent keyboard interaction).
- **Decision**: Keep the split in the current page session only.
  - **Rationale**: The request is about usability, not saved preferences. Avoids adding storage state or changing private workspace backup semantics.
  - **Alternatives considered**: Persist divider position in browser storage (unrequested and adds validation/migration surface).
- **Decision**: Validate with synthetic Playwright content and existing map checks.
  - **Rationale**: The layout can be exercised without reading owner-local map assets or profile data, and existing browser checks already guard map behavior.
  - **Alternatives considered**: Rely only on screenshot inspection (does not verify scroll positions, keyboard operations or state preservation).

## Open Questions

None. The feature is limited to the two sections identified by the attached element context.
