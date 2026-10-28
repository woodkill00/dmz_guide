# Tasks
## Phase1 Definition
- [x] T001 Define spec/clarify/constitution/plan/model/requirements checklist in specs/026-workspace-help; analyze and independent definition review. FR001–005/SC002.
## Phase2 Help and navigation
- [x] T002 Implement static help.html/src/help.css and Vite multi-page entry; map Help links. FR001/004/005.
- [x] T003 Add strict tool allowlist tests and src/tool-links.ts; guarded app openTool and initial main routing with readiness/failure/focus. FR002/003.
## Phase3 Acceptance
- [x] T004 Implement scripts/help.browser.cjs and wire full runner: all targets, anchors/provider URLs, noJS/missingterrain/mobile, no update or saved-state mutation, draft preservation. FR001–005/SC001.
- [x] T005 Run unit/build/full browser/repository checks; independent navigation/UI review, analyze/converge repair cycle, acceptance and user docs. SC002.

Dependencies T001→T002→T003→T004→T005, serialized. No parallel implementation; independent reviewers only. MVP readable guide precedes direct tool navigation. Rollback has no data migration.

## Phase4 Convergence
- [x] T006 Repair HELP-R1/R2 handbook accuracy: Find searches names/categories/source names (not notes); background button order Preview→Keep→Calibrate→Validate→Accept→Compare. Recheck against source and independent reviewer; regression content assertions in scripts/help.browser.cjs. FR001/005/SC002.

Evidence: acceptance.md.92unit/60browser/build/repository/diff checks passed; built help noJS/mobile verified. Independent requirements/content/navigation reviews complete; final convergence leaves no remaining work.
