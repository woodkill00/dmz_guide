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
- Confirming or correcting progress records history only: **Recording progress only; update inventory after an in-game purchase.** It never spends/refunds cash or items, changes reserves, or changes focus goals.
- Blank inventory means **Not entered**. Enter `0` to record zero deliberately; **Clear stock** unsets only that item after Save. Reserve values remain independent. Cancel restores the saved state. Save/cancel dirty inventory before using its progress controls.
- Planner's **Keep / Search** defaults to all known unfinished upgrades, with a separate Focused view. It uses direct requirements, not chosen crafting routes, and does not insert goals. Units are separate; fully stocked unfinished uses still appear in Keep. Missing stock or unknown consumption blocks affected exact numbers. Unknown prerequisites/build instead limit readiness and completeness, never imply free costs.
- **Your watch pin** is a personal reminder without an invented stock quantity. A fixed reserve is a separate numeric rule. “No known need in this scope” is not advice to discard an item.

The observed catalog's consumption rules are still unconfirmed, so its numeric Keep/Search remains gated even after you enter stock. Requirements and manual progress remain usable. Source review dates are not capture dates, and a transcription is not independent gameplay confirmation.

### Older backups and recovery

Export a private backup before migration. In Settings with the same catalog selected, choose **Preview upgrade progress migration**, inspect the summary, then **Apply replacement** (or **Cancel**). This is an explicit v1→v2 preview: legacy completed stays completed; locked records availability only; ambiguous unlocked requires review and is not purchased. Cancel changes nothing. Successful revision-checked migration keeps the original saved profile as the previous snapshot. Backups include upgrade progress and pins, never publish them as content.

Content-version changes require explicit rebind. Changed or unavailable prior evidence requires review while stable historical completion and retired references remain recoverable; new tiers start unknown. Failed/stale saves do not retry automatically. Export the retained unsaved candidate before reloading or explicitly reconciling. Older clients must reject v2 rather than drop new fields.

The existing focused planner on a **legacy v1 content pack** retains its historical unset-stock-as-zero assumption for compatibility and labels that assumption. Enter explicit quantities before relying on it. V2 focused planning refuses exact shortages until every selected input, including chosen crafting intermediates, has an entered held quantity. Root output stock is not required for an additional-output goal unless that item is also an input. Keep/Search never treats missing stock as zero.
