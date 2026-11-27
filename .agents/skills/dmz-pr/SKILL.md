---
name: "dmz-pr"
description: "Draft concise pull-request evidence using the repository template and exact change state."
license: "MIT"
---

# dmz-pr

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Read .github/pull_request_template.md and the originating feature. Lead with the concrete problem and resulting behavior; add the smallest useful visual only when it clarifies the change. Preserve the required traceability, verification, rights/privacy, rollback and independent review sections. Include actual before/after commands or sanitized images, exact head and environment, and unrun checks as limitations. Distinguish a reversible code change from a data migration and describe its affected area. Draft locally unless publication is explicitly within the task; creating a draft does not authorize commits, issue closure, merge or deployment.

[Original source](../../../vendor/agent-skills/mattpocock/pr/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
