# Implementation Plan: Agent workflow quality and continuity

**Branch**: `feature/110-agent-workflow-quality` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

## Summary and Technical Context

Ship twelve concise `dmz-*` project helpers backed by a reviewed inert upstream snapshot, explicit local adaptations, a complete integrity manifest and behavioral pilot evidence. Node 22/24 standard-library ESM for offline validation; Python 3 for the existing installer/checker; existing Playwright for fictional UI pilots. No new dependencies. Windows/Ubuntu ordinary files, no symlinks. Source: mattpocock/skills MIT commit `6f7f7831a625f040a8e06a0e7954826b87ce775a`.

## Constitution Check

Pre/post-design: no player data, game claims, migrations or publishing; small reversible tooling slice; attributed source and offline integrity; independent review; requirement/task/test traceability. Preserve 001, official Spec Kit pins and ignored active state. No exceptions.

## Project Structure and Ownership

- `agent-skills.lock.json`: schema/version/source/license, twelve helper mappings, SHA256 inventories of original/adapted files, baseline Spec Kit lock digest.
- `vendor/agent-skills/mattpocock/`: LICENSE and complete selected original folders with references/credits. `NOTICE.md` records differences and update provenance. Inert reference, not an automatically loaded policy. Vendored scripts are never automatically executed.
- `.agents/skills/dmz-{diagnose,test-first,review,domain,write-agents,handoff,retro,research,prototype,design,architecture,pr}/`: concise SKILL.md plus agents/openai.yaml, precise normal implicit discovery and unique names. Local instructions are self-contained; upstream is optional historical reference, not a second mandatory workflow.
- `docs/agents/{README,workflows,repository-map,testing,domain,issue-tracker}.md`, root GLOSSARY.md, short updates to AGENTS.md, docs/spec-kit-cycle.md and docs/README.md. Reuse existing ADRs and task authority.
- `scripts/check-agent-skills.mjs`: exported pure validation plus read-only offline CLI. Reject bad schema, absolute/traversal/duplicate paths, symlinks, missing/changed/extra inventory files, bad names/metadata/references and changed official pins. Sort diagnostics; `--list` lists validated helpers.
- `tests/runtime/agent-skills.test.mjs`: disposable checkouts exercise integrity, escaping, missing/license/extra content, naming/metadata/reference and unchanged-filesystem cases; independently supplied expected values.
- `tests/agent-workflows/pilot-fixtures.mjs`: creates three isolated fictional exercises in OS temp, with specs, sources and independent oracles. Setup is not an LLM evaluator. Agents execute the installed instructions; sanitized receipts go to this feature's evidence directory.
- `package.json`: skills:check, skills:list, test:skills, skills:pilots. `.github/workflows/quality.yml`: offline integrity in existing cross-platform runtime job, preserving current checks and deadlines.

Integration owner controls manifest/package/CI/docs/helpers. Validator implementer owns only script/tests. Reviewers own only review records. Pilot actors own OS-temp outputs and sanitized receipts. Shared build outputs are untouched.

## Data and Contracts

See [data-model.md](data-model.md) and [CLI contract](contracts/cli.md). Inventory represents actual reviewed bytes. Install original folders at the immutable ref, preserve companion files/license, record hashes, then adapt locally. Future source/manifest changes need reviewed diffs; there is no automatic lock-regeneration/update command that silently trusts tampering.

## Delivery and Verification

1. Specify/clarify and generate design artifacts/tasks/checklist; no extension hooks are configured.
2. Independent read-only analysis; implementation separately repairs owning artifacts and reruns analysis until no findings remain. Reviewer acceptance gates delivery.
3. Existing installer uses explicit --ref/--dest for the inert snapshot; local adapters preserve authorization and Spec Kit.
4. Meaningful negative tests precede validator; include Windows case-colliding paths, run on Windows and WSL and validate helper frontmatter.
5. Independent bug/UI/content pilots run real installed instructions with original red/green commands. Actors receive raw requests/sources, not intended answers. Also exercise review, handoff/resume, retrospective and the remaining helpers.
6. Relevant repository/Python checks and full runtime tests, formatting and affected build/package checks. Application browser suites are not claimed run just for tooling. Confirm no player state or product/storage/schema changes.
7. Converge against every requirement; append missing tasks, implement/retest, obtain independent final review. Any later merge still requires current-head CI. This task authorizes implementation/testing, not automatic merge.

## Risks and Rollback

Static validity is not agent-behavior proof: require independent forward tests. Upstream interview/publishing defaults are replaced by authorized local policy and existing specs/tasks. Prototypes use local self-contained previews, no CDN prerequisite. Fresh-session discovery and direct-path execution are separately evidenced. Bash remains optional/inert. Rollback removes this tooling slice and restores documentation/CI pointers; official pins and private state remain unchanged.

## Twelve-capability exercise matrix

| Exercise | Capabilities actually used | Observable receipt |
| --- | --- | --- |
| Fictional bug | diagnose, test-first, design | Original red command, minimized cause, repaired green behavior and interface assessment |
| Fictional UI | prototype, architecture | Measured narrow layout, local self-contained preview and bounded before/after design candidates |
| Fictional content | research, domain | Primary fixture source citations, corrected record and glossary terms without invented unknowns |
| Independent review | review, pr | Fixed-point standards/spec findings and a local PR-body draft retaining the repository template, no publication |
| Continuity | handoff, write-agents, retro | Sanitized handoff, fresh resumer's work, concise edited agent guidance and an evidence-based improvement |

A fresh actor starts with only the checkout and a natural request, reads normal project discovery/navigation and reports selected helpers without being given their names. Record file-based discovery, direct-path invocation and automatic UI/catalog discovery separately. If the current runtime cannot refresh its skill catalog, say so; do not infer automatic invocation from an inventory listing. A direct-path forward test can still establish actual instruction behavior, with that runtime limitation explicitly retained.
