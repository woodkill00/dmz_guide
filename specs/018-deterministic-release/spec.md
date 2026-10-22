# Feature Specification: Deterministic release archives

**Feature Branch**: `018-deterministic-release`
**Created**: 2026-10-22
**Status**: Requirements review
**Input**: Approved Wave4 workpackage15c, separate from016: reproducible ZIP and two-clean-build evidence.

## User Scenarios & Testing
### User Story 1 - Compare independent releases (Priority: P1)
A maintainer compares two releases from identical captured inputs and tooling without irrelevant time or checkout metadata causing archive differences.
**Why this priority**: An exact comparison makes unexpected release changes detectable.
**Independent Test**: Package the same valid payload under different controlled packaging clocks, input mtimes and permission metadata. Compare every member and complete archive.
**Acceptance Scenarios**:
1. Given identical validated payloads, when packaged at different times, then all member metadata and complete ZIP bytes match.
2. Given two clean independent checkouts of the same revision and runtime, when built and packaged independently, then build identity, manifest, all payloads and ZIP bytes match.
3. Given a changed shipped payload, when comparisons run, then the difference is reported rather than normalized away.

### Edge Cases
Different compression/runtime versions are outside the byte-equality guarantee; evidence records actual versions. Different Git revision or dirty status is an intentional identity difference. No-Git trees retain016 descriptive unknown status. Old archives remain valid under016 verification. Unsafe paths, stale sources, changed/missing/extra outputs and resource limits still fail closed before successful packaging. Canonical file permissions are portable, not executable-launcher permission promises.

## Requirements
### Functional Requirements
- **FR-001**: Identical validated payloads packaged with the same tooling MUST yield byte-identical ZIP archives regardless of wall-clock time, input mtimes, input ordinary permissions, checkout directory or platform default ZIP metadata.
- **FR-002**: All ZIP members including the manifest MUST have one documented canonical timestamp, regular-file permissions, compression policy, empty extra/comment fields and lexically sorted member order.
- **FR-003**: Existing016 complete file-set/hash verification, build output/source identity, all bounds, launchers/docs, self-hash exclusion and authenticity limitations MUST remain unchanged; changed inputs MUST remain visible or rejected.
- **FR-004**: Evidence MUST compare two independent clean builds at one revision, with each manifest and all member hashes compared as well as ZIP SHA256; record Node, Python, compression library and OS/platform, Git revision/clean state and exact commands. Retain evidence outputs; never remove existing outputs to simulate cleanliness.
- **FR-005**: Documentation MUST bound reproducibility to identical captured inputs and runtime/compression versions and state that reproducibility is neither an authenticity guarantee nor browser/hosted acceptance.
### Key Entities
- Release archive: sorted named regular-file members, immutable payload bytes and canonical ZIP metadata.
- Comparison evidence: captured inputs/revision/tool versions, member hash maps, archive hashes and equality verdicts.

## Success Criteria
### Measurable Outcomes
- **SC-001**: Two packaging runs with deliberately distinct timestamps and source metadata have exactly equal member hashes and archive hashes.
- **SC-002**: Two independent clean builds yield zero differing members, equal manifest bytes and equal complete archive hashes in the recorded environment.
- **SC-003**: Every existing release-integrity negative test still rejects its invalid input.

## Assumptions
Same Python/Node and compression-library versions are required for claimed equality. No cross-version compressed-byte guarantee is claimed. Scope excludes build pipeline changes, dependency changes, signing, extraction redesign, recovery pruning, hosting/security and publication.

## Clarifications
2026-10-22: Source inspection and controlled experiment show current writestr ignores input mtimes and embeds current packaging local time. Mtime-only change with a fixed clock produces equal ZIP bytes. The reproduced defect is packaging-clock metadata, not filesystem mtime propagation. Functional scope, data model, failure handling, dependencies and completion are clear; no user question is necessary.
