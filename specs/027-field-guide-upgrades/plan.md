# Implementation plan
2026-10-28; feat/027-field-guide-upgrades. Existing TypeScript/Vite/Leaflet/IndexedDB; originallocal primitives and raster normalization; no cloud service. One serialized feature with independently testable vertical slices.

## Constitution check and clarification
Existing constitution reviewed: privacy/inert imports/owned versus source evidence/mobile/recovery/bounds preserved. No amendment. Nearby uses chosen canonical coordinates, not device/player location; distances pixels. Old additive fields optional and strict on restore. External gameplay/physical-device verification cannot be simulated into acceptance.

## Architecture
search.ts pure cached normalized index + tokenizer/filter/ranking/nearest/dedup. Reuse tactical-grid math and displayDuplicates; source20k/private5k/reviewed5k limits, bound query256chars/8terms, fuzzy title fallback bounded work. UI debounce150ms and generation-safe cancellation on detach; list50rows. App supplies mapCenter/jumpTo; existing record jump revalidates current record; Nearby captures selected point.
health.ts/UI derived usage/headroom/capture-age/missing-resource checklist. Browser storage estimate advisory, no quota guarantee. Links to existing safe snapshot prune/staged-update management; never garbage-collect capture files unknown to backups/other profiles. Recovery manifest only filenames/digests/dependency identities, no restricted raw source export.
Optional Annotation.observedAt(UTCday), attachments(max4/point,32total,2MiBPNG each/8MiBtotal,sourcefile8MiB/1600px normalized), geometry(route/area,2/3..200vertices,colorhex). Inline ownedPNG data travels backup within20MiB. Strict shape/png metadata/digest verification before restore. Numeric vertex editor with existing map pick for next XY; centroid anchor indexes search, shapes rendered separately; not pathfinding. Keep point-only fields/backups valid.
icon-packs.ts strict JSON32recipes/256KiB, noSVGmarkup. Preview + abortable generatedPNG staging → one commit, dedup counts and library limits; savedrecipe starters, history50states.
Engine smoke runner supports Chromium/Firefox/WebKit and explicit missing-engine results; pinned axe scan plus manual a11y/gameplay/device checklists. CI adds engine/a11y job without real assets. Existing changed-update/restart/multitab cases audited and extend missing journeys.

## Files and verification
workspace/search.ts/search-panel.ts; app/usability-panel/explorer-index; health.ts/health-panel; annotations/model/backup/evidence/annotation-editor; icons/icon-studio/icon-packs; help/tool-links/styles; tests matching modules and synthetic browser suites. Default data budgets retained. Root source docs five-provider cleanup. Read-only analyze/converge, append fixes, independent definition/security/UI checks.

## Rollback
Keep private backup first; additive optional fields need stripping only in an older-format copy for previous strict validators, preserving original backup/images/IDs. No source rights changed. Do not merge/push while physical/live checks remain falsely claimed; explicit pending gates recorded.
