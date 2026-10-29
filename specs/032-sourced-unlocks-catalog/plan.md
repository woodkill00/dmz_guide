# Implementation Plan: Sourced upgrades and unlocks

Branch: `032-sourced-unlocks-catalog`; date: 2026-10-28; [spec](spec.md).

## Summary
Expand the existing `upgrade-observations` pack using factual, independently checked data from the three selected community sources. No new content/private schema or runtime feature is needed. Preserve original IDs/game scope/history; new evidence stays independently attributable and unverified. Keep source-only unlocks as objectives/claims/guides, not zero-input executable recipes.

## Technical context
Static JavaScript multipage app, Node 22/24, JSON schema v 2 catalog and private profile v 3. Existing build/catalog loader, bounded validator, item detail, progression, planner and transaction modules remain the integration points. Python standard-library repository checks; Node runtime tests; pinned Playwright browser tests. No new dependencies or external runtime calls. Existing source pack is small enough for published limits; verify generated size and browser rendering.

## Constitution check
Pass at design: player remaining-needs workflow maintained, unknowns explicit, privacy preserved, no asset copying or unsupported game rules, existing mobile/keyboard UI reused, no account/backend/deployment. Independent review owns the evidence checklist. Public writes remain separate from local implementation.

## Design and data
- Existing pack ID/game scope remain unchanged; advance contentVersion to 2026.10.28.1 and clearly describe mixed observed/community evidence.
- Reuse original 22 item IDs and 8 objective IDs. Add 16 new upgrade material/currency identities to reach 37 materials +cash. Source-only new IDs use `reported:` namespace.
- Add 20 FOB definitions. Original 31 rows are unchanged; explicitly append null cash rows to original VendorI/MIAIII because source reports missing price. Their future purchase attempts block; immutable prior history and reversal remain valid.
- New FOB rows use `unverified` evidence and unknown consumption. Numeric quantities are source reports; planning may present partial known requirements, never ready-to-purchase promises.
- Add 75 recipe-unlock objectives on the `progression` track and corresponding items, with 77 route claims. No recipe output quantity or ingredient list is invented. NVG alternatives are not AND prerequisites; UAV gets competing disputed claims.
- Add 69 level objectives on the `progression` track and 90 reward claims. Milestone effects/prerequisites remain empty, so no inventory grants or false eligibility. Known type/names/quantities remain factual; unspecified bundles and Simone wording are explicit unknowns.
- Story-sensitive unlock objectives use spoiler protection. Guides and ordinary item descriptions omit mission names; related-record links use the existing spoiler-safe labels. Guides link related records for navigation. Existing generic detail renders claims and source links. Related item information includes unlock summary but does not certify crafting cost.
- Public-safe factual evidence snapshot and aggregate oracle support review; do not commit downloaded HTML/article prose, assets, private screenshots or player data.

## Paths and ownership
Integrator owns `content/catalog/upgrade-observations/**`, relevant runtime/browser tests, `docs/quickstart.md`, `docs/content-contributing.md`, and this feature directory. Independent reviewer owns `checklists/evidence.md` and review records only. No map workspace or CI behavior changes.

## Verification
Test exact coverage/row counts, aggregate 889, incomplete cash subtotal 2840000, route dedupe,69/90 level facts, source attribution, uncertainty, preserved 31 rows, unknowncash atomic refusal, original history/reversal after rebind, no duplicate debit, portable roundtrip and browser navigation/manual progress. Run full `npm run check`, format checks and focused browser journey plus existing affected upgrade/browser suites. Record failed/not-run stages honestly. Independent review precedes completion.

## Alternatives
A separate pack was rejected because it would strand existing inventory/progress and duplicate the same tiers. Automatic level grants and schema expansion were rejected because source-only content can fit current contracts without inventing consumption/craft yields.
