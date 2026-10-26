# Independent recorded-spending source, domain and privacy review

Reviewer: `/root/review_upgrade_implementation`
Date: 2026-10-26
Verdict: **PASS for the exact source below; hosted browser/Studio/visual acceptance is still required.**

## Exact scope

- Frozen local commit: `7a1edc01f36555b39069e5ebdfefc5e8ac4dc2a0`.
- Tree: `186dd51a5ec15c2ceccab0ab25c4e0c99edb28be`.
- Baseline: accepted PR24 head `b935b40b27ffc8fa27228bb72fd773ba07171473`.
- Reviewed the amended transaction contract, strict profile v3, purchase/reversal and accounting APIs, storage boundary, stock limits, existing v3 readers/mutators, migration/rebind/restore/reset projections, public content attribution and portable-content separation. All execution used immutable archived checkpoints, not the integration writer's mutable worktree. Reviewer changed only independent artifacts/tests outside that checkout.

The owner-authorized feature records a purchase the player reports, not a game action or eligibility verification. Status-only completion remains separate and never spends or refunds. The 2M v3 currency allowance is an engineering input policy supporting the observed Bank IV capacity, not an inferred holding or a new universal game fact.

## Independently executed evidence

- **33/33 independent acceptance probes passed**, including 160 seeded purchase/reversal conservation vectors. Test module SHA256: `05bb0e24d87248ad932e75b006c76ce6526b34d76e478ba5badd6699f59b4bee`.
- **586 Node tests passed, 0 failed, 1 Windows-only platform skip (587 total)** on this exact archive.
- **40 Python tests passed**; repository structural/provenance checks reported zero failures; build produced **214 independent routes plus 404**.
- Pinned Prettier formatting and full baseline-to-checkpoint `git diff --check` passed. No map020 source, dependency/lockfile or game-image asset was added/changed in this amendment.
- Earlier exact `1149df4` independently passed 25 core probes and 581 Node tests with one platform skip. Added integration probes exposed the remaining count/cap gaps; those failures are retained rather than relabeled passes.

Independent probes cover atomic pure candidates; unchanged unrelated fields; exact replay/conflicting intent/stale revision; missing versus zero; duplicate consumed sums and retained/reserve floors; unknown/disputed cost refusal; metadata-only warnings; scoped/transitive/current/historical aliases; order-independent conflict admission; canonical scope-property order; historical completion migration; snapshot-only/latest-safe reversal; changed-state refusal; strict forged-history state machine; gross/reversed/net and currency/resource separation; event/node/byte/revision limits; actual eight-upgrade recording and reverse-order conservation; exact-size compact backup Blob roundtrip; v3 legacy status/pin/reset/planner compatibility; portable rejection of private history; and spoiler-safe historical projections.

## Previously found failures and closure

1. **Real observed costs unusable:** the initial implementation treated `requirementsKnown:false` as a numeric admission veto, blocking every admitted observed upgrade despite confirmed listed rows. Fixed: each exact listed row is admitted; incomplete coverage warns that additional costs may exist. All eight real definitions now pass with explicitly synthetic test stock. Unknown build/prerequisites still do not imply readiness.
2. **Post-CAS byte overflow:** a valid 1MiB profile at revision9 could previously be written at revision10 above its own backup-parser cap. Fixed: exact incremented value is validated inside the CAS transaction before the write. Rejection writes nothing and retains current/previous state.
3. **Incomplete immediate-undo capacity reservation:** checking only pre-increment candidates missed two revision increments and safe-integer exhaustion. Fixed: purchase admission validates the actual stored purchase at current+1 and immediate reversal at current+2, including digit growth. Boundary probes and maximum-safe-revision probes pass.
4. **Stock-bound integration:** inherited 1M cash inputs could not represent the observed 2M capacity. V3 known currency stock/reserves/snapshots support 2M; known noncurrency, costs/goals and v1/v2 remain 1M; unresolved v3 references are preserved without clamping. Final planner/advice integration now rejects known oversized noncurrency consistently while accepting 2M currency.
5. **Protected summary counts:** raw migration/rebind category counts and unchanged unresolved-reference totals bypassed the safe projection. Final source withholds protected/unresolved counts, including unchanged references and hidden v1 migration entries; the browser reviewer owns the corresponding rendered-DOM assertions.
6. **Backup serialization boundary:** compact admission and pretty-printed downloads could disagree. Downloads now preserve the same complete JSON information compactly. A generated exactly1MiB valid profile downloads as exactly1MiB and parses back identically.

The initial `6d5defb` HOLD and its precise reproduction remain recorded separately. No test was weakened to close these failures. Reviewer fixture repairs retained intended assertions: synthetic mixed evidence uses a non-training game identity to satisfy the actual content schema; hidden records use supported objective spoiler fields.

## Architectural and privacy conclusions

- A purchase atomically stages inventory deduction, completed progress and one immutable event; persistence retains the existing single-profile CAS. Pure operation replay never debits twice. Active scoped history survives ordinary status correction and both resets, so clearing completion cannot silently permit another debit.
- Reversal uses only the original snapshot, not current catalog costs. It is latest-unreversed-only, checks affected entered stock and exact progress, restores original values/true absence, and appends one reversal without deleting audit history. Rebind that changes review state correctly prevents automatic reversal; unchanged historical snapshots can still reverse without current cost lookup.
- Accounting is recorded-only. Material count units, each currency identity and other resource units remain separate; gross and reversed usage explain net. Historical/manual completion creates no invented event.
- Profile v1/v2 remain readable and require explicit spending migration. The schema sweep found no stale exact-v2 gate disabling v3 status-only controls, pins, reset or planners. The remaining exact-v2 profile branch is deliberate migration; content packs correctly remain schema v1/v2, not v3. Backup replacement is not event replay, and portable content cannot contain the private ledger.
- Hidden/unresolved/mismatched-scope events are omitted as complete purchase/reversal pairs from displayed totals; protected snapshot strings and operation identities cannot leak through the safe history projection. Migration/rebind/restore summaries do not disclose hidden counts. Raw private totals are not public content exports.
- Source invariant audit retained all eight upgrade IDs, effects, observation keys and prerequisites and all31 item IDs/amounts. Only consumption receives the separate dated owner-report source. Original photographs/messages, player stock/history, capture/build verification and unobserved tiers are not published or invented. No raw image asset was added.
- Existing native-dialog focus handling, strict CSP, engine health policy and WebKit functional/computed-layout-only policy remain unchanged. Workflow changes only register/split synthetic acceptance artifacts; they are not test-pass evidence.

## Limits and next gate

This is source/domain/privacy approval, **not** fresh browser, Studio, visual, package-extraction, physical-device, live-game or deployment acceptance. Actual amended purchase/reversal, failure recovery, keyboard focus and responsive views must pass the registered hosted native/engine/Studio suites and independent QA review. Prior accepted browser results remain historical and do not certify this amendment. Parent owns any later merge decision; this report does not authorize merge or deployment.
