# Feature Specification: SVG icon studio

**Feature Branch**: `feat/025-svg-icon-studio`
**Created**: 2026-10-28
**Status**: Implemented and verified locally; see acceptance.md
**Input**: Create our own SVG icons for different marker types, easy to customize and create.

## User Scenarios & Testing

### User Story 1 — Create a marker icon (P1)
In My icons, choose an original starter design, change its frame, symbol, colors, border, symbol size/rotation or short label and see previews at marker and enlarged sizes. Save it to the private library and select it for a POI or category.
**Independent test**: create a medical icon, customize it, save, assign to a point and reload; the saved icon remains displayed.
**Acceptance**: changes immediately update previews; blank accessible descriptions, invalid nonempty labels and invalid settings cannot save; an empty optional label uses the selected symbol; successful save preserves an editable design; repeated identical save does not duplicate library entries.

### User Story 2 — Make variants and export (P2)
Open a saved design as an editable copy, create a variation, download SVG or PNG. Existing referenced icons retain their appearance. A private backup restores the editable design as well as its marker image.
**Independent test**: reopen, change color, save a variant, export both formats and restore backup; old point references remain valid.

### Edge Cases
Cancel a draft; try switching tabs/closing with edits; cancel image processing; full library/storage failure; duplicate image content; malformed restored recipes; imported raster icons without recipes; long/inert descriptions; small screens and keyboard input. Failed saves preserve current data and editable draft.

## Requirements

### Functional Requirements
- FR-001: Provide at least six named starter designs and frame/symbol selection, three colors, border width, symbol size and rotation, plus optional 1–3 alphanumeric label in place of a symbol; accessible description required.
- FR-002: Show live enlarged and actual marker-size previews on contrasting backgrounds, keyboard-operable labeled controls, and no horizontal overflow at360px.
- FR-003: Save locally to the existing icon library; icons can be selected for custom POIs and category defaults. Preserve existing raster upload behavior and icon/storage limits. Same image content is not added twice.
- FR-004: Reopen saved designs as editable copies; save variants without changing existing references. Preserve editable recipes in reload and private backup/restore; older raster-only icons/backups remain valid.
- FR-005: Download a self-contained SVG and transparent PNG from the current valid design, with matching colors/frame/symbol and meaningful accessible description. SVG contains only locally generated bounded primitives and escaped text; no external resources or executable content.
- FR-006: Integrate dirty-draft guards, cancel, revision checks and transactional save failures. No remote calls, arbitrary SVG markup import, freehand/path editor, account, or public publishing in this slice.

### Key Entities
- Icon design: versioned editable frame, symbol/label, colors and dimensions, attached to an owned saved icon.
- Saved icon: existing content-identified sanitized marker image, accessible name and optional editable design.

## Success Criteria
- SC-001: End-to-end creation/assignment/reload, variant independence, duplicate save, downloads and private-backup round trip pass browser tests.
- SC-002: Invalid/hostile designs and unsupported restored settings are rejected without changing saved state; raster-only regressions and complete map unit/build/browser checks pass.
- SC-003: Independent requirements, security/data and UI review plus analyze/converge leave no actionable issues.

## Assumptions and Clarifications
Preset-driven vector composition is the first useful slice; unrestricted SVG editing is separate. Original built-in symbols require no external assets. Saved map images use existing PNG infrastructure while editable recipes regenerate downloadable SVG. Variants are explicit new saves, preserving existing point appearances. No blocking clarification remains.
