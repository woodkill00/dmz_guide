# Feature Specification: Truthful recovery and recoverable controls
**Feature Branch**: `012-recovery-truthfulness`
**Created**: 2026-10-22
**Status**: Draft
**Input**: Approved Wave1 workpackages2–3, C2 C4 C5 C6 C7 U2 A7; depends on011.

## User Scenarios & Testing
### User Story 1 - Understand replacement before applying (Priority: P1)
Players reviewing backup restore, previous-snapshot recovery or version rebind see readable before/after consequences before any replacement.
**Independent Test**: Preview a backup changing only spoilers and another changing named inventory, reserves, goals and progress. Nothing persists until explicit apply.
**Acceptance Scenarios**:
1. Every preview identifies selected catalog and current/proposed version, replacement-not-addition, changed quantities/reserves/goals/progress/routes and spoiler preference. Unchanged sections say unchanged; no silent replacement.
2. Names are used where known; unknown/unresolved references are represented by neutral unresolved labels/counts when visibility cannot be established, never raw imported IDs. Every displayed key/value/metadata string, including catalog/version text and unresolved/version-status surfaces, uses current-spoiler masking; unknown imported strings are not treated as safe merely because they lack a known record match. Hidden spoiler records are masked while current spoiler preference hides them, even when proposed restore would reveal them. Optional raw JSON is an explicit advanced disclosure, still spoiler-safe by default.
3. Cancel changes nothing; existing stale identity/revision and validation gates remain. Rebind and previous snapshot use the same summary path.

### User Story 2 - Distinguish and recover failures (Priority: P1)
Players are told whether content is invalid or browser storage is unavailable, and can attempt a new operation after a failed/closed storage connection without reload.
**Independent Test**: Inject invalid content with healthy storage; fail a database open then permit a later open; close/versionchange a connection; inject uncertain write failure.
**Acceptance Scenarios**:
1. Content-only warnings do not claim storage unavailable. Storage failures retain explicit unsaved/recovery guidance and never silently delete records.
2. Failed opens and closed/version-changed connections can be reopened by a later user operation. No uncertain transaction is automatically retried. Old connections are closed on versionchange and do not block upgrades.
3. Saving remains revision-checked and previous valid snapshots retained. A failure is not reported as success.

### User Story 3 - Continue keyboard and guided editing (Priority: P2)
Contributors reaching a guided array limit receive an actionable error while preserving their draft; planners retain useful focus after updates.
**Independent Test**: Attempt to add beyond exact schema limit in both private editor and Studio; keyboard reorder/remove/edit planner goals.
**Acceptance Scenarios**:
1. Array-limit events are caught by the host error surface, leave draft unchanged and produce no uncaught page error. Existing non-limit mutation failures are also surfaced, not silently ignored.
2. Planner goal quantity/reorder preserves focus on the same record's logical enabled control; removing selects the next row or previous at the end, or goal chooser when empty. Failure keeps actionable error focus rather than stealing it.

### Edge Cases
Blocked upgrades may later succeed; late connection successes must be closed when the original open was already rejected. A stale old connection must not invalidate a newer successful one. Unknown references and hostile names are inert text. Hidden content is not revealed by changed-to-reveal preference. At first/last goal boundaries, disabled move controls need an enabled fallback.

## Requirements
- **FR-001**: Provide one human-readable non-mutating preview for restore/recovery/rebind with complete replacement consequences including spoilers and named profile sections; raw detail optional.
- **FR-002**: Respect current spoiler visibility and inert text across preview, preserving validation/stale checks and explicit apply.
- **FR-003**: Separate content validation warnings from storage availability and retain truthful save/backup guidance.
- **FR-004**: Reset failed/closed database connections safely, close versionchange connections, and allow later independent operations without automatic uncertain-write retries.
- **FR-005**: Catch guided-control limit/mutation errors in both hosts and preserve drafts.
- **FR-006**: Restore logical planner focus after successful edits/removals/reorder without overriding failure focus.

### Key Entities
Replacement preview (current/proposed profile, selected catalog, visible names), storage connection lifecycle (opening/open/failed/closed), guided draft and focused goal identity. No stored schema or game-fact change.

## Success Criteria
- **SC-001**: All six change categories plus catalog/version/spoiler preference are represented correctly; previews persist zero writes.
- **SC-002**: Reopening tests succeed after injected open/close failures and uncertain-write fixtures record zero automatic replay.
- **SC-003**: Exact-limit attempts preserve draft and emit zero uncaught errors; tested keyboard edits land on documented focus targets.
- **SC-004**: Full existing cross-platform/browser/strict-health suite and independent source/visual review pass on exact candidate; exact-main CI passes after approved merge.

## Assumptions
No automatic retry of writes, schema migration, deleted records, recovery pruning, content-load isolation or broad Studio refactor. Raw backup source can contain spoilers, so optional advanced display is masked using current visibility unless explicitly revealed through existing spoiler controls. No blocking ambiguities; all scope, data, UX, reliability, privacy, dependencies, edge-case and completion categories covered.
