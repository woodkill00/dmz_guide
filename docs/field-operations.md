# Private field operations

Open **Prepare → Field desk** or `/field-desk/?pack=official%3Amw4-dmz-starter`. It uses the same saved profile as Inventory, Quick collect, Needed, Upgrades and Missions. No screen capture or account sync is enabled.

## Stash screenshots

Choose or paste PNG/JPEG/WebP images (up to 12, 10 MiB / 12 megapixels each). Recognition runs in the browser using bundled English OCR; images are not sent to an OCR service. Cropped, clear names and counts work best. Read every selected row, resolve ambiguous names and enter a counted total before **Preview selected counts → Confirm**. Manual text review is available too.

A scan replaces only selected item totals in the chosen compartment. It does not add the pictured amount, clear unseen items or infer a missing number. Overlapping rows for one item must be resolved rather than summed. Repeated imports are rejected using local fingerprints. After a reviewed reset of remembered screenshots you can deliberately reuse them. OCR is a suggestion, not an authoritative game-data feed; stylized icons without readable names need manual mapping.

## Prepare and return carried gear

Inventory continues to mean **FOB stash**. Search Stash & carried, enter a move quantity and preview Carry/Stash. Transfers conserve stock; unknown stash cannot be decremented. Return all carried is also reviewed. Carried stock does not satisfy FOB crafting/upgrade forecasts until moved back to stash. This does not change the separate X01 recipe reference.

## After a run

Stage extracted/crafted additions, lost/spent subtractions or counted totals, choosing stash or carried for each row. Preview the whole batch before saving. Repeated rows are folded in order. Record crafted outputs and consumed ingredients separately: the report does not execute crafting, award loot or mark a mission complete.

## Collection map plan

Choose either unfinished mission/upgrade shortages or want-to-build ingredients; these are separate allocations and are not added together. Only known positive shortages are offered. Send selected items to the local map at port5175, or download the plan and import it in map search. The receiving map requires acceptance before highlighting areas or creating a route.

Positions come from registered named map records. Unknown areas stay unplotted. A collection route uses existing route order, road routing and tracker controls; it is not a promise of loot, a shortest-route guarantee or a new road-data source. Reimporting the same waypoint set cannot create a duplicate route. The guide never sends inventory credentials, and the map never changes stash quantities.

## Discoveries and pictures

Save an item observation with date, place/location, container, quantity, notes and an optional photo. Edit or remove it after preview. These are private player reports, not verified spawn facts or public catalog edits. Uploaded pictures are re-encoded, bounded and stored separately in this browser; original uploads are not retained by this feature.

## History, undo and backups

History starts when enabled or at the first field operation, including later quantity saves from existing Inventory/Quick collect pages. It retains at most64 entries /1,200 changes. Undo restores affected quantities only if their current values still match the recorded result. It preserves the difference between not entered and zero, and refuses to overwrite conflicting later edits. It does not remove discoveries or scan receipts.

Use **Download complete backup** for the selected profile, carried stock, history, observations and their photo files. Ordinary profile JSON exports retain picture references only. Complete restore validates the profile and photos before a revision-bound confirmation. A newer save in another tab is preserved; failed edits remain staged/exportable. Storage is local to this origin/browser. Keep a downloaded backup before clearing browser data.

## Activision assessment — 2026-11-11

The owner signed in to Activision in an isolated Playwright browser for a read-only check. This did **not** link the guide to the account. Activision's [account guide](https://support.activision.com/articles/managing-your-activision-profile) explains platform linking and gameplay privacy settings and states that its APIs are available to Activision applications and approved partners; it does not supply this app with a documented DMZ stash authorization contract. The [unofficial JavaScript client](https://github.com/cod-api/javascript-client) documents session-cookie authentication, linked accounts, COD Points and store inventory, but does not establish a supported MW4 DMZ stash/backpack endpoint.

Two credential-free GET checks were made: the older `/api/apexrest/oshp/landingpage` returned404 HTML; `/api/papi-client/crm/cod/v2/accounts` returned200 JSON with application status `error`. HTTP200 alone is not account access. In the signed-in browser, the Activision landing page fetched an account profile endpoint successfully, but the visited Activision and Call of Duty pages made no observed MW4 DMZ stash, backpack, upgrade or mission requests. This is a limited observation of those pages, not proof that no such API exists. The owner's separate DevTools checks of older `accounts` and `identities` routes returned500 HTML and did not establish a usable data contract. No credentials, cookies, account identifiers, request bodies or response bodies were stored in this assessment. `node scripts/activision-availability.mjs` repeats only the fixed unauthenticated metadata checks; it is not a login tool. Supported authorization and a documented/readable DMZ inventory response are still required before live syncing can be implemented.
