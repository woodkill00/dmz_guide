# Your first feature

Goal: learn the process with a small, reviewed outcome, not implement the entire roadmap at once. Start after the [quickstart](../quickstart.md). This tutorial is instructions, not evidence that an agent workflow has already run.

## 1. Choose a bounded change

Read the constitution and [foundation plan](../../specs/001-guide-foundation/plan.md). Agree on a first implementation slice with the maintainer. The broad 001 plan remains context; bootstrap 002 is repository setup, not the application. Avoid feature-number collisions by inspecting existing `specs/` directories first.

In Codex chat, an example request is:

```text
$speckit-specify Define the next approved foundation slice: a read-only, accessible item detail view with source/unknown states using clearly synthetic fixtures. No inventory editing, planner, live game data, accounts or deployment. Preserve the existing foundation plan and create a separate scoped feature.
```

This is an example, not pre-approval of this exact slice. Inspect the newly generated feature directory and confirm active-feature state before continuing.

## 2. Review the intent and design

Run `$speckit-clarify` for unresolved scope, accessibility and content-state behavior. Run `$speckit-plan` with the accepted architecture and explicit test strategy. Ask `$speckit-checklist` for requirements-quality checks; a reviewer assesses them. Resolve blockers instead of pretending unknown game data is verified.

## 3. Turn intent into tested work

Run `$speckit-tasks` and explicitly request test tasks for every user story, negative cases and relevant acceptance IDs. Run `$speckit-analyze`. Repair specification, plan or tasks where findings originate, then analyze again. Inspect dependencies and ownership before parallel work.

## 4. Implement, verify and review

Run `$speckit-implement` only for the approved phase. Execute actual checks and the feature's acceptance tests. Run `$speckit-converge`; if gaps are appended, implement and test them before converging again. Keep unexecuted tests marked unexecuted.

Open a focused pull request with artifact links, exact command results, limitations, reviewer findings and rollback steps. No deployment, remote setting change or asset publication is implied by finishing local code. A maintainer reviews the evidence before merging.

## When stuck

Wrong context: inspect `SPECIFY_FEATURE_DIRECTORY` and select the correct existing directory. Missing skill: check `.agents/skills` and integration status. Contradictory requirements: stop and clarify the owning artifact. Missing game fact: keep it unknown or synthetic; do not guess to make a demo look finished.
