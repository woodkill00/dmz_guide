# Independent first spending-domain checkpoint review

Reviewer: `/root/review_upgrade_implementation`
Date: 2026-10-26 20:35 UTC
Checkpoint: `6d5defbfd64517e69ddd67f8a51ee688d88cac30`
Tree: `fbd317c7e27c0b23c16defc5ba32a060a89a048c`
Verdict: **HOLD for two reproduced high-priority findings and the separately clarified currency allowance.** UI/recovery integration is explicitly incomplete at this checkpoint and is not assessed as finished.

## Executed evidence

Immutable Git archive; reviewer-owned probes outside the integration checkout. The expanded suite has **21 cases: 17 passed, 4 failed**, including 160 deterministic random accounting vectors. Two failures cover the same real-catalog completeness blocker; one covers the storage byte-boundary bug; one is the expected new 2M-currency contract regression, clarified after this source freeze. The executable probe and complete output are retained in the review workspace.

Initial probe execution had reviewer-fixture errors (unsupported item spoiler:false and an observed-status record inside the restricted fictional-training game). Those were corrected to schema-valid fixtures before the reported result. No product assertion was weakened to obtain a pass.

## Findings

### S1 — HIGH: all admitted upgrades blocked by a completeness flag

`src/domain/upgrade-spending.mjs`, `costsFor`: rejects `record.requirementsKnown === false`. All eight real observed definitions retain that field for incomplete coverage/prerequisites, while all 31 listed rows now have confirmed consumed semantics and known quantities.

Actual admitted-pack reproduction: fresh v3 profile, entered 1M stock for every item, Dog Tag Case Upgrade II selected. All four requirements are consumed/observed, yet recording throws “Upgrade cost evidence is unknown or disputed; no spending recorded.”

Required repair: distinguish listed-row numeric evidence from incomplete coverage/build/prerequisite metadata. Keep the latter as explicit warnings, and add purchase tests for all eight actual admitted definitions. Do not claim exhaustive or current-build readiness.

### S2 — HIGH: storage revision increment can persist an unrestorable profile

`src/storage/store.mjs`, `saveProfile` / `commitRecord`: validates the incoming profile before incrementing revision, then writes the incremented clone without validating that exact stored object.

Independent synthetic IDB harness executes the real storage module: a valid v3 profile at exactly 1,048,576 serialized bytes, revision9, 9,984 entered-zero references is written as revision10 at1,048,577 bytes. The saved profile then fails `validateProfile` with “Profile exceeds byte limit.”

Required repair: validate the exact post-increment profile inside the atomic CAS transaction before `put`, including safe revision overflow. Abort without changing current or previous records when it no longer fits. Reserving immediate-reversal capacity in the purchase API alone does not protect unrelated saves or every digit rollover.

### S3 — clarified scope: legitimate 2M cash cannot fit inherited stock bounds

The observed Bank IV effect states capacity2M, but legacy profile/draft/HTML and this checkpoint's snapshot bounds permit only1M. The parent-reviewed amendment in `603dc766` narrowly allows v3 currency stock/reserves and historical before/after/reserve snapshots up to2M; known non-currency, consumed/retained cost, goal and v1/v2 limits stay1M. Unresolved v3 references remain recoverable without clamping. This is an input policy, not inferred holdings or universal gameplay capacity. The regression intentionally remains red against this earlier freeze.

## Passing independent areas

Atomic pure stock/completion/history candidate; exact/conflicting operation replay; status/reset no-refund and re-debit guard; duplicate consumed sums/retained maxima/reserve floors; snapshot-only reversal/absence restoration/latest order; imported impossible histories; transitive observation aliases and historical bridges; cross-build identity isolation; no invented v1/v2 spending; count/resource/currency-separated gross/reversed/net accounting; whole-event hidden-history projection; 498/499/500-event boundary and immediate-reversal capacity refusal.

No source file was edited by this reviewer. These domain probes do not establish actual browser CAS/quota/persistence, pixel, Studio or complete integration acceptance. Follow-on frozen-source review is required after repairs.
