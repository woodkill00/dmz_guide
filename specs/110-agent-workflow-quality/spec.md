# Feature Specification: Agent workflow quality and continuity

**Feature Branch**: `feature/110-agent-workflow-quality`
**Created**: 2026-11-27
**Status**: Implemented and locally verified; independently accepted. See verification.md and review.md. Publication and exact-head CI status are tracked in the pull request.
**Input**: Adopt the reviewed Matt Pocock skills plan, cycle artifacts for issues, implement every included helper, and test their actual use.

## User Scenarios & Testing

### User Story 1 - Reproducible agent setup (Priority: P1)

As a maintainer, I want the same reviewed helpers on each checkout without changing my established feature process.

**Independent Test**: Offline validation lists exactly the approved helpers and rejects a changed source file, missing license, unsafe path or duplicate name while preserving the official Spec Kit pins.

**Acceptance Scenarios**:
1. **Given** a normal checkout, **when** helpers are inspected, **then** their source version, local adaptations and invocation paths are discoverable.
2. **Given** a tampered or incomplete installation, **when** validation runs, **then** it fails with an actionable path and performs no repair or download.

### User Story 2 - Diagnose and deliver small changes (Priority: P1)

As a maintainer, I want agents to reproduce my actual problem, test the agreed behavior, and preserve the owning requirements.

**Independent Test**: An independent agent uses the installed instructions in an isolated fictional bug/UI/content exercise and records real failing and passing commands rather than asserting that reading a skill proves behavior.

**Acceptance Scenarios**:
1. **Given** an approved change and test boundaries, **when** diagnosis/testing runs, **then** the original symptom has a red-capable reproduction and actual post-fix evidence.
2. **Given** a routine implementation decision already covered by the plan, **when** work continues, **then** the helper respects existing authorization without demanding redundant approvals.
3. **Given** an unresolved product decision or external mutation outside scope, **when** it is encountered, **then** it is surfaced without inventing an answer or authorization.

### User Story 3 - Independent review and continuity (Priority: P1)

As a maintainer, I want standards and requirement findings reported separately and a fresh session able to resume using concise pointers.

**Independent Test**: A reviewer receives a fixed base, originating spec and changed fictional files, reports supported findings without editing implementation, and a handoff identifies the branch, exact evidence and remaining work without private payloads.

**Acceptance Scenarios**:
1. **Given** a changed implementation, **when** review runs, **then** standards findings cannot mask missing requirements and the implementer cannot approve reviewer-owned gates.
2. **Given** a session handoff, **when** a fresh agent resumes, **then** it can locate the current spec, branch, commands and outstanding work without rereading the entire conversation.

### User Story 4 - Shared language and design decisions (Priority: P2)

As a maintainer, I want agents to distinguish shipped behavior, roadmap proposals and game-data uncertainty, and to prototype or research decisions before broad refactoring.

**Independent Test**: Vocabulary and repository pointers resolve to actual owners; research cites its source; a prototype is locally viewable, fictional and separate from durable player state; architecture suggestions remain proposals.

### Edge Cases

- A checkout is offline or lives in a Windows path containing spaces.
- Upstream instructions refer to another skill, Bash, global configuration, a tracker or CDN absent here.
- A symlink escapes the installation, a source digest changes, a local helper is added without registration, or two inventory paths differ only by Windows-insensitive case.
- Runtime metadata is valid but the agent makes an incorrect decision; structural validation must not claim behavioral acceptance.
- An active feature pointer differs from the Git branch; resolve the pointer explicitly.
- A new session lacks prior skill context or a private handoff was lost; durable specs remain authoritative.

## Requirements

### Functional Requirements

- **FR-001**: The checkout MUST expose all twelve approved capabilities: diagnosis, behavior-first testing, separate-axis review, domain modeling, agent writing, handoff, retrospective, research, prototype, module design, architecture survey and PR evidence.
- **FR-002**: Every adopted source and adaptation MUST have explicit provenance, license, immutable source identity and integrity coverage; offline validation MUST reject missing, changed, escaping or unregistered files without mutating them.
- **FR-003**: Helpers MUST integrate with the existing Spec Kit selection, requirements, tasks, read-only analysis, convergence, verification and independent-review gates without changing official pinned files or creating a competing task authority.
- **FR-004**: Diagnosis/testing MUST exercise observable behavior at the approved test boundaries, record original failure and post-fix results, and distinguish production fixes from fixture repairs and structural checks from agent behavior.
- **FR-005**: Review MUST use a fixed comparison point, separate standards/specification findings, provide supported locations and preserve reviewer-owned decisions. Parallel work MUST have disjoint ownership and isolated mutable outputs.
- **FR-006**: Domain and navigation documentation MUST define core project terms and link actual implementation/testing owners, distinguishing current implementation from proposed architecture and unknown game facts.
- **FR-007**: Handoffs and research/prototype outputs MUST use scoped, sanitized artifacts and context pointers; credentials, player profiles and personal source screenshots MUST stay out of public history. Prototype state MUST be fictional and disposable.
- **FR-008**: Instructions MUST preserve authorized autonomy, ask only material unresolved questions, and require explicit task scope for tracker writes, commits, merges, account setup, deployment or global configuration changes.
- **FR-009**: The installation MUST work as ordinary project-local files on Windows and Linux, without new runtime dependencies, mandatory Bash helpers, global installs, automatic updates or CDN dependencies.
- **FR-010**: Maintainers MUST have documented invocation, update, rollback and troubleshooting paths, a CI integrity gate, meaningful negative tests and independently executed bug/UI/content pilots. Deferred upstream workflows MUST be explicitly listed.

### Key Entities

- **Upstream snapshot**: reviewed source revision and licensed supporting files, inert unless deliberately consulted.
- **Project helper**: locally adapted, uniquely named instructions with source lineage and required references.
- **Integrity manifest**: complete file inventory and expected digests for this tooling slice.
- **Pilot receipt**: sanitized task, environment, commands, observations, limitations and artifact pointers.

## Success Criteria

- **SC-001**: All twelve helpers have unique discoverable names and intact required references; the ten official Spec Kit helpers and their lock remain unchanged.
- **SC-002**: Clean validation succeeds offline; tests reject tampering, missing files/license, unsafe paths and unregistered helper content, with no changes to the supplied checkout.
- **SC-003**: Three independent fictional pilot journeys (bug, UI, content) produce execution evidence; review and handoff are exercised, and failures are fixed before acceptance.
- **SC-004**: Repository contracts, relevant automated tests and independent review pass; convergence leaves no unimplemented requirement. Behavioral acceptance is never inferred from text matching alone.

## Clarifications and Assumptions

The user approved the prior twelve-capability adoption plan and local editable copies. Spec Kit remains authoritative. Existing test boundaries in an approved plan supply routine test authorization. Tracker configuration is local artifact pointers, not a new issue queue. No product behavior, game data, player storage or public deployment changes are in scope. Additional upstream orchestration, triage, teaching, credential wizards, experimental and unmaintained collections remain deferred. Automatic discovery is preserved for local helpers; choosing a helper does not authorize extra mutations. No blocking product question remains after the clarification scan.
