# Plan and tasks

Use existing validated key supplement, access graph and room-details models. Add source allowlists and a bounded explicit key-reference metadata JSON (map ID, catalog item identity, floor/marker references, coverage notes). Existing base keys default Hajin. Add records to existing graph/groups and room facts so editor/backup owners retain canonical IDs. New metadata must validate exact IDs, map domains and existing snapshot markers; no guessed positions. Browser inventory imports a small ID-only lookup, not Node-only key validators.

Directory adds region sections around existing location tables and a region filter; controller hides empty region containers. Key map renderer branches to X01 marker deep links; grid-only/unmapped fallbacks never send X01 to Hajin. Generic icons where unavailable. Add actual starter item records with stable IDs/source records and an additive contentVersion bump; unknown rarity omitted. Existing overlays stay authoritative; All keys link remains available regardless selected catalog.

Execution checklist: [tasks.md](tasks.md).

Research: directory62 keys, ten named X01 DMZHub key-room markers. DMZTracker includes11 X01 cards; DMZMap14 canonical X01 records; HajinDMZKeys16 entries include two encoder labels already represented by room-card aliases. COD Central supplies four additional Hajin names (Boathouse, Helicopter, Downtown Branch Lobby Main, Netshin Security Office). Conflicting grids/floors stay attributed. Checked2026-11-22; current-build verification unknown. Source-only Archive Closet/Super User/blank card stay listed without invented marker matches.

Risks: exact-key validators and public adapters require consistent additions; preserve old IDs/useIds. Inventory new-content path must not overwrite stored catalog or silently migrate player state. No changes to owner schemas. No cross-store quantity sync promised. Existing map assets remain optional local downloads.
