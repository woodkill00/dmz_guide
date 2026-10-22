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
