# Implementation Plan: Contributor workflows
**Branch**: `015-contributor-workflows` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary
Implement only approved Wave 3 packages 10–12. Keep Studio's existing state and DOM, add anchor navigation and state-derived text, explicit review-version controls, and one bounded version-1 recovery parser reused by the existing import preview/apply pipeline. Do not extract Studio broadly.

## Technical Context
Native JavaScript modules; supported Node 22.x/24.x. Existing validatePack, parseBounded, validatePayloads, normalizeRaster and optimistic repository save remain authoritative. No new dependencies. Local repository filesystem only on existing save; import parser is pure except injected raster decoder. Node tests, Python checks and Playwright Chromium/Firefox/WebKit on Linux/Windows. Maximum envelope 20 MiB, pack 8 MiB, 32 recovery assets/uploads, per raster 2 MiB/2048², aggregate 8 MiB and existing decoded-pixel cap. Navigation does not re-render forms.

## Constitution Check
Pre-design and post-design: scope serves contributors; keyboard/200% and mobile gates retained; no invented game facts; browser-private data excluded; untrusted imports remain bounded/inert; no backend/accounts; no automatic publication. Constitution reviewed unchanged, no amendment authorized or required. Independent reviewer owns custom checklist before production changes. No violation or complexity exception.

## Project Structure
- src/client/studio.mjs: existing state, review version, recovery preview routing, summary. No media semantics edits.
- src/ui/studio-page.mjs and studio.css: anchors, summary and controls; additive selectors only.
- src/content/studio-recovery.mjs: new narrow boundary validator, no filesystem/network.
- scripts/serve.mjs, author.mjs: friendly startup errors and new module allowlist only.
- scripts/diagnose.mjs: new read-only reader/author/contributor CLI; no optional Spec Kit dependencies.
- docs/quickstart.md, developer-quickstart.md, content-studio.md and README.md: destinations/startup.
- tests/runtime/contributor-workflows.test.mjs and tests/browser/contributor-workflows.mjs: focused red-first contracts and actual browser acceptance.
- specs/015-contributor-workflows/: lifecycle/evidence.

## Validation strategy
Capture missing parser/controls and missing-build startup failure-first. Unit hostile matrix covers format/version/size/unsafe keys/duplicate fields/identity/key/revision/rights/media mismatch/missing bytes/aborted decoding. Browser tests cover inert preview/cancel/apply, dirty retention, identity of controls, version invalidation, accessible focus and workflow truthfulness. Existing strict browser health and full-page/tiled screenshots, actual 200% text, Windows/Linux and three engines are not replaced by unit tests. Local sandbox EPERM is unavailable evidence, never bypassed. Hosted exact-head CI is integrator-owned.

Diagnostics report BLOCKER for required missing runtime/build/source, WARN for non-loopback configured HOST and unavailable optional contributor tools. They do not bind sockets, inspect secrets, install tooling or alter settings. Contributor role checks developer readiness separately from reader/author needs.
