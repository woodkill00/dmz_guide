# Bootstrap implementation plan

## Technical context
Python 3.11+ standard library for offline project checks; official Spec Kit 1.2.2 Codex skills and Bash scripts; GitHub Actions on Linux and Windows (Git Bash). No runtime application package or network dependency is needed to validate repository structure.

## Constitution check
Small reversible slice, testable evidence, separation of game content from private state, no asset-rights assumptions. Preserve the proposed product constitution; ratification/amendments remain explicit review work rather than invented owner agreement.

## Design
Keep upstream files unmodified and hash-pinned in speckit.lock.json. Keep project policy outside upstream templates. Use existing feature directories and a validated selector writing only upstream's ignored .specify/feature.json. Author checks that fail on drift, malformed metadata, missing requirement coverage, dangling task references, missing evidence and broken relative file links. Do not claim these structural tests verify game semantics, external URL availability or Markdown anchors.

## Delivery sequence
T001 source/integration; T002 retained plans; T003–T004 contributor selection; T005–T007 traceable checks and documentation; T008–T009 cross-platform validation; T010 independent review and publication. Read-only checkout permissions, full-SHA actions and no workflow secrets. Merge only after independent approval and passing required quality jobs.
