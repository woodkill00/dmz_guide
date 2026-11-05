# Presentation data model (no domain-schema migration)

## TaskViewEntry / ViewCache

Key: validated task ID + current workspace/pack/profile context identity, using existing identity validators (opaque references, never selector/HTML fragments). Fields: task ID, context revision/capture identities, query+scope, public sort/group/filter presentation, expanded control IDs, finite scroll anchor/offset, optional invoking-focus key, and one DetailSubview `{recordRef,returnAnchor}`. Persistent domain source masks, route/progress/stock and editor values are references to owners, not copies.

Constraints: memory-only LRU≤8entries **including active**; detail is part of that entry. Total serialized UTF-8≤64KiB; query≤256UTF-16 code units;≤128expanded IDs validated against current mounted control-key allowlist. Numeric offsets finite,nonnegative and clamped to current scroll range. Reject invalid identity, do not truncate it. On admission pressure evict oldest clean inactive display entry. If active return entry exceeds bound, retain minimal valid task/query/anchor and drop optional expansion state with a quiet display-restoration notice; never drop draft/recovery. No generic cache owns a dirty editor. At most one active editing owner, enforced by existing guards. Pack/profile change clears incompatible display entries; capture change invalidates stale record/focus references while keeping applicable current query. This never restores old domain masks/progress.

Query scopes: public index, map-location and private workspace remain explicit. A workspace query may exist in memory only and is never logged/exported/shared/indexed by this cache. Size metrics contain counts/bytes, not query/notes. Existing validated domain limits prevail for referenced IDs.

## NavigationIntent

Fields: monotonic intent ID, destination kind/feature/ref, origin task/focus key, source context/pack/profile identity and expected revision. One pending intent; first wins while guard is open. State: idle→guarded→saving→confirmed-success or failed/unknown; Stay→cleared without draft loss. Success revalidates context/destination before navigation. Rejected/unavailable target remains in current owner with explanation; no substitution. Browser modified/new-tab actions are native and excluded. Intent never persists private payload/URL query.

## OperationOwner

Fields: owner ID, operation token, monotonic view generation, validated context/pack/profile/revision and draft generation, phase `{reading,preparing,committing,confirmed,failed,unconfirmed,disposed}`, existing controller receipt/recovery reference, abort capability (only if real controller supports it). It is not a second write engine. UI observer transitions and late result rules are in lifecycle contract. New viewgeneration does not imply canceling an already handed-off commit. Recovery stays with existing controller/store; no new domain journal/schema.

## RouteActionBinding

Fields: exact route ID, expected domain revision, stable waypoint token, action kind, and prior confirmed action ID for Undo. Validate atomically at mutation, retain resolved-point/current write guards. No selected-marker dependency; road solve state is display data, not progress authorization.

## LayoutSnapshot / DisplayPreferences

LayoutSnapshot: visual viewport width/height and offsets, measured shell/context/pane/route/status/terrain rectangles, active mode/scroll owner, focused control and task ID. Store synthetic measurements without private text. Preferences: versioned per-surface theme/density/optional clean dimensions only. Read at most16KiB per preference record; invalid/oversize/unknown version uses usable default and preserves original key/bytes untouched. Existing business/profile stores never written by preference validation. Flags/default promotion separate from player data.


Rollout flags are trusted build/startup configuration in new src/ui/presentation-flags.json, NOT DisplayPreferences. Schema/version/surface IDs, process override precedence, fail-preparation behavior, static/no-JS variants and promotion are normative in contracts/rollout.md.

IssueSummary is a shared presentation primitive, not a new persistent error store: it reads bounded current issue references from their existing owners, groups by stable owner/cause/context, retains unresolved blocking-write priority, and emits ONE visible aggregate per active workspace with links to owner details. Child source/route/editor owners do not independently add stacked banners. Routine ready never clears unresolved blocking issues; inactive-context issues remain with their owner, not a cross-origin global queue.
