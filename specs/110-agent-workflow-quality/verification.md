# Verification: agent workflow quality

Feature branch: `feature/110-agent-workflow-quality`, implementation based on `201f039833a54ac6ff3630a72e889680cca4df40`. Tooling/instructions only: no product source, game records, player profiles, schemas or global agent configuration changed. No commit/push/merge or new GitHub CI result is implied by this record.

## Workflow receipts

Pinned instructions were followed as a Codex workflow, not a claim that a separate slash-command service or workflow runner executed. No extension hooks are configured. Actual commands included template resolution, feature selection, setup-plan, setup-tasks and prerequisite checks through existing WSL Bash scripts. The ignored pointer selects this feature independently of the Git branch. Specify/clarify captured the approved scope and existing decisions; no blocking question remained.

Independent analysis found three artifact gaps, which the implementation owner repaired. Reanalysis accepted all requirements with zero findings before implementation. See [analysis](analysis.md) and [reviewer checklist](checklists/workflow-quality.md). Final review found a metadata-validation defect requiring a real regression/fix/recheck; final acceptance is tracked in [review](review.md).

## Executed checks

| Check | Observed result |
| --- | --- |
| Original source identity | All 37 original files match their Git blob identities at upstream commit 6f7f7831a625f040a8e06a0e7954826b87ce775a |
| Offline real installation, Windows and WSL | Both validate/list all 12 helpers; integrity success explicitly does not claim behavioral acceptance |
| System skill-creator frontmatter checker | All 12 local helpers pass using existing WSL Python/PyYAML; no new dependency installed |
| Negative tests and final metadata repair | Initial permissive stub failed 24/25 cases. Independent review later exposed duplicate YAML sections; four new regressions failed before repair. Final expanded suite: 38/38 pass, zero failures/skips, on Windows Node 24.15 and WSL Ubuntu Node 24.20, including CLI paths with spaces/from another cwd |
| Relevant formatting and repository contracts | Final format:check passes; check-python reports zero failures; real skills:check and skills:list pass |
| Full runtime suite | npm test: 1,237 passed, zero failures/skips. Additional metadata/CLI cases introduced during the full run were verified afterward in the complete 38-case targeted suite on both platforms |
| Full Python suite | Serial rerun: 79 tests, OK, exit 0, 783.382s. Initial concurrent run had one existing 60s reproducibility-build timeout; original evidence retained. Serial run passed that same test without timeout/assertion changes |
| Guide build and readiness | Built 2,277 routes plus 404; unified local startup reports already running on port 4173 and HTTP 200 |
| Exact official pin preservation | No diff to speckit.lock.json, official skills, scripts or templates |

Machine-local raw command output is retained under ignored test-results/110-*.log. These logs are not a substitute for the sanitized receipts below.

## Actual agent exercises

| Capability | Actual exercise and receipt |
| --- | --- |
| diagnose, test-first, design | Fictional missing-stock defect: original exit1, repaired exit0, minimized cause and interface note |
| prototype, architecture | Fictional 220px card: original rendered overflow, corrected layout, measured actual 16/32px text, interaction and keyboard behavior |
| research, domain | Fictional primary source correction: original quantity failure, sourced correction, retained unknown rarity, domain-only glossary |
| handoff, write-agents, retro | Scoped instruction exercise and sanitized handoff; independent fresh resumer located evidence and caught stale review state |
| review, pr | Separate actor found standards and specification regressions, drafted a local PR body, then independently rechecked repaired code |

See [forward pilots](evidence/forward-pilots.md), [review/PR pilot](evidence/review-pr.md) and [fresh resume](evidence/resume.md). Fixture generation is only setup. All source data is fictional and explicitly labeled. Reviewer found three independent renderer failures and verified all pass after the integration owner's repair; original red reports remain historical evidence. The resumer correctly distinguished old review bytes from the current candidate.

The initial UI fixture failed to prove enlarged text because its body used a fixed font. The actor independently measured that gap. The integration owner separately hardened the maintained fixture/oracle to assert computed font size; the corrected prototype passed that stronger check. This is a fixture repair, not a production bug claim.

## Limits

Fresh actors initially demonstrated repository/file discovery and direct-path instruction use. The original runtime did not refresh its supplied skill catalog. Subsequent [CLI discovery evidence](evidence/discovery.md) verifies all twelve enabled repository-scoped entries through the actual catalog loader without extra roots. Refreshed IDE picker rendering and implicit model selection remain unverified. Structural validation cannot prove model decisions. Fictional exercises do not verify live game data, physical devices or every future task. Exact-head GitHub CI and post-merge results are tracked in the pull request rather than being claimed by the implementation receipts above.

## Convergence

Assessed the twelve installed capabilities, source/adaptation inventories, CLI contracts, documentation and actual receipts against all ten functional requirements and four success criteria. No remaining buildable work or missing task was found after the metadata repair and serial verification. The convergence assessment appended no empty phase or duplicate tasks. Final reviewer acceptance is recorded separately in review.md; task completion is maintained by the implementation owner.

## Rollback

Revert this tooling slice and its docs/package/CI pointers after review. Preserve the official pins, existing feature history, player state and unrelated private files. There is no data migration or global plugin installation to undo.
