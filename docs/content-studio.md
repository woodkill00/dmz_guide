# Repository Content Studio

The Content Studio is an explicitly started, local contributor tool. It saves public game content into this Git checkout. It is separate from the normal reader and its private browser editor. Studio defaults to the guide’s dark palette; the accessible Light mode/Dark mode button remembers only a theme preference, without opening player profiles.

The static ZIP is reader-only and does not include the author server. Clone the source repository to use the instructions below.

## Run locally

Use Node.js 22 or newer from its official distribution. In the repository:

```sh
npm ci
npm run author
```

No `npm run build` is needed before authoring: Studio runs directly from source. Open the exact `http://127.0.0.1:4174` address printed by the command. Keep the terminal running. The author server binds only loopback and does not honor `HOST`; do not expose it through a tunnel, reverse proxy or shared network. The repository must be a local writable checkout. Network and cloud-synchronized folders are outside the tested recovery guarantee.

Normal reading is unchanged:

```sh
npm run build
npm start
```

Open `http://127.0.0.1:4173`. That server and the static ZIP have no authoring write API. The portable browser editor remains private: its Save does not modify the repository. Content Studio is the tool for files you intend to share through Git.

## Windows first-use checklist

1. Use the source checkout, not the earlier static ZIP. In Windows Terminal, open the folder containing `package.json`. If this is an existing checkout, review `git status`, preserve unrelated local edits, then switch to `main` and pull its current changes using your usual Git workflow. If cloning for the first time, clone `https://github.com/woodkill00/dmz_guide.git` and enter the new `dmz_guide` folder.
2. Check `node --version` reports 22 or newer. Run `npm ci`, then `npm run author`. If PowerShell blocks the npm script wrapper, use `npm.cmd ci` and `npm.cmd run author`; do not change execution policy for this app.
3. Open the exact printed local address in Chrome, Firefox or Edge. Leave the terminal open while editing. Stop it with Ctrl+C when finished.
4. Add a catalog/record, attach an original rights-cleared picture, then review and Save to repository. Use View saved preview immediately; no build is required for that preview.
5. Run `npm run build` and `npm start` when you want the normal public reader updated. Review the changed source JSON/media in Git, commit only intended public files and publish through your normal pull-request workflow. Studio does not perform those Git actions.

The checked-in starter migration is already complete in this feature. A new pull/clone receives canonical files directly and must not re-run migration just to start Studio. Preserve and review any older custom whole-pack content separately; the portable import preview can bring compatible packs into a selected catalog without creating competing editable source trees.

## Edit directly from a record page

Every public item (including weapon), recipe, objective, guide, map and location detail now has **Edit this item/record** and **Add/change image** actions beside its heading. On the read-only website these open a record-specific startup page, not a public editor. Start `npm run author` in your current source checkout, then explicitly choose **Open this record in local Content Studio** or **Open picture controls in local Content Studio**. The link uses `http://127.0.0.1:4174`; it never probes or starts a local server automatically. If it fails to open, check that your terminal still has the author server running. For `npm run author -- --port 4175` or another port, expand the custom-port instructions and append the displayed exact destination to the printed address.

The destination contains both the catalog key and immutable catalog ID plus the record's stable ID. Renaming the record does not break its link. Missing, mismatched, duplicate or invalid targets are rejected rather than silently editing the first record. Update an older checkout or open Studio without a query to choose a record manually. No arbitrary return address is accepted.

In a saved local preview, both actions open Studio directly on the same local server. The image action focuses the upload control without opening your file chooser. The **Opened from this record** banner gives its original stable identity and **Return to saved record** link; it continues to refer to the entry record if you manually select another record. The usual **View saved preview** link follows your current selection. Returning shows saved source only, not unsaved fields or a prepared image.

All six public record groups support a primary image and up to eight additional images. Choosing **Primary picture** replaces only this record's attachment, not the old image bytes or other records that use them. Choose **Add additional picture** to retain the primary, or use an existing library picture. Rights, privacy, image-size and usage checks still apply. Cancel a prepared image to abandon it; otherwise attach it before previewing or saving other fields. Leaving with unsaved fields or a prepared picture warns about losing work. No navigation or cancellation saves files automatically.

Sources, claims and asset metadata are supporting Studio records, not public detail pages. Their saved previews offer ordinary editing, not unsupported picture attachments.

## Add a record and its pictures

1. Select a catalog, or create a new one. A stable ID is generated from its title; advanced users can override it before first save. Record identity is not a display name and should stay stable after references exist.
2. Choose the entity type, enter a name/title and fill the guided fields. Weapons are items with weapon-specific typed statistics; unknown numbers remain unknown, not zero. Numeric facts need their own evidence, scope and measurement context.
3. Use searchable reference controls for recipe inputs/outputs, prerequisites, locations, evidence and other links. Advanced JSON is an alternative editing view, not a validation bypass.
4. Choose or drop a PNG, JPEG or WebP file. Preview it, optionally crop with the numeric controls and choose the maximum output dimension. New uploads are decoded and re-encoded as PNG, preserving alpha. PNG can be larger than the original photo: the interface shows actual output bytes and dimensions, not a promise of compression savings. Choose a smaller output if necessary.
5. Record the rights holder, license, attribution and source. Confirm that distribution is allowed and that the picture does not expose personal information. These declarations are your responsibility, not automatic proof of rights. Screenshots are not automatically authorized for public redistribution.
6. Choose primary or additional pictures. A thumbnail is an optional separate asset with its own stable identity. The media library shows usage; referenced records/assets cannot be silently deleted.
7. Review validation and click Save to repository. Choosing a file, applying a crop, importing into a draft or leaving a field never publishes changes by itself.
8. Select View saved preview to inspect the saved record, its pictures and references immediately. The preview identifies its saved content version and revision. Reload it after another save; unsaved edits and Cancel do not change it. This author-local preview never builds or publishes the public site.

## Files and single source of truth

Canonical content is under `content/catalog/`:

- `manifest.json` lists catalogs explicitly.
- `<catalog>/pack.json` holds catalog metadata and ordered record IDs.
- `<catalog>/items/`, `weapons/`, `recipes/`, `objectives/`, `guides/`, `maps/`, `locations/`, `sources/` and `claims/` contain per-record JSON.
- `<catalog>/assets/` contains asset metadata and generated source references.
- `media/<catalog>/<category>/<stable-asset-id>/` contains actual image files, not base64 strings. Media paths and asset IDs are generated automatically.

Public runtime packs are generated into ignored `dist/`. Do not edit those generated packs or recreate a second editable `content/packs` tree. The compiler preserves runtime pack version 1 and ordered IDs so existing routes and references remain stable.

The checked-in starter is migrated explicitly from its former whole-pack layout. Migration validates ordered semantic equality, media bytes and provenance before retiring legacy files. It is not performed silently at build or author startup. Run `npm run catalog:migrate` for a preview and `npm run catalog:migrate -- --apply` to apply only after reviewing that preview. Current migrated checkouts do not need migration again.

## Safe save, conflicts and recovery

Only one Studio writer owns a repository transaction at a time. Saves compare the current source revision with the draft revision, validate the full affected pack and references, stage known old/new bytes and write through a recovery journal. Private profiles, inventory, goals and browser backups are not accepted as catalog data.

If another tab or an external editor changes the files, a stale save is refused. Keep or download the unsaved draft before explicitly reloading/discarding it. A lost response does not establish whether a save happened: check the returned/current revision rather than blindly overwriting again.

Interrupted saves leave ignored `.author-state/` recovery material. Do not commit it or delete/edit pending recovery material. Completed backup storage is handled separately below. Author startup refuses to continue a pending transaction silently. Close the old author process and run `npm run author:recover` for a preview; use `npm run author:recover -- --apply` only after reviewing the reported known transaction. A live or unverifiable lock owner is not discarded because it is old. A file whose bytes differ from both the recorded before and after versions blocks recovery for manual review.

Filesystem guarantees have limits. Portable Node filesystems do not provide atomic compare-and-swap against an unrelated editor between the final check and rename. Avoid concurrent external edits while saving. Before bytes are retained, but no universal guarantee is made against malicious local programs, hardware failure or power loss. Operating-system/filesystem durability and Windows sharing restrictions can differ; failures must remain visible and recoverable rather than being reported as success.

## Retained completed backups

The 64 MiB transaction limit is not a lifetime storage quota. Completed before/after backups remain in `.author-state/transactions/`, so repeated large saves can grow disk usage without a fixed total limit. There is no automatic pruning or destructive cleanup API. The Git review scans at most 1,000 completed receipts and 8 MiB of receipt bytes; it reports truncation when history exceeds these bounds. Your usual Git client remains the complete working-tree review.

To archive completed backups safely:
1. Stop every author and migration process. Run `npm run author:recover` and proceed only when its preview reports `pending: false` and `lock: null`. If either differs, resolve recovery first; never infer safety from an old timestamp.
2. Consider only a regular, non-symlink transaction directory named with exactly 32 lowercase hexadecimal characters. Its regular `outcome.json` must say `state: "committed"`, have the matching `transactionId`, and contain valid managed public paths and hashes. If you cannot verify these conditions, retain it and ask for help. Missing/invalid outcomes, rolled-back/incomplete transactions, symlinks, `journal.json` and `current.lock` are not eligible for this procedure.
3. Move that whole eligible directory to a unique, user-chosen backup location outside the checkout, without replacing existing files. Preserve every file. Recreate its original transaction directory and copy back only the unchanged regular `outcome.json`; verify those receipt bytes exactly match the archived copy before restarting Studio. Keeping the receipt preserves managed deleted-path history, within the scan limits above.
4. Keep the archived before/after bytes for as long as you need rollback evidence. Do not erase them as part of this archive operation. If interrupted, leave Studio stopped and complete receipt restoration before resuming.

## Review and share with Git

The Studio displays a bounded change summary for known managed content/media only. It never commits, pushes, resets, cleans, creates credentials or changes repository settings. Unrelated `.env`, private files and other dirty working-tree files are not shown by the Studio.

Use your normal Git review workflow after a successful save. Review both JSON facts and distribution rights, run the checks, commit the intended catalog/media files and open a pull request. Another clone receives those files normally, then runs `npm ci`, `npm run build` and `npm start`. No private browser export/import is required.

## Effective limits

- Every picture: at most 2 MiB, 2048 pixels on either side and 4,194,304 pixels. Decode/normalization failures leave the previous draft intact.
- One recoverable transaction: at most 64 MiB of changed before/after bytes; save smaller batches when this bound is reached. Recovery material stays local and ignored.
- One new upload batch: at most 32 pictures and 8 MiB binary bytes; the request envelope is bounded at 20 MiB.
- Published catalog: at most 1,000 assets per pack, 1,024 across the site and 256 MiB total image bytes. Canonical metadata is bounded at 8 MiB and 20,000 entity records across the site; each generated runtime pack also retains its 8 MiB bound. Derivatives count as assets.
- Portable picture pack: at most 32 assets, 8 MiB binary bytes and 16,777,216 total decoded pixels, in a 20 MiB envelope. Published-catalog capacity does not widen untrusted portable-import limits. An oversized self-contained export is rejected, not silently truncated.
- A record can have one primary and at most eight additional picture IDs. Duplicate IDs are not rendered twice.
- Media library entries are paged, and picture bytes are loaded only for displayed previews rather than all at startup.

Legacy reviewed JPEG/WebP sources retain their original source metadata and existing build checks; all newly uploaded browser images normalize to PNG and receive full server PNG pixel-stream checks. Rights and factual verification are separate from image validity.

## Testing and boundaries

See [feature acceptance](../specs/009-repository-content-studio/acceptance.md) for exact tested commits, CI runs, screenshots and remaining limitations. Browser checks are not physical-device testing or formal accessibility certification. This is not a multi-user hosted database, cloud sync, an account system or automatic public deployment.

## Navigation, version review and recovery drafts

Use Authoring, Pictures, Review & save and Import & recovery links to move within the same page. These links do not replace controls or discard unsaved fields/rights choices. The compact summary distinguishes an unsaved draft, reviewed candidate and confirmed repository save. Rebuild and publication remain manual.

In Review & save, enter a content version and choose Change draft version. This explicitly changes the draft and expires the old preview. Choose Validate and preview draft again; only a fresh reviewed candidate can be saved.

Download draft remains available for invalid unfinished work. To restore a valid version-1 repository recovery export, select its explicit destination and use Repository recovery draft. The importer checks format, identity, schema, rights, image signatures/hashes/dimensions and current source media before showing an inert preview. Limits are 20 MiB envelope, 8 MiB catalog, 32 pictures, 2 MiB per picture and 8 MiB image bytes before and after normalization. Review differences and rights, then explicitly Apply import to draft. Repository saving is a separate reviewed action.

Recovery exports are not portable public packs. Existing-media references require matching current repository bytes; a recovery file with missing media or unfinished invalid fields cannot bypass validation. Preserve the original and repair a copy or reattach authorized source pictures. The original exported revision is historical context, never permission to overwrite a newer repository revision. Cancelling, changing destination, switching catalogs or editing the draft expires the preview.
