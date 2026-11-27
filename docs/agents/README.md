# Agent workflow guide

Use the [workflow bridge](workflows.md) for helper selection and gates, [repository map](repository-map.md) for actual owners, [testing guide](testing.md) for evidence, [domain guide](domain.md) for terminology and [tracker contract](issue-tracker.md) for task authority.

List the installation with `npm run skills:list` and validate it offline with `npm run skills:check`. Invoke a named helper in agent chat, for example `$dmz-diagnose`; these are not terminal commands. Discovery metadata is checked separately from actual agent execution. A fresh session may be needed to see newly installed skills; opening the SKILL.md by path is an explicit fallback, reported as direct-path use.

Check the workspace root with `git rev-parse --show-toplevel`: use the checkout containing these `.agents/skills` files. An older checkout opened in the editor is a different installation even if shell commands explicitly target this one. The initial implementation session reported a legacy MW4_guide working root while the canonical installation was in MW4. A subsequent [CLI catalog discovery check](../../specs/110-agent-workflow-quality/evidence/discovery.md) found all twelve helpers enabled with repository scope in MW4, without manually adding skill roots. This verifies catalog loading; refreshed IDE picker rendering and implicit model selection remain separate observations.

All twelve approved capabilities are shipped locally; experimental/unmaintained skills and broad ticket/implementation orchestration are intentionally deferred. The source snapshot and licenses are in [vendor](../../vendor/agent-skills/mattpocock/NOTICE.md). See [feature 110](../../specs/110-agent-workflow-quality/spec.md) for scope and receipts.
