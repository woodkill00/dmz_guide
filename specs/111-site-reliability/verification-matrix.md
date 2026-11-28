# Planned verification matrix

All tests use isolated synthetic contexts, not the private backup or live browser. This table is planned coverage; verification.md records actual execution.

| Family | Owner suites / command | Required observable assertions |
| --- | --- | --- |
| 1 Inventory → Needed → Quick collect | tests/browser/collection-needs.mjs, collection-workbench.mjs, quick-collect.mjs; reliability runner invokes exported suites or adds missing coverage | Save quantity; exact outstanding demand/missing counts on related pages; Add found changes inventory; reload preserves result |
| 2 Upgrades | tests/browser/tiered-upgrades.mjs, upgrade-dashboard.mjs | Checkbox confirmation commits; next incomplete tier/remaining counts change; inventory unchanged by completion |
| 3 Orders | tests/browser/orders-navigation.mjs, mission-objectives.mjs, order-return.mjs, order-completion.mjs | Individual and section completion; acknowledged dashboard reopen; simulated clean/held-initial cached return without replay; exact objective lines; Hajin24/X015 page links |
| 4 Weapons ↔ dashboard | npm run test:weapons:workspace; tests/browser/unified-weapons.mjs; add reliability assertions where absent | Manual +/- and ownership; camo completion then next challenge; navigate to dashboard and assert same count/current camo; prestige stays separate |
| 5 Maps and routes | npm --prefix tools/hajin-map run test:engines, test:safes, test:loot; selection-stability owner suite | Selected marker inspector stays visible through pan/zoom; route order changes while retaining selection; Safe/Loot/Hajin/X01 destination links |

The reliability runner uses Chromium/Firefox/WebKit and strict browser health, reporting each family separately. Map owner suites use their existing engine matrix. Existing suite commands remain present in CI; new assertions must be wired to the appropriate gate.

| View/component | Evidence/checks |
| --- | --- |
| Dashboard/weapon/item cards | npm run test:cards, reusable-card-reflow; name/action containment at narrow widths, no clipped labels, equal intended row spacing, actual computed200% font increase, reviewed screenshots |
| Inventory/upgrades/Orders/quality tables | npm run test:ui:sitewide and test:ui:sweep; 320/390/768/1440 widths, bounded2D regions, expanded disclosures, no normal document overflow |
| Menus/editors/tools | test:ui:services and sitewide-workflows; keyboard open/close/return focus; focused expanded control not obscured; current Axe serious/critical findings block |
| Map inspectors/navigation | map engines/accessibility + selection tests; bounded inspectors, retractable navigation, retained selection, route controls keyboard alternatives |

Reuse feature109 FR13/14 thresholds:44CSSpx primary/touch controls;24CSSpx compact controls or an applicable documented spacing exception. Font enlargement must be measured on rendered body/control text (2×), not inferred from a CSS variable. Responsive mixed rem/vw headings must grow and remain unclipped; they are not required to scale by exactly2×. Review screenshots for text/action readability as well as overflow geometry. Unavailable device/screen-reader testing is explicit, not claimed.
