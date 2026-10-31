# Evidence reviewed
Repository-only design research; no internet/game-source claims needed for this planning task.
- Current inventory rendering: src/client/profile.mjs renderInventoryPage mounts large fieldsets; inventory-window already owns raw drafts and50-row pagination.
- Current upgrade rendering: src/client/progression.mjs includes requirements/effects/evidence percard; typed upgrade progress and spending are already separated.
- Keep/Search: src/client/upgrade-advice-view.mjs has existing shared-needs and source-safe projections; compactness must reuse them, not invent new totals.
- Authoritative safety contracts: feature023 spending/progress and feature032 unknown price/source reporting. Status correction does not debit; purchase confirmation snapshots/CAS/acknowledgment do. Unknown quantities/costs cannot be treated as0.
- Read-only browser measurement receipt in plan.md; all browser profiles isolated, no owner local inventory was read. No game assets or screenshot content committed in this planning package.
