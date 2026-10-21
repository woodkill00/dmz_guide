# Implementation Plan: Repository Content Studio

**Branch**: `009-repository-content-studio` | **Date**: 2026-10-21 | **Spec**: [spec.md](spec.md)

## Summary
Add an opt-in loopback-only Node authoring server and a separate contributor UI. Reuse schema-guided controls and raster validation, but never initialize private browser profiles. Canonical source becomes per-record JSON plus categorized binary media. Deterministic assembly preserves the existing runtime pack version, record order and public URLs. Ordinary serving and distributables remain read-only.

## Technical Context
- Language/version: JavaScript ES modules, Node 22+, existing HTML/CSS.
- Dependencies: existing Playwright and Prettier only; no runtime service or native image dependency.
- Storage: tracked content/catalog and media, ignored .author-state recovery journal. Generated dist packs remain ignored.
- Testing: Node test runner, Python repository checks, hosted Chrome on Windows/Linux, Firefox/WebKit behavior. Local browser sandbox limitations are not bypassed.
- Platform: local Windows/Linux author server, responsive browser UI; public site remains static multipage.
- Scale: canonical metadata has global 8 MiB and 20,000-record bounds; each generated runtime pack also retains its 8 MiB bound; at most 1,000 assets per pack and 1,024 assets across a build, with 256 MiB total published bytes. Each image retains 2 MiB, 2048 dimension, 4,194,304 pixel bounds. New upload batch 8 MiB; request envelope 20 MiB. Portable import/export retains 32 images, 8 MiB bytes and 16,777,216 total pixels.
- Performance: no eager binary image fetch on startup; library renders pages of at most 24 entries and requests visible previews only. Test 1,000 metadata entries.

## Constitution Check
Pre-design: passes. The feature directly supports contributor workflow, preserves factual uncertainty and private/public separation, uses bounded untrusted parsing, and adds only the backend necessary for explicit repository writes. No deployment, credentials or publication automation.
Post-design: passes subject to independent requirements checklist. Transactions preserve old data/recovery evidence, migrations have a single authoritative marker, and the normal runtime remains isolated. Power-loss durability is bounded by filesystem/OS guarantees, not overstated.

## Project Structure
- scripts/catalog.mjs: canonical reader, serializer, deterministic assembly and migration helpers.
- scripts/author-store.mjs: fixed-root validation, revisions, journals, commit/recovery, managed Git preview.
- scripts/author.mjs: local-only HTTP server, validated saved-record preview and CLI startup.
- src/client/guided-editor.mjs: shared schema control renderer, extracted without private behavior changes.
- src/client/raster-editor.mjs: bounded browser decode/crop/PNG normalization.
- src/client/studio.mjs and studio-media.mjs: independent repository authoring controller and media workflow.
- src/ui/studio-page.mjs and src/ui/studio.css: author-only accessible page/style.
- content/catalog/manifest.json: explicit canonical catalog membership.
- content/catalog/<pack-key>/pack.json: header and ordered group IDs.
- content/catalog/<pack-key>/<group>/<safe-id>.json: individual records; weapons stored separately but assembled into runtime items.
- content/catalog/<pack-key>/assets/<safe-id>.json: source-only asset descriptor.
- media/<pack-key>/<category>/<safe-id>/original.png: new normalized binary image; thumbnails are separate ordinary assets.
- tests/runtime/catalog.test.mjs, author-store.test.mjs, author-server.test.mjs and tests/browser/studio.mjs: traced acceptance coverage.

## Ownership and Integration
Catalog owner controls catalog module, migration, published validation profile, schema media limits and build integration. UI owner controls guided extraction, raster helpers and Studio modules. Server owner controls author-store and author HTTP server. Integration owner controls package scripts, CI, acceptance/browser orchestration, documentation and shared additional-picture schema/render changes, coordinated before edits. Reviewer owns the custom requirements/safety checklist and final release gate. No implementation starts before the design gate.

## Migration
Explicit migration previews every existing pack and asset, preserves exact runtime semantics/order, validates all bytes, then stages canonical outputs. A single catalog manifest marker is committed last only after targets match expected contents. Legacy files are retired through the same recoverable plan, not silently unioned or selected by precedence. Build fails on incomplete/ambiguous state. The checked-in migration is verified by deep equality against the prior tracked packs. Tests obtain canonical packs through a helper, not duplicate editable fixture copies. Existing independent synthetic test fixtures remain fixtures, not public sources.

## Verification and Release
Run regression tests before and after integration, fail/interrupt injection for persistence, real browser journeys with file uploads/crop/restart/build/clean-copy rendering, scalable catalog and lazy-media checks, negative authorization/path/symlink cases, and actual visual review. Preserve strict CSP and health monitoring. WebKit functional checks remain required; its screenshot injection limitation remains documented. Keep implementation, tasks, contracts and evidence aligned through analyze and converge. Publish reviewed draft PR, repair findings, merge only after reviewer and exact-head green CI, then verify exact main CI. Physical device checks and formal accessibility certification are not claimed.
