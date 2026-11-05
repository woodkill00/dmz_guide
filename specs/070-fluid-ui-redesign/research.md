# Research and current-state evidence

Checked 2026-11-05. Primary sources only for adopted technical/design guidance. These establish design principles, not proof that our proposed interface is usable. All budgets, palette choices and phase ordering below are project proposals/inferences.

| Source | What it supports | Decision / limit |
|---|---|---|
| [Esri mapping app layouts](https://developers.arcgis.com/javascript/latest/creating-app-layouts/) | Separating structural layout from mapping functionality | Root shell owns panes; Leaflet remains. Do not import Esri or assume its components' behavior transfers |
| [Fluent drawer usage](https://fluent2.microsoft.design/components/web/react/core/drawer/usage) | Difference between side-by-side supplemental content and intrusive overlays; deliberate modality | Dock default desktop tasks; brief explicit mobile inspection. Sheet height does not define focus semantics |
| [Material-derived canonical layouts](https://developer.android.com/develop/adaptive-apps/guides/canonical-layouts) | List/detail and supporting-pane adaptation between widths | Adopt layout principle for web; Android APIs are not an implementation dependency |
| [Carbon data-table guidance](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Structured comparison rows, toolbar organization, selection and expansion | Shared directory pattern with bounded results; no automatic React/Carbon migration |
| [WAI disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) | Ordinary navigation links/disclosures differ from ARIA application menu widgets | Preserve semantic nav/native links, keyboard/Escape; test assistive technology rather than copy example as certification |
| [USWDS side navigation](https://designsystem.digital.gov/components/side-navigation/) | Keep hierarchy manageable and current location clear | Prefer one primary navigator, not combined permanent app/map rails |
| [GOV.UK details](https://design-system.service.gov.uk/components/details/) | Optional detail can be disclosed; essential information should remain exposed | Keep uncertainties/prerequisites visible; disclose optional history, not crucial facts |
| [GOV.UK notification banners](https://design-system.service.gov.uk/components/notification-banner/) | Purposeful notifications, distinct from page-local validation/content | Quiet normal status; persistent actionable problems; avoid repeated banners |
| [WCAG2.2 reflow explanation](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) |320CSS-pixel reflow and exceptions for inherently2Dcontent | Table/map exception does not exempt controls or cell text; actual zoom checked separately |
| [WCAG2.2 focus not obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Focus must not be entirely hidden; persistent overlays create risks | Product aims for fully visible focused controls/rings, beyond minimum partial visibility |
| [WCAG2.2 target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) |24×24CSS-pixel AA minimum with defined exceptions |44px operational targets are our stronger usability preference, not an AA quote |
| [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) | Announce relevant changing status without moving focus | Keep meaningful live feedback even when visually quiet; avoid chatter |
| [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Modal focus containment, deliberate initial focus, Escape/return | Real modal contract for destructive/import/draft boundaries, no fake modal inspector |

## Repository evidence

- `src/ui/site-navigation.mjs`: primary Home/Map/Prepare/Track/Reference/Manage/Search; `main-hubs.mjs`, `feature-registry.mjs` and existing mindmap use additional Guide/FOB/Weapons hubs. Reconcile presentation without dropping registered destinations.
- `src/ui/layout-tokens.css`: existing rem/clamp spacing and44px control foundation. Reuse it rather than duplicate a new global override layer.
- `tools/hajin-map/src/main.ts`, `styles.css`, `map/field-toolbar.ts`, `map/menu-layout.ts`, `workspace/app.ts`: parallel overlay/task ownership and many fixed label/offset values. Recent066–069 fixtures prove selection, source masks, focus and scrolling are preservation requirements.
- `src/ui/keys-page.mjs`, `gunsmith-view.mjs`, `collection-page.mjs`, `progression-page.mjs`, private/key/armory workspaces: different list/edit/detail presentations, with useful existing domain rules. Migrate presentation adapters, not domain calculations.
- Native Guide4173, Map5175, Studio4174 and Manager4176 have distinct actual services/storage boundaries. A common shell must not imply data synchronization or silently initialize/migrate profiles.

## Actual audit method and limits

Agents performed read-only source review and fresh isolated Chromium observations on running local pages, not the owner's browser context. IA agent sampled18page-width cases; accessibility reviewer independently sampled header/nav geometry. Map reviewer measured intersecting controls and wrote ignored screenshots. Current-state map audit had a differing companion-nav response; exact live response is not universal code behavior. No player usability study, full populated-state audit, physical-device certification or complete catalog verification was performed.

Ignored receipts include `.local/design-map-audit-{390,1440}.png` and agent-produced IA observations; parent concept receipts `.local/design070-layout.json` are separate from the production baseline. Do not publish local owner assets with this planning package. The concept uses code-native schematic SVG and synthetic records only.

## Alternatives and unanswered validation

Use existing static rendering/DOM controllers and shared tokens first. A SPA rewrite, third-party map/control stack, global floating layout and list virtualization are deferred absent measured need. Preserve native detail URLs/no-JS content and transaction guards. Open validation items: user visual preference, long-session task switching, real-browser zoom/virtual-keyboard layouts, screen-reader behavior, acceptable comfortable-density/map width tradeoff, and exact keyboard shortcut scope. These become implementation research tasks, not silently resolved claims.
