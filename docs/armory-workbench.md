# Armory workbench

Open [the local workbench](http://127.0.0.1:4173/armory/workbench/) from the main navigation or weapon database.

## Compare and build

Choose two to four weapons. Official launch fields, community Multiplayer measurements and your DMZ observations have separate views. Unknown values stay unknown; incompatible units are not converted. Private comparison requires explicitly choosing observations with matching metric, unit, build, date, target, armor, range, method, firing mode and loadout context. It does not average experiments or declare an automatic winner.

The builder offers reported compatible attachments by slot, up to five standard attachments plus one Apex. Remove blocked-slot conflicts explicitly. Advice explains individual reported benefits and tradeoffs with source context; it does not predict combined stats or TTK. Save, load/rename, delete or export a build. Shared JSON imports first show a preview and become unsaved drafts; save to retain them.

## Evidence and acquisition

Record measurements with their full testing context. Optional PNG, JPEG and WebP screenshots are decoded, resized and re-encoded locally to remove original metadata. SVG and remote image URLs are rejected. Entries remain user-reported, including repeated experiments; they never automatically become verified publisher facts.

Track manuals, compatible owned attachments and named blueprints per weapon. Reference links include only public MW4 DMZ records. Missing evidence is stated explicitly; a name match does not establish a drop location or unlock rule. Spoiler records and indirect secret mentions are excluded.

## Storage and recovery

Private data lives in this browser origin's separate `dmz-armory-local` IndexedDB database. It is not uploaded or written into repository content. Existing inventory and progression profiles are unchanged. Another browser, port or cleared site data has a different workspace.

Export backups regularly. Limits are 100 builds, 100 observations, 256 acquisition entries, 12 MiB total and 8 MiB total images (2 MiB per image). Restore validates structure, decoded pixels and hashes before preview. Cancel or a new selection invalidates older reads. Apply uses the revision captured before preparation; a newer save from another tab conflicts instead of being overwritten.

Failed saves retain their candidate for export or retry and block unrelated mutations. Reload explicitly discards drafts after confirmation. Previous snapshots can be previewed before restoration. Removed catalog IDs remain exportable archives. Unload warnings are supplementary; save or export to retain work reliably.

## Update dashboard

Run `npm run weapons:manage` in the repository, then open [the local dashboard](http://127.0.0.1:4176/). Opening reads status only. Check stages an official patch proposal. Inspect source links, scope, warnings and changes, then tick the review checkbox before Apply. Apply binds to the exact proposal hash and updates the patch ledger, not baseline DMZ measurements. Rebuild pages and reload the reader afterward.

Rollback requires explicit review of the current revision and retains the replaced state as backup. Interrupted rollback retains a candidate and journal for explicit recovery. Owner edits conflict instead of being overwritten. The service never takes over an existing writer lock; inspect stale locks only after verifying no updater is running. Status, proposals and backups stay ignored by Git.

The service binds to loopback with same-origin and session-token checks. It exposes fixed actions, not arbitrary commands, paths or URLs. Sessions expire after 12 hours; restart and reload. Checks are manual, bounded and dependent on publisher layouts; future layouts may require parser maintenance. No schedule is installed.

See [database source limits](weapon-database.md) and [feature049 acceptance](../specs/049-armory-workbench/acceptance.md).
