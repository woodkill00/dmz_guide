# Planning and concept validation
2026-10-31. Production files unchanged; no production behavior or gameplay data modified.

Baseline: read-only isolated Chromium1440x1000, selected observed:upgrade-review-20261026 after loading and two paint frames. Mounted inventory firstpage50rows; first3 fieldsets306px. Upgrade track28cards; first3 heights1907/1907/1939px. This is one current-catalog baseline, not game completeness or an owner profile.

Standalone fictional concept:
- First mobile hierarchy was too tall (~230–253px), independently identified and revised before visual agreement.
- Refined representative desktop inventory63px rows; upgrades80/63/63px. At390px inventory121px; upgrades132/114/114px. At320px inventory121px; upgrades132/127/114px (rounded pixels).
- Final Chromium:12 view/theme/width combinations (Inventory/Upgrades × dark/light ×1440/390/320) passed configured axe with no violations or horizontal overflow. Explicit target-view visibility and pageerror checks passed; earlier preview-label initialization error corrected, no hidden-view false pass retained.
-320px at root200% font: both concept views had no horizontal overflow. This is not physical-device or full screen-reader certification; body/scaled typography and production controls still require implementation acceptance.
- Demo has no network assets, profile storage or mutation API. Quantity/purchase buttons explain illustration-only status. View controls/search/Details/theme/density affect only the sample DOM. The prototype's inline CSS/script is a standalone planning artifact, not a production CSP/template decision.

Independent planning/safety review and visual refinement in checklists/requirements.md. All I001–004 production tasks remain unimplemented. Existing app unit/browser suites were not rerun for a planning-only artifact change. Repository structural and diff checks recorded after review.

## Grouped sections / uses extension
- Independent definition and concept review passed for FR010–013/T004–005. Production I005–006 still pending; no real reverse-index, spoiler, stock, spending or persistence implementation is certified.
- Fictional concept now has Materials/components and Currency sections, section filter, visible/total sample counts, expand/collapse controls, four wide-screen usage columns and medium/mobile Uses expansion. Named sample links/+N use native disclosure and a labelled fictional-reference dialog, not real catalog navigation.
-16 visible view/theme/width combinations (Inventory/Upgrades × dark/light ×1440/1024/390/320) passed configuredaxe/no-overflow with zeroJSerrors. Representative inventory rows78px with four wide usage columns,61px at1024 and121px mobile. More content/expanded lists can grow naturally; prior63px figures describe the earlier stock-only prototype.
- Interaction smoke passed: RecipeB additional-list reference, crafted-output reference, native dialogClose/Escape, searchRecipeC→1/2visible Materials, Currency section filter, collapse/expand all, medium/mobile columns actually hidden (no clipped interactive links), mobile four labelled lists,320px/root200%nohorizontaloverflow.
- PNG concepts regenerated. No production files were changed or app test suites rerun for this planning-only extension. Structural checker0failures and diff checks pass.
