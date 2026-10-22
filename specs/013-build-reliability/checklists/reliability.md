# Reliability requirements-quality review

Purpose: Independent pre-implementation review of build preservation and trustworthy evidence.
Created: 2026-10-22
Feature: ../spec.md
Ownership: Reviewer-owned. A checked item means requirements-quality approval, not implementation completion. Implementer must not check these items.

- [x] CHK001 Are OLD preservation, normal-path rollback, failed-rollback retention and hard-interruption limits specified without claiming universal atomicity? [Completeness, FR-001–003]
- [x] CHK002 Is OLD labelling unambiguous about command/Studio diagnostics versus unchanged retained page bytes? [Clarity, FR-003]
- [x] CHK003 Are child identity, exact content, exit, timeout, bounded output and child-only cleanup requirements measurable and mutually consistent? [Coverage, FR-004–005]
- [x] CHK004 Are supported runtime majors, platform combinations and preserved browser-engine coverage bounded and explicit? [Clarity, FR-006]
- [x] CHK005 Does the A4 investigation distinguish observed failure, negative evidence, existing guards and separately approved repair scope? [Evidence, FR-007]
- [x] CHK006 Are concurrent build, rollback failure, uncertain interruption and retained recovery-material requirements complete without automatic destructive cleanup? [Edge cases, FR-002/008]
- [x] CHK007 Are shared-file ownership, no author/schema/private-profile changes and required Windows evidence explicit gates? [Dependencies, FR-008]
- [x] CHK008 Are baseline reproductions, final-head regression tests, convergence and independent implementation review distinguished from requirements approval? [Measurability, SC-001–004]

## Independent requirements decision

Reviewed on 2026-10-22 by independent requirements/source reviewer against spec, plan, tasks and reproduction proposal. CHK001–008 satisfy requirements quality for A3/C12/A2/A1 implementation and A4 investigation only. A4 coordination/author/catalog contract repair remains explicitly UNAPPROVED until actual reproduction and amended contracts are reviewed separately. Integration-owner path approval and read-only consistency analysis remain prerequisites. No production source, runtime, Windows/browser/visual, CI or merge approval is implied.

Windows evidence must execute the promotion failure paths on Windows; native open-file/locked-path behavior should also be exercised where feasible and any limitation disclosed. Failed rollback must distinguish retained complete OLD recovery tree from unavailable normal dist. Existing recovery material and abandoned uncertain trees remain preserved without automatic pruning.
