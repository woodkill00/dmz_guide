# Tasks — Progress dashboard

Status: implemented and locally verified; independent implementation checklist complete. See acceptance.md for exact receipts and delivery boundaries. Requirement references refer to spec.md. No parallel edit markers: the model/controller contracts and existing hub files require serialized integration.

## Setup and foundations
- [x] T001 Record baseline home/Quick collect/Inventory counts with synthetic profiles in tests/runtime/dashboard.test.mjs; include no-profile and spoiler-protected fixtures. FR-002, FR-008, FR-012.
- [x] T002 Implement pure section model and bounded pagination in src/domain/dashboard.mjs; delegate existing calculations and prove no input mutation in tests/runtime/dashboard.test.mjs. FR-002, FR-005, FR-006, FR-007, FR-011, FR-012.
- [x] T003 Trace and document actual storage keys, safe read-existing armory adapter, Quick collect save/history transaction, effective blueprint ownership rules and supported deep links in contracts/dashboard.md; add any necessary shared adapter in src/storage/dashboard-context.mjs and src/client/collection-action.mjs. Inspect existing controllers before moving code. FR-004, FR-007, FR-008, FR-012.
- [x] T004 Add absent/stale/blocked/partial-store/generation tests in tests/runtime/dashboard.test.mjs and tests/browser/dashboard.mjs, proving home discovery makes no DB creation or player-store writes. FR-008, FR-012.

## US1 — Collection (P1)
- [x] T005 Build grouped ingredient and other-needs tile markup in src/ui/dashboard-page.mjs, reusing/extracting safe primitives from src/client/build-collect-view.mjs; assert unknown/minimum/shared-stock behavior in tests/runtime/dashboard.test.mjs. FR-002, FR-003.
- [x] T006 Add inline details and guarded Add found to src/client/dashboard.mjs through T003 adapter; retain focused node, draft, scroll and group states during refresh. FR-003, FR-004, FR-008.
- [x] T007 Test add-once, quantity bounds, repeated activation, success across Inventory/Quick collect, conflict/quota/retry and stale-draft handling in tests/browser/dashboard.mjs. FR-004, FR-012, SC-002, SC-003, SC-005.

## US2 — Upgrades and Orders (P1)
- [x] T008 Add current-tier and separate Hajin/X01 previews to src/domain/dashboard.mjs and src/ui/dashboard-page.mjs, using persisted visible completion and source rosters. FR-005, FR-006.
- [x] T009 Verify all-complete families, variable chapter positions, hidden story content, selected-pack navigation and existing destination edit/return in tests/runtime/dashboard.test.mjs and tests/browser/dashboard.mjs. FR-005, FR-006, FR-012.

## US3 — Weapons and recipes (P2)
- [x] T010 Add independently loaded weapon acquisition summary and effective item blueprint/recipe rows to src/domain/dashboard.mjs and src/client/dashboard.mjs, with existing owning-workspace edit links. FR-007, FR-008.
- [x] T011 Verify unknown blueprint universe, no false missing counts, printing upgrade-derived access, unresolved identity mapping and partial armory failure in tests/runtime/dashboard.test.mjs and tests/browser/dashboard.mjs. FR-007, FR-012.

## US4 — Home composition (P1)
- [x] T012 Wire shared home dashboard into both variants of src/ui/hub-page.mjs, src/client/hub.mjs and build stylesheet/script inclusion; retire overlapping legacy summary renderer. Keep search, hubs, pins/recent and service links reachable. FR-001, FR-010.
- [x] T013 Implement bounded layout preferences and dirty-navigation protection in src/client/dashboard.mjs (or shared preference module), section anchors, independent expansions, focus return and paged content. FR-008, FR-009, FR-011.
- [x] T014 Add responsive token-based sizing in src/ui/dashboard.css and preserve intrinsic dimensions/fallbacks for image buttons. FR-003, FR-010, FR-011.
- [x] T015 Exercise 320/390/768/1280/1920 widths, 200% text zoom, classic/modern modes, keyboard/touch, missing icons, large catalogs, rapid pack switches, bfcache/focus return and no layout jumps in tests/browser/dashboard.mjs; integrate journey into existing browser/engine test entry points. FR-001, FR-003, FR-008, FR-009, FR-010, FR-011, SC-001, SC-004.

## Integration and acceptance
- [x] T016 Prove dashboard-to-owning-page parity and page-to-dashboard refresh after inventory, upgrade, mission, item blueprint and weapon acquisition edits using tests/browser/dashboard.mjs. FR-012, SC-002, SC-003, SC-005.
- [x] T017 Run repository checker, focused tests, npm test, npm run build, npm run format:check and relevant browser/engine/accessibility gates; fix concrete failures and capture evidence in acceptance.md. All FRs.
- [x] T018 Independently review implementation, run convergence against each FR/SC, append uncovered tasks, rerun read-only analysis and repair owning artifacts until no unresolved implementation gaps. Reviewer updates their checklist; implementer does not approve it. All FRs.
- [x] T019 Update docs/quickstart.md and docs/README.md with dashboard usage, counts, local-state boundaries and recovery; capture final acceptance and prepare reviewed commit/PR. FR-001, FR-008, FR-012.

## Dependencies and delivery
T001 -> T002 -> T003 -> T004 are foundations. US1 T005->T006->T007; US2 T008->T009; US3 T010->T011. Complete shared contracts before each story; serialize shared model/UI edits. US4 T012->T013->T014->T015 integrates all stories. T016->T017->T018->T019 closes delivery. Pure projections and zero-write loading are the first reviewable slice; then read-only sections, then guarded collection writes. Do not ship the first slice as the completed feature.

Optional independent review can run while implementation tests execute; no concurrent writes to shared source files. Planning artifacts are the only changes in the initial branch commit.

T013 also owns section Move up/Move down controls and Reset layout, keyboard announcements and tests proving reset never touches inventory, missions or acquisitions.

## Analysis repair task ownership
- [x] T020 Preserve direct Safe Run and collection links; update the Home fixture for six dashboard sections and pin through All features. Verify existing navigation workflows. FR-001, FR-010.
- [x] T021 Admit the measured modern site-map snapshot (321111 JSON values, 8035093 bytes) with a shared exact-endpoint 350000-value budget; preserve graph/byte/depth and ordinary JSON bounds. Test overflow and wrong-endpoint rejection. FR-001, FR-010.
- [x] T022 Catch dashboard module import interruption, including rejection after persisted return; retain navigation and provide explicit reload recovery. Add the lifecycle browser reproduction. FR-008, FR-010.
- T003/T006/T007 cover FR-013: inspect atomic commit evidence, expose committed-unverified/Verify saved update, and test successful commit followed by failed reread, held commit across pagehide/return, late old-catalog ack and no double delta.
- T002/T005/T007/T016 cover FR-014: explicit default crafting=false/optional true parity, absent-held versus explicit zero and lower-bound unknown fixtures.
- T002/T004/T013/T015 cover FR-015: maximum 100-target fixture, many/shared inputs, total mounted tile/header/panel counts under replacement pagination; held/blocked/open-after-timeout reads, 1500ms deadlines, pagehide cancellation and connection cleanup. Prove read cancellation never replays a write.
