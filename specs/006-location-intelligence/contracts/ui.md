# Integration contract
featurePages(packs) returns [{path:'maps',title,page:'maps',body,scripts}]. Parent adds route and shared styles. Client common.init(render) supplies state.pack/profile and handles private overlay selection; required IDs pack-select, pack-note, save-status,error supplied by page.

Pure exports planned: projectLocation(map,location) => {x,y} normalized 0–100 or null; placementReason(map,location); filterLocations(pack,filters,neededItemIds) => location array; relatedItemIds(location,neededItemIds). floorOf(location) canonicalizes unknown floor. Import planShared from ../domain/shared-plan.mjs. Its ledger rows expose id, missing and retainedMissing; positive missing OR retainedMissing makes an unmet item. Throws (including stale binding and unsupported plans) produce an explicit unavailable warning. Goal reasons remain displayed, never promise availability. Dynamic import permits list/map to remain usable if the adapter fails.

Private imagery: readRecord('content',pack.id).value = {pack,revision,payloads:[{assetId,base64}]}; asset metadata supplies mime. Only 005-validated raster IDs/payloads are used. No remote/image URL accepted from record text. Image failure preserves list.

Browser entry runMapsTests({browser,base,context,page}) returns evidence summary and writes screenshots using existing harness convention confirmed at integration. No cloud publication.

The client excludes kind=currency and unresolved item IDs from positive ledger needs. RetainedMissing counts; already-held retained tools do not. Domain helper accepts explicit positive-needed IDs only. Source and coordinate-version selectors are separate, with all/current versions drawn from active pack maps. Parent approved these selectors and shared-plan contract on 2026-10-21.

Raster renderer dynamically reuses 005 portable.mjs bytesFromBase64/imageInfo/hashBytes, canonical byte/pixel/dimension limits, and verifies metadata/hash before image decode. Tests generate original canvas imagery and validate via buildTransfer. No separate image-policy constants are maintained in 006.
