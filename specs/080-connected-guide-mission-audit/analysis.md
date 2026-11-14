# Planning analysis and repair cycles

## Cycle 1 — 2026-11-13

Read-only comparison of `spec.md`, `plan.md`, `data-model.md`, `research.md` and `tasks.md` found three gaps:

1. **Editorial export ambiguity (high)**: an export cannot both preserve the owner's spoiler-containing notes for restore and promise spoiler-free contents. Repaired FR-009 and T005: list/search projection hides protected content; private export retains notes with an explicit warning and never enters public search automatically.
2. **Audit action count (medium)**: SC-002 required three actions while the planned list → section → state → Save flow takes four. Repaired SC-002 to four actions and retained a visible Save confirmation.
3. **Requirement traceability (medium)**: several task lines relied only on phase-level FR ranges. Repaired T004–T023 with explicit IDs on each task.

The source review also found a scope hazard: the official starter currently has zero DMZ Order/Story records, while the existing UI models 24 Orders slots and official Season 1 notes add X01 Orders. Spec, research and data model now state that 24 is the current scoped page set, not a complete-game denominator. Unrecorded slots are editorial targets, never fabricated mission records.

## Cycle 2 — 2026-11-13

Reran a read-only requirement/task scan: **7 user stories, 18 functional requirements, 23 open tasks, zero unmapped requirement IDs, zero template/clarification placeholders**. Reviewed the mission audit path, cross-origin backup boundary, source rights, spoiler protection, player/editorial-state separation and failure paths against the constitution. No critical or high specification contradiction remains before implementation.

Planning is complete; implementation, reviewer-owned checklist approval, actual test runs and acceptance are pending. The checklist remains unchecked and is not self-approved. Later source findings or tested behavior may require another tasks→analysis→fix cycle.

## Cycle 3 — 2026-11-13, first implementation slice

Compared the new mission-audit projection and generated page with FR-001–FR-009 and the shared catalog-loading contract. The first browser run found that the generated page omitted `#pack-note`, which the shared loader writes before rendering. Added that element and reran the page: the 24 empty slots render, a Fill later status persists after reload, and the 390px layout has no horizontal page overflow.

The gap review also found that an unreadable saved audit could otherwise be replaced by an import. The client now blocks all writes when an existing audit fails to load; the validator requires the declared content version and page set. Focused tests cover the target projection and invalid states. T005 and T007 remain open: durable history, source-fingerprint rebinding, complete spoiler behavior, import-failure browser cases and 200% text/keyboard checks still need implementation and evidence. The remaining feature phases are likewise open; this cycle does not mark them accepted.

## Cycle 4 — 2026-11-13, verification ownership

An initial full `npm test` run reported 997/998 passing; the topology snapshot test failed while a separate build was replacing `dist` concurrently. This was a test orchestration error, not a missing route: after the build completed, the generated topology contained `/missions/audit/` with feature ID `mission-audit`, and the focused topology, registry and audit tests passed 14/14. Future full-suite and build checks are serialized so `dist` is stable during snapshot tests. The new browser test passed the empty roster, Fill later persistence, status filter and 390px overflow checks. Full-suite rerun remains pending after the last code changes.

## Cycle 5 — 2026-11-13, stable verification and visual check

The serialized full runtime suite passed 998/998 with a stable `dist`. A screenshot review found that default buttons made all 24 unrecorded pages look like bright primary actions; the page now uses compact muted cards with a clear selected outline. The added keyboard and 200% text browser test initially attempted inline CSS and was correctly blocked by the site's `style-src 'self'` policy. The test now loads a generated local CSS file, and the browser journey passes at 390px/200% text without horizontal document overflow. This repairs a test harness issue while preserving the production CSP.

## Cycle 6 — 2026-11-13, connected preparation

The Collection workbench already computes shared unfinished mission/upgrade needs, stock, reserves, recipe steps and locations; a second calculation would create a conflicting source of truth. The new action strip is a bounded view of that projection. A browser regression exposed reuse of the existing `data-why-item` hook, which made exact test selectors ambiguous. The new action button now has a distinct hook and delegates to the same explanation. Focused Collection workbench and needs browser journeys pass. The action strip does not yet close FR-010/FR-011: exact key/map cross-links and full scenario evidence are still open.

## Cycle 7 — 2026-11-13, audit and review connection

The Data review page previously counted catalog uncertainty but had no route to editorial section status. It now reads the same bounded local audit format as `/missions/audit/` and presents scoped roster gaps, Fill later and stale counts. Failed or unavailable local reads produce an unavailable message without changing state. The audit browser journey verifies a saved section appears in Data review. Full multi-domain coverage and change-queue contracts remain open under T016–T019.

## Cycle 13 — audit persistence contract

The repeatable baseline test confirms the checked-in starter has zero recorded Order/Story missions and exactly 24 unrecorded page targets. The audit validator now normalizes older v1 files, bounds payload/history, and validates each before/after event. A changed source fingerprint must be explicitly confirmed before save. Focused runtime and browser tests passed; quota failure, cancelled restore and full workspace backup remain open. T001 is closed; T002/T005 remain open pending those recovery cases.

## Cycle 14 — import recovery and page-set scope

The first import UI named only entry counts, which obscured removed or stale reviews. A pure preview now reports added, changed, removed and stale/missing bindings before an explicit replace. Cancel is inert, and restoring over an unsaved form asks before discarding it. Browser checks cover cancelled import/restore, successful restore and simulated quota failure without changing saved bytes. A synthetic later page set confirms IDs are separate without inventing real X01 page coverage. T004 is closed; T002/T005 remain open for spoiler/export and broader restore cases. No critical or high contradiction was found in this slice.

## Cycle 15 — delayed import cancellation

A pending file read could outlive Cancel and reopen the restore preview. The client now invalidates pending reads on cancel, replacement and catalog switch. A browser reproduction held `File.text()`, cancelled the import, released the read and verified the preview remained cancelled. T005 is closed with this evidence; the complete workspace backup remains T014–T015. T002 still needs separate spoiler/export-contract review.

## Cycle 16 — audit contract convergence

The export contract test now verifies private JSON retains the owner note while the audit list omits it. Focused tests also bound UTF-8 import size and retain an old fingerprint as stale review evidence. T002 is closed; T003 and the remaining cross-page tasks still require implementation and acceptance checks. The reviewer-owned checklist was not self-approved.

## Cycle 17 — repository authoring ownership

The audit previously linked recorded missions only to the private detail and gave unrecorded pages no authoring action. It now uses the published catalog manifest's exact pack key to build Content Studio links: recorded objectives select their existing record; unrecorded page slots open a blank objective form. Unknown private packs receive a truthful unavailable message. The first browser run found that `author-target.mjs` is intentionally excluded from public assets, so the public client now serializes the validated target fields locally while Studio parses them with its strict target contract. Build, focused author-target tests and audit browser journey passed. The ownership review in `plan.md` closes T003 and the tested navigation closes T006. T007 and source ingestion remain open.

## Cycle 18 — populated audit and visual check

A routed fictional training pack supplied one Order with an assigned page and one protected Story Mission. The browser journey verified 23 unrecorded page slots, separate Story sections, hidden protected name in the list/search, exact author link and a checked Rewards state that did not remove the evidence warning. The 390px screenshot showed row fills were too visually heavy; a neutral surface fill and selected border repaired that. The rebuilt page passed the browser journey, including keyboard and 200% text checks. T007 is closed; no fictional data was added to the catalog.

## Cycle 8 — 2026-11-13, exact record links

The detail renderer resolved target IDs across every loaded pack, so a duplicate ID in another catalog could point at the wrong record. Detail references now resolve within the selected pack, and a bounded direct-reference projection supplies reverse links for non-item records. A synthetic two-pack test verifies that the wrong catalog's link is excluded. The first build after editing failed because a broad text replacement also changed the catalog directory's pack list; that line was restored before retesting. Build and focused relation tests pass. FR-011 remains open for key/weapon/map-specific journeys and broader browser evidence.

## Cycle 9 — 2026-11-13, regression convergence

After the relation changes, `npm test` passed 1,001/1,001 against stable build output, and the full Chromium browser run passed its existing connected journeys. The feature's new mission-audit browser run passed separately. No new failure was reported by this regression pass. T010/T011 remain open because the tested direct relations do not yet cover all exact key, weapon and map journeys; T012–T023 remain pending implementation or broader evidence as described in tasks.

## Cycle 10 — 2026-11-13, Home action and build state

The Home action reuses `collectionWorkbench` and `connectedPreparation` after a valid profile/content match. The first Home browser run passed Chromium but stopped on an intermittent Firefox key-detail assertion; isolated Firefox and WebKit Home/key journeys then passed. A subsequent Home assertion failed because the local `dist` still contained the prior Home module. Inspection found an incomplete build candidate and lock in `.build-state`; its recorded PID was no longer running. An automated verified cleanup command was rejected by approval policy, so recovery material remains untouched. Current-source Home behavior passed the full Home workflow in Chromium, Firefox and WebKit using a single-module Playwright route override. A clean normal build and final release check remain open until the interrupted build state is resolved.

## Cycle 11 — 2026-11-13, scoped content coverage

The first Data review summary exposed mission roster counts but not the other listed content areas in FR-016. A pure bounded projection now counts listed recipe ingredient completeness, catalog image references, numeric weapon stats, key descriptions/sources and positioned locations alongside scoped Orders and checked mission sections. Zero-record domains display "None recorded" instead of a misleading 0/0 completion. Each row states that its denominator is the selected catalog's listed records; image references and weapon numbers do not assert loaded art or DMZ testing. Focused unit tests pass. Browser/build verification remains pending while the interrupted build lock is unresolved.

## Cycle 12 — 2026-11-13, reversible recovery and clean recheck

After the user's explicit instruction to handle cleanup, automatic approval review again rejected the narrow deletion as blocked by policy. A verified reversible move of the stopped candidate and lock into ignored `.local/build-recovery-080` was allowed; it preserved all bytes and did not touch current `dist`. A normal build then succeeded with 1,867 routes. The mission audit, Home and Data review checks passed against built files; the serialized runtime suite passed 1,002/1,002; and the full Chromium browser run passed. The build-state blocker is resolved. This cycle does not close unfinished functional tasks or reviewer-owned criteria.
