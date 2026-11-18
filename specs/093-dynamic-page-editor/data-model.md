# Proposed data model

- EditorTarget: registered adapterId plus immutable scope/catalog identity and recordId. Derived file paths come from trusted adapters, never user paths.
- PageDocument v1: exact target, presentation revision, base semantic fingerprint, ordered sections and bounded deletedAnchors. Stored under a managed repository page-document root; schema rejects unknown fields/versions. Layout-only revisions are distinct from pack factual versions.
- Section: stable ID, title, ordered block IDs, approved template, collapsed-by-default flag. Managed sections refer to canonical slots; custom sections own their blocks. Identity/evidence remain available regardless of layout choices.
- Block: discriminated validated paragraph/heading/list/steps/callout/image/gallery/table/reference/layout-group or managed-data projection. Stable IDs make reorder independent of content identity. No recursive free-form object, script or raw HTML.
- AssetPlacement: existing attached asset ID, contextual alt/decorative, caption, contain/cover, focal point and approved layout. Asset bytes/hash/rights stay in the existing media system. Placement removal is not asset deletion.
- RecoveryDraft: target, base revision/fingerprint, unsaved page document, canonical field patch, staged picture metadata/bytes, draft revision and timestamp. Separate from player inventory/progress and normal profile backups. Bounded atomically with no false save acknowledgement.
- AdapterCapability: resolve/read/form/validate/project/save/preview/version-impact/source-update support. Coverage inventory records supported/read-only with an explanation and destination.
- EditCandidate: canonical patch plus document/assets preview, expected revisions, semantic/layout classification and dependency-impact summary. Existing author transaction commits all affected managed files or retains recoverable before/after bytes.

No automatic migration of legacy packs. With no PageDocument, reader uses existing default rendering. Existing image attachments appear once in a default gallery; creating a document references those IDs without re-uploading. Removed upstream fields remain conflict evidence, not silently remapped by title. Published page docs are keyed by immutable record identity in a bounded separate manifest; pack-v1 schema stays unchanged.
