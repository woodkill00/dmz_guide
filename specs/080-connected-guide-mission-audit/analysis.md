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

## Cycle 8 — 2026-11-13, exact record links

The detail renderer resolved target IDs across every loaded pack, so a duplicate ID in another catalog could point at the wrong record. Detail references now resolve within the selected pack, and a bounded direct-reference projection supplies reverse links for non-item records. A synthetic two-pack test verifies that the wrong catalog's link is excluded. The first build after editing failed because a broad text replacement also changed the catalog directory's pack list; that line was restored before retesting. Build and focused relation tests pass. FR-011 remains open for key/weapon/map-specific journeys and broader browser evidence.

## Cycle 9 — 2026-11-13, regression convergence

After the relation changes, `npm test` passed 1,001/1,001 against stable build output, and the full Chromium browser run passed its existing connected journeys. The feature's new mission-audit browser run passed separately. No new failure was reported by this regression pass. T010/T011 remain open because the tested direct relations do not yet cover all exact key, weapon and map journeys; T012–T023 remain pending implementation or broader evidence as described in tasks.

## Cycle 10 — 2026-11-13, Home action and build state

The Home action reuses `collectionWorkbench` and `connectedPreparation` after a valid profile/content match. The first Home browser run passed Chromium but stopped on an intermittent Firefox key-detail assertion; isolated Firefox and WebKit Home/key journeys then passed. A subsequent Home assertion failed because the local `dist` still contained the prior Home module. Inspection found an incomplete build candidate and lock in `.build-state`; its recorded PID was no longer running. An automated verified cleanup command was rejected by approval policy, so recovery material remains untouched. Current-source Home behavior passed the full Home workflow in Chromium, Firefox and WebKit using a single-module Playwright route override. A clean normal build and final release check remain open until the interrupted build state is resolved.
