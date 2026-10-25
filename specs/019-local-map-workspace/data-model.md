# Data Model

The native guide schema is unchanged. The local workspace retains its existing snapshot schemaVersion=1: sourcePage/capturedAt, category id/name/group/local icon path, and records with source-scoped id/name/category, mapId, coordinateSpaceVersion and normalized x/y.

Map reference: 4096-square image, top-left origin, positive x right/y down, `hajin-official-v1-4096`. Unsupported map/version, non-finite/out-of-range positions, duplicate IDs and unknown categories reject the snapshot. Source identity scopes equal record IDs independently. Preferences store per-source master visibility and all/none/mixed category IDs under versioned browser-local keys. Corrupt/unavailable storage falls back safely.

Limits: snapshot 2 MiB, 100 categories, 5,000 records, bounded strings/local paths; image decode and fetch must have deadlines. No remote acquisition helpers are included. No local paths, profile backups, credentials or raw source assets are persisted in public integration history.

Synthetic tests use non-game names/positions and generated raster bytes. They exercise the same local input contracts without claiming factual accuracy.
