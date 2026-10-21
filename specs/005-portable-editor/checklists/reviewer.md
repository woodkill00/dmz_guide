# Reviewer requirements checklist: Private portable editor

**Purpose**: Independent preimplementation requirements gate for guided authoring and private raster portability.
**Created**: 2026-10-21
**Feature**: [Specification](../spec.md), [plan](../plan.md), [contract](../contracts/editor.md)
**Review Ownership**: Independent reviewer; implementer may not change markers.
**Marker Semantics**: Requirements-quality approval is not implementation or release acceptance.

## Guided authoring and identity
- [x] CHK001 Are all agreed entity types, typed statistics, nullable unknowns, references and evidence editable without requiring raw JSON? [Completeness, Spec E01, SC01]
- [x] CHK002 Are existing pack identity, new-pack/fork namespace and collision requirements internally consistent? [Consistency, Spec E01/E09, Assumptions, Gap]
- [x] CHK003 Are private reader routes, public snapshot separation and same-ID relationships explicit? [Clarity, Spec E02/E09]
- [x] CHK004 Are additions, changes, deletions, affected goals and version/rebind warnings specified before explicit apply? [Coverage, Spec E02/E09, Plan]

## Safe transfer and assets
- [x] CHK005 Are reference-only JSON and self-contained actual-picture export semantics distinguished? [Clarity, Spec E04, SC02]
- [x] CHK006 Are signatures, decoded dimensions, integrity, byte/pixel totals and raster format limits numeric and consistent? [Measurability, Spec E05/E06]
- [x] CHK007 Are animation handling, decode timeout/cancellation and stale asynchronous result rules explicit? [Coverage, Spec E05/E06, Gap]
- [x] CHK008 Are supported transfer format boundaries explicit, including ZIP/archive rejection rather than unbounded decompression? [Clarity, Spec E07, Gap]
- [x] CHK009 Are duplicate keys/IDs/paths, traversal, case collisions, unknown capabilities, schema versions and noncanonical payloads rejected atomically? [Coverage, Spec E03/E07]
- [x] CHK010 Are rights/privacy attestations and metadata stripping defined without pretending an attestation proves ownership? [Clarity, Spec E05/E10]
- [x] CHK011 Are profile exclusion, inert text and no automatic remote asset requests unconditional across imports/exports/readers? [Consistency, Spec E04/E07/E10]

## Transactions and usable recovery
- [x] CHK012 Are stage/apply/rollback bound to original pack and expected revision, including invalidation on pack switch? [Coverage, Spec E08, Gap]
- [x] CHK013 Are quota/conflict/cancellation failures defined to preserve current and previous snapshots plus recoverable drafts? [Coverage, Spec E08, SC03/04]
- [x] CHK014 Are keyboard labels, error focus, narrow-screen editing, direct draft export and all recovery states specified? [Coverage, Spec E11, SC05, Plan]
- [x] CHK015 Is a full guided gun/stat/item/recipe/guide/picture clean-context export/import/reload journey required with semantic and actual-image evidence? [Measurability, Spec SC01/02, US2]

## Notes
Generated through the pinned checklist protocol with explicit 005 prerequisite/template resolution. No extension hooks file was present. The assignment already establishes security-heavy reviewer depth and scope, so no redundant user questions were asked. Generated markers are unchecked until independent evaluation. Parent owns cross-feature integration; its 003 recovery fixes must propagate.

Independent evaluation, 2026-10-21: All15 requirements-quality criteria approved after E12–E14 and matching contract additions resolved immutable identity/new-ID import collisions, generation+target+revision staging, dirty-switch confirmation, sequential timed/cancellable decode, animation/archive rejection and directly exportable failure drafts. New pack revision zero means expected absent baseline; first committed snapshot follows the shared storage revision increment. ZIP is intentionally unsupported, not an implemented archive pipeline. Actual clean-profile transfer, raster decoding, storage safety, keyboard/mobile and linked-view integration remain unexecuted acceptance gates.

## Independent implementation review evidence
2026-10-21: reviewed strict portable parser, actual raster headers/bytes/hash/decode, editor draft/save boundaries and browser journey source. Early findings addressed in owned source: conflicting image intrinsic dimensions/duplicate frames, dirty import disposal consent, pre-mutation save guards, original imported-byte EXIF/GPS disclosure, attestation invalidation and actual new-gun/new-guide roundtrip coverage.
Independent reconstruction of new gun/stat using the actual guided default function reproduced `context.rangeMeters: invalid variant`: pure-null schema default incorrectly returned an empty string. Worker independently converged and fixed explicit null defaults, not validation weakening. Independently ran all 15 portable tests at 23296bc821fa54e31ab393875de4486f7108c089, all passed, including actual-schema new gun defaults.
Hosted 320px overflow and earlier preview failures require repaired exact-head browser run and visual review. No final implementation acceptance yet. Parent-owned private reader/common/CSS integration and clean-profile linked-view tests remain part of acceptance.

### Independent exact-head implementation evidence, 2026-10-21 11:57 UTC

- Reviewed PR4 `e7188426e038b32eba62cd2427a508ed4634414e` using an isolated `git archive` checkout. Independently executed all 59 runtime tests and the build (78 routes plus 404); static parsing of 79 generated HTML files found no missing paths among 1,279 local href/src references.
- Parent verified hosted run 39594775563 succeeded. Independently read its editor browser module: guided creation of a new weapon with a sourced typed damage statistic, new item/recipe/guide and original raster; exported picture bundle; imported into a clean browser context; reloaded; compared full pack/payload semantics and verified related local-reader, inventory and planner views. Also exercises stale-tab conflict, cancel, rollback, delayed decode/pack switch, decoder timeout, storage denial, synchronous quota failure, keyboard preview focus and JPEG/WebP decoding. This is Chrome on hosted Windows/Linux, not physical mobile or all-engine evidence.
- Inspected all 16 Windows PNGs. Both new editor frames were inspected across their complete height at native 320/390 CSS-pixel width. Reflowed SHA256, nested fields, action labels, picture rights/privacy warnings and transfer controls remained visible without page overflow. Overflow JSON records only internal single-line input scrolling for long values. The seven unchanged-layout public/base frames differed only in navigation-label pixels from the previously inspected PR3 images; changed planner, inventory and settings frames were inspected, with full-height readable inventory crops. No new visible overlap or clipping found. Desktop 200% text is not evidence of mobile 200% text or browser zoom.
- No remaining 005-specific release blocker identified at this head. Overall site acceptance remains pending later integrated maps/progression/community, cross-engine and mobile text-enlargement gates, context-wide browser health and final exact-head/main verification. This note is not merge authorization or WCAG certification.
