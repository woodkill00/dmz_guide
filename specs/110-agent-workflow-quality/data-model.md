# Tooling data model

agent-skills.lock.json: schemaVersion=1, upstream(repository, commit, license), baseline(Spec Kit lock SHA256), helpers, files.

Each helper has unique name/path/source/capability. Its path is .agents/skills/<name>; source identifies its original folder. Twelve approved names/capabilities form the closed initial set. Files maps project-relative names to lowercase SHA256. Cover every original/adapted file under owned roots; extra files fail. Reject absolute paths, backslashes, dot/empty/traversal segments, duplicates including case-insensitive Windows collisions, symlinks and escapes. Additionally verify the unchanged official lock and every file it pins.

Return sorted diagnostics without rewriting files. Updates are reviewed source installation/comparison and manifest changes, not automatic trust transitions.

Pilot receipt: fictional scenario, actor, consumed skills, exact commands, failure/pass observations, outputs, unresolved issues and limitations. Handoffs point to durable specs; OS-temp exercise paths are disposable. No private payloads.
