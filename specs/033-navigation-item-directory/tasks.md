# Tasks
- [x] T001 Define scoped stories/clarifications and architecture in spec.md, plan.md, research.md and contracts/navigation.md.
- [x] T002 Independent requirements-quality review in checklists/navigation-safety.md.
- [x] T003 [US1] Add shared navigation and sitemap/local-map workspace pages in src/ui/render.mjs, src/ui/navigation-page.mjs and scripts/build.mjs (FR-001/002/007).
- [x] T004 [US2] Add compact item rows and sorting in src/ui/render.mjs, src/client/catalog.mjs, src/styles.css (FR-003/004/007).
- [x] T005 [US3] Add exact removal-preview intent through src/content/author-target.mjs, src/ui/author-actions.mjs and src/client/studio.mjs (FR-005/006).
- [x] T006 Add runtime regressions tests/runtime/navigation-directory.test.mjs and browser journeys tests/browser/navigation-directory.mjs; wire browser runners (FR-001–007).
- [ ] T007 Run checks/browser verification and independent code/visual review; record acceptance and convergence (SC-001–004).

Dependencies: T001→T002→T003/T004/T005→T006→T007. Changes serialized in this worktree; parent integrates catalog/repair separately. Each story independently testable as described in spec.
