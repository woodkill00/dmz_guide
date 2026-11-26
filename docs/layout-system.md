# Shared layout and usability system

The guide, map companions, content Studio and weapon manager share `src/ui/layout-tokens.css`. Page controllers remain responsible for saved inventory, Orders, upgrades, weapons and map state.

## Using the layout controls

- **Hide menu / Show menu** collapses the shared navigation. Its reopen control stays visible, including on the map. The choice is remembered locally.
- **Reset layout** restores navigation and the existing map-menu position/side-pane width preferences. It does not reset inventory or progression.
- **Reset dashboard** resets the dashboard arrangement through its existing owner. This separate label distinguishes it from the shared menu reset.
- **Compact density** remains under the existing workspace controls; the same saved density drives the shared spacing factor. Compact density preserves usable action targets.
- Map panels keep their original pointer and keyboard resizing controls. Home/End and arrow keys adjust the side pane. Narrow layouts retract controls without discarding the preferred desktop width.
- Long marker notes scroll inside the existing detail owner. Popup placement reserves actual toolbar and wrapped attribution geometry; selection and camera owners are unchanged.

Layout preferences belong to this browser and origin. The feature's preference is `dmz-layout-109`, version1; existing map placement/width preferences retain their own owners. Invalid preferences remain unchanged until explicit Reset; blocked storage changes the current page only. Export progression through the existing backup system rather than treating layout preferences as a profile backup.

## Extending components

Use semantic spacing/type/radius tokens for controls and text; use CSS Grid/flex, minmax, clamp and calc to express available space. Shared space tokens derive from the base unit and density. Use the measured `--ui-top-offset` and `--ui-visible-block` for available panel height. Do not cap away occupied header pixels to manufacture space.

Keep intrinsic artwork, SVG/world coordinates, hairline borders and minimum physical action sizes explicit where appropriate. `layout-exceptions.json` lists retained source declarations; do not wrap a fixed dimension in a meaningless calc just to satisfy a check. New or changed retained primitives require geometry evidence and review.

Keep item artwork/name/count/status in the existing `item-card` variants. Tiny missing-art slots use a simple symbol and tooltip instead of clipping a second text label. Full item names and available provenance remain on the owning card/detail view.

Do not duplicate a persistence controller, use a layout event to replay a write, replace a dirty form during resize, or force navigation as part of routine inspection. Use existing save/retry/verify/recovery owners. Close RAF/observer/event subscriptions when disposing a mount.

## Verification

Run guide/map builds before browser checks. `npm run ui:audit` validates route ownership, exact dimension exceptions and the selected CSS budget; it also runs in quality CI. It requires the map toolchain installed by `npm run map:install`.

`npm run test:ui:sitewide` uses an owned server unless `DMZ_SITE_URL` is supplied. The component, service, feature-entry and performance scripts under `tests/browser/usability109-*.mjs` use disposable browser data; the service fixture uses a temporary repository, not the owner's working files. Production behavioral checks retain CSP. Axe injection bypass is limited to the inert component reference fixture.

The performance comparison uses the committed baseline record in `specs/109-sitewide-usability-design/layout-dom-baseline.json`. Keep the baseline and fixture identity stable when comparing changes. Source CSS byte growth is a regression budget, not an assertion of rendering speed.

`implementation.md` and reviewer-owned `review.md` / `visual-review.md` in the feature directory record executed checks and limits. Physical mobile keyboard/toolbars and real-device verification must be recorded separately before claiming physical-device support.
