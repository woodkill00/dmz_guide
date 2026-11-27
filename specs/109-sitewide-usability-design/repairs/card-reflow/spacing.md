# Card spacing follow-up

The supplied screenshot shows cramped ownership labels, insufficient group separation and competing camo/action space despite no horizontal overflow.

R8: Separate checkbox labels and ownership/count/action groups with consistent token-based gaps. Camo information and completion controls must have distinct, aligned space; at narrow card widths completion moves to a compact footer instead of squeezing the description. Preserve all labels, help, progress owners and both camo tracks.

- [x] T9: Refine shared weapon toolbar and track spacing using intrinsic sizing and grouped wrapping.
- [x] T10: Reproduce screenshot-like populated cards; assert actual inter-control gaps and narrow completion layout, and inspect native screenshots.
- [x] T11: Run existing card regressions, audit/format/build checks, independent review, and refresh local service.

Analysis: R8 adds visual spacing criteria to R1–R7, not a new tracking model. Coverage must measure gaps rather than only absence of overflow. The screenshot is user evidence, not an instruction to import game facts or private progress. Use synthetic presentation labels in disposable browser contexts; leave real saved player data untouched.

Implementation: ownership group separation uses the shared spacing tokens; count and correction buttons remain distinct groups. Challenge descriptions reserve more room before a compact horizontal Done control wraps to a right-aligned footer. Description typography rules were consolidated without increasing the approved CSS budget. Shared rendering applies this to Weapons and Dashboard.

Verification on 2026-11-27: test-results/109-card-spacing-native.log records both card suites passing Chromium/Firefox/WebKit. Final exact footer assertions also passed all three engines (109-card-spacing-footer.log): actual minimum gaps, below-description position and right alignment at narrow widths, tested at 180/220/260/300/350/380px and 100%/125%/200% text. The original no-overflow, help, saved-count reload, Dashboard, accessibility and item-host checks remain active. Screenshot-like synthetic states are captured in card-reflow/*-spacing-350.png and *-spacing-260.png.

Nine affected runtime tests passed, no failures/skips (109-card-spacing-runtime.log); full formatting and whitespace checks passed. Guide build produced 2277 routes plus 404; map build passed (109-card-spacing-build.log, 109-card-spacing-maps.log). Audit passed at 423630 CSS bytes versus the unchanged 423763 limit, 36 sheets and 861 raw declarations. [Independent visual/source acceptance](spacing-review.md) found no confirmed blocker within this scope. The recorded owned local service was restarted with fresh bundles at http://127.0.0.1:4173/. No public deployment, physical-device testing or changes to saved player data are claimed.
