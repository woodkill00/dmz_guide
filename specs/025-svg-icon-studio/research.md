# Research and clarification
Existing library accepts sanitized PNG/JPEG/WebP uploads, stores content-addressed PNGs and has32icon/8MiB limits. Source icons are a separate path. Backup validates exact IconAsset fields and preserves owned icons. Existing services.process supplies cancellation/interaction locks, commit supplies revisions/rollback, body input events guard drafts.

Decision: additive validated recipe attached to PNG, SVG regenerated from known local primitives. Rationale: editable vector output with unchanged marker renderer and export machinery. Alternatives: arbitrary SVG storage/import needs sanitization; separate editor database complicates atomic backups; full vector drawing is later scope.

Clarify coverage: scope/entities/lifecycle/security/failures/accessibility/acceptance clear using documented defaults. No blocking question. Saved copy never mutates references; identical raster content reuses existing entry with explicit notice. SVG file is export-only; raster-only entries remain supported. Constitution reviewed; no governance change requested. No external research dependency or new package required.
