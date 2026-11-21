# Acceptance — 2026-11-21

FR01–03: shared currency stock/reserve application maximum is exactly7,000,000,000 inclusive;7,000,000,001 is rejected. All101 profile/draft/spending/refund/run stock consumers inherit the shared constant. Three UI guidance strings now derive their formatted limit from that constant rather than maintaining separate literals. This is the user-requested application maximum, not a claim about game-bank rules. Existing material/cost/goal/legacy/carried/transfer limits and explicit currency profile-format confirmation remain.

Executed current-source receipts on Windows/Node24:
- 102-runtime.log68/68 PASS. Includes legacy conversion and higher cash backup roundtrip, accepted historical6209662/999999999 and7b, above-max and unsafe/fractional/negative/malformed rejection, material caps, exact7b purchase/refund arithmetic, inventory presentation and run reservation checks. Native-invalid VM harness now receives its actual imported currency constant; cancellation/draft-retention assertions remain unchanged.
- 102-browser.log Chromium/Firefox/WebKit PASS. Actual Inventory raw/grouped6209662 and7000000000 saves, exact numeric stock and7b reserve, reload with grouping, explicit legacy confirmation and existing v3, displayed max attributes, unrelated metals quantity preserved,7,000,000,001 and malformed/negative/fractional values rejected while saved7b and draft remain.
- 102-build.log2109 guide routes plus404;102-map-build.log eight map entries refreshed for shared source. 102-topology.log registry/current built topology PASS. Final102-format.log full formatting pass;102-structure.log zero failures. Local4173 status ready/maps true.

No full repository aggregate rerun claimed for102;101 aggregate and targeted convergence remain historical. Production source frozen after these builds; only focused test harness dependency injection changed afterward. No source collection, schema/migration, owner-profile changes, external publication, push or main merge. Older readers with lower bounds cannot load newly exported balances above their former cap; use the updated application for those backups. Rollback changes input/storage bound only and must not silently truncate saved balances.

Reviewer disposition is in reviewer-owned review.md. No remaining implementation-known gap in this bounded maximum change.
