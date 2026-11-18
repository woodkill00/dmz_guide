# Save operation and asynchronous ownership

## Durable operation identity

Before Save, validated preview returns target, canonical/document expected revisions, source fingerprints and previewDigest over exact reviewed changes/assets. Client allocates operationId=32cryptographically random lowercasehex and retains it with that candidate in recovery storage before submission. The local service adds page-edit operations to its existing journal/receipt mechanism; this is required implementation, not an existing API claim.

Proposed authenticated local endpoints: `POST /api/page-edits/preview`, `POST /api/page-edits/commit` with `{operationId,target,expectedRevision,expectedDocumentRevision,previewDigest}`, `GET /api/page-edits/operations/<operationId>`, and `POST /api/page-edits/operations/<operationId>/cancel`. Fixed grammar, existing local session/Origin/Host rules and no arbitrary paths. Source files/assets are admitted through the reviewed server candidate, not arbitrary commit payload paths.

Server serializes by operationId and the existing repository transaction lock. It records durable intent before file writes. Reuse of operationId with a different target/digest/revision is rejected; the same operation can be committed at most once. A repeated request for a known operation returns its existing outcome and never applies a second mutation. Cancellation is serialized with commit and records a durable terminal tombstone, so a delayed original request cannot execute after a confirmed cancellation.

Receipt states:

- `committed`: durable outcome binds operationId,target,digest,transactionId and resulting canonical/document revisions plus asset/document hashes. Confirm actual current revision/known journal outcome before reporting Saved to repository. A later edit may supersede it, but that does not justify replay.
- `not-committed`: durable terminal rejection/cancellation proves no file mutation from this operation, or reviewed rollback proves before-bytes restored. Keep draft; correct/reload and validate a fresh candidate before a new operationId.
- `unresolved`: pending/in-flight, receipt not found (which does NOT prove a delayed request cannot arrive), unreadable journal, unknown source bytes or interrupted commit. Keep target/candidate/picture bytes; disable new repository mutations until resolved. Offer Check status/export/manual recovery. No automatic new-ID retry, overwrite, timestamp expiry or lock deletion.

If an operation was never seen, explicit cancellation must establish its durable tombstone before treating it as not-committed. If it was already committed, cancel returns committed instead. Pending recovery follows existing author:recover preview/apply and known before/after byte rules; mismatch keeps the author locked for manual resolution. Receipt retention is explicit: pending/unresolved records and cancellation tombstones are not silently pruned; any later compaction requires a separate safe retention protocol. Local-author backend must not claim universal CAS against arbitrary external filesystem writers.

## Browser draft/media ownership

Every read, File.text/decode/normalization/crop, asset lookup, restore, preview and autosave captures `{targetKey,baseRevision,documentRevision,draftGeneration,blockId,assetIntent}` as applicable. Any edit/replacement/removal/selection switch increments the owning generation or asset intent. Before applying a completion, compare the captured owner and generation against the active draft and verify block/asset still exists. Stale work is discarded and owned object URLs/workers released. It cannot overwrite a newer photo, import, preview, selected record, saved receipt or focus.

Autosave debounces500ms, uses one writer and compares captured draft revision in its IndexedDB transaction. It commits complete metadata and prepared image bytes atomically or reports unavailable recovery; successful older writes cannot replace newer generations. It never changes repository files. Restore is validated and previewed before replacing a draft and increments generation. Pending destructive replacement/restore and new repository mutations are disabled during Save or unresolved outcome; read-only navigation may retain the operation owner separately.

pagehide/target switch aborts cancellable reads, normalization, preview and draft tasks; late callbacks still check generation because abort alone is not a guarantee. A durable repository save cannot be undone by aborting the browser request: retain the operation owner and resolve its receipt on resume. A save acknowledgement for an inactive target updates only that operation's recovery record, never the active page or a newer draft. BFCache/pageshow rechecks unresolved receipt/base revision before enabling edits. Focus restoration requires unchanged target/generation/input intent, connected and actually visible control, and no newer pointer/keyboard destination; never reopen a collapsed section to focus an old field.

Recovery storage keys include exact targetKey, local checkout identity and draft revision so records with equal names or different checkouts cannot collide. No recovery state is silently shared with inventory/profile/mission-audit stores. Origin/browser changes remain a portability boundary; export is the supported transfer mechanism.
