# Cross-platform quantity-field follow-up

PR #42 run 45994546574 caught an upgrade stock input exceeding its 220px card at 200% text in Chromium on Ubuntu. The general layout rule's nine-character logical minimum beat the card control's less-specific physical minimum. Card/spacing checks in the same job had already passed all three engines. The existing overflow oracle correctly rejected this additional case.

R6/R7 follow-up: let the FOB stock component own its input's shrinking minimum while retaining its grid and all save actions. Wait for the actual layout-system marker before measuring page cards; do not weaken bounds, hide fields or increase budgets.

- [x] Reproduce/retain the CI failure and repair the component selector.
- [x] Rebuild and run the same native regression; recheck formatting, runtime and CSS budget.
- [x] Obtain independent review and document the remaining remote merge gate.

The original failed CI run remains evidence; later passing runs must be identified separately. No player state or quantity validation limits change.

The final input-only selector sets `min-inline-size: 0`; the grouped control rule and its approved dimensions remain unchanged. Both native suites passed Chromium/Firefox/WebKit (test-results/109-card-ci-followup-native.log), five affected runtime tests passed, formatting passed, and the unchanged CSS budget passed at 423663/423763 bytes. Guide and map builds passed. Earlier full local runtime/Python suites passed 1200/1200 and 79/79. See [independent scoped acceptance](ci-review.md).

Remote gate: PR #42 must pass every GitHub check on the final head before merging. These local receipts do not mark that gate passed. The final PR verification section is the authoritative link to subsequent run/head results; no follow-up source change is needed merely to restate GitHub status.
