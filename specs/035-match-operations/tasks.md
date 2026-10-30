# Tasks
- [x] T001 Define/clarify035 and select context; specs/035-match-operations/spec.md. FR001–009.
- [x] T002 Independent definition checklist, plan/model/contracts and read-only consistency analysis before production edits; specs/035-match-operations. FR008/009.
- [x] T003 Strict optional operations domain, journal/road validation/dependency pinning, route duplicate/move/rebind/search/impact/backup-diff pure helpers and tests; workspace/operations.ts,field-guide.ts,tests/operations.test.ts. FR001–008.
- [x] T004 Journal/checklist/start/end/promotion/notes/export UI and toolkit marks bridge; operations-ui.ts,toolkit-ui.ts. FR002/003.
- [x] T005 Road reports/trace links/stale status and optional overlay; operations-ui.ts. FR001.
- [x] T006 Opt-in manual map drag, protected source replacement, insertion, duplicate and alternatives comparison; field-guide-ui.ts,operations-ui.ts. FR004.
- [x] T007 Update impact summary, single current-reference repair and historical caution; source-updates.ts,operations-ui.ts. FR005.
- [x] T008 Workspace search with exact editor targets and existing restore-preview comparison/backup receipt walkthrough; app.ts,operations-ui.ts,toolkit-ui.ts. FR006/007.
- [x] T009 Help/styles/gameplay worksheet plus focused/full units/browser/3engines/axe/320px/capacity; scripts/operations.browser.cjs and runners. FR009.
- [x] T010 Analyze/converge independent code/security/visual findings, acceptance and local commit; specs/035-match-operations. SC001–003.
Dependencies T001→T002→T003→T004/T005/T006→T007/T008→T009→T010; shared contracts serial, no parallel implementation writes. External gameplay worksheet remains not-tested until owner supplies observations.

- [x] T011 Convergence: invisible Leaflet popup fade must not intercept immediate map clicks/right-click draft reopening; retain unchanged authoring/grid assertions and add scoped pointer-events CSS. styles.css,existing browser regressions. FR004/009.
