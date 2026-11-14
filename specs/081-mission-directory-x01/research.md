# Source and code research

- [COD Central Orders](https://codcentral.net/blog/mw4-dmz-orders/) reports a Hajin 24-page sequence and five X01 pages, with three Orders per X01 page. Chapter choice can change Hajin page positions. Checked 2026-11-14.
- [DMZ Codex X01 guide](https://dmzcodex.com/guides/x01-orders-guide/) independently lists the five X01 page rosters and key tasks. Its in-game applicability remains unverified here. Checked 2026-11-14.
- [DMZTracker mission tracker](https://dmztracker.com/missions/) corroborates many X01 tasks but has incomplete or unconfirmed names for later pages; use COD Central and DMZ Codex for names, retain conflicts as gaps. Checked 2026-11-14.
- Feature080 source review has 66 reported Hajin identities, seven fixed rosters and a reported sequence for other chapter pages. Existing `orderPage` represents fixed Hajin placement. An explicit `orderSet` is needed to prevent X01 pages 1–5 colliding with Hajin pages 1–5.
- `/objectives/<id>/` and Content Studio exact-ID edit routes already exist. `/missions/` currently renders a progress table and only a partial Hajin coverage strip; the audit uses `page:hajin-launch` IDs in local storage. Preserve those IDs.
