# Validation Quickstart

Use Node 22.18+ or 24. From repo root: `npm run map:install`, `npm run map:test`, `npm run map:build`, then `npm run map:dev`. Open the printed loopback URL (5175). Without local files, expect explicit asset/source errors with Retry; no imagery is bundled.

For clean-checkout browser tests install Chromium via the tool's pinned Playwright, or set `CHROMIUM_PATH` to installed Edge, then run `npm run map:test:browser`. The runner owns an isolated loopback server and synthetic fixtures. Evidence is ignored under the tool's `.local/` directory. Do not infer real map accuracy or physical-device support from synthetic checks.

Run the unchanged root checks/build/browser suites as documented in [developer quickstart](../../docs/developer-quickstart.md). Asset handling and owner-local file preparation are documented in [workspace guide](../../docs/local-map-workspace.md).
