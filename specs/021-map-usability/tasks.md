# Tasks: Map usability

## Phase1 Contracts
- [x] T001 Add optional bounded usability metadata/validators and old/new private-backup round trips in workspace/usability.ts, model.ts, backup.ts; unit failures before implementation. FR003/006/007,SC002.
- [x] T002 Build pure derived index, capture identities, duplicate member details/exception handling and bounded completeness classifications in explorer-index.ts and display-duplicates.ts; unit adversarial cases including same-time/different-digest inactivity and250,000-work incomplete results. FR001/002/005/008,SC002/004. DependsT001.
## Phase2 User flows
- [x] T003 Add Explore/Find search and keyboard result jump/highlight/details with hidden/unplaced explanations and draft guards. FR001/004/008,SC001/003. DependsT002.
- [x] T004 Wire clickable matching rows, member distances and reversible persisted keep-separate decisions including inactive dependencies. FR002/007/008,SC001/002. DependsT003.
- [x] T005 Implement saved-view save/apply/delete and private discrepancy flag/resolve/reopen; richer source/custom popups, copy fallback and custom Edit. FR003/004/007/008,SC001/002/003. DependsT003.
- [x] T006 Add completeness review UI and nonmodal backup status/reminder/snooze/export tracking; bound storage and preserve editing on errors; verify exact counted/excluded mutations, first-dirty age anchor and24h snooze. FR005/006/007/008,SC001/002/003. DependsT005.
## Phase3 Acceptance
- [x] T007 Add browser journeys/backup/legacy/360px/keyboard/adversarial fixtures; run production capacity and record actual checks in verification.md. FR001–008,SC001–004. DependsT004/T006.
- [x] T008 Update workflow docs; analyze/converge and independent review/fix cycle until no actionable findings. Preserve reviewer checklist ownership. FR008,SC005. DependsT007.

## Phase4: Convergence

- [x] T009 Allow authored discrepancy notes to be edited after their exact source capture is omitted/unavailable, with existing ownership/draft guards and private backup semantics. Add restore→inactive-note edit→save regression. FR004/007 (partial), SC001/002.
