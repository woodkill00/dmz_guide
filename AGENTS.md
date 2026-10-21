# Repository instructions

Read README.md, .specify/memory/constitution.md, docs/spec-kit-cycle.md, and the owning change artifacts before editing. This is a bootstrap, not a running application. Preserve the product roadmap and do not label planning as shipped behavior.

1. Use the applicable pinned Spec Kit workflow for every change. Production features require the full cycle; repairs require assessment, scoped fix and reproduction-based verification. See docs/tutorials/change-types.md for documentation and emergency handling.
2. Resolve the active feature explicitly through SPECIFY_FEATURE_DIRECTORY or .specify/feature.json. Branch changes alone do not select it. Keep machine-local feature state out of commits. Use isolated worktrees for parallel features and serialize shared-contract edits.
3. Keep requirements, plans, tasks, tests and decisions consistent. Analyze reports findings; repair owning artifacts. Converge appends missing work; rerun implementation and verification. Never claim a skill ran if you only reviewed its instructions.
4. Reviewer-owned checklists are not implementer-owned task lists. Do not self-approve them, weaken tests, remove failing fixtures, or turn unexecuted tests into passing evidence.
5. Never invent game facts, sources, scope denominators, unlock rules, rights or launch availability. Label synthetic fixtures. Keep private profiles, credentials and original user screenshots out of public history.
6. Treat imports, archives, links and images as untrusted. Enforce limits, preview and transactional recovery. Do not fetch arbitrary remote assets or execute imported content.
7. Keep changes small and reversible. Record touched paths, requirement IDs, dependencies and test evidence. Preserve 001 as the approved planning baseline; track implementation changes through reviewed artifacts.
8. No account linking, paid service, deployment, credential provisioning, publishing assets or repository-setting change is implied by a coding task. Respect the specific authorization given. Stop dependent work on security, rights or data-loss blockers.
9. Run the repository's documented checks and record exact results, including unavailable checks. Follow CONTRIBUTING.md and SECURITY.md. Do not publish confidential vulnerability details.
