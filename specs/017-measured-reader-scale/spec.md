# Feature Specification: Measured reader scale
**Branch**: 017-measured-reader-scale
**Created**: 2026-10-22
**Status**: Draft for independent requirements review
**Input**: Approved Wave4 workpackage15a/15b (C9,C8,U9), excluding deterministic packaging owned by a separate batch.

## User Scenarios & Testing
### User Story1: Open the intended catalog (P1)
A player opens their selected catalog without waiting for unrelated catalog content or inheriting another catalog's failure.
**Independent test**: Hold or invalidate an unrelated catalog while opening a healthy selected one; then select an unavailable identity.
**Acceptance scenarios**:
1. A healthy requested catalog becomes usable without requesting unrelated published catalog payloads. Catalog choices remain discoverable from bounded metadata.
2. An unknown, malformed or unavailable requested identity produces an explicit unavailable state, never a default catalog/profile. A user can explicitly choose another known catalog.
3. A failed switch from an already usable catalog leaves that prior catalog and its exact raw draft and successful-save checkpoint active, even after Discard was chosen for that attempted switch, restores its selection, and explains that no switch occurred. It does not claim the requested catalog loaded.
4. Rapid changes cannot apply a late catalog/profile response over a newer selection. Existing dirty Save/Discard/Stay, private context identity/digest checks and startup/export guards remain.

### User Story2: Find inventory without sacrificing edits (P2)
A player can filter a large valid inventory responsively, retaining all raw quantities and protected reserves.
**Independent test**: Measure representative and large valid fictional catalogs before and after improvement, change a raw value, hide it by filtering or conditional pagination, and exercise Stay, failed Save and successful Save.
**Acceptance scenarios**:
1. Repeated filtering returns identical stable-order results and counts while avoiding growth from repeated full-list searches per item.
2. Exact raw empty/invalid values and valid quantities remain intact when hidden or off-screen, including failed save and departure Stay; successful save includes all entries, not only visible ones.
3. Additional pagination or native record filtering is introduced only if controlled browser measurements show the indexed version still exceeds the documented interaction budget. Otherwise record an explicit evidence-based no-change decision.
4. Any justified pagination is keyboard accessible, has clear range/count/navigation and does not move focus unexpectedly or mark filtering as dirty. No custom combobox or density mode is introduced.

## Edge Cases
- Empty manifest, duplicate/mismatched identity or malformed descriptors fail explicitly; no guessed identity from a file name.
- Missing local catalog or invalid local override remains retained, with content/storage warnings accurately distinguished. Published same-identity baseline fallback follows existing documented invalid-overlay behavior, never substitutes another identity.
- Unrelated local listing failures do not block a selected healthy catalog. A later recovered storage operation must not remain labeled unavailable.
- Failed fetches can be retried by a later explicit selection; writes are never automatically replayed.
- Hidden invalid numeric input prevents validated save/export. Filter/page changes never reset the last successful-save checkpoint.
- Large measurements use valid bounded fictional data, disclose hardware/browser/method and are observations rather than universal latency guarantees.

## Requirements
- **FR-001**: Resolve and make usable only the requested catalog payload first; unrelated published payloads must not be needed for initial readiness.
- **FR-002**: Reject unknown/unavailable/mismatched selection explicitly, with an accessible recovery choice and no silent identity substitution.
- **FR-003**: Preserve prior catalog/draft on failed switches, late-response safety and all existing draft/export/private-context contracts.
- **FR-004**: Keep catalog choices discoverable using validated bounded identity metadata and safely load a different catalog on explicit request; private editor import comparisons must still obtain the correct full baseline.
- **FR-005**: Replace repeated linear inventory lookup with an identity index while preserving stable filter outcomes and truthful counts.
- **FR-006**: Record reproducible before/after initialization and filtering measurements for representative and large valid inventories, plus native goal-choice interaction observations. Decision budgets: warm median filter-to-next-painted-frame100ms and initialization1000ms and native-selector settled keyboard-selection-to-next-painted-frame100ms on the recorded hosted runner, with multiple samples and no CI timing pass/fail threshold.
- **FR-007**: Add pagination or filtered native selection only when the post-index measurements exceed their relevant budget; document an explicit implement/no-change outcome separately for both choices. Requirements/design must be amended and independently reviewed before dependent optional code.
- **FR-008**: Preserve all raw off-screen values, save/discard/stay semantics, invalid/failure retention, keyboard focus, both themes and true200% reflow if presentation changes.
- **FR-009**: Retain strict health and the Windows/Linux Chrome plus Firefox/WebKit functional matrix; actual hosted measurements and independent review gate completion.

## Key Entities
- Catalog descriptor: bounded identity/title/payload location, distinct from a validated full catalog.
- Catalog cache: only successfully validated full payloads, associated with their exact identity; no failed-load success placeholder.
- Inventory draft: raw entries and last successful-save checkpoint independent of visual filtering or conditional page window.
- Measurement record: fixture size/validity, environment, repeated samples, selected decision and limitations.

## Success Criteria
- **SC-001**: Every controlled unrelated-catalog failure/delay permits the healthy selected catalog, while every unavailable-request case avoids wrong-identity state.
- **SC-002**: All exercised hidden/off-screen valid and invalid entries survive filtering and failed/cancelled actions exactly; full saves retain entries outside the visible window.
- **SC-003**: Published evidence contains before/after samples and separate justified pagination/native-filter decisions; no optimization is justified by invented measurements.
- **SC-004**: Exact-candidate required browser/platform checks and independent source/visual acceptance pass before the parent-approved merge and exact-main verification.

## Assumptions
Existing schema/import limits remain unchanged. Additive generated catalog metadata is permitted, but broad manifest-boundary consolidation is not. No services, background synchronization, accounts, new dependencies, private query URLs, automatic write retries, type tooling or unrelated refactoring. Reader-flow014 must be integrated before editing its common initialization hook. ZIP reproducibility belongs to the separately gated release batch.

## Clarifications
### Session2026-10-22
Explicit prerequisite scan resolved this feature directory. Functional scope, data identity/lifecycle/limits, interaction states, privacy, dependencies, failures, constraints, terminology and completion coverage are clear. The two optional scale controls are deliberately conditional investigations with an amendment gate, not unresolved implementation choices. Zero user questions required; no scope beyond the approved wave is inferred.
