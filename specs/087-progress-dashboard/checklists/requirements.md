# Reviewer-owned requirements quality checklist

- [x] User stories, requirement IDs, success criteria and implementation owners are stated; planning-only boundary is explicit.
- [x] Weapon blueprint completeness is honestly unknown; manual names are not an exhaustive public blueprint roster.
- [x] Independent stores, selected-catalog identity, spoiler filtering and no-write discovery are explicit.
- [x] Classic/modern share capabilities and responsive/keyboard/touch acceptance is planned.
- [x] Add found has an unambiguous commit/verification/retry lifecycle and failure/departure tests.
- [x] Needs counting fixes the actual Quick collect options and unknown-held-stock presentation.
- [x] Numeric limits bound the whole nested dashboard and async work, not only each individual group.
- [x] Read-only analysis findings are repaired across owning spec/contracts/model/tasks before implementation begins.

## Independent planning analysis — 2026-11-17

Read spec, plan, research, data-model, contracts/dashboard.md, tasks and quickstart, with bounded inspection of existing Quick collect, build-target, collection-budget, profile and read-existing storage owners. No implementation approval or runtime pass is claimed. Findings below are actionable planning gaps, not demonstrated defects in unimplemented code.

### DASH-01 — High: distinguish committed-but-unverified Add found

FR-004/SC-003 require exactly once, reread after successful write, draft retained on failure and retry. FoundDraft only has pending/failed/stale/saved, and addDashboardFound returns committed revision or typed error. Neither contract defines the state when the real write commits but subsequent reread, callback, pagehide/BFCache or acknowledgement fails. Treating that as ordinary failure can retain a retryable delta and add stock twice. Define operation identity/captured expected revision and committed-but-unconfirmed state; once commit succeeds do not offer a blind replay. Reconcile exact durable identity/revision before clearing draft or enabling another attempt. Add explicit T007/T015 tests for commit-success/read-failure, held commit across departure/return, and late ack from an old selection. Existing operation protocol must determine safe cancellation, not a UI-only rollback promise.

### DASH-02 — Medium: pin collection options and unknown-stock semantics

FR-002 says reuse Quick collect scope and FR-003 includes indirect crafting/yellow; projectDashboard accepts unspecified options, while actual quickCollect(pack, profile, {crafting=false}) excludes indirect rows by default. No task/contract specifies whether dashboard uses crafting=true, false, or an exposed validated toggle, so equivalent counts and Needed membership are not deterministic. Specify exact mode/options for each section and parity fixtures. Existing Quick collect also exposes assumedZero when inventory is not entered; CollectionTile lacks that qualifier. Require the dashboard to retain owned=unknown/assumed-zero or lower-bound labelling when a missing number uses that assumption, rather than implying a measured exact shortage. Add T005/T007 cases for absent stock versus explicit zero, indirect input, and lower-bound unknown quantity.

### DASH-03 — Medium: bound nested build-group rendering and load lifecycle

FR-011 gives 12 collection tiles per section, 12 ingredients per build group, 50-item pagination and five progress rows. It does not define how many build group headers/details are initially mounted, or whether independently expanded sections can accumulate all pages. The existing profile permits 100 build targets; 12 ingredients per target can mount 1,200 ingredient controls despite the apparent 12-tile section cap. Define a maximum initial/expanded group count, total mounted tile/detail cap and page replacement policy, keeping true totals visible. Add T015 maximum-target/many-shared-input fixtures and enforce actual DOM counts. Also carry the existing readExistingRecord deadline/abort/close contract explicitly into the new armory adapter and T004/T015 held-read/pagehide tests rather than relying only on late-paint generation checks.

## Other assessment

The proposed architecture correctly separates public catalog facts, private profile state, and independent armory acquisitions. It does not invent missing weapon-blueprint totals. Additional-output build semantics, stock allocation once within shared totals, no cross-section grand sum, partial independent failures, guarded preference schema and classic/modern parity are clear. T003 appropriately requires tracing actual history/storage/deep-link owners before extraction. All implementation tasks are future unchecked items. Resolve the three findings in their owning artifacts and rerun read-only analysis before claiming the plan implementation-ready.

Only this reviewer-owned checklist was created. No production/artifact repairs, merge approval or permission request.

## Repair analysis — 2026-11-17

DASH-01 closed by FR-013 and AddFoundOperation: unique captured identity/revision, failed-before-commit versus committed-unverified, verification-only uncertain state, no post-commit stamping write, and explicit T003 stop/review if existing atomic history cannot prove ownership. Added task acceptance covers commit/read failure, lifecycle and stale acknowledgements. This is a safe implementation dependency, not a claim that the adapter is already feasible or verified.

DASH-02 closed by FR-014, CollectionOptions and the exact contract: crafting=false default, labelled alternatives toggle, matching-option parity, and explicit Not entered/assumed-zero versus saved zero. Model and additional journeys retain assumedZero/minimum rather than asserting exact shortage from unknown stock.

DASH-03 closed by FR-015/RenderWindow and the global contract: three initial/five expanded build headers; 12 initial/50 expanded build tiles across all groups, 12/50 Needed tiles, 100 combined maximum and two detail panels; replacement pagination and maximum-target assertions. Read adapter explicitly retains 1500ms abort/close and late-open behavior with held-read/lifecycle tests.

Also reviewed latest verified store keys/effective ownership helper references, section Move up/down and layout-only Reset controls, and task mapping normalization. No new blocking planning finding identified. The appended repair design explicitly supersedes older loose descriptions; for maintainability, consolidating the earlier FoundDraft state list and action signature with the canonical AddFoundOperation section would reduce duplication, but the authoritative repaired requirements are clear.

All quality criteria are supported as planning readiness only. Implementation tasks remain future and must prove these contracts. In particular, T003 must stop dependent write implementation if atomic idempotency evidence is unavailable; this review approves no migration, source edit, runtime behavior, release or merge. Only this reviewer-owned checklist was edited.
