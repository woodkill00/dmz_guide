# Choose the right change process

Every change remains governed by the constitution and leaves reviewable evidence. “Use Spec Kit” does not mean force a feature workflow onto every diagnosis, or install unrelated extensions.

## New behavior or a substantial redesign

Use the [full feature lifecycle](../spec-kit-cycle.md). Changes to shared contracts require affected-feature review and an ADR/migration analysis where applicable. Preserve the distinction between the approved baseline and a later implementation slice.

## Bug fix

The official `bug` extension is opt-in and is **not installed by the bootstrap**. Before first use, a maintainer reviews and pins the official extension source under the tooling-change process. The upstream install command is `specify extension add bug`; its resolved version/source must be captured, not assumed to inherit the core pin automatically.

Once deliberately installed, invoke these separately in Codex chat, reusing the same slug:

```text
$speckit-bug-assess "Describe the symptom, minimal reproduction, expected behavior and affected version" slug=short-repair-name
$speckit-bug-fix slug=short-repair-name
$speckit-bug-test slug=short-repair-name
```

Assessment does not edit code; review its diagnosis first. Fix applies the assessed repair. Test reruns the original reproduction and relevant regression checks and records evidence without changing code. Keep `.specify/bugs/<slug>/assessment.md`, `fix.md` and `test.md` together. `partial` or `failed` is not verified. Scope expansion returns to assessment or a new feature spec.

If the extension is not adopted, use a bounded full feature-cycle repair spec with the reproduction as an acceptance requirement. Do not claim extension commands ran when you followed the manual fallback.

## Documentation-only change

For a typo, broken link or explanation correction, use a small owning Spec Kit change: intent and affected readers in the spec, file/verification plan, explicit tasks, analysis, implementation and convergence evidence. Clarify only real ambiguities; use a brief requirements checklist reviewed independently. Record “not applicable” with a reason for app-specific tests; do not fabricate test runs. Several tiny edits serving the same outcome can share one scoped change and pull request.

Example in Codex chat:

```text
$speckit-specify Correct the contributor quickstart's documented command to match the verified CLI. Scope is documentation only. Acceptance: commands match pinned tool help, local links resolve, and no runtime behavior changes.
```

Follow the rest of the lifecycle with proportionate artifacts. If documentation changes policy, permissions, release promises or a public API contract, it is not merely a typo; seek the corresponding owner review.

## Content correction

Follow the [content guide](../content-contributing.md). A reported source is input, not approval to publish. Trace the scoped content change through evidence, applicability, plan/tasks, validation and independent review. Schema or planner semantics changes require the feature workflow, not a silent content-only patch.

## Emergency change

For active security or data-loss risk, minimize exposure and preserve evidence privately. Do not publish an exploit to satisfy a public artifact requirement.

1. Identify the incident owner, affected commit/release and authorized containment. Prefer a known safe rollback over an unreviewed broad repair.
2. Record a minimal private assessment: symptom, impact, scope, proposed fix/rollback, verification and decision-maker. Do not invent permission for deployment or destructive action.
3. Apply only the authorized containment/repair and exercise the original reproduction plus the most relevant regression checks. Require a second reviewer where available; identify any unavoidable gap explicitly.
4. Verify the resulting state and record recovery/rollback. Do not equate a merge with successful containment.
5. Reconcile permanent specs, tasks, tests, changelog and the complete applicable Spec Kit review before treating the long-term repair as complete. Keep confidential details private until disclosure is agreed.

Emergency handling does not waive rights, privacy, security or authorization boundaries. No silent permanent “skip Spec Kit” exception is created.
