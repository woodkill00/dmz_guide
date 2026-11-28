# DMZ Guide

A community field guide being built around trustworthy game data and explainable “what should I collect next?” planning.

**Status: runnable local guide, tracking dashboard, unified maps and repository editing tools.** With Node22.x or24.x, install dependencies using `npm ci` and `npm run map:install`, then run `npm run local` for the guide and maps at one address. Repository editing is optional: `npm run author`. No public deployment or complete verified game catalog is claimed. See the [quickstart](docs/quickstart.md), [unified local service](docs/unified-local-site.md) and [current reliability work](docs/reliability.md).

## Current product and historical evidence

The current site includes a progress dashboard; inventory, needed items and quick collection; upgrades and Hajin/X01 Orders; a unified weapon workspace with manuals/camos; keys, recipes and contextual editing; and Hajin, X01, Safe Run and Loot Run maps. Guide/maps use the unified service. Standalone map development and the authoring tool remain separate optional processes.

Historical milestones retain their exact evidence: [baseline guide](specs/008-community-release/acceptance.md), [Content Studio](specs/009-repository-content-studio/acceptance.md), [catalog/navigation](specs/033-navigation-item-directory/acceptance.md), [unified weapons](specs/108-unified-weapons/acceptance.md), [sitewide design](specs/109-sitewide-usability-design/acceptance.md) and [agent workflows](specs/110-agent-workflow-quality/verification.md). A past passing run is not a test of a later revision. See the [roadmap](docs/roadmap.md) for current capabilities and remaining acceptance work.

## Start here

- **Guide and maps at one local address:** run `npm run local`, then open http://127.0.0.1:4173/. Hajin, X01, Safe Run and Loot Run use `/map/` routes on that same server. See [unified local startup and saved-data transfer](docs/unified-local-site.md). The standalone viewer below remains available for development and old-data recovery.

- **Using the optional local Hajin viewer?** See the [local map workspace](docs/local-map-workspace.md). Run `npm run map:install`, then `npm run map:dev`. It retains the separate interactive key/source-layer viewer without replacing the native guide; downloaded game assets are not bundled.

- **Reading or editing content?** Use the short [reader/author quickstart](docs/quickstart.md); it explains private browser editing versus repository files.

- **Building the project?** Follow the [developer quickstart](docs/developer-quickstart.md), then the [first-feature tutorial](docs/tutorials/first-feature.md).
- **Editing repository JSON and media?** See the [Content Studio guide](docs/content-studio.md) and its explicit local-only scope.
- **Reporting a wrong fact or contributing a guide?** Start with [contributing](CONTRIBUTING.md) and the [content guide](docs/content-contributing.md). Coding is not required to submit evidence.
- **Understanding the direction?** Read the [roadmap](docs/roadmap.md), [decision summary](decision-summary.md), and [foundation specification](specs/001-guide-foundation/spec.md).
- **Reviewing or editing missions?** Open the [mission directory and editing guide](docs/mission-directory.md) for Hajin/X01 page lists, individual records and audit links.
- **Maintaining the repository?** Read the [maintainer runbook](docs/maintainer-runbook.md) and [Spec Kit lifecycle](docs/spec-kit-cycle.md).
- **Reviewing the delivered improvements?** See the [roundtable delivery ledger](docs/roundtable-delivery.md) for accepted workpackages, exact test and merge evidence, conditional decisions and documented limits.
- **Looking for something else?** Browse the [documentation index](docs/README.md).

## Current implementation and boundaries

- Contextual edit and image actions on every public content detail lead to explicit local Studio startup; saved local previews open the exact record directly. Location records support primary/additional pictures too.
- Opt-in local Content Studio saves guided records, sourced weapon stats and categorized pictures directly to the checkout, with saved previews, conflict recovery and manual Git review.
- Native searchable catalog/detail routes, typed weapon stats, recipes and guides.
- Shared single/multi-goal planning with reserves, prerequisites, retained tools, now/later shortages and executable-now trials.
- Private local inventory/progress with explicit backup, restore, version rebind and retained-snapshot recovery.
- Guided all-entity editing, searchable reference pickers and portable PNG/JPEG/WebP picture packs. New private records have real generic detail routes immediately.
- Accessible map/list views, floors/source/version filters and goal-to-location relevance. Real unknown coordinates stay unplotted; fictional schematic is explicitly opt-in.
- Separate DMZ Orders/upgrades and campaign progression, spoiler controls and local correction/review export.
- Optional Discord configuration is unset. No login, bot, public moderation service, sync, PWA installation or paid hosting is simulated.

Catalog counts change as attributed records are reviewed. Run `npm run audit:content` for a current scoped inventory and exact gap links, or open `/quality/` and `/missions/audit/`. Those checks cover repository records, not everything in the game. Unknown weapon numbers are not zero, and a source-supported identity never certifies every stat.

Public content and private player state stay separate. Only original or explicitly licensed assets may be distributed; private screenshots and profile backups must never enter public history. Local operation needs the server running. Browser storage is not a backup.

## How changes happen

Every change follows the [constitution](.specify/memory/constitution.md) and an applicable Spec Kit process. Production features use specify → clarify → plan → checklist → tasks → analyze → implement → converge. Repairs use the evidence-led bug workflow; documentation and content edits use bounded, traceable changes. Review and actual test evidence are required before completion claims.

Spec Kit is pinned to **v1.2.2** (commit `74be0a63e93c7087c5b06556b7561810d8f78a45`). Agent skills run inside Codex chat, not your terminal. A Git branch does not select the active feature.

## Before a public product launch

The owner must settle release scope, target game/build, hosting and community ownership. Game facts and asset rights need verification. The guide and Content Studio have exact-head integrated browser/visual evidence and independent review; exact-main results are recorded in their acceptance files. Any public launch remains a separate gate. Physical devices and formal WCAG certification are not implied by automated tests.

Original project code is licensed under [MIT](LICENSE). Game artwork, maps, third-party data and assets are not relicensed by that grant. Upstream tooling retains its own notices. See [licensing and asset rights](docs/licensing-and-assets.md).

This is an independent community project, not an official game service. No affiliation or endorsement is claimed.

## Local home dashboard and navigation

Home is the progress dashboard. Current primary navigation uses Home, Map, Track, Orders, Reference, Manage and Search; labels and destinations live in `src/ui/feature-registry.mjs`. Tracker tabs connect Inventory, Items, Weapons, Upgrades, Needed, Quick collect and Field desk. See [Home and navigation](docs/home-navigation.md) for supporting behavior and [unified local routes](docs/unified-local-site.md) for current map destinations.

The [visual site map and link audit](docs/site-map.md) now provide a generated inventory of every built page and companion destination, with searchable branches, connection inspection, named controls and reproducible local menu/tab checks.

Private [Field operations](docs/field-operations.md) adds reviewed local screenshot OCR, separate carried stock, run reports, quantity history/guarded undo, collection-map handoff, and item discoveries with complete photo backups. Screen capture is excluded. No Activision account is linked and no DMZ inventory API is confirmed.
