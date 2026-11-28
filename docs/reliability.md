# Site reliability

Use `npm run local` for the dashboard and all four maps at one local address. Current routes are documented in [unified-local-site.md](unified-local-site.md). Runtime navigation labels/links come from the feature registry; documentation does not define a second routing system.

## Review reference coverage

Open `/quality/` for actionable item, recipe, upgrade, mission, location, key, weapon and camo findings. Use its filters and exact reader/editor links. Marking a row Checked records editorial work; it cannot fill missing facts or complete a player's goal. Changed relevant content/source evidence invalidates old review bindings.

Open `/missions/audit/` for per-section Hajin24/X015 Orders coverage and Fill later notes. Run `npm run audit:content` to produce `test-results/reliability/content-audit.json`: actual admitted public catalog counts, bounded quality rows and optional local camo-image availability. No provider is contacted and no source/player data changes. Image metadata and valid downloaded bytes are counted separately. The report is a local reference inventory, not complete-game verification.

## Verification and CI

`npm run test:reliability` exercises isolated guide tracking journeys across Chromium, Firefox and WebKit, including cross-page weapon/dashboard progress and content-gap navigation. Existing owner suites retain detailed adverse cases. See the [feature111 matrix](../specs/111-site-reliability/verification-matrix.md) and [verification receipt](../specs/111-site-reliability/verification.md) for exact run results.

CI separates runtime/package, browser acceptance and Studio acceptance on Windows and Ubuntu. Each suite has a45-minute job budget, its own fresh checkout/build, and preserved functional assertions/deadlines. Existing `runtime-checks (os)` names are aggregate gates; failed, cancelled, skipped or missing dependencies fail them. Browser and Studio evidence use distinct artifact names. Other repository/editor/engine/map checks remain intact. This avoids spending one shared60-minute budget on every suite; it does not promise every future runner will be fast.

## Private preservation and deferred recovery

Private backups stay under ignored `.local/private-backups/` in this checkout and are never source/build inputs or CI evidence. A saved-file hash or valid owner export does not prove successful restoration. Browser-local records are separate for each browser/address. Do not reset or restore the live profile during reliability testing.

The dedicated backup/recovery verification workpackage is **deferred until last**, after the other reliability tasks and independent review. It remains a separate follow-up and is not marked complete by this feature.
