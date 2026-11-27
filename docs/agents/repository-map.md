# Current repository map

The static guide is built by [build.mjs](../../scripts/build.mjs) and served by [serve.mjs](../../scripts/serve.mjs). [local.mjs](../../scripts/local.mjs) owns unified local startup. The [optional map workspace](../local-map-workspace.md) lives in tools/hajin-map; public paths use the [unified server](../unified-local-site.md). Inspect current package.json scripts instead of caching a second command registry.

| Concern | Actual owners and entry points |
| --- | --- |
| Content identities/validation | src/content; scripts/catalog.mjs; content docs |
| Calculations and demand | src/domain/collection-needs.mjs, upgrade-needs.mjs, inventory-stock.mjs |
| Durable player state | src/storage; owning store contracts and recovery tests |
| Shared item cards | src/ui/item-card.mjs and item-card.css |
| Weapon cards/progress | src/domain/weapon-picker.mjs, src/ui/weapon-picker-view.mjs, src/client/weapon-picker.mjs |
| Dashboard | src/domain/dashboard.mjs, src/client/dashboard.mjs, dashboard-weapons.mjs |
| Guide map routes | src/domain/map-routes.mjs; tools/hajin-map for interactive workspace |
| Authoring | scripts/author.mjs; docs/content-studio.md |
| Repository contracts | scripts/check.py and tests/test_*.py |
| Browser lifecycles | tests/browser/health.mjs, server.mjs; scripts/server-readiness.mjs |
| CI | .github/workflows/quality.yml and the map/diagnostic workflows |

[Foundation 001](../../specs/001-guide-foundation/spec.md) and the [decision register](../adr/decisions.md) include proposed planning baselines. They must not be mistaken for proof that a proposed framework or feature shipped. Use the owning implementation artifacts, current source and actual acceptance evidence. Do not rewrite approved history to make it look current.
