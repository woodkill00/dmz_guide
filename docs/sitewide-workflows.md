# Sitewide workflows

Use `npm run local` and the address printed by the launcher. The guide, Hajin, X01, Safe Run and Loot Run share that origin. Browser profiles and addresses have separate saved progress.

The navigation's **Workspace** menu opens recent work, pinned features, Search, Help, Content quality, maps and recovery. It closes with Escape or an outside click. Compact spacing is a shared preference. Dashboard task shortcuts lead to the existing trackers and editors.

## Find and resume

- `/` (Home dashboard): existing live collection/progress summaries plus task shortcuts.
- `/search/`: search public reference records; query, type and result page remain in the URL. Previous/Next keep each page at most100 results.
- `/help/`: searchable instructions for all14 workflows, including editing, sources, counts and recovery.
- `/quality/`: reference-field gaps with reader/editor links, filters and100-row pages. **Later** and **Checked** are editorial notes, not mission or upgrade completion. A changed record or cited source invalidates its previous review.

## Protect saved work

A save notice is emitted only after a successful guide or armory transaction. Another tab's notice asks you to finish/export your edits; it never reloads a form automatically. Notices are advisory metadata and do not prove a backup file was saved.

At `/workspace-backup/`, explicitly preview the selected profile and/or armory, choosing current or recoverable previous snapshots. Download only after checking the included modules and omissions. This operation reads saved data; it does not restore it or include unsaved inputs. Maps, photos, plans and audit notes keep their existing export/restore tools. Quality notes can be exported on Quality and included as an optional seventh bundle module. Restore through each module's owning page and review its preview.

Quality notes use a separate local metadata database created only on an explicit save. Atomic revision checks refuse stale simultaneous writes. Export notes before reloading a conflict. Preferences and receipts can be unavailable without changing a successful inventory/armory save.

## Editing, sources and maps

Reader and Quality editor links open the existing local repository editor. Use its sections, photos, preview, history and recovery controls; player quantities remain in trackers. Help links the source-impact review, staged map updates and weapon update tools. Source changes still require their existing preview/apply decisions.

Four map shortcuts reuse the existing map owners, floor/source filters and routes. Item-to-map links retain their exact context. Routes are planning aids; they do not provide live player position or a guaranteed traversable optimal path.

## Verification

After guide and map builds, run `npm run test:sitewide` for three-browser new-workflow and adverse editorial journeys. It writes synthetic screenshots and local route/search measurements under ignored `test-results/`. Timing values describe this machine/run only. Existing tracker, editor and map regression suites remain separate. The feature's exact delivery/evidence ledger is in `specs/105-sitewide-workflows/delivery.md`.
