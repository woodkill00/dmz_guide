# Data model

Keep existing pack/record IDs and player schemas. Public content corrections use existing sourceIds/status/requirements/steps/stats/image registries. Inventory, completion, manuals and camo stores are unchanged.

Verification report: version, checkedAt, baseline identity, source outcomes, per-area counts and per-finding dispositions. Dispositions are factual-correction, classification-correction, unresolved-source or external-verification; each binds the original finding ID/field and an explanation/evidence path. A changed finding cannot inherit acceptance from a previous source hash. Reports are derived, local and not player state.

Source comparison: exact provider URL, capture time/hash, compared registered IDs, unchanged/added/changed/unmapped counts and explicit error/partial states. An unavailable fetch retains current catalog data. Map features bind provider/floor/coordinateVersion/id. Weapon reports bind mode/source date; partial DMZ never overrides baseline.

Manual verification receipt: browser/device, actual/emulated flag, journeys, result and limitations. Do not retain device serials, private inventories, screenshots containing owner data or access credentials.
