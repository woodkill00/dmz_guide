# Independent hosted WebKit focus diagnosis

Reviewer: `/root/verify_upgrade_player_journeys` · 2026-10-26 UTC
Status: **reproduced persistent focus failure; diagnosis only, not acceptance**.

Source: published diagnostic head `fdcf2da88f265f170d10f1886c5bdb9f6a3759e7`, tree `7301bf21d78a011b8006c9e59f2f329548c81c01`; report merge source `cefa47874b8fb6ea596af6cc91819eb19b096bca`.
Hosted quality run `40352058929`; WebKit 26.0 compact artifact `12664576744`, 6,008 bytes. Independently downloaded SHA-256 matches GitHub metadata: `2d6bca9e1910788edd1bf2f464fdbe74c4aa2433695b66a0760079e48afe31ce`.

The reviewer-owned diagnostic preserves keyboard actions and the original assertion. It records native events and exact-forwarded focus calls, assigns stable synthetic DOM identities, observes row replacement, and restores all instrumentation afterward. A failure-only observable-focus probe cannot change the original failed assertion to PASS. This is synthetic test state only.

## Actual failing Undo trace

File: `focus-webkit--progression--completion-incomplete-r5-keyboard.json`.
Times relative to start of this operation:

| ms | Observed event |
|---:|---|
| 30 | Enter keydown on Apply button4. |
| 34 | Enter keyup; Apply and original select1 disabled during persistence. |
| 43 | Progress rows replaced; new select6 is connected and enabled; dialog is closed but Apply4 still active. |
| 43 | Native close event delivered. |
| 43 | Production helper calls focus on the correct new select6. The call returns with Apply4 still active; no select focus event occurs. |
| 57 | Apply4 blurs and focus becomes BODY2. |
| 88–1090 | Failure-only observable-focus probe never sees select6 gain focus; TimeoutError after1,000ms. |

The final failure snapshot shows select connected=true, disabled=false, dialogOpen=false, active BODY. This rules out an early close callback focusing the old node and subsequent rerender removing it in this reproduction. It also rules out the immediate assertion merely preceding an otherwise successful late restoration.

## Successful comparison traces

- Keyboard Cancel: close at+36ms calls focus on the existing select1; focus succeeds at+42ms.
- Double-activation completion: native restoration first focuses old select1 at+48ms; rerender replaces it at+51ms; close/helper then focuses new select5 successfully at+52ms.
- Inventory double activation also restores focus successfully.

Inference: failing keyboard Undo attempts outside focus while native modal/focus cleanup still retains Apply, and WebKit silently rejects that attempt. The exact internal inert/layout mechanism is not proved by the trace. A lifecycle-aware production repair should be verified with the same original uninstrumented keyboard assertion; a diagnostic-only pass is not acceptance. No production changes were made by this reviewer.
