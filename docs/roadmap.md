# Product roadmap

Status: current implementation map, updated2026-11-27. The original scope remains [feature001](../specs/001-guide-foundation/spec.md). Shipped local capabilities do not imply verified complete-game coverage or a public launch.

| Area | Implemented locally | Remaining verification / work |
| --- | --- | --- |
| Guide and navigation | Search, linked reference directories, clickable site map, help and dashboard | Current route/journey coverage and content freshness; [sitewide workflows](sitewide-workflows.md) |
| Collection and progression | Inventory, demand calculations, Quick collect, build targets, upgrades and Orders | Validate source applicability and missing facts; [content quality](sitewide-workflows.md), [Orders](mission-directory.md) |
| Weapons | Unified acquisition/manuals, camos, attachments, builds and individual pages | Combat/source limits remain explicit; [weapons acceptance](../specs/108-unified-weapons/acceptance.md) |
| Maps | Unified Hajin/X01, floors, source layers, private POIs and Safe/Loot routes | Asset/source coverage and calibrated locations; [unified routes](unified-local-site.md) |
| Editing | Local repository Content Studio and contextual page editor | Public authorization/moderation is separate; [editing guide](content-studio.md) |
| Design and reliability | Shared compact cards/navigation and feature109 acceptance; twelve feature110 workflow helpers | [Feature111](../specs/111-site-reliability/spec.md): current journey/layout/content audits and separate CI budgets |
| Personal data | Browser-local stores and existing export/import tools | **Last follow-up:** dedicated fresh-browser backup/recovery verification, explicitly deferred by owner |
| Public release/community | Contribution/security documentation and static packaging | Hosting, ownership, moderation, asset rights and launch approval remain open |

## Current delivery order

1. Preserve current player information privately in ignored local storage before edits; never commit it.
2. Feature111: reconcile documentation, audit five core journey families and compact layouts, report actionable content gaps, repair confirmed failures, and separate long CI suites without reducing coverage.
3. Complete independent implementation/visual review and record exact executed checks; do not treat planned tests as passes.
4. **Then, last:** dedicated backup/recovery acceptance in a separate follow-up, using copies/synthetic profiles before any owner-approved restore. Existing recovery tools are not being removed.

Maps, editing, progression/story and community remain part of the requested product. Optional offline downloads, accounts, cloud sync, bots and public services require separate assessment and approval.

## Decisions before launch

Owner: target game/build and first-release scope; hosting/domain/budget; named content and moderation owners; verified community destination. Content reviewers: record coverage and asset rights. Engineering/review: actual acceptance, security, accessibility, mobile and performance evidence.

Do not assign dates or claim “complete” until scope, capacity and evidence justify it. Track dependencies and unresolved decisions in each owning specification.
