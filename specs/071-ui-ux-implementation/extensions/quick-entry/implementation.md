# Implementation record

2026-11-08. User authorized implementation after reviewing the proposal. Active owner remains feature 071. Original research/prototype is retained as design history; the actual pages now use the shared compact presentation. No claim of independent reviewer approval or remote deployment.

## Delivered architecture

Shared server wrapper `src/ui/quick-tracker.mjs` is applied in the existing build module loop to exactly Inventory, Upgrades, Needed and the armory workbench. It adds native section links and a scoped stylesheet, without changing route IDs, content catalogs or original scripts. No new route or feature denominator required. `src/client/quick-tracker.mjs` moves the original live controls into the compact layout rather than cloning forms; state and persistence stay in their original modules. Styles are isolated in `src/ui/quick-tracker.css`.

Inventory retains its 50-row window, raw draft, currency-format preview, revision checks, backup/recovery, reserve validation and category/type groups. Main rows show name/rarity, stepper, next-tier need and Uses; reserves, other calculations and every existing usage column are moved into the same row's details. Repeated increments patch current values; no list remount. Pressing unmodified Enter on a valid owned quantity moves to the next visible quantity (last row focuses Save). Explicit clicking +/- on blank stock establishes a value; leaving blank alone stays unknown. Invalid hidden reserve recovery opens its actual detail before focusing. Successful explicit cancel clears the resolved inventory error after loading the saved revision.

Weapons adds a searchable/class-filtered roster inside the existing #acquisition workbench panel. All 33 existing weapon identities reuse the same acquisition store and commit transaction. Each Manual found checkbox saves separately; counts reflect acquired attachment IDs and blueprint names. Inspect opens the original selected-weapon editor; compare, builder, evidence and backups remain intact. No second ownership model or cross-store merge.

Upgrades retains its existing family/current-tier model and completion/purchase confirmations. Advanced view controls move under More filters; budget uncertainty and tracking-update action remain visible. Direct material details link to exact `inventory/?pack=…&item=…` editing. This intentionally delegates to the single existing inventory page rather than mounting another writer inside Upgrades. Saved stock updates on returning/reloading; no live cross-tab draft forecast or implicit save is claimed.

Needed retains the original budget arithmetic. Its primary table shows item, saved owned, remaining and a Calculation/printing disclosure; all original quantities, uncertainty and direct-versus-print separation are retained there. Each disclosure offers the same exact global-stock edit link. Forecasts still use saved state and protected reserves; missions remain the separate existing planner. X01 is still a distinct carried-material reference.

Catalog selection/exports/coverage are in the visible Catalog…/backups disclosure. Its label and tracker links refresh from the loaded pack, avoiding the startup select's initial-option label. Loading/error/version setup remain outside collapsed prose. Both themes use existing tokens; no imported site assets, credentials, schema migration or user profile edits.

## Analysis/fix results

- Avoided duplicate inventory writers by using exact-item delegation instead of an embedded independent stock editor; this is the concrete QE6 implementation decision.
- Fixed hidden invalid-reserve focus after moving cells; browser test reproduces it.
- Preserved input identity and button geometry across 20 increments and after Save.
- Fixed startup context label after async pack loading; exact active pack drives links.
- Catalog growth since prior tests adds two X01 ingredient samples: updated the old 29-count assertion to 31 plus exact sample-ID checks. Source parity remains covered elsewhere, and all previous numeric/validation assertions stay intact.
- Updated regression journeys to open actual disclosure controls before selecting moved filters; no force-click or disabled assertion bypass.
- Bounded-DOM runtime harness now supplies no-op presentation adapters and URL/location to its intentionally fake DOM; unchanged 100/1000/5000-catalog tests still enforce at most 50 mounted rows. Actual presentation/DOM identity is exercised in real browsers.

## Verification

Evidence logs and screenshots are private under `.local/quick-entry/`. Targeted runtime tests: 38 passed, zero failed. Quick tracker journey passed Chromium, Firefox and WebKit: ten staged inputs/save/reload, stable increments, invalid reserve recovery, dirty departure/Stay, stale revision protection, first-viewport inventory target, 33 manual records, acquired attachment persistence, category filters and responsive document overflow. Existing inventory/cash, category grouping, upgrade/Needed/printer and X01 regression results are recorded in the final verification receipt. Full-suite/final build and extended theme/viewport results follow there.

No physical-device, real keyboard-overlay, formal accessibility certification or independent release approval is implied by browser automation. No speed percentage or exhaustive game-data coverage is asserted.

Follow-up: [Needed layout parity](needed-layout.md) replaces the previous compact table with the same category/type grouped rows used by Inventory, including category filtering, expandable calculations and printing inputs. See its own final verification receipt for the later repair.

[Item blueprint checklist](item-blueprints.md) adds the Inventory-row ownership flag to the shared draft/save and backup lifecycle, with ownership labels in crafting views. Its separate contract and verification receipt explain the optional profile field and the distinction from recipe eligibility.
