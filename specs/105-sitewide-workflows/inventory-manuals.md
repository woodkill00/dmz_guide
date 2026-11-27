# Scoped inventory display repair

2026-11-22 · owner feature105 · user request: remove Weapon Manuals from Track → Inventory because acquisition is tracked in Weapons.

## Specification / clarification

Inventory must not list, search, count or offer a section for items whose catalog category is Weapon Manuals. Keep public item references, Orders requirements and the weapon acquisition owner's manuals/counters intact. Preserve any previously saved inventory entries rather than deleting user data. Scope is this page's display, not catalog removal or data migration. No unresolved question.

## Plan / tasks

Filter the existing inventory display index by the canonical itemSection category before sections, pagination and matching are calculated. Leave the full draft/profile and item-use graph unchanged so saving other quantities cannot erase hidden values. No new dependency, schema or store; no new feature branch is needed for this bounded owning-feature repair.

- [x] T021 Filter the inventory display index; verify manual section/rows absent, normal quantities save, hidden legacy values and acquisition progress retained, and Weapons still lists manuals.
- [x] T022 Build guide/map bundle, run affected checks and independent scoped review; record receipts.

## Analysis

Single projection boundary covers list, section filter and page/search totals. Filtering catalog data or clearing profile quantities would violate preservation; neither is authorized. Existing createInventoryDraft must continue to receive all pack.items. No shared metadata contract changes. Manual match uses the existing category classifier, case-insensitive; weapons and unrelated manual-named items in other categories remain visible.

## Verification

36/36 affected inventory runtime checks pass. Guide rebuilt2111 routes+404 and unified map bundle rebuilt. Scoped format check passes; repository structural check0 failures. Browser reproduction passes in Chromium/Firefox/WebKit: no manuals section/filter/search results, ordinary cash4321 saves/reloads, previously stored manual7 unchanged, separate M4 manual ownership+2/3 extraction counter unchanged and displayed by Weapons. All seeded data is synthetic in disposable browser contexts; no owner profile was accessed. Receipts: test-results/105-inventory-manuals-{runtime,browser,build,map-build}.log. First diagnostic read hidden counter via innerText and was corrected to await its textContent (existing disclosure); no production behavior was changed for that diagnostic issue. Independent scoped source review found no blocker; final evidence review PASS in reviewer-owned review.md. This document follows the repository's manual bounded Spec Kit repair fallback; no bug-extension command is claimed.
