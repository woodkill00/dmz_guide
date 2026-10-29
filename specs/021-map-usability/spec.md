# Feature021: Map usability and author review

Created2026-10-27. Status: implemented, locally verified and independently reviewed; see verification.md. Branch feat/021-map-usability. User explicitly authorized all six proposed improvements and complete testing.

## User stories and acceptance

US1 Navigation: search all loaded provider locations, own points and reviewed entities by title/category/source, page results, and jump/highlight without altering saved filters. Hidden results disclose their layer state; unregistered locations are inspectable but cannot be jumped to. Acceptance: keyboard search selects a hidden source result, centers/highlights, exposes details and preserves masks; own point offers edit.

US2 Trust and comparison: clicking a matching-row `*` opens members/names/sources/coordinates/distance and explains representation. Keep a mistaken group member separate from its group, restore matching later, and retain the decision on reload/backup. Acceptance: a likely duplicate becomes independently drawn, toggles and undo remain safe, and an old-capture exception is marked inactive rather than applied to new data.

US3 Repeatable views: save/name/apply/delete site/category/search combinations; recover via private backup. Acceptance: saved masks reappear after reload and restore, application does not discard drafts, and missing categories are disclosed.

US4 Private authoring: richer POI popups expose source, category, notes, canonical coordinates and uncertainty; custom points offer Edit; source records offer local discrepancy notes. Acceptance: flag/resolve/reopen notes survive reload/backup; never post to another site.

US5 Completeness checks: distinguish matching official records, uncertain name/location conflicts, records not found in loaded official data, kept-separate decisions and unregistered records. Acceptance: a synthetic provider-only point appears as not found, nearby different-name/same-name-different-position appears uncertain, no official data blocks conclusions. This is capture comparison, not proof of real-world completeness.

US6 Recovery: show last backup download initiation, changed-work reminder after20 meaningful mutations or7days with changes, and optional24h snooze. Acceptance: visibility alone does not trigger edit counts, a backup action updates browser-local status, stale/malformed/unavailable reminder storage never blocks editing. Download initiation is not proof a file reached disk.

## Requirements

- FR001 Search/index all active provider snapshots plus private/reviewed entries; bounded paginated keyboard results, jump/highlight, hidden/unplaced explanations and no automatic filter mutation.
- FR002 Explain duplicate matches with source/name/location/distance and allow reversible, persisted, capture-bound keep-separate exceptions. At most one member/site, original name+24px rules, known floor/build constraints and raw evidence remain unchanged.
- FR003 Persist up to20 named visibility presets, names<=80, with apply/delete and missing-category notices. Include private backups.
- FR004 Provide richer safe-text popups/details, copy coordinates with explicit fallback, custom Edit, private source discrepancy CRUD/resolve/reopen with authored observations. No external writes.
- FR005 Provide paginated completeness classifications based only on loaded registered official data; distinguish uncertainty/unknown/unregistered and never claim game completeness.
- FR006 Track meaningful edits and backup-initiation status, nonmodal reminders20edits/7days and24h snooze, degrade safely without localStorage; reset provenance on replace/undo/new workspace.
- FR007 Preserve old schema1 workspaces/backups. Optional version1 usability metadata:20 presets,200 separate pairs,200 flags/4000char notes, capture-bound opaque identities<=512; enforce exact20MiB projection, graph/shape/enum bounds and atomic CAS/draft recovery. Source copied content remains omitted; exception/preset/flag metadata is private and source references can be inactive after omission.
- FR008 Preserve existing official/provider/key/layer/right-click/authoring behavior, keyboard/360px/reduced-motion, offline operation, zero provider requests, untrusted inert text, performance budgets and private-assets exclusions. Independent review and analysis/convergence required.

## Success criteria

SC001 Search/detail/jump, own Edit, duplicate inspection/exceptions, saved views, flags, completeness and reminders pass synthetic offline browser journeys with0 errors/0 external requests.
SC002 Unit coverage proves name/location/floor/build integrity, exception group safety/version binding, coverage classifications, preset/flag bounds, reminder time/count/error states and old/new backup round trips.
SC003 Browser keyboard and360px journeys pass without horizontal overflow or lost drafts; no existing map regression fails.
SC004 Existing production250ms p95 toggle/search and2s worker budgets continue passing; explorer lists page50 and respect20000 source/5000 private/5000 reviewed count bounds, JSON byte/node caps still govern jointly.
SC005 Read-only analysis/convergence and independent implementation review close actionable findings; record actual commands/results and limits.

## Non-goals

No live acquisition, accounts, public export, new game claims, deployment or collaborative editing. Preserve authorized local captures and machine-local opt-in. No feature020 baseline rewrite.

Normative clarification decisions: see clarifications.md DEF021-01..03 for exact mutation/age semantics, source+snapshot+digest+record identity, and250,000-work completeness truncation rules. These are part of FR002/005/006/007 acceptance.
