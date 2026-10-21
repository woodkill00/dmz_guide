# Spec Kit lifecycle

## Pinned source and installed scope

Official GitHub Spec Kit **v1.2.2**, peeled commit `74be0a63e93c7087c5b06556b7561810d8f78a45`, is the reviewed baseline. See `speckit.lock.json` for provenance. This repository uses Codex-native skills under `.agents/skills` and Bash scripts under `.specify/scripts/bash`.

The bootstrap was initialized with:

```bash
specify init --here --integration codex --script sh --non-interactive
```

That is a recorded setup command, **not a command to repeat on every clone**. See [quickstart](quickstart.md) for normal use.

## Production feature path

Establish the constitution once; review it for every change and amend only through explicit review. Invoke one skill at a time in Codex chat, inspect the result, then continue:

```text
$speckit-constitution
$speckit-specify
$speckit-clarify
$speckit-plan
$speckit-checklist
$speckit-tasks
$speckit-analyze
$speckit-implement
$speckit-converge
```

Do not paste the entire sequence as one command. These are agent skills, not terminal commands. The full path is the default for production features; scale the artifact size, not the honesty of the gates.

- **Specify / clarify:** observable outcomes, explicit scope and resolved blocking ambiguities. Preserve unknown game facts.
- **Plan:** architecture, contracts, alternatives, migrations, risks and verification strategy.
- **Checklist:** requirements-quality review. Custom checklists are reviewer-owned, not task-completion checklists. Built-in `checklists/requirements.md` is maintained by specify/clarify.
- **Tasks:** dependency-ordered work with explicit tests and requirement IDs. Parallel markers require disjoint safe ownership.
- **Analyze:** read-only consistency report. Fix the owning artifacts and rerun; analysis does not repair them automatically.
- **Implement:** execute only approved tasks; respect checklist gates and scope. Unchecked reviewer criteria are not an invitation to mark them yourself.
- **Converge:** compare implementation with artifacts, append missing tasks, repeat implementation and verification until resolved. A convergence verdict does not replace passing tests or independent review.

Changing an existing feature's agreed intent requires updating affected artifacts and decisions before dependent code. Do not rerun specify blindly over an existing reviewed specification. See upstream evolving-spec guidance and review the diff.

## Active context and collaboration

Select existing work with `python3 scripts/select-feature.py FEATURE-DIRECTORY-NAME`, for example `002-repository-bootstrap`. The script takes the directory name under `specs/`. Upstream tracks it in `.specify/feature.json`, a machine-local ignored file. `SPECIFY_FEATURE_DIRECTORY` overrides that pointer. Switching Git branches alone does not change active context. Clear stale overrides and inspect the selected path before every skill invocation.

Use separate worktrees/checkouts for parallel features. One integration owner controls shared contracts, schema and constitution changes; serialize shared-file edits. Link requirement IDs, touched paths, dependencies and expected evidence in tasks. Independent review follows implementation.

## All applicable capabilities, not every optional install

The default integration includes the core lifecycle and a deprecated `taskstoissues` compatibility skill. **Do not use that deprecated skill for new automation.** The supported replacement is in the optional official `github` extension. Issue creation is an external write and needs the maintainer's authorization and correct repository scope.

Optional capabilities remain intentionally uninstalled until a change needs them:

| Capability | Appropriate use | Gate before adoption |
| --- | --- | --- |
| Official `bug` extension | Existing behavior repair: assess → fix → test | Review/pin extension source and record install; see change tutorial |
| Official `assess` extension | Uncertain investment: intake → research → define → shape → decide | Evidence-based go/clarify/kill decision; not an implementation shortcut |
| Official `github` extension | Approved task-to-issue publishing | Verify destination and credentials; review planned writes |
| Git extension | Optional numbered branch automation | Does not replace active-feature selection |
| Presets | Deliberate shared template or policy customization | Diff behavior against constitution; pin source/version |
| Bundles | Coordinated installation of related workflows/extensions/presets | Review every included component and its effects |
| Workflow runner/overlays | Repeatable multi-step process with human gates | Inspect executable steps, validate definitions and preserve required gates |

Never install all catalog entries merely to claim “all features.” Extensions can execute code or write externally; inspect their permissions and provenance. No additional credentials or services are needed for the baseline repository checks.

## Workflow runner, when adopted

The pinned CLI supports `specify workflow list`, `specify workflow run <source>`, `specify workflow status [<run_id>]`, and `specify workflow resume <run_id>`. Read `--help` and the source definition before running. Source placeholders and run IDs above must be replaced with actual reviewed values; they are not copy/paste invocations. Definitions are validated during installation/loading; do not invent a `workflow validate` subcommand.

The upstream default `speckit` workflow is **not this project's full production gate set**: it omits some required quality steps. Use the manual full cycle until a reviewed project workflow or overlay includes clarify, checklist, analyze, converge, test evidence and independent review. A runner's “completed” status is not a product release verdict.

For a paused/failed run, inspect its status and persisted evidence, resolve the actual blocker, then resume the same run when safe. Do not launch duplicates to escape a human checkpoint. Never automatically approve a reviewer gate. Do not resume a currently running operation. Keep sensitive/local run state out of public commits.

## Gate summary

Evidence and rights → testable scope → reviewed design → traced tasks/tests → consistency analysis → bounded implementation → actual verification → convergence → independent review. Stop on critical security, data-loss, unresolved rights or unsupported game semantics.

## Official references

Verified against the pinned upstream source during bootstrap:
- [Tagged quickstart](https://github.com/github/spec-kit/blob/v1.2.2/docs/quickstart.md)
- [Integration syntax](https://github.com/github/spec-kit/blob/v1.2.2/docs/reference/integrations.md)
- [Agentic SDD reference](https://github.com/github/spec-kit/blob/v1.2.2/docs/reference/agentic-sdd.md)
- [Workflow runner](https://github.com/github/spec-kit/blob/v1.2.2/docs/reference/workflows.md)
- [Bug repair](https://github.com/github/spec-kit/blob/v1.2.2/docs/guides/bugfix.md)
- [Evolving specifications](https://github.com/github/spec-kit/blob/v1.2.2/docs/guides/evolving-specs.md)
