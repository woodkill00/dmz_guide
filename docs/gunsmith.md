# Weapon armory and Gunsmith

Open [the local weapon armory](http://127.0.0.1:4173/armory/). It follows the game's weapon-list and Gunsmith arrangement while retaining the guide's source labels and private workbench.

Use the class buttons or Class selector and search to narrow the scrollable list. Selecting a weapon previews its base figure and launch ammunition/fire-rate reports. Open details enters that weapon's Gunsmith. Every row also has a native detail link that works without JavaScript.

The Gunsmith displays officially supported slots around the base weapon. Click a slot to filter and scroll to its reported compatible attachments. A supported slot without attachment data stays visible and filters to an empty list; that does not establish that the slot is unusable in game. Unknown damage/range/accuracy/mobility/handling values remain explicitly unknown rather than invented bars. Full official, community and patch evidence stays below the display.

Build this weapon opens a new unsaved draft in the existing [private workbench](armory-workbench.md). It does not save or replace a build automatically. Existing draft, failed-save, backup and conflict protection still applies.

## Local artwork

The source register contains 33 official base-weapon figures with exact URLs, hashes and crop geometry. Images remain in ignored `.local/weapon-art/`, never in Git, the static build or a release archive. Your two private screenshots remain layout references and are not copied into the project.

To populate artwork in another authorized local checkout, run:

```sh
npm run weapons:art
```

This explicit command contacts only fixed official image URLs, rejects redirects and changed hashes, bounds bytes/time/concurrency and retains existing accepted images when a new request fails. Review the register if the publisher replaces a figure. It runs neither on startup nor on builds.

The local guide server serves validated fixed-ID figures through `/local-weapon-art/{id}.webp`. Missing or invalid local files show an unavailable notice. A native fallback also handles early image failures before scripts load and no-JavaScript/static-only use. Static hosts do not acquire artwork automatically. Figures are 2D source illustrations; attachment selections do not modify the render or offer a simulated purchase, wallet, prestige, appearance or 3D rotation.

Original project styles and controls follow the supplied screenshots. Artwork retains publisher ownership and the session's existing local collection permission; no public distribution permission is asserted. See [asset policy](licensing-and-assets.md), [database source limits](weapon-database.md) and [feature050](../specs/050-gunsmith-design/spec.md).
