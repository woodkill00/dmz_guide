# Local contracts (draft)

## RunPlanV1

Stored under `content/run-plans:<packId>` with `kind=dmz-run-plans`, `version=1`, `packId`, `contentVersion`, `revision` and at most eight ordered plans. Each plan has an ID, name (1–80 chars), date, at most 32 typed objective references, 64 registered stop IDs and 64 item reservations. References are IDs, never authoritative new game facts. `revision` uses existing compare-and-swap storage. A changed catalog version marks the plan stale; it does not rebind names or allocate stock.

Reservation rows read saved FOB stash, carried stock and protected reserves. Unknown stash remains unknown. Earlier plans in the visible order allocate first; moving a plan previews changed shortages. Reserving is a forecast only and never subtracts stock. Current implementation: `src/domain/run-plans.mjs`; the UI supports naming, ordering, objectives, recorded stops, keyed access and item reservations. Key packing follows only explicitly selected key uses and their recorded required-use chain. Stops alone do not imply a particular locked room.

## RunReviewV1 (domain foundation)

Bounded staged entries identify their owner and expected revision. A confirmed owner write emits a receipt with that owner's advanced revision. The review document is saved independently with compare-and-swap under `content/run-review:<packId>`. A missing acknowledgement can mark a row `uncertain`; it cannot be replayed until the owner outcome is reconciled. The owner save adapters and queue UI remain pending. No cross-origin atomic transaction is promised.

## PlanHandoffV1 (planned)

The existing collection handoff transports only allowlisted public record IDs and registered map references. The map asks for acceptance, sends no private stock/notes, and offers a return link. A stale or rejected transfer leaves both origins unchanged.

## PlayerImportPreviewV1

This is a file-only, bounded preview for an approved future contract. No live account connector, session-cookie import or unsupported-field write exists. The current preview always reports `canApply=false` because no approved export schema exists. It never returns a profile mutation candidate.
