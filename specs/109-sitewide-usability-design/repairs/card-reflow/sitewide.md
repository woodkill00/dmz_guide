# Reusable-card follow-through

The owner requested checking all reusable card families after the weapon repair.

R6: Audit shared item size variants and their Dashboard, Quick Collect, blueprint and crafting hosts, plus reusable feature/reference, Order, upgrade and action cards. Repair confirmed intrinsic-width or flex competition without hiding content, removing actions or changing progress storage.

R7: Add reusable regression coverage using real renderers and real page styles at intermediate widths and enlarged text in Chromium, Firefox and WebKit. Distinguish tested families from empty/unavailable states; inspect representative screenshots. Keep the CSS budget and existing tests intact.

- [x] T6: Inventory card families and reproduce remaining failures.
- [x] T7: Repair shared boundaries at their owners and add native regression tests.
- [x] T8: Run affected checks, obtain independent review and record evidence and local availability.

Analysis: This extends the existing repair with R6/R7; R1–R5 remain covered by test:cards. No blanket clipping, fixed heights or player-state changes are planned. Use intrinsic sizing and existing calc-backed tokens. New fixtures must be explicitly synthetic and use real renderers or rendered page DOM.

Confirmed additional causes: the upgrade family's higher-specificity button rule forced max-content/nowrap; the item-directory row allocated four competing Grid columns and its actions inherited nonshrinking flex behavior; camo badge negative insets extended the scrollable area beyond tile borders. Repairs are owned by quick-tracker.css, item-workspace.css and weapon-camos.css. Item-directory actions are now bounded while wrapping naturally. Obsolete row Grid placement rules were removed rather than layered over the new Flex layout.

Coverage inventory: real feature-hub, reference-guide, Order page, FOB upgrade, upgrade-material, item-directory, Track item, camo and item-action cards. Real shared item renderers cover icon/inline/compact/regular variants in Dashboard and Quick Collect styles, including actual ingredient tiles, blueprints, Orders, upgrades and crafting buttons. Old inactive feature-card/compact-armory styles and author-only media cards were inspected as source; this does not claim a live author-server or map-popup interaction test.

Verification distinguishes actual page allocations at 320/768/1100px from isolated card widths at 220/280/360px, both at 100%/200% text. Only descendants of an explicit bounded scrolling table region are exempt from wide-table bounds checks. Viewing help and keyboard-activating the upgrade button with blank stock must not change durable profile data; the latter must report the exact existing missing-stock guard, not imply that a purchase preview is available without stock.

Runtime regression: 38 passed, zero failed/skipped. Full formatting and guide/map builds passed. CSS audit: 36 stylesheets, 863 raw layout declarations, 423562 bytes within the unchanged 423763-byte limit. Final native and independent acceptance receipts are recorded in the follow-through verification below when completed.

Final convergence: both suites in `npm run test:cards` passed in Chromium, Firefox and WebKit (exit 0; test-results/109-reusable-cards-final.log). Real page grids at 320/768/1100px and isolated cards at 220/280/360px passed at 100%/200% text. Reviewed screenshots include item-row-200 and upgrade-purchase-200 for all engines. The button's native keyboard action displays the exact existing blank-stock guard without changing durable data. Earlier modal expectations were corrected to match this intentionally empty profile; no successful-spend claim is made. See [independent acceptance](sitewide-review.md).

Live availability: guide and map bundles rebuilt; the recorded, verified project service was restarted at the same http://127.0.0.1:4173/ address. Local readiness check passed and eight live guide/map routes returned HTTP 200. Runtime log: test-results/109-reusable-cards-runtime.log; build: 109-reusable-cards-build.log; audit: 109-reusable-cards-policy.log; formatting: 109-reusable-cards-format.log. No GitHub CI or publishing ran for this repair.

Limits: representative active public card families and real shared renderers, not every hypothetical content/state combination or physical device. Studio media-card containment (min-width zero, bounded images, paragraph/button wrapping) was source-reviewed rather than exercised through the separate author service. No blanket clipping, new card heights, save owners or storage migrations were introduced.
