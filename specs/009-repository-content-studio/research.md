# Research and decisions

## Local server versus browser filesystem access
Decision: explicitly started loopback-only Node server. Rationale: reliable Windows/Linux repository writes and normal browser compatibility. Directory-picker APIs alone have browser support and activation constraints. A hosted write service is outside scope and needlessly expands exposure.

## Single source and compatibility
Decision: per-record canonical source compiles to unchanged runtime pack v1 with explicit ordered ID lists. Rationale: existing first-record/default behavior and portable compatibility depend on shape and order. Sorted record order or dual editable pack copies would introduce regressions. Source asset descriptors keep filesystem organization out of portable path contracts.

## Media safety
Decision: browsers fully decode supported PNG/JPEG/WebP input and normalize new uploads to PNG; server validates complete PNG pixel streams, hashes and dimensions. Rationale: existing server signature parsing alone is not a full JPEG/WebP decoder. Alternatives: native decoder dependency (unnecessary initial runtime cost), accepting signatures as full validation (unsafe). Existing trusted migrated assets retain existing checks; this distinction is documented.

## Published versus portable limits
Decision: separate explicit published validation profile while retaining per-image safety and portable import caps. Rationale: increasing all limits would weaken untrusted import protections. Metadata stays bounded and images remain lazy independent files. Large full-pack portable exports fail clearly rather than silently omitting assets.

## Filesystem guarantees
Decision: bounded transaction journal, old/new content hashes, staged bytes, explicit commit marker, exclusive writer lock and guarded recovery. Rationale: multi-file rename is not atomic across paths. Recovery completes or rolls back only states whose hashes match known old/new content; unexpected edits stop for manual recovery. Process-crash guarantees are tested. Power loss and unsupported filesystem directory-fsync durability remain platform-dependent and documented. No automatic stale-lock deletion.

## Interface reuse
Decision: extract guided rendering only. Rationale: existing common.init loads private IndexedDB overlays/profiles, so reusing it would violate public/private separation. Keep the private editor controller intact. Media creation uses bounded decoded raster helpers and explicit draft mutation, never writes on selection.
