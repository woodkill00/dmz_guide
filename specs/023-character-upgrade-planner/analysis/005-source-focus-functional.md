# Independent functional source review — observed native-blur repair

Reviewer: `/root/verify_upgrade_player_journeys` · 2026-10-26 UTC
Source verdict: **PASS; original uninstrumented hosted browser acceptance still required**.

Commit `ca95081aaaa434c760f533a2f56be9129ee0428a`, tree `6d2888795cfe3da200531612359a92bfca866358`, reviewed against diagnostic head `fdcf2da88f265f170d10f1886c5bdb9f6a3759e7`.

The actual WebKit timeline in artifact `12664576744` showed the correct connected/enabled replacement select rejecting focus while Apply remained active inside a closed dialog; Apply subsequently blurred to BODY and focus did not arrive within the diagnostic1,000ms observation. That evidence, not a guessed timeout, motivates this repair.

Reviewed `src/client/dialog-focus.mjs`: close handling waits for native blur only if the closed dialog still owns active focus, then posts one cancellable MessageChannel task. The task is not a timed retry or polling loop. Navigation/new dismissals, reopening, new key/pointer input and newer outside focus prevent stale restoration. Cleanup removes listeners and closes ports; stale task identity cannot cancel a newer request. Normal native restoration to a different outside element before close does not suppress the intended initiating-control focus. Both callers remain unchanged from the previously reviewed pack/revision/navigation guard checkpoint.

Independently executed:

- `node --test tests/runtime/upgrades-dialog-focus.test.mjs`: **12 passed, 0 failed**.
- `node --check src/client/dialog-focus.mjs`: **PASS**.
- `git diff --check fdcf2da..ca95081`: **PASS**.
- Both caller files unchanged from `266998c`.
- Reviewer-owned browser module restored exactly to SHA-256 `ba29151f31c4c9cb7e48ac88d3fe4dc09faf696930276892f602feda5f260e95`: no focus wrapper, observer, failure-only probe or diagnostic timing changes remain. Original keyboard sequence and focus assertion remain the acceptance gate.

The synthetic runtime tests cover lifecycle/cancellation cases; they do not establish actual WebKit repair. Fresh Chromium/Firefox/WebKit browser and Studio strict-health execution plus actual pixel review remain required. No game-mechanics, merge or deploy approval is implied.
