# Tasks and acceptance checks

## Immediate context cleanup — implemented and verified
- C01: shared compact disclosure for non-tracker pages, retaining real selector/export nodes.
- C02: shorten tracker summary; bound advanced coverage view.
- C03: healthy local-save text becomes unobtrusive; unsaved edits retain a stable visible label; failures and other warnings remain fully visible.
- C04: selected fixture label stays visible; explicit other-catalog context retained.
- C05: test normal/private/tracker/settings pages, backups, selection, warnings, dirty drafts and mobile bounds.

## Approved redesign delivery
- I01 (implemented): inventory current native/private item layouts and preserve each action/ID/relationship.
- I02 (implemented): implement item projection and scoped identity/action shell with real local icon/fallback.
- I03 (implemented): remove the generic library hero from a focused private item view; retain library access.
- I04 (implemented): implement section navigation and disclosures with keyboard/deep-link behaviour.
- I05 (implemented): adapt existing inventory/build/blueprint controls without a second save owner.
- I06 (implemented): render source/loot/crafting/use relationships once; retain notes, uncertainty and stats.
- I07 (implemented): implement directory grouping and stable compact rows with filters and exact links.
- I08 (verified): exercise exact edit/photo destinations and persisted photo/text roundtrip in an isolated repository.
- I09 (verified): compare 320, 390, 768, 1024, 1440 and 1920px, 200% zoom, dark/light, long names/counts and reduced motion.
- I10 (verified through runtime/storage, context and blueprint regressions): test fully stocked/unknown/no recipe/missing icon/failed save/rebind/fixture states; ensure alerts and unsaved work remain visible.
- I11 (verified): real journeys: Inventory → item → add build → Quick collect; mission/upgrade → item → loot type; item → Studio → edit/photo save → saved preview.
- I12 (verified; exact-run caveat in analysis.md): run source/profile/collection/blueprint/render regressions, exact-ID/canonical checks and static build; record only executed evidence.

Acceptance: no duplicate description/use panels, no body overflow, no click-induced jump or lost draft, no inaccessible source information, no field count fabricated from unknowns, and no hidden real failure. Existing inventory and IDs must remain identical. Reviewer-owned approvals are separate from implementer task completion.

- I13 / IP-8 (implemented and verified): source-mentioned/explicit possible-area buttons, native location fallback and literal map search; all three map browser engines pass result-to-map movement, empty and invalid-query journeys.

- I14 / IP-9 (implemented; verification receipts in analysis.md): auto-frame exact named registered positions and draw persistent temporary highlight rings; compact dismissible label clear of map controls; no visibility/profile writes. Exercise delayed loading, zoom, clear, unknown names, duplicates and existing result jumps.
