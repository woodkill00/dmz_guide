# Independent planning review

2026-11-26. Read spec, clarifications, research, plan, tasks, validation, analysis, planning acceptance and self-check. Reviewed existing map selection invalidation source. This is planning review only: no application edits, fixtures, builds or current application acceptance executed by reviewer. Existing108 work preserved.

## Findings

| ID | Severity | Owning location | Required bounded repair |
| --- | --- | --- | --- |
| USABILITY-01 | P2 planning blocker | spec FR17/18; tasks T00–02/T29–31 | Spec contains18 requirements, while planning/final catch-all task ranges end FR16 and parent/self shorthand says16. Explicitly map FR17 verification and FR18 rollout/review/docs to task owners and gates, correct requirement denominator/ranges and analysis coverage. Existing work describes much of this, so repair traceability rather than expand scope. |
| USABILITY-02 | P2 planning blocker | validation Mandatory adverse map scenario; FR10/T19 preservation | Selection is required to survive every filter/save, but current map renderMarkers intentionally invalidates selection on explicit data/filter refresh (workspace/app.ts around1677). Pin a transition contract distinguishing passive pan/zoom/resize/noninvalidating repaint (retain stable inspector) from explicit source/filter/data/deletion/owner changes (existing guarded close/review/clear). Preserve dirty/committed operation guards and explicit unavailable state. Test both rather than silently changing domain behavior under styling. A selected record becoming excluded/deleted cannot be promised persistent interactive authority. |

## Coverage and quality assessment

All20 declared families have named phases and validation tiers. Generated exact route/feature/CSS inventories and measurable budgets are correctly deferred to T04/T05 before implementation, not called executed coverage now. Existing071 rollout/lifecycle and105 owners are explicitly retained, actual shipped variants must be tested, aliases/capability-gated tools receive nonpassing outcomes, and exposed operations preserve schemas/game facts. Isolated implementation after a108 checkpoint is appropriate and not yet claimed complete.

Calc-backed tokens with intrinsic flow/clamp/minmax and documented primitive/vendor/map exceptions are proportionate; meaningful computed geometry and parsed owner inventory outrank textual calc counts. Current source counts/16read-only Chromium observations are candidly limited, not representative workflow proof. Performance budgets are baseline-selected; device/keyboard checks require real manual evidence before support claims. Accessibility/visual/function/lifecycle tiers are separated; serious/critical Axe is a scoped tool criterion, not full WCAG certification. No remote source/rights or all-game completeness approval is inferred.

Independent acceptance after implementation must bind route/owner/state inventory to exact build/fixtures/engines and include failed/blocked/not-run outcomes. No unclassified route, unresolved P1/P2 or past108 scoped PASS can satisfy109 final acceptance. Preserve unsupported/unavailable checks honestly. Planning remains pending the two owning-artifact repairs; no application implementation is authorized by this review.

## Pass2 independent recheck — 2026-11-26

Planning READY. USABILITY-01 closed: all full-scope task ranges cover FR01–18, explicit FR17 verification owners T05/T23/T25/T29/T30 and FR18 isolation/rollout/consolidation/review/docs T03/T24/T30/T31 are pinned. USABILITY-02 closed: mandatory validation and plan now retain selection for passive pan/zoom/resize/noninvalidating repaint, while explicit source/filter/data/delete/floor/context changes follow existing guarded invalidation. Locate/reset/route-fit remain explicit positioning actions, not silent recentering. No remaining confirmed blocking planning finding.

Directly inspected planning consistency JSON reports12documents/32taskIDs/18requirements, acyclic dependencies and0failures. This is parent-run documentation validation, not application test evidence. The manual feature-pointer fallback is honestly described as necessary after the Python Store shim failed; no CLI success or Git branch/worktree transition is invented. Existing108 dirty work and application sources remain outside reviewer edits. Future implementation still requires T03 checkpoint/isolation, T04 exact inventories and T05 baselines/budgets before dependent code. No runtime/performance/WCAG/device/whole-site implementation acceptance, commit, merge or deployment approval is granted.

Reviewer planning checklist now contains planning criteria only; future implementation acceptance remains a separate review gate. Only reviewer-owned review.md and independent-review.md edited.
