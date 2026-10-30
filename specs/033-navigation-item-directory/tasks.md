# Tasks
- [x] T001 Define scoped stories/clarifications and architecture in spec.md, plan.md, research.md and contracts/navigation.md.
- [x] T002 Independent requirements-quality review in checklists/navigation-safety.md.
- [x] T003 [US1] Add shared navigation and sitemap/local-map workspace pages in src/ui/render.mjs, src/ui/navigation-page.mjs and scripts/build.mjs (FR-001/002/007).
- [x] T004 [US2] Add compact item rows and sorting in src/ui/render.mjs, src/client/catalog.mjs, src/styles.css (FR-003/004/007).
- [x] T005 [US3] Add exact removal-preview intent through src/content/author-target.mjs, src/ui/author-actions.mjs and src/client/studio.mjs (FR-005/006).
- [x] T006 Add runtime regressions tests/runtime/navigation-directory.test.mjs and browser journeys tests/browser/navigation-directory.mjs; wire browser runners (FR-001–007).
- [x] T007 Run checks/browser verification and independent code/visual review; record acceptance and convergence (SC-001–004).

Dependencies: T001→T002→T003/T004/T005→T006→T007. Changes serialized in this worktree; parent integrates catalog/repair separately. Each story independently testable as described in spec.

Current checkpoint: T007 implementation checks, browser verification and independent code/visual review are complete at all-green `7a0b4caf`. See acceptance.md for exact runs and artifact limits. Final documentation-head CI, merge and post-merge verification remain release gates tracked in PR #28 before completion.

- [x] T008 Assess all-page gaps and trace FR-001/SC-001 repair scope; independent focused design review.
- [x] T009 Shared escaped navigation renderer; static map/help injection, Studio navigation and responsive map sizing; no API or state changes.
- [x] T010 Reproduction-based unit/browser checks for all generatedHTML, companion pages, navigation links, pack/privacy, no-JS/mobile and drafts. Build/repository/format and appropriate map regression verification.
- [x] T011 Converge independent findings, record exact evidence and commit locally. No push/merge authorized for this repair.

- [x] T012 Regression fixture repair: explicitly frame synthetic icon points before asserting density-off restores at least4icons. New nav shrinks the viewport; viewport-culling criteria and original4/0/restored count assertions remain unchanged.

- [x] T013 Existing navigation journey: scope the map-workspace CTA count to main and assert one global navigation map link separately. Both intended destinations stay present without weakening the original main CTA check.

- [x] T014 Exhaustive HTML-renderer inventory: add shared static companion menu to scripts/author-preview.mjs saved previews. Preserve saved revision/lazy media/noJS and escape boundaries; extend preview contract and actual/noJS browser coverage.

- [x] T015 Real resize convergence: synchronous invalidateSize counter-pan preserves center when the key changes available width under wrapped navigation. Retain original exact menu-drag center comparison; verify bounds/overview/resize regressions and engines.
