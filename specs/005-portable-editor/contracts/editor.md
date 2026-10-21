# Editor contracts
featurePages(packs) returns /editor/ descriptor with scripts ['/assets/src/client/editor.mjs']; native pack selector and error/save status IDs match common.init.
portable exports parseTransfer(text,schema,{decodeRaster}), validatePayloads(pack,payloads,{decodeRaster}), buildTransfer(pack,payloads,schema,{decodeRaster}), diffPacks(before,after), imageInfo(bytes), bytesFromBase64/base64FromBytes, hashBytes. Runtime decoder injection is required for any payload; browser decoder uses createImageBitmap. JSON content-only imports may carry reference metadata, but cannot claim a self-contained picture bundle.
Payload exact shape [{assetId,base64}]. Parent readers can construct Blob only after saved validation and display a bounded raster object URL. No sourceUrl fetch.
Storage readRecord('content',pack.id); commitRecord('content',pack.id,{pack,payloads,revision},expectedRevision). Parent supplies listRecords('content') and common.init discovery. No separate asset store transaction.
Pack semantic version must change on edits. Unknown versions reject: preserve original, export from a reader supporting that version; never auto-migrate.

Identity: form ID/schemaVersion read-only once loaded. New-ID imports read target content record (revision 0 when absent); collisions preview explicit replace of that exact ID. Existing selected pack is never used as a different-ID replacement baseline. No automatic namespace changes or merges.
Stage token {targetId,expectedRevision,generation}; generation increments on pack switch, cancel and each new import. Check token after every await before showing/applying. Pack switching discards unsaved workspace only after explicit browser confirmation; cancellation returns selection to prior pack. Pending decode is sequential and five-second bounded; cancellation ignores/cleans late bitmap and prevents commit. Reject animation and ZIP. Draft export controls remain available on storage failure and require no navigation.

Profile impact: read target profile only for preview; enumerate goals and inventory/progression references absent or changed in candidate. Never mutate the profile. Report binding mismatch and link explicit settings rebind workflow.

Parent-approved initialPrevious storage option preserves the validated bundled baseline on a first overlay commit atomically. It is ignored when an old overlay exists; genuinely new packs have no previous snapshot.
