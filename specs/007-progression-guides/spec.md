# Feature Specification: Progression and spoiler-aware guides
Branch007-progression-guides. Created2026-10-21. Status requirements review.
Input: complete approved S6 progression/Orders/story/campaign distinction and safe local tracking.005/006 parallel,008 community/release remains.
## User Scenarios & Testing
### US1 Follow the right track (P1)
Player filters objectives and guides by DMZ upgrade, DMZ Orders, DMZ story, progression or campaign, sees prerequisites and provenance and marks manual state without changing owned inventory.
Acceptance: campaign completion never unlocks a DMZ objective; unknown stays unknown; completed toggle modifies only completion. Shared prerequisites display their own status and direct detail links. No real mission list fabricated when starter lacks verified records.
### US2 Choose spoilers deliberately (P2)
Player keeps spoiler titles/body/search metadata hidden by default, chooses reveal and can hide again; preference persists locally for the selected pack.
Acceptance: unrevealed spoiler search never finds hidden title/body; revealed relevant records display only after explicit action. Public native spoiler details remain manual no-script disclosure, distinct from private preference.
### US3 Recover progression (P3)
Player exports private profile, previews a progression-only reset for named pack and confirms or cancels. Other inventory/goals/reserves remain unchanged; prior snapshot supports recovery.
Acceptance: stale revision/pack change invalidates reset; failure preserves active/current data and offers export. Imported unknown IDs remain recovery report.
## Requirements
- F007-01: Native /progression/ page with track/search/source/status filters, objective/guide records and explicit coverage gaps. Local overlay pack used consistently, no cross-pack resolution.
- F007-02: Display prerequisite chain/status and sourced effects; record manual unknown/locked/unlocked/completed separately from inventory. Source disagreement remains warning and never officially verified readiness; allow requirements estimates without changing public facts.
- F007-03: Persist explicit spoiler preference, hide spoiler title/body/search text until reveal, hide again without losing progress; retain native public disclosure for no-JS reading.
- F007-04: Progression-only reset uses explicit named target+revision confirmation and atomic saved snapshot, cancel no change, failed transaction preserves active state. Direct private export available for unsaved edits.
- F007-05: Unit/browser tests prove scope separation, no inventory consumption, spoiler search/reload behavior, cancel/reset/stale-target failure and narrow keyboard-accessible views.
## Key Entities
Existing schema1 profile completion/spoilers, pack objective track/scope/prerequisites/effects and guide category/spoiler. No new format required. No server/account/game automation.
## Success Criteria
All named regression scenarios pass; no hidden spoiler title/body in unrevealed rendered page or search index; changing completion leaves serialized inventory/reserves/goals byte-equivalent;320px controls/keyboard tests and actual screenshots recorded.
## Assumptions
Manual progress is user-reported, not synchronized game state. Sparse real Orders/campaign data labeled incomplete; fictional fixtures opt-in. No fake quests. Reversible UI defaults, no new user clarification needed.
## Clarifications
Prior approved baseline separates campaign from DMZ and completion from consumption. Unknown/disputed facts remain unresolved, conditional estimate never claimed executable certainty.
Spoiler isolation includes prerequisite labels, effect text, related links, breadcrumbs and document title. Hidden-again rendering removes already revealed text/search results immediately; nonspoiler records referencing spoiler prerequisites show a generic label until reveal. Reveal/hide button retains keyboard focus after re-render; reset confirmation focuses its confirm/cancel controls and returns focus on cancel. Stale-tab reset conflict preserves active profile and offers export/reload.
