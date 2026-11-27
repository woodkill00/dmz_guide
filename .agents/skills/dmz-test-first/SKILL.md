---
name: "dmz-test-first"
description: "Implement behavior-first tests at the interfaces agreed in the active feature plan."
license: "MIT"
---

# dmz-test-first

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Read the selected spec, plan and task. Treat the approved test strategy as authorization for routine test boundaries; ask only if a new material decision is required. Exercise observable behavior using independent expected values. Write one failing behavior check, run it, implement the smallest slice and rerun it before the next slice. Prefer actual public interfaces and the original bug path to mocks of internals. Avoid tautological assertions. Record deliberate fault injection separately from an original production failure. Run affected integration checks; final completion still needs the owning verification and independent review.

[Original source](../../../vendor/agent-skills/mattpocock/tdd/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
