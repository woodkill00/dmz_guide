---
name: "dmz-handoff"
description: "Prepare a sanitized session handoff that another agent can use to resume exact work."
license: "MIT"
---

# dmz-handoff

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Write a concise handoff to an OS-temp/private location, not public Git. Include repository identity, branch/base/head when available, selected feature, owning artifact pointers, current task, actual commands/results, service origins, CI run identifiers and remaining work. Clearly distinguish committed, uncommitted and generated state. Point to durable artifacts rather than copying conversation history. Redact credentials, personal identifiers and profile payloads. If a field is unavailable, say so. Give a fresh resumer only the handoff and permitted raw artifacts and record whether it can continue. Losing a temporary handoff must not lose the durable feature spec.

[Original source](../../../vendor/agent-skills/mattpocock/handoff/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
