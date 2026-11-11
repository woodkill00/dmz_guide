# X01 planning workbench

Status: implemented and locally verified, 2026-11-11; independent review and player gameplay/device observations remain open. The owner approved the seven recommended X01 improvements: calibrated source review, private markers, crowded-marker selection, guide links, reviewed source refresh, connector-aware waypoint planning, and gameplay verification including mobile/accessibility checks.

## Player outcomes

- FR-001: Compare DMZHub and COD Central X01 sources floor by floor. Display an evidence-based alignment, anchor count and residual error. Show likely same-place candidates separately until the player marks Same or Separate; never silently merge source records.
- FR-002: Clicking crowded map markers opens a stable list of nearby markers so every member can be selected. Search and keyboard-accessible result lists remain alternatives to map gestures.
- FR-003: Add, edit and delete private X01 POIs by right-clicking or using a coordinate form. Save notes and optional bounded PNG/JPEG/WebP photos locally. Export and preview a complete portable backup before replacing private state.
- FR-004: Open known X01 map destinations from guide surfaces with an exact matching marker identity. The currently mapped guide destination is the in-raid printer; key, boss, item and mission references without an exact X01 marker remain unlinked. Links identify the local map and select the correct floor/marker.
- FR-005: Import a newly captured COD Central or DMZHub snapshot as a local draft. Show added, removed, renamed and moved records with source identity before Apply. Reject malformed/oversized input and preserve the prior snapshot on failure. Never update automatically.
- FR-006: Build a reorderable X01 waypoint plan using known floor connectors and explicit door/access notes. Show schematic straight segments, connector transitions and uncertainty; never present the plan as a verified traversable path or ETA.
- FR-007: Record dated player observations for source markers, custom points and route/connectors, with game build, outcome and notes. Distinguish owner observations from source claims. Use a real-phone and accessibility acceptance matrix; do not claim gameplay observation without owner evidence.

## Boundaries

X01 basemaps and third-party icons remain owner-local. Private state stays in this browser by default and is excluded from Git. Source alignment is an approximate, measured display transform; duplicate review decisions are owner-local and reversible. Road-level navigation, live game positioning, account sync and current-match spawn/exfil state remain unknown.
