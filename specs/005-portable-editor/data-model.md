# Data model
Canonical pack schema remains schemas/pack.schema.json. No profile schema changes.
Portable envelope: {format:"dmz-picture-pack",version:1,pack:Pack,payloads:[{assetId:string,base64:string}]}. Exactly these properties; payload exact properties. One payload for each asset, no extras. Canonical padded base64; asset metadata holds MIME/size/dimensions/hash/rights. Total envelope 20 MiB; aggregate pixel budget 16,777,216; remaining limits canonical.
Stored content value: {pack:Pack,revision:integer,payloads:Payload[]}; previous snapshot same shape. Older overlay missing payloads is treated as empty with reference-only picture warnings.
Draft state -> validated stage -> explicitly applied current; cancel stage -> unchanged current. Rollback selects previous then previews and commits as a new revision. Expected revision is captured when draft loads, never silently refreshed during save.
Diff: grouped added/removed/changed records with before/after values plus manifest changes; profile warning includes retired IDs and version/build identity mismatches. No profile writes.
Semantic content edit requires contentVersion differ from currently loaded content. Reversion rollback is explicit and may restore old version with warning.
