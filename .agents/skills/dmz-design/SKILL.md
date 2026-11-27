---
name: "dmz-design"
description: "Assess a module interface and test boundary when a planned change exposes architectural friction."
license: "MIT"
---

# dmz-design

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Use the project's vocabulary and actual interfaces. Identify what callers must know, which behavior the interface owns and where tests can observe it. Prefer a small interface that contains real complexity; avoid pass-through abstractions or speculative extension points. Explain the concrete caller/test problem, alternatives and trade-offs. Reuse existing state owners and records; a shared UI change must not create another progress store. Suggest refactoring only where the approved scope and evidence justify it, then verify the original external behavior.

[Original source](../../../vendor/agent-skills/mattpocock/codebase-design/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
