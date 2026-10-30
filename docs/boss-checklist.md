# Commander and Lieutenant checklist

Open the local map at `http://127.0.0.1:5175/`, then **My workspace → Planner → Boss checklist**. This is the first checklist category; kills are recorded manually and do not synchronize with the game.

## Start with a roster or your own targets

Expand **Source roster / refresh** and choose **Preview collected boss roster**. Review its names and types before **Apply boss roster**. The owner-local capture is ready; to check for updates, run this from the repository root:

```powershell
py -3 scripts/collect-references.py --sources dmztracker-bosses
```

The dedicated adapter collects only explicitly labelled linked boss-card names and types from [DMZTracker](https://www.dmztracker.gg/bosses/). It does not import tactics, rewards, artwork or assumed spawn coordinates. The initial retrieved roster reports three Commanders and ten Lieutenants; this is source coverage, not a promise of a complete current roster. [COD Central](https://codcentral.net/blog/mw4-dmz-boss-board/) provides a useful second reference but differs on some locations/names. Do not equate aliases or fixed spawns automatically.

Alternatively expand **Add a custom target**. Choose Commander or Lieutenant, a name and goal. The default goal is one kill. **Starting kills** accounts for kills you already have; it stays separate from individual logs. Source-backed entries show the source's name/type separately from your editable display name. Detach the source explicitly before changing a reported type.

## Use the checklist

- Search your target names or notes, filter by type, and show pending, complete or pinned targets. Totals describe saved targets only.
- Set the observation date and optional notes, then **Record kill**. Each log adds one; reaching the chosen goal marks that target complete.
- **Undo latest logged kill** removes the last appended log for that target, even if its observation date was backdated. It does not change the starting count or goal.
- Open **Target settings and history** to edit goals/notes, inspect match associations or remove a specific log. Deleting a target confirms the impact and removes only its own history.
- **Pin in match mode** adds quick controls to Match mode and the compact route tracker. Without an active route, use the Match mode panel or Boss checklist directly. An active journal session's ID/name is captured with a new log; historical journal records are not silently edited.
- Choose your own linked map location in settings. Stale or unavailable locations cannot be shown until explicitly reselected; no fixed boss spawn is assumed.

Unsaved row edits block filtering or pagination that would discard them. Save or use the workspace's Cancel control first. After a storage error, the saved count stays intact and the form/draft remains recoverable. Edited forms support retry after fixing storage. A retained quick-action draft can be exported through Backups, then recovered through the existing guarded restore workflow or followed by Reload saved workspace. Concurrent edits are refused rather than overwritten.

## Refresh, export and recovery

Roster preview and Cancel save nothing. Applying the same roster adds no duplicates. Refresh preserves your display names, goals, starting counts, notes, pins, locations and logs. Missing targets remain retained with their source history. Exact source IDs match first; an unbound custom entry can be reused only for the same normalized name and type. Ambiguous names/type conflicts require explicit resolution.

**Export private kill report** downloads counts, logs and reference links for review. For a restorable copy use the existing **Backups** workflow; the report is not a restore pack. Private backups include checklist data and retained source candidates, while public links/selection packs omit private kill history. Keep a capture linked by a target or detach the target's source before deleting that capture.

Limits: 200 targets, 2,000 individual kill logs, goal/total up to9,999, plus the existing workspace/capture limits. Nothing automatically resets or grants rewards. Actual kill verification, physical devices and screen reader usability still require owner observations.
