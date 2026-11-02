# 052 Readable source-update review

Repair assessment: 051 displays raw serialized diff and snapshot objects in the dashboard. Reproduce by checking CODMunity data and opening the proposal. Expected: readable coverage and weapon changes, no JSON blocks, with all prior/proposed facts still inspectable.

FR001 Replace JSON with per-source coverage counts, added/changed/removed lists and expandable weapon current/proposed tables. Retain source metadata, warnings, exact numeric values, authored units and unknown/missing distinctions. Show changes first and unchanged records separately.
FR002 Preserve review checkbox, stale/no-op disabling, hash-bound transactional apply and all collection/monitor behavior. Render untrusted text inertly and keep tables keyboard accessible at narrow widths/200% text.
FR003 Test actual new/change/removal/no-op previews, source/damage values, escaping, three-engine manager workflow and responsive layout. Record manual pinned fallback cycle; bug extension commands are not claimed.

Plan/contracts: pure client renderer takes validated status plus authored metric definitions supplied by the same local status response. No persistence/schema/update changes. No JSON display or remote requests added. Definition analysis: scoped presentation repair, no unresolved questions. Reviewer-owned gate required before delivery.

Tasks: implement renderer and wire status metadata; add reproduction/regressions; verify/review and record acceptance.
