# Repair: compact map-key toolbar

Assessment: the modern key header repeats explanatory prose, full zero-valued status counts and two long update actions, displacing the category list. User requests a slimmer, clearer section. Owning feature071 remains selected.

Plan/requirements (FR-003/004/006/020/024/027): modern-only two-row toolbar with Grid, Show all/Hide all, compact source count, deliberate information disclosure and Updates menu. Retain original IDs/controllers/grid alignment/masks, per-source limits and source-update review/recovery semantics. Keep actionable warnings and busy/error/recovery feedback visible; hide only idle explanatory copy. Details open in flow, never a full-page popup. Maintain keyboard/44px targets, narrow/200% reflow and no domain writes from disclosure.

Analysis: no new data/store or provider work. Use native details and original operation buttons; source capability discovery remains read-only. An Updates disclosure never starts a check. Legacy presentation stays unchanged. Full source/capacity/registration counts remain accessible in Details, with active availability warnings also visible in the compact view.

- [x] H1 Implement compact markup, summary and update-menu presentation.
- [x] H2 Verify narrow/200% geometry, keyboard/disclosures, original grid/bulk functions, warning/recovery visibility and no jobs on opening menus.
- [x] H3 Run relevant source-update/layout/runtime/type/build regressions; record exact evidence.


## Verification / convergence

Modern toolbar fixture passes Chromium, Firefox and WebKit, each with8 width/theme/root-text combinations: desktop/320px, dark/light,100/200% root text. It verifies44px targets, actual center hit tests, native keyboard and Escape, no data changes/jobs from opening disclosures, retained full source information, grid/bulk actions, staged-review return to Updates, visible source failure/unavailable/damaged-recovery feedback and preserved damaged receipt bytes. Root text is not native browser zoom (`tools/hajin-map/.local/071-compact-toolbar-final.log`).

The unchanged original source-update integration suite passes in Chromium legacy mode, including staged preview/apply, pending activation/retry, repeat no-op, reservation/receipt/quota failures, cancel/close/Escape locks, five source masters, immutable captures and25k raw records with20k view admission (`071-compact-toolbar-source-regression.log`). This does not claim that full suite ran in all engines or modern mode. The new three-engine fixture covers the changed modern presentation.

All214 Map runtime tests pass; TypeScript and modern production build pass (`071-toolbar-runtime.log`, `071-toolbar-build.log`). Existing bundle-size advisory remains unchanged. Repository validation reports0 failures (`.local/071-toolbar-static.log`); whitespace check passes. Live port5175 smoke/screenshot shows a109px idle toolbar at384px menu width, with no introductory prose or idle update paragraph. The screenshot is ignored under.local, not a distributed asset.

The unchanged21 normal geometry cases pass (`071-toolbar-layout.log`). No live provider jobs, owner player profiles, schema/default rollout changes or remote publication were performed by these checks; update jobs were synthetic intercepted fixtures. Feature071's broader manual/performance gates remain unchanged.
