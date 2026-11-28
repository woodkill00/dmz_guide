# Feature Specification: Content verification and usable field reference

**Feature Branch**: `feature/112-content-verification`
**Created**: 2026-11-28
**Status**: Software implemented and verified; physical Android/TalkBack testing deferred by owner
**Input**: Complete follow-ups 1–5: content gaps, source verification, map coverage, weapon statistics and manual usability; Android phone available. Backup/recovery verification remains deferred.

## User Scenarios & Testing

### User Story 1 - Trust the reference (Priority: P1)
Players can read useful sourced item, recipe, upgrade and Order information and editors can distinguish genuine missing facts from information already present in structured records or related source references.
**Independent Test**: Compare an identity-bound before/after audit to the catalog and current approved sources; follow affected reader/editor links.
**Acceptance Scenarios**:
1. Given a structured recipe or reported loot-source hints, the audit describes what is actually missing rather than suggesting the existing information is absent.
2. Given a fresh source report, factual enrichment retains stable identities, provenance and current-build uncertainty; player progress is untouched.
3. Given contradictory or unavailable evidence, the exact unresolved field and reason remain visible. No blanket Checked state or invented replacement resolves a finding.

### User Story 2 - Plan from accurate maps (Priority: P1)
Players can rely on source identity, floor assignments, duplicate handling and key/access relationships while understanding that source coordinates and planned routes do not prove gameplay accuracy.
**Independent Test**: Reconcile available Hajin/X01 captures with registered layers and test marker persistence, floors, access labels and safe/loot route selection.
**Acceptance Scenarios**: An available source comparison reports missing/changed/duplicate records; repeated updates do not add copies; floor-specific markers stay on their floor; unsupported room relationships are not asserted as certain.

### User Story 3 - Read current weapon evidence (Priority: P1)
Players can inspect current preferred-source weapon reports and dated patch references without mistaking multiplayer values for DMZ testing.
**Independent Test**: Check both fixed comparator routes, exercise source-parser positive/negative cases and existing preview/apply/repeat contracts; inspect weapon readers and badges.
**Acceptance Scenarios**: Valid current multiplayer markup is accepted while wrong modes/partial or malformed data are rejected; a partial untested DMZ report cannot replace the preferred baseline; missing weapon combat records remain explicit until supported.

### User Story 4 - Use the site by touch and keyboard (Priority: P2)
Players can operate core collection, upgrade, Order, weapon and map journeys on narrow screens and enlarged text without clipped actions or lost focus.
**Independent Test**: Actual pointer/touch and keyboard journeys, accessibility scans and reviewed screenshots; separately recorded physical Android and screen-reader observations.
**Acceptance Scenarios**: Expanded cards/details and table controls remain operable at 320/390/768/1440 CSS pixels and 200% text; failures have reproductions and repairs; unavailable physical or assistive-technology evidence stays pending rather than being described as a pass.

### Edge Cases
Historical versus current packs; unavailable provider, changed markup, redirects and malformed imports; missing icons and unknown rarity; non-inventory mission objectives; source-aligned versus gameplay-confirmed positions; map floors and locked-room claims; stale/duplicate updates; live private profiles; phone access without exposing repository editing services.

## Requirements

### Functional Requirements
- **FR-001**: Account for every baseline audit finding by stable identity and field, with resolved evidence, accurate classification or explicit outstanding reason. Preserve scope counts and exclusions.
- **FR-002**: Fill supported content gaps using approved source facts and existing typed relationships, recording source/date/applicability and avoiding repetitive filler, guessed values or silent identity merges.
- **FR-003**: Review all 34 registered FOB upgrades, 95 FOB recipes, 24 Hajin/5 X01 navigation groups and their admitted tasks; report source differences and missing facts without changing player completion or pretending every requirement is an inventory item.
- **FR-004**: Review registered Hajin/X01 source/floor coverage and duplicate behavior, calibrated coordinate bounds, locked-room/key relationships and Safe/Loot route behavior. Retain unverified spatial/access claims explicitly.
- **FR-005**: Check preferred MW4 and candidate DMZ weapon comparators and configured official patch sources; safely repair reproduced source drift, retain mode/coverage safeguards and the existing *WZ explanation, and keep unsupported stats unknown.
- **FR-006**: Execute current compact, enlarged-text, touch, keyboard and automated accessibility checks for core guide/map/tool families; reproduce and repair confirmed software defects and review actual captures.
- **FR-007**: Prepare and attempt physical Android and screen-reader verification using isolated test data; record actual execution separately from emulation and document external setup/results still required.
- **FR-008**: Use the pinned Spec Kit analysis/repair cycle and independent review; preserve private backups, existing browser data and unrelated files. No recovery, live profile restore, account integration, public deployment or permission change is included.

### Key Entities
Existing public catalog identities, source captures, quality findings, map features/floors, weapon mode reports and verification receipts. Player state remains separate.

## Success Criteria
- **SC-001**: Every baseline finding has an auditable disposition; no disappearing finding without a documented factual correction or justified rule correction.
- **SC-002**: Every reviewed upgrade, recipe and Orders group has an explicit source-comparison outcome and usable reader links; unsupported content remains visibly unresolved.
- **SC-003**: Map/update and weapon-source regressions pass without relaxed assertions or mode/identity checks, with actual provider outcomes recorded.
- **SC-004**: Core automated touch/keyboard/layout journeys pass and sampled visuals are reviewed; physical-device/screen-reader outcomes are recorded honestly, including pending external dependencies.
- **SC-005**: Independent review has no unresolved implementation defects; content and external-verification limitations remain separate from software completion.

## Clarifications and Assumptions
Owner follow-up,2026-11-28: defer physical Android/TalkBack testing. Keep step-by-step instructions and an indexed user task under root `user-tasks/`. T013 remains uncompleted; preparation and deferral are not passes. Keep the existing documentation URL working. Documentation-only: no runtime, network, device or player-data changes.

Existing owner permission covers local collection from the previously approved providers; it does not create a public artwork redistribution grant. Use ignored local captures/assets where required. Android is available; connection and assistive-technology setup are not yet established. Source agreement is source verification, not an in-game measurement. The requested full-game completeness cannot be certified from incomplete third-party lists; record every remaining evidence gap instead of fabricating it. Dedicated backup/recovery remains outside this feature even if other work finishes.
