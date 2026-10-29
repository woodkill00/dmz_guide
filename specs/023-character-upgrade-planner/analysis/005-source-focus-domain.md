# Independent native-focus follow-on review

Reviewer: `/root/review_upgrade_implementation`
Date: 2026-10-26 15:57 UTC
Decision: **Source delta PASS; uninstrumented hosted WebKit acceptance remains open.**

## Identity

- Frozen commit `ca95081aaaa434c760f533a2f56be9129ee0428a`
- Tree `6d2888795cfe3da200531612359a92bfca866358`
- Reviewed immutable archive: `dmz-upgrade-review/checkpoint-ca95081`.
- No integration files edited by this reviewer.

## Actual failure evidence

The earlier close-event repair passed source review but failed actual WebKit acceptance. I independently inspected the synthetic trace from artifact12664576744, `focus-webkit--progression--completion-incomplete-r5-keyboard.json` (source merge `cefa47874b8fb6ea596af6cc91819eb19b096bca`). The replacement SELECT6 existed before close. At156ms the helper called focus on that connected, enabled replacement, but focus returned with ApplyBUTTON4 still active. At170ms native blur left BODY. No eventual select focus was observed through1203ms. This disproves the old-control/early-close hypothesis and skipped-guard explanation for this run; it does not prove the engine's internal cause. The failing assertion was not merely observing too early.

## Reviewed repair

The helper now waits only when the closed dialog still contains the active element. It listens once for that element's native blur, then posts one MessageChannel task rather than using a microtask, timer, polling or repeated focus attempts. The task checks current token ownership, dialog reopening and newer outside focus before calling the existing caller guard. A close event with focus already outside follows the original immediate restoration path.

Cancellation removes the close/blur/input listeners and closes both ports. Supersession cancels the old request before registering a new one; an old queued callback cannot delete or close the newer request. New keyboard/pointer input cancels restoration. Existing caller pack/revision/loading/navigation and candidate guards are unchanged. No schema, stock, progress persistence, privacy or arithmetic behavior changed.

The browser module is restored byte-identically to the uninstrumented reviewer-authored assertion/activation flow: SHA256 `ba29151f31c4c9cb7e48ac88d3fe4dc09faf696930276892f602feda5f260e95`. No waits, forced focus, retries or diagnostics can mask the original browser assertion in this checkpoint.

## Independent execution

- Frozen helper regression file: **12 passed, 0 failed**.
- Four additional deterministic MessageChannel/port probes: **4 passed** (input cancellation, superseded callback isolation, newer outside focus, reopened modal). Each also checked relevant port cleanup; stale callbacks were deliberately invoked after cancellation to verify token isolation.
- Exact tree, uninstrumented module hash, unchanged callers and delta whitespace checked.

No blocking source finding. The unchanged full domain suite was not rerun for this helper-only production delta. Actual browser behavior cannot be certified by the fake lifecycle tests: fresh uninstrumented native/Studio/Firefox/WebKit acceptance remains required. This permits already-authorized draft-PR/CI continuation, not merge/deployment or browser approval.
