# Independent domain re-review — feature 023 planning

Reviewer: `design_upgrade_tracking_rules` (independent of artifact writer)

Reviewed checkpoint: `57ab0690a0ece7bd6fd849f2199d8b941c7e6214`

Reviewed tree: `19051a024a3c8afcc9dee7234bad5b95970e96c5`

Date: 2026-10-26 UTC

## Verdict

**Approved as a planning definition. No remaining blocking domain findings.** This approves the proposed rules, algorithms, evidence boundaries and acceptance scenarios, not unimplemented runtime behavior or unverified game mechanics.

### D1 — Resolved

The advice contract, specification, data model, plan, clarification record, tasks and quickstart now consistently distinguish:

- exact arithmetic for selected known direct requirements, once the affected quantities/consumption/entered stock are known;
- partial observed-scope coverage when prerequisite costs, future tiers or live-build applicability remain unknown; and
- stronger readiness/current-build/exhaustiveness assertions, which remain blocked by those factual gaps.

The text does not certify the observations as a common actual live build. A20 explicitly tests useful partial-scope arithmetic without a readiness/current/exhaustive claim. Unknown consumption/disputed quantity/missing inventory continue to block dependent exact numbers.

### D2 — Resolved

The new advice preserves the legacy allocation gap U and adds unfilled fixed-reserve gap Q separately. Collect-to-target S=U+Q is correct for the stated fixed-reserve semantics. Corrected synthetic A06 now yields U=15, Q=3, S=18; adding 18 clears both gaps without claiming more physically held protected stock than exists.

I independently evaluated the revised identities for every G/H/R combination from 0 through 30 (29,791 combinations):

- `S == max(0,R+G-H)`;
- adding S makes upgrade gap and reserve gap zero for unchanged G/R; and
- physically protected held stock does not exceed H.

All equation checks passed. These are checks of the documented arithmetic, not application tests.

### Related changes reviewed

- A19 and the direct-only advisory contract keep crafting routes in the existing optional focused planner; advisory pickups do not require both an intermediate and its crafting inputs.
- Inventory drafts explicitly preserve missing versus zero versus deliberate clear, through failure/cancel/save/paging/reload.
- Inventory-page prerequisite controls join the same upgrade progress authority as progression and both planners, avoiding two mutable completion maps.
- Completion remains a reconciliation action with no spending/refund, and saved inventory remains explicitly manual.

## Evidence/privacy and scope checks

- Git HEAD/tree matched the checkpoint above and the worktree was clean at review.
- The sanitized evidence fixture is unchanged from the first review: 8 definitions, 31 required rows, 22 labels. Its unknown consumption and live-build limitations remain intact.
- Manual review and a supplemental literal scan found no newly introduced screenshot holdings/balance, raw pixels, private source paths or Library IDs in feature artifacts. A literal scan alone is not a comprehensive privacy proof.
- All 22 implementation tasks remain unchecked; no implementation or gameplay-validation claim is introduced.
- Review changes are confined to planning artifacts and preserved review records. No runtime changes were made by this reviewer.

## Reviewer checklist disposition

For the reviewed planning definition, I approve domain criteria **CHK003, CHK004, CHK006, CHK007 and CHK008**. I also found no domain objection to CHK001/CHK002 evidence boundaries, CHK005 scope/stock conservation, CHK009 recovery rules, CHK010 accessibility/spoiler requirements or CHK011 future-test labeling; integration, evidence and execution review remain the respective reviewers' authorities.

The owner may carry this signed assessment into the reviewer record. It must not be represented as runtime acceptance, source-game verification, or permission to merge/deploy.

Signed: `design_upgrade_tracking_rules`, 2026-10-26.
