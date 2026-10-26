# Independent consolidated modal and preview-entry source review

Reviewer: `/root/review_upgrade_implementation`
Date: 2026-10-26
Verdict: **PASS for this exact source delta; fresh hosted entry/layout/visual acceptance remains required.**

Frozen commit `78dbb14a24f56351af971a77e808ae9c15ca0852`, tree `3d7316d11cae17489969f442a0a1d0e28fd121b3`, compared with published `45202fc`.

The consolidated repair includes the separately reviewed `#upgrade-spend-confirm` margin:auto override and a narrow initial-preview focus change. The review heading has tabindex−1; footer Cancel no longer has autofocus; showing either purchase or reversal focuses the noninteractive heading and explicitly starts dialog scrollTop at0. It cannot activate a purchase by itself. Unchecked acknowledgement, disabled purchase Apply, Cancel/Escape, transactional candidate checks and the guarded native-close focus helper remain unchanged. No domain, storage, cost-source, counter or snapshot semantics change.

This responds to actual capture evidence, not screenshot manipulation: the earlier manifest recorded initial scrollTop2756 of3572px because footer focus skipped the start of the review. New browser assertions observe exact heading focus, zero initial scroll, full heading visibility and visible beginning of the purpose before any capture helper scrolls. They cover the purchase helper and all five direct reversal-entry sites. Existing horizontal/vertical/control geometry assertions remain intact; typography and viewport are not reduced.

Independent exact-archive execution passed **15/15 summary/preview/native-focus tests** and **34/34 domain/compatibility/privacy probes**, including the fixed actual-eight-upgrade292-material/600,000-cash oracle. Syntax and delta whitespace checks passed. The retained failure ledger does not claim source checks establish actual browser layout. The original native-focus interruption guards and all-markup privacy assertions remain present.

No source blocker found. Actual new modal centering, initial review visibility, keyboard operation and complete pixels must pass fresh native/engine/Studio acceptance. Prior source reports remain applicable to unchanged code; the unpublished margin-only checkpoint is not presented as a separately shipped repair. No merge or deployment authorization is implied.
