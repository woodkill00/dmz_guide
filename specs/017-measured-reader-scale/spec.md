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

## Measured pagination amendment, 2026-10-22
Independently verified after-index run39781214667 at9dd5772c68b1f5c0189bb5301d6018abfcda765c contains all six fixtures and five samples per engine. At5000 inventory items, initialization/filter-to-paint medians are Chrome1076.1/103.6ms, Firefox887/183ms and WebKit3280/328ms. At1000 all meet the existing budgets. This authorizes review of bounded inventory pagination, not automatic implementation. Different runner CPUs preclude causal before/after speedup claims. Residual synchronous filter measurements suggest DOM/paint cost, an inference rather than profiling proof.

Native-picker decision: NO CHANGE. Native5000 keyboard-to-paint medians35/28/23ms and initialization all meet budgets. Keep native selection; no custom combobox, native filtering or density mode.

- **FR-010**: Render at most50 inventory item fieldsets at once, in original catalog order after applying existing query/view semantics. Show truthful matching-total/catalog-total, visible range, page number/page count and Previous/Next controls. A zero-result filter displays0 matches, no item fields, page1 of1 and unavailable navigation. Hide navigation for inventories with at most50 total records so existing small-catalog presentation stays unchanged.
- **FR-011**: Maintain a pack-scoped raw map and successful-save checkpoint for every owned/reserve field, independent of mounted inputs. Input events update both raw map and full profile model; page/filter changes never change raw values or dirty state. Empty, out-of-range and fractional inputs remain exact raw strings and remain invalid when offscreen. All existing Save/export paths validate the full model, never a visible-only subset. Failed writes and Stay retain both maps; successful save advances the full checkpoint only after actual storage success. Successful activation/reset/restore initializes both maps from the resulting model; failed activation, including attempted Discard, does not touch either map.
- **FR-012**: Query/view changes reset page to1 while preserving focus in the filter control. Previous/Next preserve focus on the activated button, including boundary transitions; use aria-disabled with guarded handlers rather than disabling the focused boundary button. Filtering/paging must not count as edits or persist anything. A new active catalog starts at page1; successful reset/restore also starts at page1 with existing filter settings applied. A page change shows updated range/status and does not automatically focus an input.
- **FR-013**: If a save/export operation fails with invalid inventory raw values, reveal the first invalid item in catalog order (owned before reserve), clear query/view filters to All, select its page, announce why and focus the invalid input. Keep its exact raw string, all other drafts and the checkpoint. Do not move pages/focus for storage failures with otherwise valid quantities. Native visible-input validation remains available. Departure Save failure remains on the current catalog and uses the same recovery; Stay and Discard do not trigger validation recovery.
- **FR-014**: Add failure-first bounded-DOM and all-record draft tests, page/filter/boundary/zero-results/invalid-recovery keyboard journeys, and exact hosted after-pagination measurements of the same100/1000/5000 fixtures. Retain all baseline/fixed identity cases, five samples, no latency pass assertions, strict health, Windows/Linux Chrome, Firefox/WebKit and both-theme fullpage/true200% evidence. No completion claim before independent exact-source/visual and parent integration gates.

Clarifications: page size is fixed50; no preference/storage migration. Filtering uses the full model and catalog, never only mounted rows. Existing Owned/Needed view reevaluation occurs on filter/page actions, not every quantity keystroke, preventing active-input disappearance. Selection of a recovery page is an explicit response to a user's failed operation, not unsolicited background focus movement.
Small-catalog clarification: for<=50 total items, existing hidden-field filtering may retain all rows mounted, still within the50-row bound; navigation remains hidden. Larger catalogs unmount offscreen/filtered rows. Both paths use the same all-entry draft/checkpoint contract.
Privacy/input clarification: query, view mode and page are in-memory view state only, never encoded in URLs or written to storage. Delegated input events capture input.value synchronously before any later page/filter unmount, never only on blur. The exact raw string means the value exposed by the browser; when number inputs sanitize inaccessible lexical text to an empty string, preserve that exposed empty string rather than claiming access to the original keystrokes.

Native-validation convergence clarification (actual c0b Firefox reproduction): FR013 recovery must synchronously cancel every inventory invalid event without replacing rows during the browser's native validation traversal. Coalesce one next-task recovery, not a microtask. Reveal only if its captured draft and pack are still current and no subsequent input, pointer or key action superseded the failed-Save intent. Activation/reset/restore/render invalidate queued recovery. Immediate explicit Save/export model-validation recovery remains unchanged. All multi-invalid raw/order/focus assertions and strict browser health remain mandatory.
