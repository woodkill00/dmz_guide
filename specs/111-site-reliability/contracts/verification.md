# Verification contracts

- Quality index retains existing version/entry shape and size/node limits. Weapon/camo rows have deterministic IDs/bindings; relevant changes stale a review. Camo details use weaponCamoURL; editor uses the existing weapon-camos adapter admitted by the page editor. Unknown data stays unknown. No third-party request is required to build/audit.
- Existing runtime-checks OS names are retained. Aggregate requires runtime-core, browser-acceptance and studio-acceptance success; failures, skips, cancellations and malformed/missing results fail. Dependencies run their own fresh workspaces; artifacts remain distinct by suite and OS. Existing tests and checks stay present once per original matrix unless explicitly required setup is repeated.
- Journey evidence names engine, route, assertions, synthetic fixture and result. No real player data is imported by tests. Screenshots supplement geometry/action assertions. Content gap counts are a scoped catalog inventory, not a verification of gameplay facts.
- Dedicated backup/recovery acceptance remains deferred and last. Private captured files are never referenced by public build inputs or CI artifacts.
