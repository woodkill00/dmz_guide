# Implementation Plan: Protect private inventory drafts
**Branch**: `011-private-draft-safety` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)

## Summary
Repair approved Wave 1 C1/C3/U1/U11 and save-state U10. Reproduce baseline in the real browser before repair. Track an inventory form checkpoint without rebuilding fields during a cancelled departure. Centralize export validation in common client behavior and disable state actions in initial markup.

## Technical Context
ES modules, Node 22+ repository baseline, static HTML, IndexedDB unchanged. Existing Playwright 1.58.2 and Node test runner. Windows/Linux Chrome plus existing Firefox/WebKit matrix. No new packages. Scope: common/profile clients, generated private-page markup, small dialog styling if necessary and focused tests. Current local Node24.19.0. Local Chromium launch is blocked by OS sandbox permissions; hosted CI supplies execution and screenshots without disabling safety.

## Constitution Check
Pre/post-design: player work protected; semantic keyboard-accessible dialog; no game claims changed; profile/content boundary and existing recovery preserved; imports/schema unchanged; small reversible patch; reproduction and exact-head evidence required; no services/accounts/deployment. No exceptions.

## Project Structure
- src/client/common.mjs: initial control lock, one shared export function and dirty guard registration/departure orchestration.
- src/client/profile.mjs: raw inventory checkpoint, dirty comparison and successful-save baseline update.
- src/ui/progression-page.mjs: disable the same shared export in initial progression markup.
- src/ui/private-pages.mjs: disabled startup actions and named dialog markup (or shared client-created semantic dialog where all private pages need it).
- src/styles.css only if existing dialog styles are insufficient.
- tests/browser/draft-safety.mjs: independent acceptance owner; run.mjs integration owned by integrator.
- tests/runtime/private-draft.test.mjs if pure helper contracts justify extraction.
- specs/011-private-draft-safety/: bounded full repair cycle and evidence.

## Design
A guard registered by inventory supplies isDirty() and checkpoint(). Common persist dispatches a successful-save event only after confirmed revision update, letting the inventory checkpoint be refreshed. Compare current input strings to checkpoint strings, so empty/invalid fields remain distinguishable and exact DOM values are preserved. Numeric-equivalent formatting may remain dirty; editing back to exact saved values is clean. No rerender on Stay/error. Preserve existing completion auto-save behavior.

A single pending departure captures the first intent; further requests are ignored until resolution. Pack picker resets to active identity before decision, and pack-changing dispatch happens only after approval. Same-window cross-page anchors are intercepted, except modified clicks, downloads, other targets and same-page fragments. Native beforeunload protects reload/close/history; it is not a custom modal guarantee. Save awaits persist once, then proceeds only on true. Discard clears the departure warning only when committing departure. Stay/Escape cancels pending action and restores initiating focus. Dialog is dismissed before persist so error focus is not hidden behind a modal; failure returns focus to error while preserving draft.

At start of init, lock controls before the first await; generated markup disables private state buttons/file inputs by default to cover pre-module clicks. Only the controls explicitly startup-disabled by this feature are re-enabled once readiness succeeds, preserving other intentionally disabled controls. Both export buttons use exportProfile() and validateProfile; reject loading/no pack/no profile/identity mismatch. Sanitized catalog/version plus revision and UTC timestamp form bounded .json filename. Export request does not persist/checkpoint or promise storage.

## Validation and rollback
Focused baseline failures must be recorded before changing production files. Test startup with delayed schema, dirty pack/link Stay/Discard/Save, empty value retention, failed revision save, no clean prompt, unload warning, both exports and filename semantics. Run npm run check, format:check, browser/engines/studio CI and preserve screenshot/health gates. Independent review and parent exact-head merge gate; then exact-main CI. Revert patch if regression; no migration needed.
