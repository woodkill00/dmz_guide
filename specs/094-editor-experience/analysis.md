# Independent planning analysis — iteration 1

2026-11-19. Read-only source/artifact assessment; only this reviewer report and requirements checklist written. No implementation or runtime acceptance.

## Findings

| ID | Severity | Location | Finding and required repair |
| --- | --- | --- | --- |
| EDITEXP-01 | P2 / blocking | contracts/editor-tools.md:11; plan.md:history; T004 | Retention contradicts itself: Save must evict oldest at five snapshots, but deletion is allowed only by explicit reviewed prune. Define sixth-save behavior, whether before counts toward five, and quota behavior. Pin tests showing no unreviewed historical loss and whether canonical Save is blocked or proceeds without history; do not silently diverge from atomic history guarantee. |
| EDITEXP-02 | P2 / blocking | contracts/editor-tools.md:7–15; data-model.md; T004/T009 | New persistence is not yet an exact validator contract despite referring to exact fields: checkpoint envelope/version/timestamps/checkout ownership, checksum bytes/canonicalization, referencedAssets entry schema and prepared-picture storage are unspecified. Define these plus atomic current→previous replacement, how missing/corrupt current is distinguished from empty and CAS/export/recovery admission, and whether referenced upload bytes count toward256MiB/are retained against deletion. Otherwise cross-browser CAS and recoverable pixels cannot share a deterministic failure oracle. Reuse existing093 definitions by exact reference where adequate. |
| EDITEXP-03 | P2 / blocking | contracts/editor-tools.md:19; T005/T009 | Same-operation refresh must reuse a job, but failed refresh must be retryable. A single durable receipt leaves unclear whether retrying that operation reuses its terminal failed job forever, or a null-operation retry bypasses deduplication. Define explicit attempt/retry admission and concurrent-request semantics, finite child deadline/termination ownership and restart behavior; test failed→retry success without canonical Save replay, duplicate pending request, and interrupted/late child outcome. |

## Coverage and disposition

All12 FRs map to tasks; US1–4 and SC01–05 have proportionate verification owners. Existing exact target/source adapters, local author protection, no player-state/public-auth widening, inert composition, keyboard/numeric alternatives and Orders/items-first scope are clear. New persistence/refresh oracles above block implementation readiness; they are owning-contract repairs, not requests for new features. T002 remains pending. No tests executed; no production files changed.

## Independent planning analysis — iteration 2

2026-11-19. Reread the amended owning contracts, data model and task dependency/traceability against EDITEXP-01–03. All three blocking findings are resolved for planning readiness.

- EDITEXP-01 closed: explicit advertised newest-five automatic retention is distinct from confirmed manual prune; original before counts, each subsequent Save adds one after, sixth evicts oldest atomically. Preview and commit admission, expected history set and quota failure preserve canonical/history bytes; replay adds none.
- EDITEXP-02 closed: exact checkpoint envelope/byte checksum, writer/checkout ownership, complete PageRecovery including unattached prepared PNGs, separate checksum-bound reads, current/previous crash ordering, corrupt/future retention/clear and exact active-byte/file accounting are specified. History captures server-owned before/after record/document pixels; eligible embedded bytes versus hash-bound referenced source assets and blocked missing/unverified restore are distinguished. Existing093 recovery/media validators remain the referenced format owners; no rights or public/private scope widening.
- EDITEXP-03 closed: requestId identifies a durable attempt separately from canonical operation identity; same-ID replay is idempotent, failed retry uses new ID without Save replay, active concurrency409 is checkout-wide. Persist-before-spawn, owned handles, restart uncertainty refusal,300000ms child deadline and5000ms force/drain ownership have named adverse tests. Header summaries are read with the exact persistence/admission definitions as the normative refinements.

Disposition: planning READY, zero remaining actionable planning blockers from this bounded consistency pass. All12 requirements retain task owners; T004/T005/T009/T010 own implementation/adverse proof, including cross-browser checkpoint conflicts, pictures, history and failed refresh. This closes T002 review only; unchecked implementation work is not executed or approved. No production files changed, runtime/browser tests run, or implementation/merge/publication approval claimed.
