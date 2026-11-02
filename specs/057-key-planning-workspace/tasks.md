# Tasks and convergence

This is the manual full-cycle fallback described in `docs/spec-kit-cycle.md`; no automated Spec Kit skill command is claimed. Definition review passed after archived-ID and stale-operation contracts were clarified. This task ledger consolidates implementation and the remaining verification work; checked implementation items are not acceptance claims.

- [x] T001 / FR001: define state, isolated storage, CAS and recovery contracts; independent definition review.
- [x] T002 / FR005–006: account for all sixty DMZTracker rows; expand catalog and preserve conflicts, original images and owner provenance.
- [x] T003 / FR001–003: implement pure stock, backup, readiness, dependency and trip logic.
- [x] T004 / FR001: implement isolated IndexedDB storage, previous snapshot and bounded append-only recovery archive.
- [x] T005 / FR001–003,007: add stash, filters, packing, previewed restore and asynchronous ownership guards.
- [x] T006 / FR004: implement calibrated grid-area map links, inert label and dismiss control.
- [x] T007 / FR005,007: add concise room/source panels, mobile cards and compact controls.
- [x] T008 / FR001–006: add seven focused domain/catalog tests; update legacy count and category fixtures for the expanded catalog.
- [x] T009 / FR001–003,007: complete real-browser storage, import, persistence, failure and layout regressions in all three engines.
- [x] T010 / FR004: run map unit/build/browser verification.
- [x] T011 / FR007: run accessibility, source/build equivalence and repository checks; record exact receipts.
- [x] T012: resolve independent review findings; update documentation and final analysis/acceptance.

Convergence additions from review: prevent Reload racing an owned save; retain native invalid numeric buffers; guard stale error callbacks; preserve modified-link behavior; separate acquisition from entrance directions; show applying state during restore. Implemented, awaiting complete regression receipts.

Final convergence additions: scoped mobile checkbox labels enlarged to44px with actual geometry assertions; shared brand/theme accessible names aligned with visible labels; source-reviewed nested damaged-record read failure now ignores stale/disposed callbacks. Final build and post-freeze browser verification follow these repairs.

Independent final local gate: PASS, see reviewer-owned checklists/requirements.md. No remote publication authorization is implied.
