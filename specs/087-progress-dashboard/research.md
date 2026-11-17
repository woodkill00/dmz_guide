# Research and decisions

- **Current dashboard:** home already exposes search, pins/recent, simple saved-profile counts and one collection action (`hub-page.mjs`, `hub.mjs`). Reuse navigation; replace the summary ownership, not the whole shell.
- **Demand:** `buildTargetNeeds` and `quickCollect` already distinguish additional build quantities, inventory/reserves, grouped estimates and unknown scope. Use them directly; no second demand engine.
- **Collection UI:** `build-collect-view.mjs` has icon/name/rarity/count tiles and inline details. Reuse safe presentation concepts, extracting shared primitives where necessary rather than importing a page controller that mounts unrelated DOM.
- **Persistence:** Quick collect uses an owning profile controller and quantity history. Exact save/history pathway must be traced in T003 before extraction; use revision compare and existing backup behavior. Read-only discovery must not initialize any private store.
- **Armory:** `armory-workspace.mjs` stores acquisition keyed by weapon ID with manual, attachments and arbitrary blueprint names. It cannot supply an exhaustive missing-blueprint denominator. `armory-store.mjs` uses a separate database; use read-existing adapter and validate identity mapping.
- **Spoilers:** `home-progress.mjs` excludes protected identity/text; retain this defensive boundary rather than use naive objective totals. Profile preference does not justify cross-store or unrelated-catalog disclosure.
- **Design:** no new provider research needed; this is integration of existing repository features and the user's already accepted compact collection design. Existing variants need equal capabilities so a classic-mode browser receives the improvement.
- **Scope decision:** this feature's plan covers implementation tasks, acceptance journeys and analysis. No gameplay automation, speculative source imports, or inferred total catalog of weapon blueprints.

- **Verified keys/rules:** profile summaries read dmz-guide-local/profiles keyed by pack ID. Armory is dmz-armory-local/workspace/main. Effective ingredient ownership uses automaticIngredientBlueprint and inventoryBlueprintOwnershipLabel in src/domain/inventory-presentation.mjs; a raw itemBlueprints lookup alone is insufficient. Quick collect route is /quick-collect/.
