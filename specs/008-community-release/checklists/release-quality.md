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

## Independent implementation evidence, 2026-10-21 12:50 UTC

Reviewed application head `93ad1f54027d103aed1bd94433ece18e29d68727` independently. No remaining release-blocking source, tested workflow, visual or packaging defect was found at this head. Main-branch merge and main CI remain separate pending gates; this does not authorize deployment.

- An independently archived exact source tree passed 112/112 runtime tests and generated 84 native HTML routes plus the 404 page. All 1,718 local HTML href/src targets resolved.
- Independently rebuilt and clean-extracted static ZIP passed CRC, unique/safe member paths and all 125 production-file hashes. All 84 routes returned HTTP 200 from the extracted Node-only server with strict CSP. Original PNG/JPEG fixtures returned their exact bytes and correct MIME. The delivered candidate ZIP SHA-256 is `091bd372986ec21932116a4e2be56e224a4ee008ba8d742df4923153e51219b3`; all 130 member contents match the independent exact-source rebuild byte-for-byte (ZIP timestamps can differ).
- Hosted run `39601721603` passed all five jobs, as independently checked by the parent reviewer: Chrome runtime on Linux and Windows, repository checks, and substantive Firefox/WebKit navigation, storage, editor/picture clean-profile roundtrip and external-network-denied local-server workflows. The reviewer read the actual browser assertions, not just launch smoke.
- Inspected all fourteen Windows 200% text screenshots in readable full-height crop sheets: planner, inventory, settings, editor, maps, progression and community, each at 320 and 390 CSS pixels. The browser asserts computed root text of 32px and doubled body text. Prior header and progression-token overflow is repaired; no lost controls or document spill was visible. Native single-line selects/inputs can scroll or truncate their displayed text without expanding the document.
- Inspected seven clean-profile showcase frames, the hostile-correction import error state, open landscape navigation, and public picture rendering with JavaScript disabled and with IndexedDB unavailable. Inspected all five Firefox frames, including full nested editor forms at 320/390 and both public picture states. Original tiny 8x6 test artwork renders with rights/provenance, not a broken image. Fictional schematic data remains explicitly separate from real uncalibrated locations.
- Reviewed strict JSON/import/URL/private-export boundaries, correction stale-review clearing, same-ID picture rollback and public asset path/rights/hash safeguards. PNG stream validation now checks chunk CRC, native zlib integrity, exact noninterlaced/Adam7 scanline geometry and filter values with bounded streaming/deadline/cancellation, followed by actual bitmap decoding. Intentional malformed-image diagnostics are isolated and exactly bounded; unrelated CSP, page errors and network failures remain failures.

Limitations remain explicit: emulated viewports and text enlargement are not physical-device or full-browser-zoom tests, nor a full WCAG audit. WebKit functional evidence has no screenshots because the pinned capture tool itself violates strict inline-style CSP. The real starter catalog is partial and live-build-unverified; missing stats/coordinates remain unknown. Discord awaits an owner-provided invite. Local offline operation needs the static server running; no hosting, service-worker install, cross-device sync or durable-storage guarantee is claimed.
