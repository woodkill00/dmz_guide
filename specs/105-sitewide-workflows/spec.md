# Feature Specification: Sitewide workflows and usability

**Branch**: feat/105-sitewide-workflows | **Created**: 2026-11-22 | **Status**: Implemented; final independent acceptance and local commit recorded in review/tasks
**Input**: Implement all14 agreed sitewide improvements: actionable home, navigation, global search, recovery, consistent state, design system, accessibility, content audit, editing, maps/routes, source updates, performance, release testing and searchable help.

## User Scenarios & Testing

### US1 — Resume and complete a task (P1)
From Home or any workspace, a player can resume recent work, open a pinned feature, find a record, follow its inventory/upgrade/mission/map actions and return without losing drafts. A keyboard or390px touch user has equivalent links and visible focus.
Acceptance: Home/task shortcuts and shared Workspace controls have valid registry-derived links; search query/type/page survive URL navigation; recent/pin state is bounded and safe. Protected content never enters search or audit metadata.

### US2 — Save and recover progress (P1)
A player sees confirmation only after a real save, receives a non-destructive notice when another page saves, and can explicitly preview a bundle of saved guide/armory data plus their recoverable prior snapshots. Existing owner restore previews remain authoritative; other modules can be added through their exports.
Acceptance: one successful commit produces one metadata receipt; failed/aborted commits produce none; notices never reload a dirty form. Reading a public/help/audit page creates no private database. User explicitly requests exports; bundle omissions and download-request status stay visible; invalid/corrupt data never becomes a verified backup. Existing previous-snapshot/CAS recovery retained.

### US3 — Review and improve references (P1)
An editor searches a field-level content-quality list, opens the exact record or compose editor, marks a finding Fill later/Checked locally, and recognizes changed source content as requiring fresh review. Images, mission steps, recipe costs, source links and missing weapon combat data remain unknown until actually supplied.
Acceptance: reviews are separate from player completion/source truth; reviewed does not erase a missing-field fact. Audit keys bind catalog/record/field/source version. Fictional fixtures and spoilers do not enter the default report. Exact editor targets include catalog and record identity.

### US4 — Understand and maintain the entire site (P2)
Users get searchable help with working direct links for every main journey. Editors can reach source-update owners and their old/new/conflict previews, and map users have consistent Hajin/X01/Safe/Loot destinations. Maintainers can run one documented journey/performance check and review actual evidence.
Acceptance: no new scraping/login/sync/deployment is implied; existing owner review/import/restore authority is preserved. Runtime measurements are identified as local measurements, not universal speed guarantees.

## Requirements

- FR01 Home/dashboard: add a compact Start a task launchpad linking current dashboard goals and the main inventory/needed/orders/weapons/map/recovery workflows; recent/pinned work remains available through shared navigation. Existing live summaries retained and tested.
- FR02 Navigation: shared compact Workspace disclosure across guide/map/editor surfaces links Home, search, recovery, quality and help by registry identity; recent/pins and back-to-task links remain bounded, keyboard-operable and unobtrusive. No hardcoded development ports.
- FR03 Search: preserve grouped records/direct actions; add stable URL query/type/page state, bounded debounced input, Previous/Next navigation and clear search. Back/forward restores exact public query state. No profile-dependent results or unbounded rendering.
- FR04 Recovery: preview/export selected saved guide profile and armory together from Workspace backup, exposing availability of existing prior snapshots and omissions for map/photos/audit/plans. No automatic restore, no new private database on inspection and no claimed filesystem success from a requested download. Existing owner recovery previews remain linked.
- FR05 Shared progress: confirmed guide/armory saves emit bounded metadata-only receipts; same-origin tabs show a notice and explicit owner-aware review/reload action. Keep existing authoritative stores, CAS and draft guards; never auto-merge or reload unsaved edits. No account/cloud sync claim.
- FR06 Design: a shared compact spacing/type/control/panel vocabulary covers the new controls, help/audit/recovery/search and existing tables; persistent compact/comfortable preference and disclosure positions do not hide content or reduce touch/keyboard access.
- FR07 Accessibility/mobile: check390px/desktop/light-dark/keyboard/200% text on the main journeys; Workspace panels stay bounded and retract with Escape; no full-screen accidental overlay, clipped controls or horizontal page overflow.
- FR08 Content quality: provide a field-level audit of visible published items, recipes, Orders/upgrades, locations/keys and weapons, with searchable kind/status/field filters, exact reader/editor links, missing-picture-reference distinction and local Fill later/Checked states. Missing source facts are not auto-filled; changed bindings become unreviewed.
- FR09 Editing: help/audit link exact existing compose editor, fields/photos/sections/history/rollback workflows; add contextual editing help entry in the editor. Preserve repository-vs-player-state boundaries and existing conflict/preview requirements.
- FR10 Maps/routes: a consistent four-map shortcut group and documented/tested item-to-map and waypoint flows expose Hajin, X01, Safe Run and Loot Run; preserve existing source/floor/spawn/selection/layout semantics. No new routing-optimality/live-GPS claim or coordinate invention.
- FR11 Source updates: central help/source-owner section links catalog old/new impact review, map staged updates and weapon/patch updates; no auto-apply/download. Local corrections and source conflicts retain their owning workflow. Existing review flows tested as retained capability, not reimplemented.
- FR12 Performance: search input is debounced and results/audit rows bounded per page; lazy image behavior preserved. Add repeatable browser measurements for selected routes/search/layout and report values without brittle cross-machine timing promises.
- FR13 Testing/release: provide one command for105 user journeys and measurements; test recovery/save failure/stale-tab/read-only/privacy, exact links and primary workflows; execute current full runtime/build/map/format/structural checks and record precise pass/failure scope. No merge/publish implied.
- FR14 Help: searchable live help page covers all14 areas with concrete steps, owner tools, caveats and direct registry-derived links. Include counts/colors, crafting, progress, editing, maps, updates and recovery; documentation and feature ledger reflect actual shipped work.

## Key Entities
Workspace receipt (owner/key/revision/time only); workspace preferences (bounded disclosure/density/recent IDs); quality finding (catalog/record/field/version/factual gap and exact links); local editorial review (binding/state only); existing profile/armory/backups stay unchanged.

## Edge Cases
Missing/blocked storage; pending saves; failed CAS/quota; forged BroadcastChannel metadata; malformed query/local preferences; multiple catalogs with identical names; spoiler records; missing images vs cached icons; content updates invalidating audits; no saved profile; partially omitted bundles; bfcache; unloaded companion/editor; map page preserved query/floor context; long labels and browser zoom.

## Success Criteria
SC01 All14 requirements have owning tasks and executed evidence or explicit retained-capability tests, not just new navigation links.
SC02 Exact confirmed-save event/no-event-on-failure and no silent reload or private data write from read-only pages.
SC03 All selected exports validate and expose omissions/prior snapshot availability before download; malformed input cannot replace data.
SC04 Audit preserves exact identities/privacy and review separation; search/audit show at most100 results per page and accurate totals.
SC05 Main journey UI works in Chromium/Firefox/WebKit at390px and desktop with keyboard; no critical accessibility/overflow/link defect remains.
SC06 Existing7b cash,35 weapon acquisition, camo completion, item columns, mission/upgrades/needed and map-source behavior remain covered.

## Assumptions / Clarifications
Use existing local-only stores and owner tools; automatic prior saved snapshots already exist and will be exposed rather than inventing an additional storage owner. Cross-tab sync means notification plus explicit safe refresh, not automatic conflict merging. New source facts/photos require the existing author workflow. New audit reviews are local editorial metadata. Existing sophisticated maps/editor/source review are retained, linked and tested; this feature is not a rewrite of them. No account linking, cloud storage, paid services, scraping or deployment requested. No blocking clarification remains.
