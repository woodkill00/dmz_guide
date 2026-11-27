---
name: "dmz-review"
description: "Review a fixed change against repository standards and its originating requirements independently."
license: "MIT"
---

# dmz-review

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Resolve and record the base and head, owning feature and exact touched paths. For committed work use the merge-base diff; include tracked and intended new working files when reviewing an uncommitted change. Keep Standards findings and Spec findings separate, each with evidence and file locations. Use independent fresh read-only reviewers when available; isolate their context. Classify documented violations separately from architecture suggestions. Missing or unrun evidence is not a pass. Reviewers own their decisions/checklists and do not fix or approve their own implementation. Return supported findings and limitations; perform repairs through implementation and re-review. Review does not authorize publication or merge.

[Original source](../../../vendor/agent-skills/mattpocock/code-review/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
