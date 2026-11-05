# Lifecycle, draft, focus and route contracts

## Dirty intent / saving states

Only one active editing owner. Same-task selection does not rebuild or reset its draft. A departure includes task, selected-record replacement, pack/profile, global link or same-tab Back. Capture the FIRST intent with origin/destination/context/revision/focus key; while guard is open, later attempts do not retarget it. Modified/new-tab links retain native behavior and do not depart this owner. Nonmodal tool changes invoke the guard before replacing DOM.

- **Editing/guarded:** Save validates then delegates to real controller; validation failure keeps values/destination and exposes field error. Discard is available only when no noncancelable commit is handed off; it discards the current owned draft, not unrelated domain state. Stay clears departure only and returns to draft/recovery.
- **Preparing:** cancellation only through actual existing controller/token capability. Aborting a request does not claim an already committed write was undone.
- **Committing:** disable conflicting submit/Discard/replacement; leave status readable and UI responsive. A real durable receipt is the only success signal. Watchdog at10seconds if no earlier domain deadline displays Still waiting/unconfirmed, not success/failure/rollback, and exposes status/recovery help. Preserve operation/unsaved references. Existing domain deadlines/recovery remain authoritative; do not reset their clocks on UI movement.
- **Confirmed:** apply original owner result once, verify receipt/current context/revision and revalidate frozen destination. Navigate only if still valid; otherwise stay with explanation. Duplicate/late callbacks do not repeat mutation or navigation.
- **Failed/unconfirmed:** preserve draft, pending destination and existing recovery metadata; no automatic resubmission. Retry explicitly revalidates current state/new operation. Stay clears navigation intent only. For a commit whose outcome is still unknown, keep Check status/read-only guide (new tab)/supported export or recovery access available; do not create an endless disabled blank screen. Discard/retry of uncertain write stays guarded until real reconciliation proves it safe. A timer cannot silently abandon a commit or invent a recovery export unsupported by its owner.

The presentation observer may time out its view update; it cannot cancel or rollback an owned domain write. There is no new persistent transaction journal or domain migration. Existing stores/controllers own retained snapshots/CAS/atomic files. Cross-owner UI failure must not clear those stores.

## Operation ownership

Every read/search/prepare/save/update observation captures owner token, view+draft generation, context/pack/profile and expected revision. Before touching UI, verify owner is connected/current, phase accepts result, generation matches and focus/feedback ownership is still relevant. Stale completions may be reconciled by the original domain owner but cannot update a newer view or revive a discarded draft. An operation that began committing is never treated as an abortable read.

Dispose/pagehide invalidates UI generations and aborts only supported reads/preparation; BFCache/pageshow reconciles authoritative state before enabling writes and must not duplicate listeners/workers or replay pending operations. Source/catalog/pack changes invalidate stale reference results. Current cache/route masks/stock are read from owners, not restored from view snapshots. Route/source workers retain existing initialization, stale result, cancellation, deadlines and capacity behavior.

## Focus

Before destructive DOM replacement capture stable origin/control identity and user-focus generation. Deliberate Back/close restores surviving origin row/control; otherwise nearest valid result then named task/list heading. Rebuilding masks/counters does not replace focused inputs unnecessarily. Async completion does not steal focus from a newer connected control. Pending navigation success moves focus according to new page/task semantics only once. Filtering/removal/capture replacement rejects stale selector keys; use validated DOM-key maps or getElementById, never evaluate imported strings as CSS/HTML. Modal focus is contained; dismiss restores the correct existing trigger/fallback.

## Route actions

Render action binding `{routeId,expectedRevision,waypointToken}` and validate it **inside** existing atomic change/CAS boundary. Reordering, deletion, source replacement, pack change or selecting another route before activation invalidates binding. Refuse/refresh with explanation rather than recompute next from whichever route is now active.

Preserve baseline field-guide-ui.ts resolved-point guard: Mark reached requires current waypoint resolution and normal write/draft guards. Locate requires coordinates/current permitted inspection. A road solve failure or recalculation alone is NOT a new authorization failure for valid manual progress. Selection or layer hiding does not remove/reorder route or retarget its next action. Undo binds exact prior confirmed action and revision; refuse if superseded, never undo unrelated progress. Display direct/local/partial roads truthfully, draw no invented connecting road, manual tracking only. Completion remains complete until explicit existing reset, never wraps modulo.

Safe runs remains a distinct owner/worker/road source. Applying main private road edits, profile values or map cache to it implicitly is prohibited. Geometry changes never advance route progress or recenter terrain; only explicit Locate/Zoom intent may change camera.
