# Architecture and implementation plan
Manual pinned Spec Kit extension under active feature071; user explicitly approved the feature scope. Reviewer-owned checklists remain unchanged.

Optional profile.fieldOps v1 stores carried quantities, bounded quantity journal, import receipts and discoveries. Strict validation extends v1-v3 without mandatory migration. Profile backups retain the optional object. Reset clears carried/discoveries/receipts. Central profile commit computes before/after journal inside the existing CAS transaction only for enrolled profiles. Domain operations stay pure and revision/content bound; UI uses common.persist.

Photos use validated bounded content-store records with hashes; complete field-backup export/restore includes those bytes and a profile preview. Failed photo staging never commits profile counts. Unreferenced staged pictures remain private and recoverable; no automatic garbage deletion.

Bundled Tesseract JS/WASM/English data are vendored from pinned npm packages into src/vendor/ocr by the preparation script, then copied into dist by the ordinary build, with licenses/provenance. No screenshot goes to a remote OCR endpoint. No display-capture API. Browser OCR has worker cancellation/deadline, pixel/byte limits and explicit staged mappings.

Guide/map boundary uses an explicit bounded JSON file export/import (portable and reviewable, no cross-origin localStorage assumptions). Extend existing map Explorer with collection import/review, area highlighting and an atomic new-route action through FieldGuide UI. It never transfers inventory ownership to the map. Existing route controls handle order/roads/tracking.

Delivery order: domain/contracts/tests → transactional storage/history → Field desk/UI/OCR → map integration → complete backup/photo/discovery → navigation → real OCR/interaction/storage/map tests and build. Rollback is optional fields/new pages and modules, no destructive migration.
