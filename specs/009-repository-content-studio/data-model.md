# Data model

Canonical manifest version 1 explicitly names pack keys and immutable runtime pack IDs. A pack descriptor contains `pack` (existing non-group header fields) and `order` (one ordered ID array per existing group). Every ID appears exactly once and matches one record file. Weapon-kind items live under weapons while preserving their items order.

Ordinary entity JSON is the existing schema record unchanged. Additional pictures use optional `assetIds` (at most 8 unique IDs) alongside primary `assetId`; references and runtime galleries validate both. Assets alone use a source descriptor: `asset` (existing runtime metadata), `sourcePath` (generated repository-relative path), `category` (allowlisted entity/media category), and optional derivative metadata identifying thumbnail parent. Runtime assembly strips source-only fields. Binary media is never encoded into canonical JSON.

Revisions are hashes of managed source path/content snapshots, not browser counters or timestamps. Writes require the exact expected revision; references are validated across the candidate complete pack. Source paths and IDs are immutable during ordinary record edits; removal/replacement requires validated explicit actions.

A transaction stores its validated target paths, expected old hashes, staged new bytes/hashes, durable state and backups under ignored .author-state. States: prepared → applying → committed; recoverable failure → guarded rollback/recovery; unexpected file bytes → blocked conflict. No recovery state is tracked in Git. Private profiles are neither accepted fields nor scanned paths.
