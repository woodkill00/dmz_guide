# Independent implementation review — preparation/in progress

2026-11-20. Planning READY remains separate. Production implementation is in progress; this bounded review does not approve unexecuted behavior.

## UNIFY-03 / P2 — incomplete compiled-input freshness fingerprint

scripts/unified-map-bundle.mjs sourceFingerprint currently walks tools/hajin-map/src and server plus shared src/ui and src/domain and fixed entry/config/package files. Existing compiled imports include src/client/raster-editor.mjs and src/content/portable.mjs from workspace/icons.ts and owned-assets.ts, outside that inventory. Changing those runtime dependencies can leave bundle freshness true and admit SkipBuild/readiness against stale code. Required: include actual transitive shared inputs (including HTML module dependencies) or derive a complete reviewed Vite input inventory; fixture must mutate a real excluded dependency and assert stale/rebuild refusal. Static source finding, no test executed or production edit.

## Executable review criteria

- File admission: exactly eight HTML entries/canonical aliases, manifest-only compiled files, finite public roots/MIME/byte caps. Reject decoded traversal/backslashes/hidden/auth files/unknown HTML, missing or mutated hash and symlink/junction at root or ancestor/segment. Unknown map paths never fall through into Guide; private imagery and state never enter artifact/archive. Prove HEAD/method/CSP and plugin Host/Origin/token/body guards unchanged.
- Bundle/readiness: source graph freshness plus exact manifest/status kind/version/base/entry/file/hash caps. Missing/invalid/stale cannot return ready; last-good bytes may survive without a fresh-ready claim. Native installed and guide-only archive paths have distinct tested failure/setup behavior.
- Preference transfer:18 exact keys, absent versus empty, corrupt export but invalid Apply refusal; source origin never fetched, no pending-job/backup receipt/guide values. Review binds file/selection/target bytes/lifecycle; all selected keys compare before write. Partial quota rollback restores only bytes still written by this apply; competing writer and rollback uncertainty retained/exportable, no automatic retry. Main/X01 restoration uses original codecs, no migration flag replay or visibility-mask override.
- Startup/process: exact existing-service recognition, same port/no silent drift, unrelated listener refusal/no kill, both bundles usable before ready, fixed root/command and owned-child disposal.5175 stopped during actual unified smoke; legacy recovery explicit with original storage intact. Optional author4174 independent.
- User proof: all maps/X01 floors, terrain/icons/markers, source APIs, query/hash/back/reload, highlights/strict window-origin-nonce handoffs, synthetic save/restore and unchanged Guide storage in three engines. Current build/source identity and original adverse tests matter; prior095 planning or predecessor receipts are not execution evidence.

Only reviewer-owned file written; no implementation acceptance, merge or publication approval.

## Interim implementation review — 2026-11-20

UNIFY-03 source repair present: fingerprint now walks all shared src, covering previously omitted raster/portable compiled inputs. Mutation/freshness execution remains required; no final acceptance inferred.

### UNIFY-04 / P2 — serving base ancestors not jailed

scripts/unified-map-bundle.mjs safeFile checks the resolved base itself and its relative children, but not intermediate ancestors of that base. A junction/symlink at.local/unified-map or a parent of tools/hajin-map/public can redirect the entire otherwise regular serving directory outside checkout while all checked descendants remain regular. Contract explicitly refuses symlinks at any segment. Use an anchored existing safe-path/ancestor check (including Windows junction) before opening and test root ancestor redirection for compiled/public reads. Current parent has acknowledged and is repairing; do not mark executed yet.

### UNIFY-05 / P2 — several preference settings lack owner-shape admission

src/domain/map-preferences.mjs validPreference admits any non-null bounded JSON for most keys. Migration UI correctly adds real Safe/Loot/roads codecs, so those five are not the finding. Remaining X01/menu/pane/marker/selection UI values still use genericJSON admission, e.g dmz-x01-map-ui-v1 value true or {} is marked applicable though its loader expects valid floor/enabled/grid. Contract requires invalid values unavailable for Apply. Pin each remaining setting's actual owner shape/primitive bounds (or reuse validator), retain originals export-only if invalid; prove wrong shapes disabled plus legitimate current/legacy values accepted. No user storage read/writes by reviewer.

Other bounded observations: migration applies synchronously with exact captured-byte compare and conditional rollback, lifecycle/storage/selection invalidation and inert sourceOrigin. Same request import-success guards generation; old import catch can still paint stale error status over newer review (candidate itself remains newer). Treat this latter feedback-only race as a small follow-up, not a claimed canonical-data loss. Startup finite command/identity checks and API prefix adaptation are in progress; no executed process/security acceptance yet. Only reviewer note edited.

## Repair source recheck —2026-11-20

UNIFY-04 repair present: safeFile walks filesystem root→base ancestors and refuses linked/non-directory components before relative path checks. UNIFY-03 shared src walk and environment/provider fingerprint inputs present. Parent reports focused junction/dependency-mutation tests; completed exact matrix receipts remain required for final acceptance.

UNIFY-05 owner shapes are now substantially pinned: X01 floor/enabled plus UI category enum checks, menu positions, selection dimensions, grid/tracker primitives and marker-size strings; real Safe/Loot/roads codecs remain UI owners. One concrete legitimate-value mismatch remains: map-preferences.mjs accepts dmz-ui-map-pane-v1 width240–1600 while existing map/task-resize.ts loader accepts180–4096 and dynamic persisted widths can exceed1600. This wrongly marks a valid legacy preference unavailable. Align actual owner bounds and test180/4096 plus out-of-range rejection. No storage corruption claimed; original remains exportable. Other03/04 repair claims are source-reviewed, not global acceptance. Production untouched.

## Source/focused repair closure — 2026-11-20

UNIFY-03–05 are closed in the inspected source/focused evidence. Pane migration now matches actual180–4096 owner range with both boundary positives and179/4097 negatives. X01 invalid shapes/enum checks and real Safe/Loot/roads codecs remain; marker-size raw strings preserved. Ancestor walk and shared-src fingerprint fixes remain present. Directly read095-contracts.log10/10 PASS, zero failures/skips/cancels, including conditional rollback/empty-vs-absent, finite route/HEAD/MIME/tamper/origin and linked-ancestor/shared-dependency tests. These are parent-executed receipts independently inspected, not reviewer-run tests.

Read docs/unified-local-site.md: one fixed address/SkipBuild/optional author/explicit legacy command, separate origins and main/X01 codecs, private settings export, recovery-only source filters, conditional rollback and restricted assets accurately explain scope. No remaining concrete P1/P2 found in this bounded recheck. Final current three-engine maps/handoffs/migration, aggregate runtime/Python/build/release/startup and source identity receipts remain pending; historical smoke is not current final acceptance. Only reviewer-owned notes changed.

## Current terminals and conditional disposition —2026-11-20

Rechecked X01 setFloor: off-floor selection is cleared, marker query removed when no selection, floor query retained. Same-floor marker selection is preserved. This addresses the retained marker forcing old floor after reload without changing stored workspace facts. Development-mode compiled bundle includes existing local provider configuration while keeping Vite absent from normal serving; source/config fingerprint remains required.

Directly read1113/1113 runtime PASS467925.9658ms,243/243 map unit PASS, current three-engine unified smoke PASS, unrelated raw TCP occupied listener refused/untouched then fresh+idempotent startup PASS, and clean2415hashes/native links/ownedchild/exactcontent PASS. Complete Python log is79 tests with one reproducibility failure505.099s, not aggregate PASS; proposed live-edit cause is not independently proven. Stable reproduction rerun still pending at inspection.

### UNIFY-06 / P2 — required integrated owner proofs still missing

Read tests/browser/unified-local-site.mjs: it proves routed apps/markers/popup/floor reload, one grid preference import and a synthetic localStorage sentinel. It does not exercise actual Guide profile/armory state, Hajin/X01 workspace backup preview/restore/CAS, or reviewed collection/run/boss handoff window/origin/nonce negatives on the new same origin. T009 and SC02/03 explicitly require these affected owner boundaries. Provide proportional existing or new owner journeys against/map/ and true Guide state, with both valid handoff and wrong sender/origin/nonce refusal; no need unrelated broad redesign. Until those receipts and reproducibility resolution arrive, only the inspected smoke/source subset is conditionally supported, not full095acceptance. No new production defect claimed; reviewer notes only.

## Integrated owner evidence and X01 Blob repair —2026-11-20

Directly read095-workspace.log Chromium/Firefox/WebKit PASS for real persisted Guide inventory, Hajin backup preview/backup-before-replace/restore/reload and exact collection origin/window/nonce refusal.095-run-handoff.log Guide-to-map run-plan handoff PASS. Stable095-repro-recheck.log1/1 OK434.516s closes the failed reproducibility case as a separately executed rerun; original Python78/79 remains historical, not retroactively aggregate PASS. These close the corresponding portions of UNIFY-06; X01 owner terminal remains pending.

Inspected workbench-store.ts memory-backed Blob repair: existing state/photo sizes (20MiB aggregate,2MiB each) are validated first; byte materialization is awaited before starting unchanged readwrite CAS. Metadata/pixel bytes are retained; same revision comparison, atomic put and transaction-complete acknowledgement remain. No schema or demonstrated loss defect found in this narrow change. Optional hardening: clone captured state/revision before asynchronous materialization and revalidate durable result, since shallow metadata arrays and live next.revision remain referenced. This is not a new independently reproduced blocker. Current X01 owner log still records original WebKit failure; await fresh exact three-engine terminal before closure. Production untouched.

## X01 internal byte-codec design review —2026-11-20

Actual WebKit still rejects persisted Blob backing, so prior memory-Blob attempt is not accepted as a fix. Proposed versioned internal wrapper with Uint8Array photo bytes is a reasonable bounded storage-only repair; design READY subject to exact owning contract and implementation review. Keep DB/store/key and external PrivateState/backup schema unchanged, legacy5175 data untouched.

Required admission: strict wrapper version/kind/state/byte shape; at most20 photos,2MiB each/20MiB aggregate measured actual Uint8Array byteLength before Blob reconstruction; validate reconstructed complete state. Only absent undefined is empty; present null/malformed/future wrapper must fail closed and remain unchanged. Capture isolated state/revision before awaits; convert all photo bytes before transaction; latest decode/revision comparison and atomic wrapper put stay synchronous inside the original CAS transaction. Conversion/put failure preserves old row; no optimistic acknowledgement. Legacy raw Blob rows remain readable and backup exports preserve original exact bytes. Required proof: legacy→wrapper save/reload, future/corrupt same-revision refusal, stale CAS, quota/failure and actual photo hashes+owner workflows all-three engines. No fixture weakening or bitmap/health waiver. Code and executed proof pending.

## Portable X01 codec and owner-proof closure —2026-11-20

Current codec source review supports the repair: encode clones validated state before asynchronous Blob reads and revalidates packed result; exact versioned envelope/photo fields, actual Uint8Array2MiB/20MiB caps and immutable revision are retained. Decode is synchronous within original CAS transaction; getAll(current,1) distinguishes absence from a present undefined row and refuses malformed/future data. Atomic wrapper put is acknowledged only on transaction completion. Legacy Blob rows remain readable; external backup still contains original metadata/pixels. No remaining concrete safety blocker found in this bounded delta.

Directly read095-x01-owner.log Chromium/Firefox/WebKit full owner workflows PASS;095-map-runtime.log244/244 PASS and current map typecheck clean. Reviewed codec tests for legacy/encoded photo hashes/backup, mutable caller isolation and future/malformed/oversized rejection. Previously inspected integrated workspace all-three, strict collection sender/window/origin/nonce, real Guide inventory and run-plan proof now close UNIFY-06. Stable reproducibility1/1 PASS434.516s resolves the previously failed case as a separate rerun, not an invented all-pass original Python aggregate.

Source and scoped owner evidence are ready; final aggregate disposition awaits reconciled acceptance currently still saying map243/repro pending and omitting new integrated/codec proofs, plus final build/release-byte boundary and formatting/repository receipts. Earlier guide1113/release2415 remain historical where late X01 changes postdate them; parent must label executed scopes accurately. Only reviewer notes edited; no PR/merge/publication approval.

## Final independent bounded acceptance —2026-11-20

- [x] Feature095 inspected implementation and scoped local verification accepted.

PASS; no remaining actionable blocker in the reviewed implementation. UNIFY-03–06 are closed by repairs and focused/integrated proof. Exact bundle/file admission, ancestor refusal, source freshness, owner-specific preference validation/conditional rollback, existing workspace backup ownership, strict same-origin handoffs and one-listener startup remain the inspected boundaries. No private data automatically migrates or merges; explicit legacy origin/export remains necessary. Portable X01 storage is a new internal envelope with unchanged external backup format; downgrade refusal/export advice is documented.

Re-read updated acceptance and current terminals: guide1113/1113, map244/244/typecheck, contracts10/10, three-engine route/marker/floor smoke, real Guide inventory/Hajin backup/strict collection handoffs all-three, run-plan proof, X01 full owner/photo/backup/adverse all-three after getAll refinement, occupied-port/owned fresh/idempotent startup, guide-only2415hash/native-link/exact-content verification and structural0. Python original78/79 plus stable repro1/1 OK434.516s provide passing evidence for every case; original aggregate is not labelled all-pass. Updated acceptance accurately distinguishes smoke from integrated owner proof and current map deltas from historical unchanged guide inputs.

095-source-match.log records parent verification of unchanged guide build/release source boundary; this reviewer inspected that receipt, not a newly executed independent hash comparison. Late map-only source was rebuilt/typechecked/tested separately; guide1113/archive2415 are not invented reruns. Parent reports final whitespace check and ready SkipBuild service. Earlier inspected browser screenshots and scope limits remain, with no claim of physical-device certification, universal user-browser migration, remote CI or public distribution. No production files edited or PR/merge approval by reviewer; authorized Git delivery remains parent's separate responsibility.
