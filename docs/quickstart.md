# Reader and author quickstart

Use supported Node 22.x or 24.x. No account, Codex, Python or Spec Kit installation is required to read the guide or use local Content Studio.

## Read the guide

In a source checkout:

```text
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173 and keep the terminal running; stop with Ctrl+C. Do not use file://. For a prebuilt static ZIP, extract the complete archive and run `node scripts/serve.mjs`; npm dependencies are not needed at runtime.

The **Private editor** saves private content overlays in this browser at this exact origin. Inventory and goals also stay private in browser storage. It does not edit repository files or publish anything. Export backups before clearing browser data. Changing hostname or port gives a different storage origin, not a migration of your data.

## Edit repository content

Use a source checkout, not the reader ZIP:

```text
npm ci
npm run author
```

Open the exact loopback address printed, normally http://127.0.0.1:4174. No reader build is required. **Repository Content Studio** saves JSON/media in the checkout only after validation, review and explicit Save to repository. It never reads private profiles, commits, pushes or publishes. Rebuild the guide explicitly and review/commit/push with your normal Git workflow when ready. See [Content Studio](content-studio.md) for rights and recovery.

## Diagnose without changing anything

```text
node scripts/diagnose.mjs reader
node scripts/diagnose.mjs author
node scripts/diagnose.mjs contributor
```

Choose your role. BLOCKER identifies a required missing prerequisite; WARN is advisory, including a configured non-loopback reader address or untested optional developer tools. Diagnostics do not install, authenticate, alter files, bind a port or change settings. They do not certify that a port is free. Startup reports missing builds and occupied ports. Stop the conflicting server or choose an explicit port only if you understand the separate browser-storage origin; no automatic port switching occurs.

Optional coding/agent workflow setup is in the separate [developer quickstart](developer-quickstart.md). Follow it only when developing the project, not merely reading or editing repository content.

## Observed upgrades and private progress

The **Observed upgrade requirements · build unverified** catalog is a separate eight-definition snapshot, not the official starter or a complete/current game catalog. After building this feature branch, open `/progression/?pack=observed%3Aupgrade-review-20261026` on your running local guide, or select that catalog on Progression, Inventory or Planner. Use `/inventory/` for manual holdings and `/planner/` for Keep/Search; retain the same selected catalog. It contains required amounts and observed effects only; no photographed player stock or progress is imported.

- **Availability** and **completion** are separate. Available is not purchased. “Not marked complete” includes unknown completion. Higher tiers do not complete lower tiers.
- **Status-only correction** changes completion/availability without spending, refunding or adding usage history. Use it if you already adjusted stock or are recording an older completion.
- **Record in-game purchase…** is a separate confirmed action on Inventory and Progression. Enter and save the stock from **before** that purchase, inspect every deduction and remaining amount, then tick the pre-purchase acknowledgement and confirm. Stock, completion and one spending entry save atomically. This records what you report; it never triggers or synchronizes with the game. Protected reserves cannot be spent; edit them separately if your intended reserve changed. Missing/insufficient stock or unknown cost evidence blocks recording.
- Blank inventory means **Not entered**. Enter `0` to record zero deliberately; **Clear stock** unsets only that item after Save. Reserve values remain independent. Cancel restores the saved state. Save/cancel dirty inventory before using its progress controls.
- Planner's **Keep / Search** defaults to all known unfinished upgrades, with a separate Focused view. It uses direct requirements, not chosen crafting routes, and does not insert goals. Units are separate; fully stocked unfinished uses still appear in Keep. Missing stock or unknown consumption blocks affected exact numbers. Unknown prerequisites/build instead limit readiness and completeness, never imply free costs.
- **Your watch pin** is a personal reminder without an invented stock quantity. A fixed reserve is a separate numeric rule. “No known need in this scope” is not advice to discard an item.

The owner separately confirmed consumption for the eight observed upgrades/31 listed costs on 2026-10-26. Entered stock now enables qualified direct-cost Keep/Search. That report does not verify current build, complete prerequisites or omitted costs; those warnings remain. Source review dates are not capture dates, and the confirmation is not independent gameplay corroboration.

**Recorded usage / spending** shows net material count units, gross and reversed amounts, a per-item/unit breakdown and each currency separately. It only totals purchases recorded in the guide; zero does not mean zero lifetime gameplay spending. Manual stock edits and old completions add no history. Only the latest unreversed entry can be reversed, and only while its affected stock/progress still exactly match. Reversal restores its original snapshot in the guide, not a game refund. Status corrections and resets preserve history and cannot enable a duplicate debit.

V3 currency stock/reserves accept up to 2,000,000 to support the observed Bank IV capacity; this is an input policy, not a claim about your holdings or a universal game maximum. Non-currency stock and all individual costs/goals stay capped at 1,000,000.

### Older backups and recovery

In **Settings** with the same catalog selected (`/settings/?pack=observed%3Aupgrade-review-20261026`):

1. Choose **Export private backup** first and keep that file private.
2. If the profile and catalog versions differ, choose **Preview current content binding**, review the changes, then **Apply replacement** (or **Cancel**) **before** migration. Changed or unavailable prior evidence requires review; stable completion and retired references are retained, while new tiers start unknown.
3. For an older v1/v2 profile, choose **Preview upgrade progress / spending migration**, inspect the summary, then **Apply replacement** (or **Cancel**). This explicitly creates v3 with empty spending history: legacy completed stays completed; locked records availability only; ambiguous unlocked requires review and is not purchased. Cancel changes nothing.

Each successful replacement keeps only the **immediately previous** saved profile for **Restore previous saved snapshot**. A rebind followed by migration advances that recovery slot twice; keep the original exported backup to recover the state from before both actions. Backups contain progress, pins and immutable spending snapshots; never publish them as content.

Failed/stale saves do not retry automatically. Export the retained unsaved candidate before reloading or explicitly reconciling. Older clients must reject unsupported v3 rather than drop history. Whole-profile restore replaces the entire history after preview; it never replays purchases. Profile reset clears ordinary stock/progress but preserves spending history. Ledger capacity is 500 events with space reserved for an immediate reversal; export/reconcile instead of silently truncating it.

The existing focused planner on a **legacy v1 content pack** retains its historical unset-stock-as-zero assumption for compatibility and labels that assumption. Enter explicit quantities before relying on it. V2 focused planning refuses exact shortages until every selected input, including chosen crafting intermediates, has an entered held quantity. Root output stock is not required for an additional-output goal unless that item is also an input. Keep/Search never treats missing stock as zero.
