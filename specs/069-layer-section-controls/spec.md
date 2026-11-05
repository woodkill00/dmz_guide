# Layer section bulk controls and category sublists

Manual pinned Spec Kit full cycle, bounded feature069 built on067/068. FR001: Combined map categories has Show all/Hide all buttons affecting all available imported source categories in one existing visibility transaction, preserving private/reviewed controls and deduplication. FR002: each website disclosure has its own Show all/Hide all, affecting only that site's available category masks and source enablement. Unavailable sources show disabled bulk actions. Show enables source and categories; Hide disables its categories. Active search remains unchanged. FR003: each section exposes expandable category sublists, keeping icons, labels, counts and per-category selection. Selected retained snapshot categories live inside their website section rather than a separate distant card. FR004: mixed checkboxes, keyboard focus, disclosure state, persistence and other sites remain correct after bulk and individual edits.

Clarification: Combined controls are imported source layers; own/reviewed layers retain existing switches. A sublist means native keyboard-accessible details/summary, not a new dataset or location identity. Existing category group labels retained.

Plan/tasks: T001 definition/consistency review; T002 add stable bulk buttons using changeVisibility/setSourceAll and grouped native category disclosures, relocate retained snapshot fieldsets under matching website; T003 extend permanent three-browser menu regression for combined/per-site bulk, category sublists, isolation/mixed/focus/reload; run typecheck/build,207unit and retained workflow checks; T004 converge/independent final review. No dependency/schema/source acquisition change. Source-section controls need stable IDs because renderKey rerenders synchronously. Category disclosure keys stable and open state captured by existing mechanism. Existing tests retain fixtures/assertions.

Initial analysis: combined list has only category switches; legacy website key cards expose category fieldsets but no bulk actions; nonlegacy snapshots are separately rendered in extras. Existing setSourceAll provides transaction-safe bulk semantics. Source dropdown wrapper must own both snapshot controls and bulk to avoid scattered website controls.

Acceptance: implementation and scoped verification complete; independent final review passed.

Analysis repair: existing setSourceAll replaces the entire mask, which would discard preferences for categories exclusive to another retained snapshot. Section bulk instead merges the affected IDs into the existing mask within the same visibility transaction; Show enables the site. Unselected-snapshot category preferences must survive (snapshot-switch regression).

Tasks/convergence: T001 definition PASS; T002 implemented including mask-preserving repair; T003 scoped verification PASS (see acceptance.md); T004 final independent receipt/hash/visual review PASS. No missing task remains.
