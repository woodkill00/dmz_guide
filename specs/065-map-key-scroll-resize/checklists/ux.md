# UX Requirements Checklist: Map Key Scrolling and Resizing

**Purpose**: Review the clarity and completeness of map-key layout requirements  
**Created**: 2026-11-04  
**Feature**: [spec.md](../spec.md)

**Note**: This custom checklist is a reviewer-owned requirements-quality review artifact.
**Review Ownership**: Mark an item `[x]` only when a reviewer determines that the requirement-quality criterion is satisfied.
**Marker Semantics**: `[x]` records requirements review, not implementation completion.

## Requirement Completeness

- [ ] CHK001 Are the controls and layer-list areas clearly identified as the two independently scrollable sections? [Completeness, Spec §FR-001]
- [ ] CHK002 Are the map state and private workspace boundaries explicitly covered by the resizing requirements? [Coverage, Spec §FR-004]

## Requirement Clarity

- [ ] CHK003 Are the divider's orientation, bounded range, and effect on each section clear? [Clarity, Spec §FR-002–FR-003]
- [ ] CHK004 Are the keyboard and direct-manipulation resize interactions specified without conflicting with existing map controls? [Consistency, Spec §FR-003–FR-005]

## Acceptance Criteria Quality

- [ ] CHK005 Can the visible list-area threshold and full-list scrolling outcome be objectively evaluated? [Measurability, Spec §SC-001–SC-002]
- [ ] CHK006 Are responsive and short-viewport constraints measurable enough to distinguish a usable split from a collapsed section? [Measurability, Spec §SC-003, FR-005]

## Edge Case Coverage

- [ ] CHK007 Are small viewports, interrupted resizing, and oversized content addressed consistently? [Edge Case, Spec §Edge Cases]

## Notes

- Reviewer must assess the requirements themselves; implementation and test results do not authorize marking these items.
