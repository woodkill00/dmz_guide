# Dashboard interface contract

`projectDashboard({pack, profile, armorySummary, options})` is pure. It returns section states and safe bounded rows, never writes or fetches. Invalid profile pack/version blocks profile-derived numeric projections. Armory is independent; never attach unverified identity mappings.

`readDashboardContext(packId, {signal,generation})` reads only existing stores, validates their envelopes and reports each source independently. It does not create stores/profiles, synchronize tabs automatically, or reinterpret unsupported versions.

`addDashboardFound({packId,contentVersion,itemId,amount,expectedRevision})` uses the shared Quick collect save/history adapter. It returns committed revision on success or typed validation/conflict/unavailable/quota result. A transaction cannot grant completion, alter blueprint ownership, remove reserves, or infer crafting. No success event until persistence commits. A stale draft needs explicit review before retry.

`load/saveDashboardPreferences` validate the v1 schema and bound before use. Failure changes presentation persistence only.

Links: `/quick-collect/?pack=...`, `/inventory/?pack=...`, `/upgrades/?pack=...`, `/missions/?pack=...&page=hajin-N` or `x01-N`, item/record qualified existing reader links; weapon editing uses current armory destinations and native weapon identity. T003 must verify exact fragments supported by destination pages and add handling where absent; no invented dead anchors.

All source text becomes escaped text; icons resolve only through existing safe local loaders. Every async paint checks selected pack/version/generation. Closing panels returns focus to their tile; rerender preserves pending input and expansion state.

Verified storage identities: dmz-guide-local/profiles/<pack ID>; dmz-armory-local/workspace/main. Effective ingredient blueprint helpers: automaticIngredientBlueprint and inventoryBlueprintOwnershipLabel from src/domain/inventory-presentation.mjs. Require validated weapon database IDs when resolving acquisition records; never join by display name. Collection View all destination is /quick-collect/?pack=<encoded pack ID>.

## Operation and pagination contracts (DASH-01/02/03 repairs)
AddFoundOperation = {operationId, packId, contentVersion, itemId, amount, expectedRevision, state, committedRevision?}. Only the existing atomic profile/history transaction can establish commit. The action adapter returns commit outcome independently of a subsequent refresh result. A thrown post-commit reread/callback never becomes a retryable delta failure. If the protocol cannot retain atomic operation identity in existing compatible history, T003 must stop dependent implementation and document the protocol adjustment plus migration impact for review; do not silently add a profile field. For unresolved outcome, Verify saved update reads history/revision and blocks further submission until resolved. Capture pending identity across bfcache; for full navigation reload, reread saved state before exposing any new submission, never automatically replay a stored delta. Persistent unresolved-operation metadata, if needed for proof, belongs in the existing atomic protocol, not loosely coordinated localStorage.

Exact options: other needs calls quickCollect with crafting=false by default; an explicit boolean toggle enables alternatives. Build needs calls buildTargetNeeds with existing profile recipe selections. CollectionTile also contains assumedZero:boolean and minimum:boolean; held=null remains unknown, never relabelled owned=0. A presumed-zero missing figure displays Estimate and lower-bound/minimum markers as applicable.

Read adapter: call readExistingRecord(name,store,key,{signal,timeout:1500}); validate returned envelope and actual independent owner identities. Preserve settled guards, abort timed-out transactions, remove event listeners and close all successful or late-opened connections. Pagehide/pack changes cancel reads; write completion semantics are governed by AddFoundOperation, not the read AbortController.

Global DOM budget: initial Builds <=3 headers and <=12 tiles; expanded Builds <=5 group headers and <=50 total tiles across groups/shared totals. Each visible group previews <=12. Needed <=12 initially, <=50 expanded. Collection detail panels <=1 per section (2 total). Page replacement releases old tiles/panels and retains only bounded UI preferences/draft data. Every pagination action preserves focus on the section controls and reports current range/true total.
## T003 implementation findings

The existing profile schema already permits optional `fieldOps`. Explicit Add found initializes that optional journal only if absent, then calls the existing `saveProfile` CAS transaction with `journal.entryId = operationId`. `journalInventory` records the ID and stock delta before the same `os.put`; `saveProfile` resolves only on transaction completion. Verification looks for that exact ID/change and a later matching-version revision. Post-commit read failure remains committed-unverified and cannot replay the delta. No schema migration or second stamp write is used.

Dashboard profile/content discovery now uses the existing read-only helper with the 1500ms timeout. When supported, IndexedDB database enumeration avoids opening absent databases (including WebKit's aborted-upgrade shell behavior). Initial-load and stale-generation cleanup are tested. Armory discovery remains independent and uses dmz-armory-local/workspace/main.

Local catalog precedence matches the owning tracker: read dmz-guide-local/content/<pack ID>, validate its `.value.pack` with the public schema, require matching identity, and prefer it over published data. Invalid overlays retain bytes and show a published-baseline warning. Profile/version/quantity mismatches block unsafe projection. Before Add found, compare both profile revision and overlay presence/revision tag to the captured values, then use the selected validated pack's item bounds.
