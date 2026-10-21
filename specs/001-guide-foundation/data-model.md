# Data model contract to implement
This is a design contract, not an executable JSON Schema. T004 creates and tests the actual schema before runtime implementation.

PackManifest: schemaVersion, packId, contentVersion, gameId, modeId, applicableBuild/season, createdAt, rights/license record, sources, minimumReaderVersion and asset index. Schema version describes format; content version describes data. IDs are namespaced and immutable. Explicit replacement/tombstone mappings handle renamed/retired records.

Item: id, localized name, aliases, category, unit, stack semantics if verified, assetId, uses/acquisition references, source-backed fields and verification records. Unknown sale value is null/unknown, never zero. Unit and currency cannot be summed.

Recipe: id, station, output item quantities when actually produced, consumable item/currency/resource requirements, retained-tool requirements, unlock predicates, selected alternative identity, batch yield and source applicability. UpgradeObjective is a distinct cost-bearing one-time goal with prerequisites and typed effects such as capacity delta or category unlock. Shared upgrade closure pays once; effects never become item yields.

Claim/Evidence: claim ID, entity/field target, observed/asserted value, source URL or authorized media reference, source type, source publication time, observation time if known, applicability, reviewer and verification state. Conflicting claims coexist. Inspection time is not capture time. Evidence URL stored as inert data, not automatically fetched by import.

Map: id, coordinateSpaceId/version, declared canonical extent/origin/axis direction, floors, imagery transforms and rights. Location: permanent ID, map/floor, finite geometry, landmark directions, grid, category, relations, fixed/possible/event/unknown spawn classification, confidence and evidence. Route: ordered location references, version pin and manually supplied transitions; no fastest-path claim.

Profile: schemaVersion, local profile ID, bound content version, revision, inventory pools, quantities, protected reserves, selected goals/order, explicit progression state, spoiler preference, bookmarks and recovery references. Storage revision supports cross-tab conflict detection. Snapshot imports replace selected profile after preview by default; never sum snapshots. Public content export excludes profile data.

Inventory pools: stash/carried/secured/currency or resource pools only when corresponding semantics verified. Track operator scope only when needed. Eligibility for a recipe is explicit; printing output destination does not prove which input pool is consumed. Manual failed-exfil simulation requires verified rules and user confirmation; it cannot change game state.

Plan output: selected goals and recipe choices, raw and expanded demand, owned/reserved/allocated/deficit ledger, projected surplus, prerequisites and unknowns, priority mode, executable-now schedule, later requirements, blocked/unsupported reasons and content/profile versions. Explain quantities without opaque recommendation scores.

Contracts: validatePack(bytes)->staged report; compilePack(validated records)->runtime catalog; planRequirements(catalog, profile, policy)->requirements plan; simulateExecutable(catalog, owned state, goals, policy)->trial schedule; previewImport(staged,current)->diff/conflicts; commitImport(expectedRevision, staged)->atomic outcome; exportContent(scope)->no-profile pack; exportProfile(profile)->private backup. These are proposed interface shapes, not implemented functions.

Caps: 100 active goals; larger inputs rejected recoverably, with 200-goal over-limit stress tests. Archive/image/JSON limits in acceptance.md are provisional until mobile memory spike, then one canonical limits module must serve UI, parser and tests. Selected recipe routes must be acyclic; unused alternatives may contain a route cycle if never selected, but progression prerequisites must remain a DAG. Always report the offending path.
