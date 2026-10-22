# Feature Specification: Page edit and picture actions

**Feature Branch**: `010-page-edit-actions`
**Created**: 2026-10-22
**Status**: Implemented; exact-head hosted acceptance and independent final review pending
**Input**: Owner requests an option on pages for any items or things to edit them and add or change their image; implementation and testing are authorized before reviewed publication.

## User Scenarios & Testing

### User Story 1 - Edit the record I am reading (Priority: P1)
A contributor sees an Edit this item/record action beside the heading of every public detail page. Public reading remains read-only. The action explains how to start local authoring, then offers an explicit link to the matching saved record in Content Studio. A saved local preview offers direct editing.

**Why this priority**: Finding the record again manually invites mistakes.
**Independent Test**: For each public detail type, follow its action and open the matching catalog and stable record; change its name, save explicitly, and return to its saved preview.
**Acceptance Scenarios**:
1. Given any item (including weapon), recipe, objective, guide, map or location detail, when choosing edit, then its exact catalog and record are identified, not the first catalog or a name match.
2. Given the public site, when choosing edit, then local-only startup instructions and an explicitly clicked local link appear; no automatic request to the local computer occurs. A custom-port author server can use the displayed relative destination with its printed address.
3. Given a missing, stale, mismatched or malformed target, when opened locally, then an actionable error is shown and no other record is silently loaded for editing.
4. Given a valid local edit, when returning, then the same saved record preview opens; no arbitrary redirect destination is accepted.

### User Story 2 - Add or change this record's pictures (Priority: P1)
A distinct Add/change image action on every public detail and saved local preview opens the matching record with the picture controls focused. Contributors can replace its primary picture or add additional pictures through the existing rights-reviewed workflow.

**Why this priority**: Image maintenance should not require finding an unrelated media panel.
**Independent Test**: Upload original synthetic pixels to a location and an item, replace the item's shared primary image, add an additional image, save, rebuild and inspect from a fresh checkout.
**Acceptance Scenarios**:
1. Given a record without pictures, when its image action is followed, then that exact record is selected and upload controls are focused without opening the file picker automatically.
2. Given a primary image used elsewhere, when replaced, then only this record's attachment changes; other records and original bytes remain unchanged.
3. Given unsaved fields or an unattached picture workbench, when leaving, reloading, discarding or switching catalogs, then loss is warned about and cancel retains the work. Canceling picture/save preparation never writes files.
4. Given invalid media or missing rights, then existing validation refuses attachment/save and retains prior valid source.

### Edge Cases
Duplicate/extra query parameters, wrong catalog key/identity pair, deleted records, misleading names, renamed records with stable IDs, encoded hostile URLs, no server running, non-default port, reload/back/forward, repeated actions, spoiler-protected titles, shared picture attachments and a record deleted after loading.

## Requirements

### Functional Requirements
- **FR-001**: All six public detail groups MUST show separate contextual edit and image actions near the page heading, including spoiler-protected records without revealing protected content. Weapons are items. Sources, claims and assets have no public detail route and remain auxiliary Studio records.
- **FR-002**: Public actions MUST clearly explain local writable source checkout, Node 22+, dependency installation, explicit author startup and manual publication. They MUST NOT add writes, probe localhost, imply connectivity, or depend on browser private profiles.
- **FR-003**: The editor target MUST contain catalog key, immutable catalog ID and immutable record ID plus edit/images intent. Missing, duplicate, unknown, malformed or mismatched fields MUST be rejected without fallback. Names and positional indices MUST NOT determine identity.
- **FR-004**: Valid local actions MUST select the correct catalog, group and record. Image intent MUST focus the image entry controls, ordinary edit MUST focus the record controls, and a generated same-record saved-preview return MUST be available. Arbitrary return URLs are forbidden.
- **FR-005**: All six public groups MUST support existing primary plus up to eight unique additional image references, including additive location support. Picture replacement MUST change this record's reference, not overwrite shared asset bytes; existing usage information and rights/media checks remain mandatory.
- **FR-006**: Loading/actions/return links MUST never save automatically. Unsaved guided fields and prepared image work MUST receive existing loss safeguards, including cancel retention; saved previews show saved state only.
- **FR-007**: Authoring MUST remain loopback-only with existing Host, Origin, session proof and save checks. Explicit cross-site top-level GET navigation to the validated editor document may enter it, but cross-origin API/resource/iframe access and all unauthorized writes remain refused.
- **FR-008**: Actions, guidance and Studio target context MUST be keyboard accessible, dark/light compatible and reflow without horizontal overflow at 320px and 200% text. Error and selected-target context MUST be legible and not rely on color.
- **FR-009**: Acceptance MUST include unit/server regressions, browser edit and real image journeys, fresh-checkout build proof, hosted Chrome Windows/Linux and Firefox/WebKit behavior, and independent visual/review gates. Unavailable checks MUST remain explicit.

### Key Entities
- Author target: catalog key + catalog ID + record ID + bounded intent; derived group and saved-preview return.
- Record picture attachment: optional primary and additional asset IDs. Shared asset content remains immutable under record replacement.

## Success Criteria

### Measurable Outcomes
- **SC-001**: Every generated public detail record has both actions and targets its original catalog and stable ID.
- **SC-002**: Every invalid-target fixture is refused with zero source changes and zero fallback record selection.
- **SC-003**: Edit, primary replacement and additional-image changes survive explicit save, restart and a fresh-checkout rebuild; shared records remain unchanged.
- **SC-004**: All required regression and hosted browser jobs pass on the exact reviewed candidate, and independent desktop/mobile/enlarged-text visual review is recorded before merge.

## Assumptions
- Existing Content Studio provides local transaction, revision, media and rights controls; these are reused rather than replaced.
- Public deployment remains outside scope. A public-site visitor needs a current source checkout and running local author server to edit it.
- Locations receive optional image references compatibly; existing source content needs no migration. Supporting auxiliary records remain editable in Studio but are not granted unsupported picture fields.

## Clarifications
### Session 2026-10-22
No questions required. Scope, identity, public/local boundary, invalid-target behavior and publication authority are explicit in the owner request plus coordination. All clarification categories are clear; implementation alternatives belong to the plan.
