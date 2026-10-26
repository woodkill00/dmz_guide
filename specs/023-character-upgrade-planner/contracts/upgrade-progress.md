# Contract: upgrade progress and compatibility

## Central semantics

`upgradeProgressFor(pack, profile, objectiveId)` returns the sole effective upgrade completion/availability and review flag. `isObjectiveCompleted` suppresses upgrade demand only for explicit completed. `isPrerequisiteSatisfied` distinguishes completion of a purchased upgrade from an explicit unlock-only objective: new upgrade availability never satisfies a purchase prerequisite. Existing non-upgrade unlocked semantics remain unchanged until a separately reviewed change.

Both `planSingle` and `planShared`, progression rows, filters, reset, local record pages, the inventory page’s “Known prerequisite state” controls and every mutation call the same semantic layer. `src/client/profile.mjs` must stop writing upgrade IDs directly into generic completion; non-upgrade controls retain their legacy behavior. Tests edit the same upgrade from inventory and progression in both directions and assert one shared state after save/reload. No UI directly writes both completion maps. A genuine unlock flag remains a separate sourced non-upgrade objective; availability is never used as its proxy.

## Mutations

- Set availability or completion validates selected pack, objective track, state and expected profile revision, returns a candidate copy, then uses existing atomic save.
- Setting the same value twice is idempotent; duplicate pending clicks do not start parallel saves.
- Mark completed changes progress only; inventory/reserves/goals/routes/watchPins unchanged. Required confirmation copy: “Recording progress only; update inventory after an in-game purchase.” This is not a purchase button.
- Undo/correction restores prior progress only after revision-aware confirmation; no refund or fabricated inventory. Reset previews the selected pack/revision and clears only progress (generic + upgrades), preserving inventory, reserves, focus, routes and watch pins.
- Failed/quota/conflicting save leaves committed state unchanged and retains the candidate for export or explicit reconciliation. Newer pack navigation cancels stale confirmation; no automatic retry against a newer revision.

## Migration and backups

Use [data-model.md](../data-model.md) v1→v2 mapping. Preserve original legacy states and untouched non-upgrade fields; ambiguous unlocked is review-required. A v2 backup includes both progress domains and watch pins, with schema version, pack/content version and existing limits. Older readers reject unsupported v2 explicitly, never silently drop fields. V2 reader accepts v1 via preview. Cross-pack restore is rejected. Rebind previews unresolved/retired/changed references without auto-clearing inventory or marking new tiers complete. A public content export never includes this profile.

## Required state truth table

| Completion | Availability | Remaining demand | Ready claim |
|---|---|---|---|
| unknown | unknown/locked/available | Included, labeled not marked complete | Blocked unless all independent readiness evidence is known; unknown completion stays explicit |
| incomplete | available | Included | Only if mechanics, prerequisites, stock and live applicability are cleared; partial known-cost arithmetic is separate |
| incomplete | locked/unknown | Included for later/unknown horizon | No |
| completed | any | Excluded | “Recorded completed”, not a live-game readiness assertion |
| migrated ambiguous unlocked | unknown, reviewRequired | Included with review warning | No |

Setting a higher tier completed does not change lower tier entries. Conflicting evidence remains disputed after manual completion; user progress cannot verify a recipe.

## Authorized spending amendment (2026-10-26)

The mutation rules above remain the **status-only correction** path. A separately labeled and acknowledged purchase-recording action now follows [upgrade-spending.md](upgrade-spending.md): it atomically deducts costs, marks completion and appends immutable history. Profile v3 is required for that action; v1/v2 stay readable and migrate explicitly. Ordinary progress correction/reset never creates a purchase or refund and preserves spendHistory/active-purchase duplicate guards. Whole-profile reset also preserves spending history; explicit backup replacement previews any history loss. The earlier v2-only text describes the accepted baseline, not a restriction on the new v3 format.
