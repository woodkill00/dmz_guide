# Implementation Plan: Private portable editor
Date: 2026-10-21. Branch 005-portable-editor. Independent requirements gate pending.
## Summary / Technical Context
Native ESM JavaScript, static HTML route, canonical schema/semantic validator, existing IndexedDB atomic revision store; no added dependencies, server, network asset loading or accounts. Parent integrates build/common/storage/private reader. Own only assigned feature files.
## Constitution Check
Player correction value, labeled native mobile controls, explicit uncertainty, separate content/profile, inert bounded imports, review gates, test evidence and reversible local snapshots satisfy principles. No exception or publication authorization is inferred. Re-evaluated after design: pass subject to independent checklist.
## Project Structure
src/content/portable.mjs owns pure byte/signature/hash/pack/diff boundary. src/client/editor.mjs owns guided form generation, browser decode/re-encode, staging, export and revision commits. src/ui/editor-page.mjs owns native route shell. tests/runtime/portable.test.mjs and tests/browser/editor.mjs own evidence. specs/005-portable-editor owns lifecycle.
## Design / Phases
1. Strict versioned portable envelope and pure staging validation. Canonical parser rejects duplicates before parse; separate envelope string cap permits bounded base64 only. Revalidate nested pack under canonical pack limits.
2. Schema-driven nested labeled fields with nullable variants, primitive type controls and add/remove controls; no executable HTML interpolation from imported strings. Full draft reload into form; raw JSON only optional advanced tool.
3. Browser raster decode after signature/header dimension checks before any persistence. New uploads canvas-reencode to PNG, strip metadata, compute SHA256 and require explicit rights/privacy attestations.
4. Staged current/draft diff plus retained historical profile-reference warning; semantic edits must change contentVersion before apply. Apply uses commitRecord with expected revision, preserving complete previous pack+payloads. Rollback stages prior snapshot and commits against current revision.
5. Test pure attacks and browser full clean-context picture transfer, editing, cancel, rollback and stale apply.
## Risks / Verification
A valid signature alone is insufficient: browser decode mandatory. Node pure checks cannot claim decode evidence. Bounded total pixels limits decode work; sequential decode and close release memory. Blob URLs revoked on rerender. No JS-evaluated markup. Schema generator must resolve nested $ref paths and allOf effects; final canonical validation is authoritative. IndexedDB inability is actionable error; exports allow unsaved-draft recovery. Screenshot privacy is human-attested, not automatically detected.
## Dependencies
Parent-approved value {pack, revision, payloads}, payloads array [{assetId,base64}]. Parent supplies listRecords and common manifest/import options; /local/?pack=...&id=... provides private reader. Public pages stay bundled snapshots. No schema/storage/common changes in this branch.

## Review clarifications
Existing pack identity is read-only. Import targets its own ID at captured revision (zero if new), never silently selected-pack replacement. Workspace generation invalidates staged and async work on cancel/switch; dirty switch needs explicit discard acknowledgment. Decode sequentially with five-second timeout, cancel and late resource cleanup; reject APNG/animated WebP and ZIP. Keep failed-save draft directly exportable. No profile mutation.

Nested array controls paginate20entries to avoid rendering a maximum-size imported record as an unbounded DOM; all entries remain editable through native previous/next controls.
