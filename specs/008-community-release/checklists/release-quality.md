# Community and release requirements checklist

Purpose: Independent requirements quality gate, not implementation acceptance.
Created: 2026-10-21. Feature: [spec](../spec.md), [plan](../plan.md).
Ownership: Independent reviewer. Generated markers start unchecked.

## Correction boundaries
- [x] CHK001 Are exact packet/wrapper shapes, field/value types, length limits and required evidence/rights defined? [Clarity, F008-01]
- [x] CHK002 Are pack/entity/version mismatch, unknown fields and inert import semantics explicit? [Coverage, US1/US2]
- [x] CHK003 Are private-state exclusion, local-only review, self-reported identity and deliberate publication boundaries measurable? [Privacy, F008-02]
- [x] CHK004 Are missing Discord destination, allowed host/path/protocol and user-controlled navigation specified? [Clarity, F008-03]

## Local runtime boundaries
- [x] CHK005 Are external-network-denied local-server semantics and loopback allowance explicit? [Consistency, F008-04]
- [x] CHK006 Are remote runtime dependencies excluded and local pack/raster reload evidence required? [Coverage, F008-04]
- [x] CHK007 Are service-worker caching/sync deferral, server-stopped limitations and storage non-durability consistent across all artifacts? [Completeness, F008-04]

## Release evidence
- [x] CHK008 Are clean checkout/start/static output, formatting boundaries and source/rights/coverage docs required? [Completeness, F008-05]
- [x] CHK009 Are actual engine/OS/mobile/keyboard/visual evidence and clean-profile picture roundtrip requirements explicit? [Measurability, F008-06]
- [x] CHK010 Are exact-head/main CI gates and truthful no-deployment/no-physical-device/no-full-WCAG boundaries preserved? [Consistency, F008-06]

Notes: Pinned checklist prerequisite/template command executed; no extensions hooks file. Awaiting evaluation of clarification gaps.

Scope revision: optional service-worker/PWA caching and sync deferred by parent and lead. CHK005–007 now assess approved local-server runtime, not new cache machinery. Evaluation pending stale cache paragraphs in data-model/contracts cleanup.

Independent evaluation 2026-10-21 11:42 UTC: all ten requirements criteria approved after canonical correction/review bounds and consistent local-server scope replaced the optional service-worker proposal. All implementation/visual/cross-engine evidence remains pending. Research wording should say project review decision rather than imply a separate direct user statement about PWA deferral.
