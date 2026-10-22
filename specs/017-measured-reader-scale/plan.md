# Implementation Plan: Measured reader scale
**Branch**:017-measured-reader-scale | **Date**:2026-10-22 | **Spec**:[spec.md](spec.md)

## Summary
Implement approved C9 selected-first isolation and C8 ID indexing after real failure-first evidence. Measure supported large fictional fixtures before/after indexing; add pagination/native filtering only after a reviewed evidence-triggered amendment. Depend on integrated014 for opaque private navigation and016 for the separate identity hook; never overwrite their contracts.

## Technical Context
Existing static ES modules, IndexedDB, Node22/24 and Playwright1.58.2. No new dependencies/schema-limit changes. Source common.mjs currently Promise.all-loads every published payload before readiness and silently defaults unknown pack IDs; profile.mjs uses items.find for each visible/hidden item per filter. Manifest currently exposes payload paths only. These are source findings, not yet claimed hosted reproductions. Add a bounded catalog descriptor index to the existing generated manifest, keeping packs paths compatible; no broad release-boundary consolidation.

## Constitution Check
Pre/post design: improve player work; retain keyboard/theme/200% checks; fictional fixtures clearly labeled; no new game facts; preserve local private state and hostile-input bounds; small explicit contracts; tests before repair, measured claims only; no publishing/account/backend changes. All ten principles reviewed, no exception.

## Structure and ownership
- scripts/build.mjs: only additive generated catalog descriptors next to packs, under013's existing captured catalog data; coordinate016 identity emit.
- new src/content/catalog-loader.mjs: bounded descriptor validation, exact identity fetch/cache, no failed-result caching. Public module, not repository author surface.
- src/client/common.mjs: integrate loader after014; preserve requestedPack/opaqueContext options, existing dirty/init/export/storage semantics. Initialize selected full pack before unrelated local listing; never fetch unrelated published payloads during readiness.
- src/client/editor.mjs: explicitly request full baseline for import comparison when not already cached, preserving source identity and media rules. Coordinate016 generic-field support.
- src/client/profile.mjs: one per-pack ID index; existing live DOM filtering/raw checkpoint remains unless measurement amendment authorizes windowing.
- tests/browser/measured-scale.mjs: controlled baseline and final journeys plus recorded samples, strict health intact.
- tests/runtime/measured-scale.test.mjs: descriptor/cache/identity and unchanged stable filter outcome contracts; benchmark lookup operation counts as well as time.
- tests/browser/run.mjs and engines.mjs: integration owner only. Workflow adds bounded feature gate, not relaxed checks.
- specs/017-measured-reader-scale: reproduction, measurements and conditional decision records.

## Loading design
Generated manifest adds catalogs entries {id,title,path}, at most32, paired one-to-one with existing packs paths. Manifest is capped at65536 UTF-8 bytes before JSON parsing. Require unique IDs matching existing ID syntax with at most200 characters, titles of1–200 characters, and paths matching exactly /^\/assets\/content\/packs\/[a-z0-9-]+\.json$/ with at most256 characters. No query, fragment, traversal, absolute URL or foreign origin is allowed; validate fetched payload with published schema then assert exact descriptor identity. No path-derived identity guess. Absence of the new index is an explicit stale-build message, not eager silent fallback; source/build are packaged together. Default may select the known official descriptor only when no requested identity exists; otherwise first explicit valid descriptor preserves existing order. An explicit unknown request never defaults.

Keep full validated payloads only in state.packs; choices are separate descriptors. A getCatalog(id) helper obtains exact full published/local content for selection and private import comparison, and caches successful validation only. Private overrides remain checked on each active selection, not silently reused across writes. Local-only requested catalog is targeted by exact ID before enumerating unrelated local records. After selected render/readiness, bounded local-list discovery may add valid choices without rerendering inventory or resetting drafts; listing failures become informative warnings without relabeling healthy active storage.

On failed startup request, show unavailable error, keep mutation/export controls unavailable and allow explicit known catalog choice. On failed switch, restore prior select/state/controls and exact draft, report that no switch happened; do not dispatch pack-changing until the new full catalog is ready to activate. Discard only authorizes the attempted departure: do not clear the prior raw draft or successful-save checkpoint before a new full catalog can activate. Generation checks suppress late outcomes. All user departures remain under011 guard. Missing context still cannot select another catalog;014 verifies complete pack digest/current visibility before exposing its target.

## Scale experiment and conditional design
Use valid fictional catalogs with approximately100,1000 and5000 items (adjust downward only if existing validation bounds require it, disclose exact counts). Record environment, validity, warmup and five repeated samples. Measure browser initialization-to-ready and synchronous filtering plus next painted frame; record lookup baseline and indexed operation counts. No CI timing assertions. Compare median observations to spec budgets; large render cost is separate from lookup cost. Native goal selection observes valid bounded option sets and native keyboard selection, not invented user-study claims. Native-filter budget is100ms for settled keyboard selection/next paint; initial option preparation shares1000ms initialization budget.

If pagination is justified, amend spec/data-model/UI contract and obtain independent gate before implementation. Proposed direction only: bounded page window with raw map/checkpoint spanning all records, successful-save-only checkpoint, all-record validation, exact invalid entry retention and logical focus. Do not implement it now. No-change is acceptable with actual measurements and limitations.

## Validation and rollback
First publish/run baseline probes without corresponding production repairs. Existing health monitor handles malformed-data responses with HTTP200, avoiding suppressed expected network failures; controlled delayed unrelated response establishes dependency without timing-only assertions. Capture unknown-ID fallback and fixture timings. After repair, run exact same functional conditions with fixed expectations, bothOS Chromium and Firefox/WebKit, offscreen raw/failure/Save/Discard/Stay cases, native options and fullpage/true200 evidence if controls change. Independent source/visual review, append-only converge, parent-approved merge and exact-main CI required. Revert bounded patch without profile migration if necessary.
