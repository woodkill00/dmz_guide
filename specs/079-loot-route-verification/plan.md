# Plan

Keep existing selected stops and saved order. Add a separate bounded Loot Run configuration so shorter-route calculations do not discard selections. The worker receives policy and candidate kinds/access flags, returning the actual route and omitted count. Use source-reported access only for the restricted filter. A small versioned local observation journal stores player-entered status, timestamp and notes per source key; validate before display/export. Add links to current road authoring and gameplay worksheet. Safe Run retains its current input and output behavior.

Unknown access is never treated as verified open. Clinic-first ordering is a stated priority policy, not a shortest-route guarantee. The short route selects a prefix of the efficient order with a user-specified stop cap; this can omit selected stops and must be visible. No road geometry is invented. Gameplay observations are owner-local until exported.

The main planner exports its already validated, owned road graph as JSON. Loot Run validates a chosen graph before saving it in its own browser key; a failed import retains the current graph. This is an explicit handoff because the main workspace's private road editor and the standalone run page have separate state.
