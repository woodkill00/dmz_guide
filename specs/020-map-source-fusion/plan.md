# Implementation Plan: Multi-source map workspace

**Branch**: `feat/020-map-source-fusion` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

## Summary

Extend the integrated Leaflet viewer in `tools/hajin-map` with permission-aware source registration, category masks, calibrated snapshots, reversible evidence review and a private point/icon workspace. Build on the existing official source without replacing the native guide. All three new providers remain reference-only until acquisition permission and coordinate evidence are reviewed. Custom authoring and synthetic-fixture acceptance do not depend on those permissions.

## Technical Context

TypeScript/Vite/Leaflet existing tool; Node22/24; browser IndexedDB for the separate private workspace; existing test runner and Playwright browser harness. No backend, account, source-site writes or live scraping. Reuse bounded raster helpers through a compatibility wrapper, not native UI/database. Supported input is versioned JSON and local raster images. See [contracts/workspace.md](contracts/workspace.md) for precise caps, registration, matching, import and performance semantics.

## Constitution Check

| Principle | Design response | Gate |
|---|---|---|
| Player decisions, accessibility | Shared key/layers state, keyboard list/numeric alternatives,360px layout | T006,T007,T013,T016 |
| Trust is data | Immutable claims, build/floor/activity unknowns, lineage, calibration, stale flags | T003,T004,T010-T014 |
| Portable/private | Separate local database, revision checks, private backups, no public export | T002,T009,T014 |
| Inert imports | Bounded preview/commit, trusted policy, raster reencode, no remote asset fetch | T001,T003,T008,T009 |
| Reversible slices and evidence | Source MVP, private authoring, then curation; traced tests and independent review | T001-T017 |
| Governance and simplicity | No backend/publication; actual source restrictions block dependent ingestion | T003,T017 |

No constitutional exception requested. The constitution retains its repository status; this feature does not ratify or amend it. Rights gates remain externally blocked even if specification quality passes.

## Project Structure

Feature documents: spec.md, research.md, data-model.md, contracts/workspace.md, quickstart.md, tasks.md, checklists/ and analysis/. Planned runtime paths: `tools/hajin-map/src/workspace/` for types, validation, store, migration, import, registration, taxonomy, visibility, annotations, icons, backup, comparison, review and refresh; existing map files integrate UI. Planned tests reside in `tools/hajin-map/tests/`. No native content schema, roadmap baseline001, pinned templates or source assets are modified.

## Architecture and sequencing

1. **Foundation**: establish explicit policy/types, bounded validators and isolated atomic storage. Source permission is trusted registry state; imported files cannot grant it.
2. **Source MVP (US1)**: register all providers with truthful unavailable states; stage authorized immutable snapshots; require calibration; map categories without dropping unknowns; wire one visibility store to Layers and directly opened Map key. Official019 adapter preserves current behavior and rights.
3. **Private authoring MVP (US3)**: point editing and safe icons, independent of fusion; private backup and transactional replace-restore. Geometry kinds POI/location/mark are all points in v1. Every mutation enforces exact backup-projection byte admission in addition to count limits.
4. **Evidence curation (US2)**: spatial candidates, explicit field selection, lineage/conflict review, reversible decisions and stale refresh handling; Reviewed layer references evidence, never overwrites source records. Extend backup to retain review metadata and missing dependencies.
5. **Acceptance**: bounded capacity timings, offline/security/error fixtures, keyboard/mobile and native regression, converge and independent implementation review.

## State and recovery

Use a dedicated IndexedDB namespace and CAS workspace revision for every mutation; retain one previous logical revision and in-memory drafts on abort. Limits and dependency-aware prune rules prevent silent eviction. Migration is one-time, stable-ID-based and preserves old localStorage. Source refresh is previewed and adds snapshots; changed/missing evidence flags affected canonical decisions stale. See data-model.md for lifecycle and contracts/workspace.md for omitted-resource restore behavior.

## Research decisions and rejected alternatives

Evidence and links are in research.md. Reject unlicensed live scrapers, blind normalized overlays, nearest-neighbor automatic merges, source-verification-to-our-verification conversion and a shared native database. Rectangular source imagery makes calibration mandatory. Private backup cannot establish redistribution permission for copied or derived third-party content. Public/share export is deferred completely.

## Verification and release gates

Authorized local backgrounds are staged separately, calibrated with side-by-side landmark controls and compared by same-camera switching or opacity. Use a canvas affine warp for rotated/sheared images rather than rectangular stretching. Keep canonical marker coordinates unchanged. Source raster bytes are omitted backup dependencies; custom data/icons remain complete. Missing permission leaves a source reference-only.

Tasks map every FR and SC to concrete implementation/tests. Definition analysis runs read-only; owning artifacts are repaired separately and reanalyzed. Reviewer-owned requirements checklist must pass before implementation. Later runtime work must execute quickstart.md, record exact evidence, run converge and receive independent review. Clean definition analysis never means runtime tests passed or real providers are import-ready.

## Complexity Tracking

Added complexity is limited to local source evidence/curation and transactional storage. No service infrastructure. External provider ingestion is a future gated adapter, not simulated completion. The full workspace is delivered in small checkpoints, with custom points useful before curation is available.
