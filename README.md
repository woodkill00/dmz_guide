# DMZ Guide

A community field guide being built around trustworthy game data and explainable “what should I collect next?” planning.

**Status: the runnable multipage feature set passed independent integrated review and hosted browser validation at [`93ad1f5`](https://github.com/woodkill00/dmz_guide/tree/93ad1f54027d103aed1bd94433ece18e29d68727).** The baseline is merged on main at `159a922` with successful exact-main CI. Repository Content Studio is being developed separately; see its current acceptance status before treating it as released. See [final acceptance evidence](specs/008-community-release/acceptance.md). With Node22+, run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:4173. No public deployment or complete verified game catalog is claimed. See the [run and content-editing guide](docs/release.md) and [quickstart](docs/quickstart.md).

## Start here

- **Building the project?** Follow the [developer quickstart](docs/quickstart.md), then the [first-feature tutorial](docs/tutorials/first-feature.md).
- **Editing repository JSON and media?** See the [Content Studio guide](docs/content-studio.md) and its explicit local-only scope.
- **Reporting a wrong fact or contributing a guide?** Start with [contributing](CONTRIBUTING.md) and the [content guide](docs/content-contributing.md). Coding is not required to submit evidence.
- **Understanding the direction?** Read the [roadmap](docs/roadmap.md), [decision summary](decision-summary.md), and [foundation specification](specs/001-guide-foundation/spec.md).
- **Maintaining the repository?** Read the [maintainer runbook](docs/maintainer-runbook.md) and [Spec Kit lifecycle](docs/spec-kit-cycle.md).
- **Looking for something else?** Browse the [documentation index](docs/README.md).

## Current implementation and boundaries

- Native searchable catalog/detail routes, typed weapon stats, recipes and guides.
- Shared single/multi-goal planning with reserves, prerequisites, retained tools, now/later shortages and executable-now trials.
- Private local inventory/progress with explicit backup, restore, version rebind and retained-snapshot recovery.
- Guided all-entity editing, searchable reference pickers and portable PNG/JPEG/WebP picture packs. New private records have real generic detail routes immediately.
- Accessible map/list views, floors/source/version filters and goal-to-location relevance. Real unknown coordinates stay unplotted; fictional schematic is explicitly opt-in.
- Separate DMZ Orders/upgrades and campaign progression, spoiler controls and local correction/review export.
- Optional Discord configuration is unset. No login, bot, public moderation service, sync, PWA installation or paid hosting is simulated.

The source-backed starter has **19 items/weapon identities, 6 recipes, 1 disputed objective, 6 guides, 1 map, 13 locations and 2 conflict claims**. This is a small starter, not a complete verified current-build catalog. Unknown weapon numbers are not zero, and source-supported identity never certifies every stat.

Public content and private player state stay separate. Only original or explicitly licensed assets may be distributed; private screenshots and profile backups must never enter public history. Local operation needs the server running. Browser storage is not a backup.

## How changes happen

Every change follows the [constitution](.specify/memory/constitution.md) and an applicable Spec Kit process. Production features use specify → clarify → plan → checklist → tasks → analyze → implement → converge. Repairs use the evidence-led bug workflow; documentation and content edits use bounded, traceable changes. Review and actual test evidence are required before completion claims.

Spec Kit is pinned to **v1.2.2** (commit `74be0a63e93c7087c5b06556b7561810d8f78a45`). Agent skills run inside Codex chat, not your terminal. A Git branch does not select the active feature.

## Before a public product launch

The owner must settle release scope, target game/build, hosting and community ownership. Game facts and asset rights need verification. The tested branch has exact-head integrated browser/visual evidence and review; The baseline merge passed exact-main CI; any public launch remains a separate gate. Physical devices and formal WCAG certification are not implied by automated tests.

Original project code is licensed under [MIT](LICENSE). Game artwork, maps, third-party data and assets are not relicensed by that grant. Upstream tooling retains its own notices. See [licensing and asset rights](docs/licensing-and-assets.md).

This is an independent community project, not an official game service. No affiliation or endorsement is claimed.
