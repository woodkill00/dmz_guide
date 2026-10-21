# DMZ Guide

A community field guide being built around trustworthy game data and explainable “what should I collect next?” planning.

**Status: runnable guide foundation under review; broader roadmap implementation continues.** Run `npm ci && npm run build && npm start` with Node22+. No public deployment, complete verified game catalog or supported final release is claimed. See [quickstart](docs/quickstart.md) and [003 evidence](specs/003-runnable-guide/acceptance.md).

## Start here

- **Building the project?** Follow the [developer quickstart](docs/quickstart.md), then the [first-feature tutorial](docs/tutorials/first-feature.md).
- **Reporting a wrong fact or contributing a guide?** Start with [contributing](CONTRIBUTING.md) and the [content guide](docs/content-contributing.md). Coding is not required to submit evidence.
- **Understanding the direction?** Read the [roadmap](docs/roadmap.md), [decision summary](decision-summary.md), and [foundation specification](specs/001-guide-foundation/spec.md).
- **Maintaining the repository?** Read the [maintainer runbook](docs/maintainer-runbook.md) and [Spec Kit lifecycle](docs/spec-kit-cycle.md).
- **Looking for something else?** Browse the [documentation index](docs/README.md).

## Planned experience

Find items and recipes, track local inventory and goals, explain shortages without double-counting, edit and transfer validated content packs, and explore useful map/list views. Progression, story guides and community corrections remain part of the roadmap. Accounts, bots and cloud sync are not prerequisites for the core guide.

Public content and private player state must stay separate. Unknown game facts remain visibly unknown. Synthetic test data is not a production catalog. Original or licensed assets only; private reference screenshots are not distributed.

## How changes happen

Every change follows the [constitution](.specify/memory/constitution.md) and an applicable Spec Kit process. Production features use specify → clarify → plan → checklist → tasks → analyze → implement → converge. Repairs use the evidence-led bug workflow; documentation and content edits use bounded, traceable changes. Review and actual test evidence are required before completion claims.

Spec Kit is pinned to **v1.2.2** (commit `74be0a63e93c7087c5b06556b7561810d8f78a45`). Agent skills run inside Codex chat, not your terminal. A Git branch does not select the active feature.

## Before a public product launch

The owner must settle release scope, target game/build, hosting and community ownership. Game facts and asset rights need verification. Application behavior, accessibility, mobile journeys, imports and recovery need implementation and measured tests.

Original project code is licensed under [MIT](LICENSE). Game artwork, maps, third-party data and assets are not relicensed by that grant. Upstream tooling retains its own notices. See [licensing and asset rights](docs/licensing-and-assets.md).

This is an independent community project, not an official game service. No affiliation or endorsement is claimed.
