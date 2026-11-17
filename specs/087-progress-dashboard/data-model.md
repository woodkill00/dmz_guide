# Data model

## DashboardContext
selectedPackId, contentVersion, profileRevision or null, requestGeneration, profileState (loading/ready/absent/stale/invalid/unavailable), armoryState (independent). Every response carries its captured context and is discarded after selection/version/generation change.

## DashboardSection
id in builds/needed/upgrades/orders/weapons/recipes; state loading/ready/empty/unavailable/blocked; visibleCount and listedTotal scoped to safe records; previewRows and pageCursor; destination with selected pack. Independent unavailable sections do not erase ready ones.

## CollectionTile
packId, itemId, name, rarity or unknown, safe icon/fallback, held nullable, required nullable, missing nullable, minimum boolean, cause, groupId, conditional boolean, destination. Display uses missing count; detail separately labels total recipe inputs. Per-build estimates and shared totals are explicitly distinct. Missing zero is permitted only for known covered demand.

## ProgressRow
qualified identity, display label, current tier/roster context, known completion, safe listed counts, next action link. Orders reference Hajin roster or X01 page; editorial audit status stays separate.

## OwnershipRow
kind itemRecipe/weaponAcquisition; identity and source store; recorded/effective owned state; completeness known/unknown; edit link. Weapon blueprint names are not translated into profile item IDs or exhaustive unowned lists.

## FoundDraft / transaction
context identity and expected revision, item ID, string amount, state editing/pending/failed/stale/saved. Validation produces bounded positive integer. Only committed inventory/history updates change visible saved totals. Exactly one active save; draft kept after failure. No automatic player-store migration.

## DashboardPreferences v1
catalogId, order (unique known section IDs, maximum six), collapsed (known boolean fields only). Bound serialized size to 8 KiB; reject unknown schema keys and reset only these preferences to defaults if malformed. Stored separately from player profile. Other page preferences stay intact.

## Additional entities
FoundDraft binds operation ID, expected revision and captured context; lifecycle editing -> submitting -> failed-before-commit OR committed-unverified -> confirmed. Uncertain outcomes stay committed-unverified with verification only. State must not imply a rolled-back transaction without evidence.
CollectionOptions includes craftingAlternatives:boolean default false; tile preserves assumedZero and minimum, and explicit zero differs from missing stock.
RenderWindow contains replacement page per section, maxGroups, maxTiles and openPanelId; off-page groups are not mounted. ReadState carries abort signal, 1500ms deadline and settlement generation, with guaranteed connection cleanup.
