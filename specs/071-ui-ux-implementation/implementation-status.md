# Implementation status

Implementation was authorized by the user's subsequent “implement” instruction. The prior planning-only boundary is superseded. Work is on `feat/071-ui-ux-implementation`; rollout defaults remain legacy until the independent and manual gates pass.

Implemented slices include the validated shared shell, bounded presentation cache, operation ownership, canonical navigation/Home, conservative native directories, weapons/evidence views, authoring/recovery presentation, intrinsic map/Safe allocations, route binding, guarded original-node selection, and compact boss controls. Existing stores and owning services remain separate.

## Scoped evidence

- Foundation admission/state/ownership tests pass; startup rejects invalid variants before opening services.
- Actual browser activation: 48 map entries (45 tools, canvas, Safe runs, Help) and 29 Guide/Studio entries in each engine; nine generated-family representatives are checked separately. Inventory counts alone are not activation evidence.
- Shell, native/key/upgrade journeys, weapons/update fixtures, authoring/recovery fixtures and reference/mindmap checks pass in Chromium, Firefox and WebKit at their recorded slice revisions.
- Map geometry: 21 cases including short landscape, 320×400, root-text enlargement, actual focus/hit tests and exact camera preservation.
- Real map persistence: held durable acknowledgements, denied-write retry, malformed receipt refusal, exact-payload reconciliation, and guarded SVG save/watchdog are tested without replay.
- Real reload rollback of all five surfaces passes in Chromium, Firefox and WebKit, preserving exact saved state, preferences and managed file hashes.
- Peek/Half/Full/Closed controls preserve original forms and exact map camera; the existing21 geometry cases and focused three-engine mode tests pass.
- Studio original full browser suite passes all three engines, including native skip-link keyboard navigation.
- Modern mobile navigation passes48 real rectangle/hit/focus cases, and independent Guide/authoring visual journeys pass24 cases.
- Historical baseline measurements remain unchanged. Final matching20-run measurements cover five Guide fixtures × three layouts ×20samples ×two variants. Four populated filter owners verify actual completion and clear restoration. This does not measure Map/Studio/Manager latency or establish a performance improvement.

Local receipts are under `.local/` and `tools/hajin-map/.local/`. They contain synthetic fixtures, not exported player workspaces. A receipt belongs to its recorded source/build; it does not automatically approve subsequent changes.

## Open gates

The integrated modern Map runner passed all its owning suites; Guide suites passed individually, including the repaired recovery fixture. Independent scoped source and visual reviews are recorded in checklists/implementation-review.md and review-guide-authoring.md. Matched performance measurements are complete:600 samples have zero geometry/health failures, but timing investigation remains open; balanced120-read follow-up did not reproduce the large sequential gap. See analysis/performance-review.md. Final Map, Home and site-topology runs pass all three engines and are recorded in verification.md. The remaining open task checkboxes, timing acceptance and manual/device gates are explicit; this is a reviewable core preview, not a claim that all70 tasks or default promotion are complete. Actual browser zoom, physical virtual keyboard/touch and screen-reader checks are pending. Root-font scaling and axe results do not replace those checks. Pending checks are not passes and do not authorize default promotion.

The implementation task list remains authoritative; partially completed tasks stay unchecked. No claim is made that all seventy tasks or every manual/device gate has passed.

## Repairs found during implementation

- Invalid display preference bytes are preserved, with session-only fallback.
- One primary-navigation DOM prevents duplicate current-page ownership.
- Layout fallback permits normal page scrolling when chrome leaves insufficient task space.
- Hidden terrain never computes a new camera fit; explicit camera center/zoom survive allocation changes.
- Clean searches are excluded consistently from draft detection.
- Confirmed, failed and unconfirmed writes are distinct; observer kinds are stable identifiers rather than long display labels.
- Frozen marker destinations survive unrelated confirmed saves, with source identity revalidated before display.
- Native source disclosure setup was missing from several older fixtures after feature067. Repairs use real summary controls and retain domain assertions.
- A WebKit readiness predicate is now synchronous and verifies durable inventory before reload.
- Safe-run test setup uses a decode-valid synthetic image and accepted native drag-over sequence; no forced clicks replace user actions.


## Retained owner implementations

Several presentation tasks deliberately retain existing stronger owners instead of replacing them: public search already validates a bounded public-only index and rejects stale lifecycle fetches; Map location and private workspace search remain distinct existing controllers with generation/connection guards and disabled no-position actions. Native mission/story page/chapter/spoiler/progress calculation remains controller-owned; the modern directory/host and scoped feature labels adapt its presentation. Map route/source/find/review errors now enter distinct owner/cause summaries. These are preservation/adaptation decisions, not new indexing, mission data or calculation APIs.

Open task checkboxes include broad acceptance matrices and any adapter requirement not fully evidenced. This document does not equate an isolated passing fixture with all feature071 requirements being accepted.
