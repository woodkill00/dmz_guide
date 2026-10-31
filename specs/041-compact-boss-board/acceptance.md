# Local UI acceptance — compact grouped boss board
2026-10-31. FR001–004 and saved-workspace part of FR005 implemented. Shared starter preset for fresh workspaces is NOT implemented: owner actual saved sequence is not readable in this session and async text request remains unanswered. Existing owner order is preserved automatically and is the default in that workspace; source refresh/read/render never alphabetizes or resets it. Do not infer a new game-board sequence from the captured roster.

Implemented:
- LT section above Commander section; per-type25-entry pages and order/position controls. Grouped read does not mutate entries array. Drag/keyboard within type; cross-type drop refused.
- Commander rows/pages/settings omit tag UI. Existing Commander optional settings/logs remain exact in private data on unrelated save; no destructive migration or game-drop claim.
- LT rows red at total>=5 including paused tracking; visible5+ text/legend.4→5→6→5→4 real fixed-coordinate checks confirm state and stable buttons.
- Compact desktop inline44px steppers and mobile two-counter row grid, slim filters, utilities below list; Arrange reveals Position controls. Explicit native select appearance/colors/options avoid white-on-white rendering.

Receipts:
- Full map unit suite174passed,0failed. Reviewer independently ran10focused boss-domain tests successfully.
- Final TypeScript/Vite production build passed; existing chunk-size advisory remains.
- Focused directory browser7groups passed in Chromium, Firefox and WebKit, retaining original038–040 journeys plus041 group/threshold/type/privacy cases. Nested52-entry independent-group pages,80-entry filtered movement, repeated fixed-coordinate desktop/mobile clicks, quota/stale saves, actual drag before/after, Commander legacy-data retention, saved order/reload, configured axe/overflow/44px checks executed. Compact fixture rows below90px desktop and140px at320; not a universal height claim for arbitrarily long names or expanded Arrange controls.
- Existing037 browser5groups passed after grouped presentation changes, preserving source/owner refresh, manual kills, draft, quota/retry and stale-revision cases.
- Repository checker0failures and git diff whitespace check passed (line-ending advisories only).
- Independent source/domain/visible320px/desktop review and native-select contrast repair receipts in checklists/requirements.md. Updated commanders screenshot includes kills-only subsection below LT/red paused row.

Scoped verification: unrelated full app suites and map/search/worker capacity not repeated; prior038capacity baseline retained because no corresponding hotpath change. Raw synthetic logs/screenshots ignored under .local/nav-repair/board-* and tools/hajin-map/.local/browser-checks/. No new source collection, no actual gameplay/physical-device/screenreader certification, no push/merge/deployment. Local UI commit only; T004b stays pending owner input.
