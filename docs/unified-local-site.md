# One local address

From the repository root run `npm run local`. It builds the guide and a code-only map frontend, then starts one background Node service at **http://127.0.0.1:4173/**. Logs are in `.local/service-logs/`. Run `npm run local -- --skip-build` to reuse a validated current build; missing, corrupt or stale map builds are refused. An unrelated occupied port is not killed or replaced.

- Guide and dashboard: http://127.0.0.1:4173/
- Hajin: http://127.0.0.1:4173/map/
- X01: http://127.0.0.1:4173/map/x01/
- Safe Run: http://127.0.0.1:4173/map/safes/
- Loot Run: http://127.0.0.1:4173/map/loot/
- Map transfer instructions: http://127.0.0.1:4173/map/migrate/

PowerShell users can run `./scripts/start-local.ps1` (or add `-SkipBuild`). Repository editing remains an optional separate tool: `npm run author` at port 4174. Maps do not depend on a Vite listener during normal use. `npm start` and portable releases remain guide-only and provide setup instructions for known map links.

## Keep saved data

The browser treats port 5175 and port 4173 as separate storage locations. No data is automatically copied, cleared or merged. Guide inventory on the same 4173 address/profile stays in its existing database. Another browser or VS Code browser has different storage even at the same address.

For old map data, run `npm run local:legacy-map`, open http://127.0.0.1:5175/ in the original browser/profile, and export the main private workspace backup and the separate X01 backup with their existing tools. Restore them in their matching tools on 4173. Then use the transfer page on each address to export/review/import supplementary map settings. Export files include private route/gameplay observations; keep them out of Git. Restricted backgrounds outside those backups remain at the old address. Source filters are recovery-only in the settings transfer so they cannot override restored workspace visibility.

Imports compare all selected target values before writing. Changing a file, selection or page expires the review; competing writes require a new review. Failed writes roll back only unchanged bytes written by that operation. An uncertain rollback preserves other writers and asks you to keep the export and inspect before retrying. No guide inventory, account credentials, source-update jobs or backup receipts are transferred.

Map artifacts stay under ignored `.local/unified-map/`; provider resources stay in the existing local map public directories. Neither is copied into the public guide build or static archive. Source updates retain their existing local request/token protections; opt in with `DMZ_ENABLE_SOURCE_UPDATES=1` when starting the unified service. Build promotion uses separate last-good boundaries for guide and map; it is not an atomic joint release.

## Navigation configuration

Guide and map navigation uses paths on the current site address. Optional tool links go through the same site's finite `/local-services/` directory, which resolves the configured companion service without starting it. Defaults for the reader, author tool, weapon manager and legacy map are centralized in `src/domain/local-services.json`; their launchers read the same configuration. Existing API origin/token restrictions still apply. Portable guide-only archives show setup instructions for these optional tools.

The navigation regression gate checks UI/client/map modules and page generators for embedded loopback URLs, audits generated guide/map pages, and exercises actual menu navigation on another port in Chromium, Firefox and WebKit. The runtime audit accepts `DMZ_SITE_URL` to select a different loopback reader origin. Old recorded origins in backup metadata remain provenance; restore links open the current site's owner tools.
