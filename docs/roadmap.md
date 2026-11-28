# Product roadmap

Status: current implementation map, updated2026-11-28. The original scope remains [feature001](../specs/001-guide-foundation/spec.md). Shipped local capabilities do not imply verified complete-game coverage or a public launch.

| Area | Implemented locally | Remaining verification / work |
| --- | --- | --- |
| Guide and navigation | Search, linked reference directories, clickable site map, help and dashboard | Current route/journey coverage and content freshness; [sitewide workflows](sitewide-workflows.md) |
| Collection and progression | Inventory, demand calculations, Quick collect, build targets, upgrades and Orders | Validate source applicability and missing facts; [content quality](sitewide-workflows.md), [Orders](mission-directory.md) |
| Weapons | Unified acquisition/manuals, camos, attachments, builds and individual pages | Combat/source limits remain explicit; [weapons acceptance](../specs/108-unified-weapons/acceptance.md) |
| Maps | Unified Hajin/X01, floors, source layers, private POIs and Safe/Loot routes | Asset/source coverage and calibrated locations; [unified routes](unified-local-site.md) |
| Editing | Local repository Content Studio and contextual page editor | Public authorization/moderation is separate; [editing guide](content-studio.md) |
| Design and reliability | Shared compact cards/navigation, workflow helpers, merged feature111 journey/audit and CI work | [Feature112](../specs/112-content-verification/verification.md): source verification, corrected browser waits and touch/accessibility; physical Android/TalkBack pending |
| Personal data | Browser-local stores and existing export/import tools | **Last follow-up:** dedicated fresh-browser backup/recovery verification, explicitly deferred by owner |
| Public release/community | Contribution/security documentation and static packaging | Hosting, ownership, moderation, asset rights and launch approval remain open |

## Current delivery order

1. Preserve current player information privately in ignored local storage before edits; never commit it.
2. Feature111 is merged with its recorded CI and journey evidence. Feature112 now fills source-backed gaps, repairs current source adapters, isolates X01 interiors from Hajin, and adds touch/accessibility verification. See its [current receipt](../specs/112-content-verification/verification.md).
3. Finish physical Android/TalkBack acceptance and resolve the explicitly listed game-data uncertainties; desktop tests and source parity cannot replace these observations.
4. **Then, last:** dedicated backup/recovery acceptance in a separate follow-up, using copies/synthetic profiles before any owner-approved restore. Existing recovery tools are not being removed.

Maps, editing, progression/story and community remain part of the requested product. Optional offline downloads, accounts, cloud sync, bots and public services require separate assessment and approval.

## Decisions before launch

Owner: target game/build and first-release scope; hosting/domain/budget; named content and moderation owners; verified community destination. Content reviewers: record coverage and asset rights. Engineering/review: actual acceptance, security, accessibility, mobile and performance evidence.

Do not assign dates or claim “complete” until scope, capacity and evidence justify it. Track dependencies and unresolved decisions in each owning specification.
