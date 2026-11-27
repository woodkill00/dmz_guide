# Tasks: Agent workflow quality and continuity

## Phase 1: Definition and review

- [x] T001 Specify/clarify approved scope in specs/110-agent-workflow-quality/spec.md (FR-001–FR-010).
- [x] T002 Record design/research/entities/contracts/validation in specs/110-agent-workflow-quality/plan.md, research.md, data-model.md, contracts/cli.md and quickstart.md (FR-002, FR-003, FR-009).
- [x] T003 Independently analyze and repair spec/plan/tasks until no findings remain; reviewer owns specs/110-agent-workflow-quality/analysis.md and checklists/workflow-quality.md (all FR; SC-001–SC-004).

## Phase 2: Installation foundation

- [x] T004 Install twelve complete selected original folders and LICENSE at the source pin in vendor/agent-skills/mattpocock/; describe adaptations in NOTICE.md (FR-001, FR-002, FR-009).
- [x] T005 Author all twelve .agents/skills/dmz-*/SKILL.md and agents/openai.yaml with precise discovery/local policy (FR-001, FR-003–FR-009).
- [x] T006 Write agent-skills.lock.json with complete source/adaptation SHA256 inventory; preserve official pins (FR-002; SC-001).

## Phase 3: US1 - Offline tooling

- [x] T007 [US1] Add initially failing boundary tests in tests/runtime/agent-skills.test.mjs for schema, integrity, escaping/symlinks, extras, missing/license, names/metadata/references and no mutation (FR-002, FR-009, FR-010; SC-002).
- [x] T008 [US1] Implement scripts/check-agent-skills.mjs; satisfy Windows/WSL tests; expose package.json commands and wire .github/workflows/quality.yml (FR-002, FR-009, FR-010).

## Phase 4: US2/US3/US4 - Operational use

- [x] T009 [US4] Add GLOSSARY.md and docs/agents/README.md, workflows.md, repository-map.md, testing.md, domain.md, issue-tracker.md; short pointers in AGENTS.md, docs/spec-kit-cycle.md and docs/README.md (FR-003, FR-006–FR-010).
- [x] T010 [US2] Create fictional exercises with independent oracles in tests/agent-workflows/pilot-fixtures.mjs; expose skills:pilots in package.json (FR-004, FR-007, FR-010).
- [x] T011 [US2] Run installed helpers in independent bug/UI/content pilots and fix observed issues; receipts in specs/110-agent-workflow-quality/evidence/ (FR-004, FR-007, FR-010; SC-003).
- [x] T012 [US3] Exercise standards/spec review, handoff/resume and all twelve capabilities using the explicit matrix in plan.md; run a fresh-agent discovery probe without supplying helper names, distinguish repository discovery/direct-path use from unavailable UI/catalog verification, and record receipts/limits in specs/110-agent-workflow-quality/evidence/ (FR-001, FR-005–FR-008; SC-003).

## Phase 5: Verify and converge

- [x] T013 Run integrity/frontmatter/formatting, relevant Python/repository checks and full runtime tests; verify official pins and product/private state unchanged; specs/110-agent-workflow-quality/verification.md (all FR; SC-001–SC-004).
- [x] T014 Converge current implementation, append/resolve missing work and obtain independent acceptance in specs/110-agent-workflow-quality/review.md (all FR; SC-004).

## Dependencies and parallel ownership

T003 gates implementation: T004–T012 cannot start until the independent analysis has zero findings and the reviewer has accepted the requirements checklist. The implementer repairs owning artifacts outside read-only analysis; the reviewer reanalyzes, without repairing implementation. T004 → T005 → T006. T007 precedes T008, which validates the install. T009/T010 precede T011/T012; pilot repairs precede T013/T014. Integration owner serializes manifest/package/CI/docs. After analysis a validator agent may own only its script/tests while the integration owner edits disjoint helpers/docs. Reviewers never edit implementation. Pilot actors write only OS-temp outputs and sanitized receipts. No shared build mutation or concurrent production feature is planned.
