# Contributor safety requirements checklist
Purpose: independent preproduction requirements gate. Created 2026-10-22.
Ownership: only the independent reviewer may check these items; implementer never self-approves.

## Completeness and clarity
- [x] CHK001 Are reader/private/author storage destinations and manual publication boundaries explicit? [Spec FR-001, FR-004]
- [x] CHK002 Are diagnostics non-mutation and no automatic origin changes explicit? [Spec FR-002]
- [x] CHK003 Are navigation preservation and version-review invalidation objectively defined? [Spec FR-003, FR-005; SC-002, SC-003]
- [x] CHK004 Are recovery format/version and all size/count/decode limits specified? [Spec FR-006, FR-007; Plan Technical Context]
- [x] CHK005 Are identity/destination collisions, stale revisions, missing bytes and rights decisions specified without a bypass? [Spec FR-007–009; contracts/recovery.md]
- [x] CHK006 Are non-mutating preview, explicit apply, invalidation/cancellation and original-export retention clear? [Spec FR-008–009]
- [x] CHK007 Are actual cross-platform/engine, strict health, keyboard and visual acceptance boundaries retained? [Spec SC-005; Plan Validation strategy]
- [x] CHK008 Are ownership boundaries and deferred architecture/media work excluded consistently? [Spec Assumptions; Plan Project Structure]

## Notes
Independent requirements gate approved 2026-10-22 after explicit contributor-role/non-loopback warning coverage, normalized byte bounds, async cancellation and destination-switch invalidation were added. All eight requirements-quality criteria satisfied; this is not implementation or runtime approval. Source, hostile-media browser tests and exact-head cross-platform/visual evidence remain separate gates.
