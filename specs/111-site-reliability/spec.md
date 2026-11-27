# Feature Specification: Site reliability and release readiness

**Feature Branch**: `feature/111-site-reliability`

**Created**: 2026-11-27

**Status**: Implemented and independently accepted locally; publication gates recorded separately
**Input**: Complete the proposed site-wide reliability pass; capture current private information locally first; save backup/recovery verification for last.

## User Scenarios & Testing

### User Story 1 - Trust the project instructions (Priority: P1)
Readers can find the current unified startup, navigation, shipped capabilities, limits and remaining work without reconciling obsolete snapshots.
**Independent Test**: Follow README and roadmap links against built routes and current owning acceptance records.
**Acceptance Scenarios**: Given a fresh checkout, the documented start command reaches the unified guide/maps. Given historical acceptance, it stays identified as historical rather than current complete-game coverage.

### User Story 2 - Complete daily tracking reliably (Priority: P1)
Users can save inventory, inspect shortages, collect materials, complete upgrades/Orders and track manuals/camos with consistent cross-page results. Maps retain selection and route controls.
**Independent Test**: Run seeded, isolated browser journeys with numerical/state assertions and strict browser health on Chromium, Firefox and WebKit.
**Acceptance Scenarios**: An inventory change updates Needed/Quick collect after navigation; an upgrade/Order completion updates its owning profile; returning to a clean cached Orders page reads newer saved completion without replaying writes or changing quantities; manuals/camos update both weapon and dashboard views. Selecting a map marker retains details after pan/zoom; route ordering changes the rendered route.

### User Story 3 - Find actionable content gaps (Priority: P2)
Editors can inspect missing mission instructions, recipe ingredients, images, weapon/camo coverage and X01 references with exact reader/editor links. A review flag cannot fabricate missing facts.
**Independent Test**: Synthetic missing and complete records produce the expected bounded findings; actual catalog audit links resolve.
**Acceptance Scenarios**: Missing camo instructions/images are linked to their weapon; a missing weapon combat reference yields a valid link rather than crashing. Mission and X01 gaps remain visible through the existing mission/quality audits. No claim of complete-game coverage is made from local catalog counts.

### User Story 4 - Read and operate compact interfaces (Priority: P2)
Cards, tables, menus and inspectors remain usable at narrow widths and enlarged text.
**Independent Test**: Representative families at 320/390/768/1440 CSS pixels, actual 200% text, keyboard operations, expanded states and screenshots; retain existing broader sweep.
**Acceptance Scenarios**: No normal document horizontal overflow, card children remain inside their cards, labels/action text are not clipped, primary/touch targets are44CSSpx and compact targets24CSSpx or have the existing documented spacing exception. Computed body/control text doubles; fluid headings enlarge without clipping; focused expanded controls are unobscured. Genuine map/table scrolling stays bounded. Confirmed P1/P2 defects are repaired and reproduced after the fix.

### User Story 5 - Get dependable verification (Priority: P2)
Maintainers get independent runtime/package, browser and Studio jobs on Windows and Ubuntu, with existing aggregate check names and failure propagation.
**Independent Test**: Workflow contract/negative fixtures preserve command coverage, OS matrix, immutable action pins and a gate that fails for failed/cancelled/skipped dependencies.
**Acceptance Scenarios**: A slow Studio phase does not consume browser/core job budgets. Failed dependencies cannot produce a green runtime gate. Existing test deadlines/assertions are unchanged.

### Edge Cases
Absent/partial sources, protected spoiler records, image references versus downloaded bytes, unknown recipes, newly added weapons, narrow expanded cards, retained user disclosures, missing local map assets, failed/cancelled CI dependencies and inaccessible live browser state remain explicit.

## Requirements

### Functional Requirements
- **FR-001**: Before implementation, preserve confirmed VS Code 4173 saved guide/armory data in an ignored local backup, with scoped raw storage, integrity receipts and no commit. Never test against the live player profile.
- **FR-002**: Reconcile README and roadmap with current routes/owners/evidence, keeping historical receipts and unresolved game verification distinct.
- **FR-003**: Audit and execute the five journey families in US2 across three engines with isolated seeded state; reuse meaningful suites, add missing assertions and repair confirmed failures.
- **FR-004**: Extend existing content-quality reporting for weapon/camo gaps; inventory mission, recipe, icon and X01 gaps with exact links and coverage limits, without new invented game data or a duplicate review store.
- **FR-005**: Run compact layout, keyboard and expanded-state accessibility/visual checks across representative guide/map/tool families; repair confirmed P1/P2 issues with regression evidence.
- **FR-006**: Split long Windows/Ubuntu runtime jobs by independent suite and preserve fail-closed aggregate check names, all existing test commands, pinned actions and functional deadlines.
- **FR-007**: Record requirement-to-command evidence, measured CI baseline, known content gaps and independently reviewed convergence; unavailable checks are not passes.
- **FR-008**: Defer the dedicated backup/recovery verification workpackage until last under a separate follow-up. No restore, reset, profile migration, account/sync, deployment or source collection is part of this feature. Existing regression suites may still exercise synthetic recovery cases.

### Key Entities
Existing catalog records, quality findings/bindings, isolated synthetic profiles and CI suite results. No new player-state schema or editorial store.

## Success Criteria
- **SC-001**: All five US2 journey families have current three-engine passing evidence or an explicitly unresolved blocker; completion requires no blockers.
- **SC-002**: Missing-reference fixtures produce actionable findings; no false complete-game denominator or spoiler exposure; actual gap counts and links are reported reproducibly.
- **SC-003**: All selected compact/expanded layout and keyboard assertions pass with reviewed screenshots and no unresolved confirmed P1/P2.
- **SC-004**: Workflow verification proves preserved suite/OS coverage and failed/cancelled/skipped dependency rejection; each long suite has its own job budget.
- **SC-005**: Private backup remains ignored/untracked, and dedicated recovery verification is clearly listed last rather than marked complete.

## Assumptions and Clarifications
The user confirmed VS Code integrated browser at `http://127.0.0.1:4173/`. A validated owner export from an isolated copy plus a stable origin-scoped raw snapshot satisfies preservation, not recovery acceptance. Broader testing uses separate contexts. Scope is audit/repair and current documentation; new content collection, public launch and repository permission changes are excluded. No further blocking product ambiguity remains.
