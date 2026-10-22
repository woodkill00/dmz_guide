# Snapshot amendment requirements-quality review

Purpose: Separate independent gate for reproduced A4 repair.
Created: 2026-10-22
Ownership: Reviewer-owned; implementer must not check these items.

- [x] CHK001 Does FR-009 limit repair to the reproduced repeated-save snapshot defect rather than broad author/catalog locking? [Scope, FR-007/009]
- [x] CHK002 Are normalized root identity, existing cross-process owner token, no recursive lock acquisition and lock order unambiguous? [Clarity, plan A4]
- [x] CHK003 Are pending/other/dead/unverifiable locks, exception release and crash outcomes specified without automatic recovery? [Coverage, FR-009]
- [x] CHK004 Is the critical section bounded to materialized catalog/media bytes, with rendering and output promotion outside it? [Measurability, FR-009]
- [x] CHK005 Are actual ABA, separate-process save exclusion, referenced media consistency, original guards and final Linux/Windows regression evidence required? [Evidence, SC-004]

## Independent amendment decision

CHK001–005 approved for requirements quality on 2026-10-22. Reviewer independently executed the pinned-baseline six-case harness; repeated-save ABA reproduced mixed output with exit 0 while single-save/pending controls failed cleanly. Independent evidence repeats reproduction/a4-results.json outcomes on Linux Node24.19.0. The bounded existing-mutex snapshot wrapper is justified. Approval is limited to FR-009 and T019–T022 design; explicit integration-owner path grant, implementation/source review and actual Linux/Windows regression evidence remain required. No global readCatalog locking, author.mjs/catalog.mjs edits, recursive store queue entry, automatic recovery or lock theft approved.
