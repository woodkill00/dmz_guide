# Plan: Truthful recovery and recoverable controls
**Branch**012-recovery-truthfulness | **Date**2026-10-22 | [Spec](spec.md)

## Summary and technical context
Bounded continuation after011. Existing ES modules, static UI, IndexedDB revision checks and Playwright/Node tests; no dependencies, data migration or game-fact changes. Windows/Linux Chrome and Firefox/WebKit remain mandatory. Production changes wait for independent checklist approval and executed baseline reproductions.

## Constitution check
Pre/post-design passes: preserve data/source boundaries, inert imports, current spoiler preferences, explicit replacement and snapshots; keyboard and visible errors; reproduction-first. No constitution exception.

## Research decisions
Use a pure profile preview projection instead of raw JSON as primary UI. Escape output and use existing spoilerGuard for names/ids/text; advanced values are projected/masked, not a hidden leak. Unknown imported IDs use neutral unresolved labels/counts; metadata and version-status/unresolved text use safe bounded projection too. Complete inventory/reserves/completion/routes changes use union of keys, goal changes use identity/priority/quantity, and versions/spoiler preference are explicit. Retain existing previewProfile checks before staging.
Separate storage read/open errors from overlay validate errors: catch read failures as storage unavailable, validate errors as content retained/fallback warnings. Maintain separate warning list and availability flag; successful profile storage must not erase earlier content warning, and content warning cannot invent a storage outage.
Connection state caches only current opening/open connection. On open failure invalidate only that promise; on versionchange/close invalidate matching connection and close it. Late success after rejected blocked open is closed. transaction() synchronous InvalidStateError invalidates connection for the next operation; do not retry current operation. Transaction events never replay writes. Preserve API shape, revisions and snapshots.
Guided editor onError host callback wraps nested event mutations; both private editor and Studio pass existing error handler. Validate limit before mutate; do not catch-and-pretend-success. Keep draft owned by host.
Planner focus uses record ID and control kind rather than row index after successful persist; removal next/previous goal, else chooser. Disabled move fallback to same-row quantity. Failed persist does not rerender or override error focus.

## Paths and contracts
- src/domain/profile-preview.mjs new pure summary projection with current-spoiler masking.
- src/client/profile.mjs, src/ui/private-pages.mjs: human-readable summary and optional advanced details.
- src/client/common.mjs: content/storage taxonomy only, retain011 draft guards.
- src/storage/store.mjs: connection lifecycle only; exported API unchanged.
- src/client/guided-editor.mjs, src/client/editor.mjs, src/client/studio.mjs: host error callback wiring.
- src/client/planner.mjs: focus restoration after successful edits.
- tests/runtime/storage-lifecycle.test.mjs and profile-preview.test.mjs; tests/browser/recovery-truthfulness.mjs plus runner integration.

## Validation and rollback
Capture C2/C4/C6/C7 baseline browser behavior and C5 deterministic Node mock before corresponding repair. Tests: spoiler-only, readable full diff, missing/hostile/spoiler names, zero preview writes, invalid overlay with healthy store, failed open later succeeds, versionchange closes, late blocked open closes, uncertain write attempted once, exact-limit errors both hosts, planner move/remove/quantity keyboard. Full check/format/three-engine/Windows+Linux/Studio/visual gates then approved merge and exact-main. No migrations; patch revert restores prior format compatibility.
