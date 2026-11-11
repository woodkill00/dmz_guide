# Planning analysis and convergence

2026-11-08, implementer consistency pass, not independent release review.

1. RESOLVED: “All on one screen” could force unreadable tiny controls or an unbounded DOM. Defined one focused workspace, first-viewport action targets, 50-row bounds and mobile/short-height flow (QE2/8/9).
2. RESOLVED: Reference auto-completion would conflate shared material availability with performed upgrade. Retain explicit completion and separate spending transaction (QE6).
3. RESOLVED: Autosave plus batch Save could cause loss or ambiguous state. Inventory has one staged draft and explicit Save; armory's discrete actions use existing immediate commits, each with honest status. Switching owning contexts resolves dirty edits (QE4/5/6).
4. RESOLVED: Same material shown in several upgrades could become duplicate stock or race two writers. Global inventory adapter and serialized commit ownership; do not auto-save on completion. Needed stays saved-state-only until commit (QE6/7).
5. RESOLVED: Weapon inventory items versus weapon manuals/attachments use different identities/stores. Explicit adapters and no guessed merge (QE1/5/10).
6. RESOLVED: Hiding catalog prose could hide mismatch/recovery; keep blocking version/error state visible and full provenance accessible (QE9/10).
7. RESOLVED: Existing needs page is upgrade-only; do not promise a newly unified mission budget in a layout change (QE7).
8. RESOLVED: Expanding existing weapon workbench route could remove compare/build tools. Inventory current tab/deep-link controls first, retain all, add a new registered route only if needed (plan step3).

No unresolved internal planning contradiction identified. Implementation and independent review remain pending; this is not a claim of production readiness, accessibility compliance, data completeness or test passes. Physical keyboard/touch/zoom and performance timing need future evidence. Source catalog denominator differences are recorded as a later content audit, not part of this redesign.

Planning verification: private research screenshots reviewed, named source links and local routes inspected, tasks traced to QE requirements. Prototype uses synthetic demonstration data only and does not access live storage. Production runtime/build tests are not applicable to this documentation/prototype-only change; prototype smoke results are recorded separately.

## Implementation convergence, 2026-11-08

Technical findings were reproduced and repaired in their owning modules/tests: invalid reserves moved under details now reveal before focus; original flat-list grid placement is reset only inside grouped cards; normal desktop first-view targets are asserted rather than assumed; context and active-filter labels refresh after asynchronous/persisted view setup; an internal +N usage button focuses its requested list instead of closing the open detail. Detail content waits use actual native-toggle completion, not arbitrary sleeps or removed assertions. The keyboard large-fixture test now starts from the visible previous Uses button rather than trying to focus a newly hidden reserve field. All original row-bound, raw-draft, CAS, recovery, completion and spending checks remain.

Manual review of desktop/mobile screenshots informed the final single-row mobile section links and two-column basic filters. Needed's secondary recipe/help/refresh tools are in one labelled disclosure, while unknown-budget warnings and tracking-update actions remain visible. Catalog label shows the actually loaded pack; local guide and armory identity stores remain separate.

The implementation and automated verification do not constitute independent release review. Reviewer-owned checklists remain untouched, and real-device/keyboard-overlay checks remain unexecuted rather than being marked passed.
