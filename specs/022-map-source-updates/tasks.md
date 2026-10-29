# Tasks
## Phase1 Contracts and collector
- [x] T001 Implement bounded fixed-site networking, inert adapter parsing, safe icon handling, denied parser egress and exact frame checks in server/source-collectors.mjs; test fixtures/security/bounds before live use. FR002/003/006,SC001.
- [x] T002 Implement staged generation/job lifecycle, semantic diffs/idempotence, file lock/CAS/atomic pointer and authenticated local Vite API; fault-injection/temp-root tests, durable reserved jobs/receipts and restart/CAS reconciliation,64-job storage cap. FR002/004/005/006,SC001.
## Phase2 Client
- [x] T003 Link source names independently of masters; load current generation descriptors and support safe in-place source controller reload. FR001/005/007,SC001.
- [x] T004 Add Map key Update/progress/cancel/preview/Apply/activation-retry; reuse immutable snapshots, preserve private data and stale reviewed evidence; browser failure/idempotence tests. FR004/005/007,SC001.
## Phase3 Acceptance
- [x] T005 Run offline unit/browser/build/performance checks and optional authorized live smoke; update workflow/evidence docs. FR001–007,SC001/002.
- [x] T006 Analyze/converge and independent domain/security/UI review/fix until no actionable findings. SC003.

Evidence: acceptance.md and analysis.md. Independent reviewer-owned requirements checklist remains reviewer-maintained. All implementation tasks and final49-group browser rerun completed. CI installs the parser browser before unit checks.
