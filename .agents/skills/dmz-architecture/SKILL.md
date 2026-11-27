---
name: "dmz-architecture"
description: "Survey a scoped area for evidenced architectural friction and reviewable improvements."
license: "MIT"
---

# dmz-architecture

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Start from the requested area or recent change history and consult the repository map and ADRs. Identify specific ownership, duplication or testability friction rather than guessing that every large file needs splitting. Produce bounded candidates with actual paths, current behavior, proposed change, trade-offs and affected verification. A self-contained local report may show before/after relationships; no CDN is required. Keep proposals separate from implementation and surface conflicts with accepted decisions. Parallel exploration requires disjoint mutable outputs; one integration owner controls shared contracts. Use the design helper when interface alternatives need examination.

[Original source](../../../vendor/agent-skills/mattpocock/improve-codebase-architecture/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
