# Upgrade checkbox access repair

## Reproduction and outcome

On `/upgrades/`, a saved profile tied to an older schema or catalog version displays checkboxes that do not accept clicks. The reason and recovery control are hidden inside each row's collapsed Details panel. Show the blocking reason above the checklist and link to the matching catalog's Settings review. For an editable profile, explain that the checkbox opens a confirmation dialog before saving.

## Requirements

- **FR-001:** An older schema shows a visible migration explanation and a Settings link for the selected pack.
- **FR-002:** A mismatched content version shows a visible content-binding explanation and Settings link.
- **FR-003:** An editable profile retains the confirm-before-save flow and communicates it before interaction.
- **FR-004:** No automatic migration, rebind, inventory change, or progress mutation is introduced.
- **FR-005:** Browser verification covers an editable click/save and a disabled legacy profile.

## Scope

Focused Upgrades page guidance and regression tests. No game catalog or private profile data changes.
