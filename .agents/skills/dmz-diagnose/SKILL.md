---
name: "dmz-diagnose"
description: "Diagnose a reported defect or regression using a reproduction of the actual symptom."
license: "MIT"
---

# dmz-diagnose

Read the [project workflow bridge](../../../docs/agents/workflows.md) for authority, scope, task selection and evidence rules. Consult only the relevant [repository map](../../../docs/agents/repository-map.md) and [domain guide](../../../docs/agents/domain.md).

Build one runnable pass/fail reproduction of the reported symptom at an agreed interface. Run it and record its actual output before choosing a fix. Narrow the scenario; for intermittent failures record the observed rate rather than claiming determinism. Test falsifiable causes one at a time with bounded diagnostics. Repair the smallest cause and rerun both the original scenario and relevant regression. Distinguish product defects from test setup/lifecycle defects. Preserve failed evidence; remove temporary probes or clearly label retained diagnostic artifacts. A screenshot or a nearby passing test is insufficient.

[Original source](../../../vendor/agent-skills/mattpocock/diagnosing-bugs/SKILL.md) is optional historical reference. This local adaptation is the operative procedure; do not inherit extra interview, publication or tool prerequisites from the original.
