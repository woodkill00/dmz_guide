# X01 shared Hajin symbols

Status: implemented and locally verified, 2026-11-11. The owner wants X01 marker types that also exist on Hajin to use the same icons and visual pin treatment.

## Player outcomes

- FR-001: On both X01 source views, Exfil, Ammo Armor Cache, Bounty, Spawn, Safe and Key symbols use the active local Hajin icon for the same type when that icon is available. Emergency Exfil uses the Hajin Exfil symbol but retains its distinct category label.
- FR-002: The X01 category list shows the same shared symbol as its map markers for matched types. X01-only types keep their source-specific icon and label.
- FR-003: Icon reuse follows the current local Hajin capture pointer, so a reviewed Hajin source update can refresh symbols without hardcoded generation paths. Missing or malformed local Hajin assets fall back to the existing X01 icon without losing markers or filters.
- FR-004: The shared icon lookup makes local-only requests, validates paths and bounds input. It does not read or modify private Hajin workspace state.

## Boundary

This is a visual icon mapping. It does not combine map coordinates, source markers, or category counts.
