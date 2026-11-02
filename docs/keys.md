# Hajin keys and private planning

Open [Keys](http://127.0.0.1:4173/keys/) or choose **More → Keys**. The current source snapshot contains **62 keys, 71 use locations and 21 map groups**. It preserves the original 18 Game8 records and two hospital supplements, then adds 42 distinct records from the DMZTracker index checked on 2026-11-02. These are source reports, not a verified complete current-game catalog.

Search names, aliases, places, grid labels, acquisition details, access requirements and your private notes. Multiple words narrow results together. Acquisition and map-location filters combine with **My view**: all, owned, recorded keys ready, missing, favorites or not opened before. Clear filters keeps your stash. Counts distinguish unique keys from use locations. Compact/comfortable density persists; small screens show labeled row cards and collapsible filters. Native grouped lists and detail links work without JavaScript.

## Record your stash

Use **− / Owned / +** in any row or detail page. Several locations for one key share the same stock. Expand **Uses and private notes** to record the optional total remaining uses across owned copies. Blank means unknown; zero means exhausted. Changing quantity resets the total to unknown. Favorites and **Opened before** are manual. Nothing reads the game or automatically consumes keys.

**What can I open?** checks the selected key and its exact recorded required access chain against your stash. Missing or exhausted types are shown. Unknown durability and access remain warnings; recorded keys ready is not a guaranteed accessible door. A possible relationship is not mandatory. Mill Explosives Lab has conflicting route reports and a reportedly unlocked door, so its key necessity remains unverified.

Private state uses a separate `dmz-keys-local` IndexedDB database. It does not change your inventory, missions, armory or map workspace. Browser storage is not a backup. Temporary-session and unsaved-draft messages explicitly mean changes are not durably saved.

## Plan a trip

Select **Add to trip** on up to 32 use locations. Open **Trip checklist** for ordered recorded prerequisites and a deduplicated list of key types. Check packed types manually; remove individual destinations or clear targets/packing checks. Clearing a trip retains stock, notes, favorites and opened history.

Counts describe selected use locations, not how many copies will be consumed. Other source-reported requirements and conflicting core counts remain visible; they are not combined into an invented total. Copy/download a packing list for reference; private notes are omitted. The checklist is separate from road routing and waypoint tracking.

## Back up and recover

Under **Backups and recovery**, export the private key backup periodically. Import first shows a replacement preview; review and Apply explicitly, or Cancel without changing saved data. A previous valid snapshot is also available. Valid historical IDs remain archived/exportable if later absent from the catalog; they are never rebound by name.

A two-tab conflict or storage failure retains your draft. Export it, then deliberately reload saved data before continuing. Invalid in-progress numbers pause saving/exporting until corrected. Internal navigation waits for saves; browser departure warns about unsaved work.

Corrupt saved data is never automatically reset. Export its recovery record, preview a valid backup or previous snapshot, then review Apply. Recovery atomically preserves the exact damaged record alongside earlier recovery history. The archive is bounded to eight records/16 MiB; invalid/full/oversized records fail closed and need manual recovery from exports. Recovery exports are evidence, not normal importable backups.

## Room facts and map links

Detail pages and expandable room panels separate acquisition, entrance, floor, possible loot, hazards and sources. Unknown facts stay unknown. The source-comparison panel accounts for all 60 DMZTracker rows: 42 new, 15 name matches, two grid conflicts and one unresolved identity. Existing grids are retained. Hospital Chemistry Lab remains an unresolved candidate, separate from the owner-confirmed Hospital Chemical Lab identity.

**Map F5** and similar links open the local companion at port 5175 and highlight the calibrated tactical grid area. Door positions are not verified. Grid ranges offer individual cells; unknown grids have no invented pin. Start `npm run map:dev` if the companion is not running. Dismiss the highlighted area when finished. Links carry only public key names/grid references, never private notes or stock.

The owner confirmed on 2026-11-02 that Hospital Chemical Lab is required to reach Hospital Chemical Lockers at Mirae General Hospital. This is **player-reported**, with its statement/date separate from website context. Lab→locker ordering and reverse links preserve that distinction. Two additional community-reported entry chains remain source-labeled; keys merely found inside another room do not create access dependencies.

## Local images and source maintenance

The original 18 Game8 keys retain local item icons and access collages, credited to Game8/Activision. Other keys use a generic icon; no new artwork was collected. Original bytes stay in ignored `.local/key-images/`, never Git or static releases. If missing, safe placeholders and source links remain.

`npm run keys:images` explicitly restores only registered Game8 images (36 mapped files, five shared icon source URLs). Fixed URLs, size/deadline limits, hashes and decoded dimensions bind reviewed assets; changed bytes fail rather than silently replace. Normal builds/readers/tests never scrape providers. A source update requires factual review, including conflicts and identities; no automatic key refresh is claimed.

Catalog files: `src/ui/keys.json`, `key-supplemental.json`, `key-access.json` and `key-room-details.json`. Source snapshots and original screenshots stay local. Collection permission covers local import; public redistribution of provider artwork is not implied.
