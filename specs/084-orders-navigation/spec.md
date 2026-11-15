# Orders navigation and directory

## Outcome

The Orders directory is a main navigation destination. Its menu exposes Hajin pages 1–24 and X01 pages 1–5 as separate subsections, each linking directly to the matching roster. Individual mission pages and their editing/audit links remain reachable.

## Requirements

- **FR-001:** Label the main navigation entry and destination page Orders; preserve existing `/missions/` deep links and private progress.
- **FR-002:** Show a compact Hajin pages subsection with direct links for pages 1–24.
- **FR-003:** Show a separate X01 subsection with direct links for pages 1–5.
- **FR-004:** On destination, provide clear Hajin and X01 headings and preserve linked individual mission records and audit actions.
- **FR-005:** Navigation works on guide and companion menus, keyboard and mobile disclosure modes, and with the selected pack.
- **FR-006:** Verify browser navigation from the menu to both page sets and regression checks.

## Boundaries

No mission facts, source status, roster assignments, or saved progress change. `/missions/` remains stable so existing links continue working.
