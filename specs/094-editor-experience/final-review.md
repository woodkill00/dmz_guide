# Independent implementation review — in progress

2026-11-19. Bounded backend/pure-tools review only; planning readiness remains separate. Inspected page-editor-tools.mjs, page-editor-store history integration, author-store allowlist and author API/shutdown wiring, plus editor-experience pure tools. No frontend or final acceptance claimed.

## EDITTOOLS-01 — P2: queued refresh can spawn after shutdown

scripts/page-editor-tools.mjs:458–469 checks closing before waiting for the repository lock; the locked callback performs multiple asynchronous admission writes and invokes runBuild at513 without rechecking shutdown. close at789–793 sets closing, terminates only the currently assigned child and awaits only the current completion. If refresh is waiting for the lock (or its receipt write) when close runs, close can finish first; refresh then starts a child with no remaining shutdown owner. Author server closes tools before its later active-request drain, so the request drain does not terminate that newly created child.

Required repair: shutdown owns and joins in-flight/queued refresh admissions, rechecks closing after awaited admission work and before spawn, and cannot return while a refresh can still create a child. Preserve durable interrupted/failed receipt and same-request idempotency. Focused oracle: hold repository admission or pre-spawn write, start refresh, close tools/server, release; assert no post-close child spawn (or any already-admitted child is joined/terminated before close resolves), terminal status and no canonical Save replay. Also retain existing timeout/concurrent-instance cases. Static lifecycle finding; not independently reproduced by a new test.

## Evidence and current disposition

Directly read parent-executed test-results/094-tools-runtime.log:8/8 PASS, zero failures/skips/cancels; checkpoint CAS/two slots/corrupt export, five-snapshot/replay, quota and refresh retry/concurrency/timeout are covered. Read094-backend-baseline.log:3/3 PASS. These do not currently cover queued admission crossing shutdown. No additional concrete P1/P2 found in the bounded pure model/history/CAS/API review. Existing exact target, root lock, fixed command/no shell, local author token checks, source/private-state and media rights boundaries remain visible in inspected source. Implementation review remains pending EDITTOOLS-01 and later executed UI/adverse/build evidence. Only reviewer-owned final-review.md written; no production edits.

## Shutdown closure and bounded frontend owner review —2026-11-19

EDITTOOLS-01 resolved: current admissions Set tracks the locked admission promise, closing is checked inside lock and immediately before spawn, and close joins admissions before terminating/joining owned child/completion. Directly read updated parent runtime9/9 PASS including held root lock→queued refresh→close waits→release→zero spawns. No independent execution claimed.

### EDITTOOLS-02 / P2 — late checkpoint callbacks can poison replacement owner

src/client/page-editor-experience.mjs:497–585. diskLoad checks owner/key only in success, but its catch unconditionally changes diskReady/status. checkpointDisk unconditionally assigns global diskRevision/diskMetadata on success before checking key, and catch unconditionally changes diskConflict/status/replace controls. A held old-owner operation finishing after reload/BFCache/target transition can replace the current owner's checkpoint revision or disable it; next current-owner write uses the wrong checksum and reports a false conflict. Guard both branches by captured key/lifecycle/read owner; preserve actual old-target durable receipt separately where required. Do not simply drop a valid same-owner late acknowledgement needed by the queued successor. Test held metadata/save success and failure across replacement owner and persisted return, asserting current revision/status and correct subsequent CAS.

### EDITTOOLS-03 / P2 — stale pattern import can replace newer reviewed candidate

src/client/page-editor-experience.mjs:1133–1147. File.text completion and catch have no request sequence/lifecycle guard. Select held old file A, then review valid B; releasing A can replace pendingPatterns with A or clear B on parse error. Apply then installs a candidate different from the user's latest reviewed import. Capture monotonic import token, target/lifecycle as relevant, invalidate on change/cancel/pagehide; check before success and catch. Test held old valid/invalid file followed by new valid review, then Apply retains only the newest candidate. This is a source finding while UI verification is in progress, not final acceptance.

No production files edited. Original backend finding is closed; frontend findings await owner fix/adverse evidence. Broad final acceptance remains pending.

## Source recheck — checkpoint and pattern ownership repairs

2026-11-19. EDITTOOLS-02 source repair is present: checkpoint metadata failure mirrors read owner/key/stopped guard; disk write success and failure check diskOwner/key/stopped before mutating shared CAS metadata/status. loaded/saved/pagehide invalidate write ownership; pagehide also invalidates metadata owner. Same-owner generation changes retain actual durable checksum and queue current draft, rather than pretending a valid acknowledgement did not commit. Manual replacement uses observed CAS instead of silently rereading/rebasing after confirmation. EDITTOOLS-03 source repair is present: monotonic patternIntent plus generation/key/stopped checks guard both File.text success and catch; edit/pagehide invalidate pending review and disable Apply.

No remaining actionable defect in these inspected guards. Findings remain pending the explicitly promised held-response/read adverse executions; ordinary successful UI journeys do not substitute for those race oracles. No production edits, browser runs, or global final acceptance by this recheck. Backend EDITTOOLS-01 remains closed by source and inspected9/9 runtime receipt.

## Later source/adverse recheck — 2026-11-19

Inspected page-editor-experience-adverse.mjs: actual old valid/invalid File.text completions are held behind newer valid import and applied library asserted; real server checkpoint commit acknowledgements are held, synthetic persisted hide/show replaces lifecycle owner, then both successful and409 old replies are released and current durable checkpoint contents checked. Read Chromium and Firefox PASS terminals at review time; WebKit still pending. These substantiate EDITTOOLS-02/03 closures in executed engines, without claiming a completed all-three terminal. Main094-experience-browser.log has all-three Order/tasks/preview/templates/patterns/batch/media/checkpoint/save-refresh/history/responsive/axe PASS. Parent-run evidence, not reviewer execution.

## EDITTOOLS-04 — P2: stale Compare response replaces newer restore review

src/client/page-editor-experience.mjs:637–644 and667–674 await checkpoint/history reads then call stageRestore without capturing a restore-review request identity or initial generation/lifecycle. A delayed Compare A can resolve after newer Compare B and overwrite its reviewed restore candidate; stageRestore at703 stamps the current generation, so subsequent Apply accepts A. The existing Apply epoch check catches edits after staging, not this outstanding-read race. Same issue permits old pre-pagehide Compare to stage after return. Required: one monotonic restore-review intent covering both entrypoints, capture target/key/generation/lifecycle before await, invalidate on later compare/edit/cancel/pagehide; guard success/catch before staging. Regression: hold Compare A, complete B, release A, assert description/diff/Apply still B; repeat old read across edit/persisted return. Preserve explicit fresh confirmation, source baseline/version and missing-asset checks. Source finding only; no source edits or final acceptance.

## Findings closure recheck — 2026-11-19

EDITTOOLS-01–04 are now closed in the inspected source and focused executed evidence. Shared compareSnapshot captures restoreIntent/generation/key before awaiting, disables previous Apply immediately, and guards both success/catch. Compare/edit/cancel/loaded/saved/pagehide invalidate the intent; pagehide aborts owned tools requests and persisted pageshow creates a new controller. history list also guards request/key/lifecycle failures. No remaining actionable P1/P2 found in this bounded recheck.

Directly inspected adverse test and all-three terminal094-experience-adverse.log: old valid/invalid pattern reads, committed checkpoint success/409 acknowledgements crossing lifecycle replacement, both checkpoint/history Compare A→B ordering, edit/lifecycle invalidation and missing/unverified referenced image refusal. Main094-experience-browser.log has all-three Order+Item end-to-end/responsive/axe PASS. Directly read094-tools-runtime.log12/12 PASS and094-full-runtime.log1099/1099 PASS, zero failures/skips/cancels,500223.1773ms; the12th focused junction case was added after the aggregate and rerun in the12-test suite. Read094-build.log2108 routes+404 PASS. These are parent-executed logs independently inspected, not tests newly run by reviewer.

Final aggregate implementation acceptance remains pending completed compatibility adapter/media/adverse evidence, final package/verification/Python/format/repository receipts and reconciled acceptance scope. No unexecuted terminal or whole-byte-snapshot equivalence is inferred. Only reviewer-owned notes edited; no merge/publication approval.

## Bounded final-delta source recheck — 2026-11-19

Rechecked hidden-document checkpoint admission, anchor-departure/beforeunload timer cancellation and existing pagehide-owned abort/invalidation. These stop an optional clean checkpoint from starting during the navigation interval; browser recovery and canonical Save remain independent. Existing canceled-request diagnostics in094-webkit-adapter-debug.log are retained; its final all-ten adapter PASS is not a claim that requests never cancel. Rechecked outline idempotency: direct old section checkboxes are removed before one selected-state-bound replacement, preserving chosen IDs and preventing duplicate appended controls. No new actionable blocker identified in these narrow changes.

Latest main/adverse log tails again contain all-three PASS. Final compatibility runner and package/Python checks remain pending; no terminal invented. Reconciled stale wording in the reviewer planning checklist to match already-recorded iteration2 closure; original analysis1 history is preserved. Only reviewer artifacts edited.

## T012 Python fixture setup review — 2026-11-19

Inspected tests/test_repository.py diff and existing positive/negative fixtures. The change only excludes named dependency/generated/private-state directories from source-copy setup; validator and assertions remain unchanged. Reviewed upstream mutation/missing skill/lock metadata/task/evidence/link negatives and valid checkout/workflow-state/feature selection cases. These authored provenance inputs are still copied. Acceptable bounded test-only setup repair; no product validation weakening found. The original stopped094-python-tests.log is interrupted, not passing evidence.094-python-final.log was progressing during review and is not yet labelled passed. The list does not include every possible ignored directory (notably.local if present); no universal private-cache exclusion claim is made. Final aggregate review remains pending terminal receipts.

## Visual/compatibility and delivery inspection — 2026-11-19

Viewed actual page-editor-094-live-desktop.png and mobile.png: readable title/destination, distinct Save/Save&refresh/Review/Cancel actions, orderly desktop three-pane selection and narrow Outline/Preview/Fields controls, wrapped task text and no visible horizontal clipping/caption collision. No visual blocker found in these screenshots. Still images do not independently prove focus, physical touch or every viewport; executed browser matrices remain the evidence for those interactions.

Directly read094-editor-compatibility.log all12 terminals (core/media/adverse/adapters across Chromium/Firefox/WebKit), all PASS. Read094-package.log2412 inventoried payload and094-release-verify.log clean2412hashes/native links/owned Node child/exact content. Original interrupted Python runs remain non-pass;094-python-complete.log and focused repository fixture terminals were still pending. Reviewed added.local fixture exclusion as the same bounded generated/private-state copy repair, with validator/assertions unchanged. No new source blocker; final aggregate acceptance awaits actual remaining Python/repository-fixture and final documentation/check receipts.

## T013 refresh-busy recovery source review — 2026-11-19

Current narrow retry selects only GET failure status409 with codeREPOSITORY_BUSY, preserves exact refresh attempt, does not reissue Save/refresh POST and guards lifecycle/epoch/key before status updates. Core API preserves HTTP status/code without changing other failures. No false canonical Save/refreshed success identified. New three-engine forced-busy proof and real fixed-command refresh remain pending at review time.

Deadline precision follow-up: readRefresh checks15000ms only after a rejected request;700ms sleep may cross the cutoff before another GET, and a pending fetch/body has no remaining-time abort. This implements a retry-window rather than a hard15s aggregate read deadline. Enforce remaining-time signal/check-before-attempt if claiming a strict deadline, or explicitly describe the weaker retry-window without inventing bounded network completion. Sent parent this concrete distinction before final acceptance; no production edits.

Directly read094-repository-fixtures-final.log:15/15 positive/negative fixtures OK,161.073s. Interrupted earlier full Python attempts remain non-pass; final complete suite still pending.

## T013 deadline closure source recheck — 2026-11-19

The reported deadline distinction is repaired: readRefresh owns a15000ms AbortController linked to captured tools lifecycle signal, passes it through fetch/body, checks remaining time before each GET and bounds the retry delay, removes listener/timer in finally. Only precise409REPOSITORY_BUSY retries; stale epoch/key/lifecycle cannot repaint, and timeout copy explicitly leaves saved content unchanged. No remaining actionable issue found in this bounded source recheck.

Directly read latest main all-three PASS and094-live-refresh-ui.log real UI→fixed Node build→durable succeeded/same-request replay/no canonical Save or profile writes PASS. Latest adverse tail had Chromium/Firefox terminals while WebKit was pending; do not infer the missing terminal. Final complete Python and final-package verification remain pending; no aggregate final gate yet. Only reviewer notes edited.

## Independent aggregate disposition — 2026-11-19

- [x] Feature094 inspected implementation and scoped local verification accepted.

PASS; no remaining actionable P1/P2 from this independent review. EDITTOOLS-01–04 and T013 deadline follow-up are closed by source repair and executed focused oracles. Planning FR01–12/US1–4/SC01–05 remain covered by T003–T010 without a new private-state/public-auth/schema authority. All-adapter compatibility preserves exact source ownership and original save/recovery contracts; refresh remains independently reported from canonical Save. Visual and source limits are recorded above.

Directly read final receipts: full runtime1099/1099 PASS, zero failures/skips/cancels,500223.1773ms; focused tools12/12 PASS including late junction case after aggregate; main and adverse each Chromium/Firefox/WebKit PASS, including hard15s held status GET, stale import/checkpoint/Compare, quota/source-picture refusal and separate Save/refresh outcomes; original compatibility all12 terminals PASS. Complete Python log reports79 tests OK544.700s (the actual log, not the earlier differently quoted duration); focused repository fixtures15/15 OK161.073s. The trailing SYNTHETIC blocked provider output is an expected fixture following OK, not a failed-suite reinterpretation. Latest package2412 and clean extraction2412hashes/native links/owned child/exact content PASS. Existing final format log PASS/repository0, build2108+404 and actual production UI fixed-build/same-ID replay/no Save PASS were inspected. Screenshots were viewed separately above.

These are parent-executed receipts independently read, plus reviewer source/test/visual inspection; this reviewer did not rerun the full suites. Earlier interrupted Python attempts remain non-pass. Broad runtime preceded bounded frontend T013 corrections; latest three-engine main/adverse and real-build/package gates cover those later deltas, not an invented second1099-test snapshot. Acceptance still had stale package-pending wording at review time; parent must reconcile that now-completed receipt and rerun its final documentation formatting/check gate. This is documentation delivery closure, not an unresolved product defect.

No remote CI, merge/push/deployment, formal accessibility certification, physical-device testing or universal external-filesystem concurrency approval. Only reviewer-owned artifacts changed; parent retains T010/T011 completion, intended diff and any local commit responsibility.

## FR13 mission-instructions amendment — planning review

2026-11-19. Read mission-instructions-repair.md and amended US5/FR13/SC06, plan and T014–016 against the existing chapter placeholder source. Bounded planning READY; no actionable planning blocker. This is presentation of existing canonical steps, not a new source import or claim of verified gameplay. Shared escaped native details with directory collapsed/chapter expanded defaults, independent toggles, existing outer spoiler boundaries, honest future empty state and retained individual guide/Edit links provide clear behavior. All29 chapter routes and87 stored mission/story records have explicit coverage tasks; protected rows remain excluded from public prose rather than treating all-record coverage as permission to reveal.

Implementation and executed T015/T016 evidence remain pending. Verify every visible canonical step/escaping, no placeholder substitution, missing-data behavior, actual directory→chapter→individual navigation, independent keyboard disclosures, narrow200%/axe and no private-progress writes. Prior094 aggregate PASS is historical pre-amendment evidence, not execution of this delta. Only reviewer notes edited.

## FR13 implementation/source and focused evidence review — 2026-11-19

Shared mission-objectives.mjs escapes record ID and every canonical step, uses independent native details without shared name/forced expansion, shows honest future empty state and takes expanded only for chapter rendering. Directory and static chapter call sites retain their existing outer spoiler checks; chapters replace generic description/open-to-view placeholder with instructions and retain full guide/edit anchor. No canonical/source/profile mutation introduced. No actionable defect identified in this bounded rendering review.

Directly read094-mission-instructions-runtime.log7/7 PASS and094-mission-instructions-browser.log all-three PASS:81 nonprotected directory entries with all stored steps,29 chapters, Hajin/X01/detail/Edit, independent keyboard toggles,320–1920/200% and themed axe. The other six existing protected story records are not newly exposed by these rosters;87 stored-record runtime coverage is not81 visible-row coverage. Read094-mission-instructions-webkit-navigation.log final chapter click/editor/save/reload PASS.

Late necessary editor lifecycle repair was also inspected: diskLoad/historyList skip stopped/hidden document; loaded/saved avoid starting optional work after stop; beforeunload aborts optional tools signal and renews it for canceled departure, then pagehide retains full owner invalidation. Reload checkpoint status remains available on metadata failure. No new actionable blocker identified, but beforeunload-cancel/retry and final affected browser/build/format/repository receipts remain pending. Previous094 aggregate PASS remains historical, not a claim that it ran this new source. Reviewer artifacts only; no production edits or final FR13 aggregate closure yet.

## FR13 scoped final repair disposition — 2026-11-19

- [x] FR13/US5/SC06 mission-instructions repair independently accepted locally.

PASS; no remaining actionable blocker in inspected rendering/lifecycle delta. Source conclusions above remain valid: escaped canonical steps,81 visible entries/29 chapter rosters, six protected story records not exposed, independent native disclosures and retained exact individual guide/Edit destinations. No facts/schema/version/private-progress change.

Directly read final parent-executed logs:7/7 focused runtime; instruction browser all-three PASS; chapter editor links all-three PASS; affected main experience and adverse each all-three PASS, including canceled-beforeunload→Reload checkpoint status with retained task/canonical revision. Inspected profile-before/after equality assertion in instruction journey and canceled-departure regression. Read current build2108+404, formatPASS, repository0 and live4173→Hajin/X01→Gear Up→4174 task field read-only PASS. Repair document accurately records receipts, initial WebKit failure and current versus historical boundaries. No tests rerun independently by this reviewer in this final pass.

Prior1099/79/package receipts remain historical before FR13; no second full aggregate/Python/package or remote CI claim. Focused runtime plus affected three-engine rendering/editor/lifecycle regressions and current build/checks provide proportional proof for this presentation repair. Parent may complete T016 and its final documentation delivery checks; no commit/push/merge/publication approval. Only reviewer-owned final-review.md edited.
