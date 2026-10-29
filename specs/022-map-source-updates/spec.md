# Feature022: Source links and local updates
Created2026-10-28. Status: implemented; see acceptance.md for executed checks and boundaries. User requests linked website names in master selectors and a Map key action to fetch current source data without duplicate additions. Prior explicit source-collection authorization persists; redistribution is not implied.

## Stories and acceptance
US1 Source navigation: website names beside master checkboxes open the correct map in a new tab, without toggling visibility or losing draft state; keyboard-operable links.
US2 Update: Map key starts a bounded local check of official/CODMunity/WZStats/CODCentral, shows per-source progress, previews added/changed/missing records and category changes, then applies validated updates. Repeating an unchanged check creates no duplicate captures or workspace entries. Failed/blocked/schema-changed/frame-changed sources retain their previous data with an explicit status.
US3 Recovery: snapshots remain immutable, prior evidence/custom points/icons/views/flags/exceptions survive, affected reviewed decisions become stale. Quota/CAS/activation failure is explicit and recoverable; no false all-updated success. Source missing records are reported and older snapshots retained.

## Requirements
FR001 Link each displayed site name to its registered HTTPS map URL, new tab/noopener, independent from checkbox activation.
FR002 Local-only owner-enabled update service for exactly four registered sites; no arbitrary URL/command/path inputs, no credentials/auth bypass, no deployment. Static/preview builds explain unavailability. Only explicit Update initiates source requests.
FR003 Bound requests/bytes/time/parser/image input and validate inert source records/icons. Remote scripts never execute in Node or the parser browser. Reuse reviewed affine calibration only when exact source image digest and declared frame match; otherwise keep prior source and require alignment review. Official frame must remain canonical.
FR004 Preview all source outcomes and stable-ID record/category diffs. One Apply updates eligible data; unchanged semantic captures/versions are reused. Display duplicate rules still require matching name and position, with existing category/floor/build protections.
FR005 Atomic file pointer activation over immutable generation assets with rollback pointer, process/file lock and baseline CAS. Browser workspace imports are revision-checked and atomic, preserve history and private metadata, and reuse identical snapshots instead of accumulating repeats. Two-phase workspace/file failures surface explicit activation-pending/retry rather than pretending cross-store atomicity.
FR006 Preserve all authorized local data outside Git. Protect write routes with loopback host/origin checks, random server token, small JSON bodies and fixed job IDs. Cancel/timeouts leave active data unchanged. Source errors never erase a good source.
FR007 Keyboard/360px accessible progress/preview/retry controls; draft guards; source links and existing map/backup/duplicate/authoring behavior regress neither function nor state. Test synthetic/offline by default; optional authorized live smoke separately recorded.

SC001 Unit/server/browser tests cover links/no checkbox toggle, all four adapters, stable IDs/idempotence, bounds/inertness/frame rejection, route security, staging/CAS/rollback/cancel/partial outcomes and private workspace preservation.
SC002 Existing map unit/browser/production performance checks pass;0 unexpected provider requests outside explicit update tests. Real assets/permission declarations stay ignored.
SC003 Analyze/converge and independent security/domain/UI review close actionable findings; exact executed results and limitations recorded.
