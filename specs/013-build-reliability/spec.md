# Feature Specification: Trustworthy build and test outcomes

**Feature Branch**: `013-build-reliability`
**Created**: 2026-10-22
**Status**: A3/C12/A2/A1 requirements approved; A4 snapshot-repair amendment approved independently on 2026-10-22
**Input**: Accepted roundtable Wave 1 work packages 4 and 5: C12, A1, A2, A3; A4 investigation completed with a repeated-save ABA defect; the narrow snapshot-repair amendment below passed separate independent review.

## User Scenarios & Testing

### User Story 1 - Keep the last usable reader (Priority: P1)

A contributor rebuilding the guide must not lose the previous usable reader when generating or promoting its replacement fails. Failure must say that the retained reader is OLD, not a successful current build.

**Why this priority**: A failed rebuild must not turn a usable local guide into missing or partial pages.
**Independent Test**: Start with a known OLD reader, inject output-write and promotion failures, and compare retained bytes and failure diagnostics.

**Acceptance Scenarios**:
1. Given a usable OLD reader, when replacement generation fails, then all previous reader bytes remain usable at their existing location, the command fails, and the diagnostic labels the retained build OLD.
2. Given a usable OLD reader, when promotion fails but rollback is available, then all previous reader bytes are restored at their existing location, the command fails, and it never reports fresh success.
3. Given a failure that also prevents rollback, then the complete OLD tree remains preserved at an explicitly reported recovery location; the diagnostic states the normal reader path is unavailable and gives a non-destructive next step. It must not claim uninterrupted availability or universal filesystem atomicity.
4. Given no prior reader, when generation fails, then there is no partial reader published and the diagnostic states no previous usable build exists.
5. Given a complete successful replacement, when promotion succeeds, then the current reader consists entirely of the replacement, obsolete old routes are absent, and the success message appears only afterward.

### User Story 2 - Trust readiness evidence (Priority: P1)

A maintainer running browser or extracted-release checks needs proof that the process started for that check serves the expected build, rather than accepting another listener or hanging indefinitely.

**Why this priority**: False-success evidence is worse than a diagnosed failed test.
**Independent Test**: Occupied-port, exited-child, wrong-content, stalled-response and successful-start fixtures exercise the same helper contract used by real entrypoints.

**Acceptance Scenarios**:
1. Given an unrelated listener returning a successful page, when the expected child cannot start, then readiness fails with child status and captured diagnostics before browser assertions or release-success output.
2. Given a running child serving unexpected content, then readiness fails, even if the response status is successful.
3. Given a child that starts but never becomes ready or stalls a response, then readiness fails within its documented deadline plus bounded cleanup time.
4. Given the expected live child and exact expected content, then readiness succeeds; existing browser health/error assertions continue unchanged, and cleanup targets only that child.

### User Story 3 - Reproduce supported runtime checks (Priority: P1)

A contributor needs the supported runtime baseline explicitly selected in automation, with a small compatibility check for the documented development runtime rather than depending on runner defaults.

**Independent Test**: Inspect exact runtime selection and job expansion; run the declared baseline and compatibility checks on their intended platforms.
**Acceptance Scenarios**:
1. Given repository automation, then Linux and Windows runtime jobs explicitly select the supported baseline; the additional supported development major has one bounded Linux runtime/build/package check.
2. Given existing engine coverage, then Chromium, Firefox and WebKit checks remain present without a full operating-system × runtime × browser multiplication.
3. Given runtime support documentation and package metadata, then declared support and selected major versions agree and no untested future-major guarantee is introduced.

### User Story 4 - Establish and preserve one source snapshot (Priority: P1)

A maintainer needs controlled evidence about a build overlapping an author save or pending recovery, not a speculative second transaction system.

**Independent Test**: Synthetic before/after revisions are deliberately interleaved using existing save failpoints and external test instrumentation.
**Acceptance Scenarios**:
1. Given a multi-file save overlapping build reads, then report whether the build publishes exactly one consistent revision or fails cleanly.
2. Given pending recovery, then report whether build refuses without altering the journal or recovery material.
3. Given the demonstrated repeated-save 0 → 1 → 0 → 1 interleaving, then the build must obtain one complete revision or fail cleanly, never publish the observed mixed version0/alpha0/beta1 snapshot. Repair remains gated on the separate amendment review.
4. Given an existing live, dead or unverifiable repository lock or pending recovery, then build fails without reclaiming locks or changing recovery material; a build crash leaves explicit inspection rather than automatic recovery.
5. Given an acquired snapshot, then a cooperating author save or recovery cannot change catalog/referenced media until their bounded bytes have been captured; subsequent rendering/output work need not block authors. Non-cooperating edits remain guarded by existing validation, not falsely described as mutex-protected.

### Edge Cases

- Disk/write/copy/validation failure; initial build; obsolete files; rename failure on Windows; rollback failure; process termination between promotion steps; previously abandoned staging/backup folders; concurrent builds.
- A server returns another build, exits during a probe, emits excessive diagnostics, refuses bind, never binds, or stalls the response body.
- A pending author journal or an author save beginning/finishing between catalog reads; multiple completed saves changing the same files.

## Requirements

### Functional Requirements

- **FR-001**: Replacement generation and validation MUST leave the last good reader untouched until a complete replacement is ready. An injected write/copy/validation failure MUST not publish partial replacement output. [A3]
- **FR-002**: Promotion failure MUST retain the complete previous tree, restore its normal location when possible, and explicitly report an unavailable normal path and retained recovery location if rollback also fails. Build interruption MUST never deliberately delete the only complete prior tree; interrupted-state recovery must not silently erase retained material. [A3]
- **FR-003**: Every failed build MUST exit unsuccessfully, label retained output OLD or say there is no prior usable build, and omit fresh-success output. OLD is a command/Studio rebuild diagnostic, not an added page banner or a change to retained HTML bytes. [A3]
- **FR-004**: Readiness MUST require the spawned process's successful bind identity, live state and expected build content; unrelated HTTP success or wrong content MUST fail. [C12, A2]
- **FR-005**: Readiness MUST have a total deadline no greater than 15 seconds, per-request timeout no greater than 1 second, bounded diagnostic capture, and bounded child-only cleanup no greater than 5 seconds. Existing browser health checks MUST remain active. [C12, A2]
- **FR-006**: Runtime support MUST explicitly cover Node 22.x baseline and Node 24.x development/compatibility, with Linux/Windows baseline checks and one additional Linux compatibility job, while preserving existing three-engine coverage. Future major support is not implied. [A1]
- **FR-007**: Controlled build/save and pending-recovery investigation MUST report observed outcomes separately from hypotheses; coordination changes require a reproduced defect and updated reviewed artifacts first. [A4]
- **FR-009**: Build snapshot acquisition MUST exclude cooperating author saves/recovery across processes while capturing validated catalog and referenced bundled-media bytes, using existing repository lock ownership. Normalize the root before coordination; do not recursively enter an already-held author transaction. On lock contention or pending recovery fail immediately without automatic retry, reclaim, recovery or deleting another owner’s lock. Release only the acquired owner token, including exceptions. Preserve existing external-edit validation. [A4]
- **FR-008**: Changes MUST preserve public content semantics, author permissions/recovery material, private browser profiles, release-only boundaries and existing test assertions. No account, hosting, security configuration, credential, automatic backup pruning or schema migration is included.

### Key Entities

- Last good reader: complete previously successful public output, retained byte-for-byte until replacement succeeds.
- Candidate reader: complete unpublished replacement that can be rejected without changing the last good reader.
- Readiness evidence: expected child identity, exact expected route content, bounded observed outcome and diagnostics.
- Source revision: one internally consistent catalog snapshot, including its referenced bundled media.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All injected generation/promotion failures preserve the prior complete reader tree and produce honest unsuccessful outcomes; successful replacement contains no stale old-only routes.
- **SC-002**: All occupied-port, unexpected-content, early-exit and timeout scenarios fail within 20 seconds including cleanup; the valid child/content scenario passes.
- **SC-003**: The runtime matrix has exactly three runtime/build platform-major combinations, retains three-engine browser coverage, and records exact-head Linux/Windows outcomes without representing unrun checks as passing.
- **SC-004**: Every controlled concurrency case has reproducible commands and a recorded outcome; the repeated-save regression never publishes a mixed revision after the separately approved repair, and pending recovery/other-owner locks remain byte-identical.

## Assumptions

- This is the bounded manual full feature-cycle repair fallback; no optional bug extension is installed or claimed invoked.
- One integration owner controls shared CI/browser entrypoint edits. This worktree proposes those changes until the parent assigns ownership.
- Successful promotion can use more disk space and a short path-switch interval. No claim of power-loss atomicity, uninterrupted availability across SIGKILL, or protection against an external process deleting files is made.
- Abandoned or uncertain recovery trees are preserved and diagnosed, never automatically pruned.

## Clarifications

### Session 2026-10-22

No new user questions are required. Accepted scope answers the critical intent questions. OLD means honest command/Studio rebuild diagnostics while retained bytes remain unchanged. A4 investigation is complete; its minimum repair is approved for the narrow owner-token snapshot boundary. Shared-file ownership and reviewer approval are implementation gates, not unspecified product behavior.
