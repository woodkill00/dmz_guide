# Implementation Plan: Sitewide workflows
**Branch** feat/105-sitewide-workflows | **Date**2026-11-22

## Summary / Technical Context
Node22/24 static ESM guide + Vite/TypeScript companion, existing player IndexedDB owners, localStorage UI preferences and a separate explicitly saved editorial-metadata database; vanilla semantic HTML/CSS. Playwright three engines, Node tests and Python structural checks. No new dependency, player schema migration, backend or external collection. Scale:89 current registry features,2109 guide routes,35 acquisition identities,303 starter items. Add Help and Quality as registry features; existing data-review remains source-impact owner.

## Constitution Check
Player task outcomes explicit; mobile/keyboard/non-color status; unknown facts preserved; existing progress/backup portability; no arbitrary asset fetch/import execution; small reversible slices; actual tests and independent reviews. No exceptions. Recheck after implementation.

## Architecture / Structure
1. src/domain/site-workflows.mjs: registry-bound14-topic help/task/source/map definitions and safe local preference/review bindings.
2. src/storage/save-events.mjs: metadata-only guarded publish after profile/armory transaction completion; bounded validation and local last receipt, BroadcastChannel with no private quantities. Existing previous snapshots/envelopes unchanged.
3. Shared workspace-tools view/client/CSS: compact disclosure rendered by shared navigation on all surfaces; lazy mounting, density, recent/pins, confirmed-save metadata, stale-other-tab notice linking owning tools, no automatic reload. Map Vite navigation entry shares controller; guide navigation imports it; editor mounting through existing menu setup. No form tree replacement.
4. Existing Workspace backup enhanced with explicit saved-data preview: selected guide profile/armory current/previous, admitted via readExistingRecord/validateProfile/validateArmory; checked manifest/omission/recovery links preserved. No DB creation; no file write until explicit download action.
5. Help + Quality feature-page module registered in normal build extension list. Build passes catalog context for exact author targets. Quality projection/privacy guard, field findings/version-bound local review states and100-row pagination; states never publish fixes. Sources/help expose existing owner review queues. New pages indexed by existing feature index.
6. Search URL/paging/debounce and shared result style; Start a task dashboard launchpad plus help/editor/source/map links. Existing global state summaries and input owners unchanged.
7. Repeatable105 journey/performance runner, docs ledger and broad verification. Reuse existing critical regressions for camera/map popup/route, Orders/upgrades/needed, source review and editor history where scoped.

## Data / Contracts / Migration
See data-model.md and contracts/workspace.md. No existing profile/armory schema changes. New bounded local metadata only; invalid metadata falls back without deleting owner data. Receipts emitted only on successful tx.oncomplete; notification errors cannot reject/replay committed writes. Other-tab notice advisory, no merges. Quality finding bindings include actual canonical record and cited-source SHA-256, so same-version edits invalidate prior review; they change when source versions/field evidence change; old review never counts current automatically. Return URLs restricted to known same-origin routes/feature IDs, not arbitrary imported URLs.

## Dependencies / Risks
Shared nav/registry/build serialized by main implementer; independent reviewer owns review.md only. Quota/blocking/CSP/noJS/iframe/bfcache/long labels and stale imports covered. Snapshot exports may omit map/photos/plans/audit intentionally with explicit receipts; existing owner export tool links remain. Download requested is not verified saved file. Store test hooks must tolerate browser globals unavailable. Content audits do not certify completeness or game mechanics. Map/editor route behavior retained and verified, no invented backend. Avoid new CSS broad selectors that override marker imagery or native controls.

## Verification / Release
Requirementsâ†’tasksâ†’tests matrix in tasks.md; analyze before implementation and append convergence findings. Node domain/store tests, exact source fixtures, browser same/two tab flows, owner CAS/quota and backup/preview, help/audit/search keyboard/mobile/light/dark; existing map journeys/editor/mission/needed regressions; full current runtime/build/map/format/structural once stable. Collect page/search timing metrics as measurements, not universal budget claims. Explicit command/docs and local site readiness. No remote publication/main merge unless subsequently requested.

Planning convergence1: SITEFLOW01 fixed by actual record/context/source SHA-256 binding and same-version stale tests; SITEFLOW02 fixed by exact bounded metadata/index/log schemas and transport rules. No new owner/schema/external access. Independent rereview requested before production edits.

Implementation convergence: existing /data-review/ was not in feature registry; register its existing page alongside new Help/Quality so all canonical owner links resolve. Registry count92; original071 count83 and prior098 Items route retained. No duplicate source-review route introduced.

Surface convergence: manually rendered editor/saved-preview pages need shared navigation entry script, and local author/weapon-manager explicit static allowlists need the finite transitive workspace/navigation module+JSON+CSS list. Added reviewed static public asset list and correct JSON MIME for manager; no arbitrary filesystem expansion or private owner module exposure. Retained editor/manager browser tests validate the actual asset boundary.
