# CI repair assessment and verification

This bounded repair belongs to the integrated guide feature. The optional bug extension was not installed or invoked. The owning feature's specification, plan, tasks, independent checklist and convergence gate remain applicable.

## Observations and scope

Main `37a8462e46e4aa82b2f510e46b68a46a1642ed50`, quality run [40919589817](https://github.com/woodkill00/dmz_guide/actions/runs/40919589817), failed two runtime browser jobs. The final premerge tree was identical and passed [40919555190](https://github.com/woodkill00/dmz_guide/actions/runs/40919555190). A preceding pass does not waive either failure.

- Ubuntu spending acceptance: after a selected-pack change invalidated an open purchase preview, the modal was closed, the replacement picker was connected and enabled, but focus remained on BODY rather than `#pack-select` for the existing 2-second endpoint assertion. The original independent browser scenario remains unchanged.
- Windows Studio artifact `12917689298` (`sha256:a55dc224d495b3230472c62d6545f9e76b48a9f248fd5882c5144c4cc02acf12`) gives the underlying diagnostic: loading `/assets/src/content/limits.mjs` failed with `net::ERR_NO_BUFFER_SPACE`. Studio never started, remained “Connecting to the local repository…”, and had zero catalog options. This is an observed browser/network resource failure, not evidence that the selected-record resolution was incorrect. Resource exhaustion's underlying host cause is not proven. No speculative Studio selection patch, relaxed assertion, ignored diagnostic or automatic reload is introduced.

## Requirements and plan

- CI-R1: Invalidation without focus restoration must release a focused descendant of the old modal synchronously before native close, so its subsequent cleanup cannot carry stale modal focus into a new view.
- CI-R2: Never blur newer focus outside that modal. Normal cancel/apply focus restoration and cancellation guards remain intact.
- CI-R3: Preserve the original failing browser endpoint assertions and strict health checks. All final required CI, including Windows Studio, must pass before merge/readiness.

Change only `src/client/dialog-focus.mjs` and its focused unit regression. The no-restore branch cancels pending restoration, blurs only a current modal descendant, then closes the modal. No timers, retries, global focus, security setting or catalog behavior changes. Rollback is the isolated source/test commit.

## Reproduction and evidence

- Before fix: focused runtime suite 13 PASS / 1 FAIL. The added deterministic DOM contract reproduces closing with the stale modal descendant still focused; the failure is “A stale modal control must not carry native blur into the next view”. This is a lifecycle contract reproduction, not a claim that local Chromium reproduced the original CI scheduling.
- Browser suites locally NOT RUN past launch: normal Chromium exits on `socket() failed: Operation not permitted`; requested normal unsandboxed execution failed during environment setup with a read-only runtime path. No sandbox weakening or denied-path reads were attempted. Local Studio also lacks the configured Google Chrome channel executable.
- Final focused/full runtime and integrated browser results: pending below/owning acceptance. Windows transport recurrence remains an acceptance blocker, not a waived failure.

## Analysis and convergence

The change is bounded to invalidation, preserves normal restoration, and has positive and negative focus ownership tests. Reviewers must validate the focus reasoning and final browser evidence independently. Do not mark the Windows module-load problem “fixed” without a successful final run; no unsupported host-resource remedy is claimed.

## Local verification after bounded change

- Focused lifecycle runtime tests: 14 PASS / 0 FAIL (baseline with the added regression: 13 PASS / 1 FAIL).
- Full `npm test`: 598 PASS / 0 FAIL / 1 Windows-only skip on this Linux executor.
- `python scripts/check.py`: 0 failures.
- `npm run format:check`: PASS.
- `npm run build`: PASS, 214 independent HTML routes plus 404 for this repair-only baseline.
- `python -m unittest discover -s tests -v`: 40 PASS.
- Original Chromium/Windows Studio failing acceptance scenarios: still require integrated CI execution. The local launch blockers above are NOT RUN, not PASS.

## Later Windows readiness-fixture failure (retained)

PR #28 head `bf494817`, quality run [40948873912](https://github.com/woodkill00/dmz_guide/actions/runs/40948873912), Windows runtime job `123711333488`: the delayed-bootstrap occupied-port negative fixture exceeded its unchanged 700 ms outcome budget. Total elapsed was 1902 ms, including the deliberate 1100 ms bootstrap delay. Live handshake PID 7416 matched the owned child; cleanup was confirmed. There was no successful-bind marker, HTTP probe or stderr, so the expected `EADDRINUSE` outcome did not reach the harness before cancellation. This evidence does not distinguish delayed trigger filesystem delivery, child scheduling or OS bind latency; it does not demonstrate an application regression. The ordinary occupied-port case passed (~159 ms), and the delayed caller-cancellation case passed (~1191 ms).

Focused local verification on Linux (`node --test --test-name-pattern='occupied port|fixture outcome timeout|cold bootstrap' tests/runtime/server-readiness.test.mjs`) passed all four cases, including the delayed occupied-port case (~1201 ms overall), fatal 700 ms outcome timeout with actual child cleanup, and cold-bootstrap 700 ms deadline. This is not Windows reproduction. No deadline, cleanup assertion, trigger behavior or production helper changed. The next integrated head's normal Windows CI must pass; this prior run remains FAIL, and Windows recurrence would require further diagnosis rather than retries until green.

## Windows Studio observer supervision repair

On integrated head `f256afe7`, [quality run 40951633665](https://github.com/woodkill00/dmz_guide/actions/runs/40951633665), Windows job `123720981436` ended with an **unhandled promise rejection** from the 30-second `/api/save` response observer in `upgrades-studio.mjs`. Artifact `12933040390` (`sha256:f913fb6cd8896449d3a84bdbb0530b05badd6651d800261afef0e96792000bcb`) contains 1,443 files but no Studio failure diagnostic. The process exited before the scenario catch/cleanup could preserve the current page state. The underlying save/interaction failure cannot be inferred from that incomplete evidence.

Assessment: the harness created response observers, awaited a potentially pending click first, and attached rejection handlers to response promises only afterward. An observer could therefore reject unhandled while another action/observer remained pending. The same issue existed in initial navigation's `/api/changes` observer. Repair: immediately supervise every observer and its initiating action together through a fail-fast `Promise.all` helper. Preserve response status/body-finished assertions, the existing 30-second bounds, exact catalog roundtrip equality, strict health checking and owned-server handoff/cleanup. No production application change or automatic retry is added.

On caught failure, capture a bounded tail (80 entries per event category) of requests, responses, failed requests, console errors and page errors plus selected catalog, current save/error text, busy/preview/control state before closing the owned context/server. Synthetic fixtures only; no private profiles are collected. Three deterministic runtime tests cover an observer rejecting while the UI action is pending, a later observer rejection after fail-fast handling, action failure identity, and successful response ordering. They pass locally. Integrated browser CI remains required to establish whether the original save flow succeeds or expose its underlying cause; this run remains FAIL.

Observer repair local verification: 11 observer/ownership focused tests PASS, including a caught response failure while its action is still pending, diagnostic persistence and exact current-server/context closure. The first full run exposed four outdated lifecycle mocks lacking the newly observed page API; the mocks were extended without changing their ownership/error assertions. The corrected full runtime run passed 602 tests with one Windows-only skip; repository and formatting checks passed. Actual Windows Studio remains pending integrated CI, not locally verified.

## Windows first-save write amplification (2026-10-29)

Quality run `40956690486`, Windows job `123738496296`, PR head `ff582c15`
(merge SHA `7278d540`) now retains `studio-chromium-failure.json` in artifact
`12933094816`. The first `demo-training` synthetic save issued `POST /api/save`
but received no response within the unchanged 30-second observer deadline. The
page remained busy with “Saving validated repository files…”. Initial modules,
session, catalog and change summary all returned 200; no console, page or
request-failure errors were recorded. This is not a missed button click.

An isolated copy of the integrated repository reproduces a concrete amplification
bug: a change to only the demo pack header asks the actual author store to rewrite
650 files, including 649 untouched source-catalog JSON files. The imported JSON
used insertion-order keys rather than the existing `catalogJSON` canonical sorted
keys. Every unrelated rewrite incurs the full durable journal/backup/install
protocol. A local Linux profile measured 8.18 seconds, 117,818 `lstat`, 46,017
`readdir` and 10,987 `open` calls. After canonicalizing those 649 files with the
existing serializer, the identical save changes exactly one file and measured
3.28 seconds, 61,355 `lstat`, 7,726 `readdir` and 3,848 `open` calls. These timings
are diagnostic observations, not a cross-platform performance guarantee.

The repair changes key order only. Parsed JSON equality was verified for all 649
files (including array order and all values); no game facts, identities, catalog
membership, private state, schema or transaction behavior changes. No deadline,
HTTP/status assertion, filesystem safety check or health check is relaxed. A
runtime regression requires all checked-in catalog bytes to match the canonical
serializer, then performs an actual isolated store save and asserts exactly the
edited demo header/objective are written while every other source/media file is
byte-identical. Restoring one original noncanonical claim makes this regression
fail before a save. Windows CI must establish whether eliminating the measured
amplification resolves its deadline failure; local evidence alone cannot do so.

Local validation of this repair: full runtime suite 615 tests / 614 passed /
1 Windows-only skipped / 0 failed; canonical-byte and actual-write-set regression
passed, with the deliberate original-byte negative case failing as expected;
repository contracts, formatting, and the 734-route build passed. Browser behavior
still requires the supported CI runners because this sandbox cannot launch Chrome.

Independent review passed parsed-value/array-order identity and 44 targeted
catalog/source/content/spending tests. The published pack serialization already
uses `catalogJSON`, so this byte normalization does not alter published content
or its pack digest. The raw repository revision intentionally changes: an already
open Studio draft remains protected by its existing stale-revision check and
must be exported/reconciled or reloaded before saving; its old revision is not
silently accepted. Python validation also passed all 40 tests.

## WebKit progress focus observation (2026-10-29)

Quality `40962753898`, engine job `123759488091`, docs-only head `d5fd8b1`,
failed at the immediate focus snapshot in `setProgress`: durable progress was
saved, the dialog was closed, and the replacement completion select was connected
and enabled, but the sampled active element was BODY. The same runtime code
previously passed at `7a0b4caf`. This snapshot does not establish whether the
pending native close/blur restoration later ran.

`closeDialog` deliberately restores on the asynchronous native close event and,
when a closing control still has focus, a MessageChannel task after native blur.
The deterministic runtime tests “progress focus resolves the replacement control
after native close settles” and “closed modal keeps focus until native blur;
restore once after cleanup” prove closed markup precedes that restoration. The
progress journey waited for durable data and hidden markup but not that endpoint;
the spending journey already observes exact focus with a 2000ms bound.

The progress journey now uses the same bounded observational wait for its exact
initiating select, then retains its original strict focus equality and complete
connected/enabled/active/dialog diagnostics. A missed deadline fails even if
focus arrives between the timeout and diagnostic capture. It never sets focus,
retries the save, or changes application code, persistence assertions, HTTP
checks, startup deadlines or modal cancellation behavior. Existing 14 native
focus lifecycle unit contracts pass; actual WebKit acceptance still requires CI.

This test-only repair passed independent review, all 14 focus lifecycle tests,
full runtime validation (614 passed, one Windows-only skip, zero failures),
formatting and repository contracts. The final-head engine run remains the
acceptance gate; the unrelated readiness status failure is not claimed fixed.

## Windows Studio screenshot geometry (2026-10-29)

Quality `40962753898`, Windows job `123759487694`, head `d5fd8b1`, subsequently
failed page-edit evidence: a 390×11550 PNG passed its own dimensions, then the
strict post-capture document measurement was 390×12202. Artifact `12937427618`
SHA-256 `e2515903a16006af79aa9ddb69471b06ba3002f8c8e903e0fc10e268b75afdcd`
contains both `chrome-page-edit-selected-editor-dark-390-normal.png` and the
failure PNG. Their first differing pixels occur at y=6488: “Review working-tree
changes” is empty in the first image, then displays “Git summary · 10 entries”
and ten file paths in the failure image. This adds the exact 652-pixel growth;
media below shifts down. Failure JSON records no pending requests, HTTP errors,
console errors or page errors. Image decode and font readiness were not the
missing readiness boundary.

Studio startup renders/focuses the selected record before awaiting `changes()`;
that function renders the list and summary note only after `/api/changes`
completes. The evidence journey previously awaited record identity and images,
not the change summary. A supervised response observer now starts before the
final public→Studio click, checks actual GET `/api/changes` status 200 and
successful body completion, then observes the exact note and bounded first-100
file list matching that response before layout checks and screenshots. Empty
loading markup cannot satisfy the predicate, including for a real zero-entry
summary. No sleeps, screenshot retry, layout mutation, application changes or
weakened geometry/coverage assertions were introduced.

Three deterministic readiness tests distinguish response receipt from rendered
note/list, require the explicit zero-entry summary, and refuse HTTP 503. All
three plus the three immediate-observer-supervision tests pass locally. Final
Windows browser execution remains required; the earlier failure is retained.

Independent source and before/after pixel review passed, including a separate
six-test run and verification that all original screenshot dimension, geometry
and coverage assertions remain unchanged. Formatting and repository checks pass.
The full local runtime rerun passed 617 tests with one Windows-only skip and
zero failures. Actual final-head Windows browser/Studio validation remains pending.

## Post-merge picker focus diagnosis, not a fix (2026-10-29)

Main `d85e4b209ff7b50926b62ca31be6ead76261444a`, quality `40972065709`,
Windows job `123790961600`, failed the original spending `cancelledNavigation`
case: its connected, enabled `#pack-select` did not hold focus within the existing
2000ms bound; BODY was active and the spending dialog was closed. Unlike the
progress snapshot issue, this already awaited an exact endpoint. Earlier
pre-merge all-green results remain historical evidence, not a post-merge pass.

The final snapshot cannot establish whether the picker never acquired focus or
acquired it and then lost it. Source review finds native close/blur cleanup and
background option refresh as possible timing boundaries, but does not prove
either caused the failure. No application patch or additional focus command is
justified by this evidence alone.

A diagnostics-only follow-up retains the original scenario actions, durable-state
assertions and 2000ms focus deadline. It runs that exact scenario five times in
fresh synthetic contexts, stopping immediately on any failure, rather than
retrying a failed assertion. Each attempt records at most 100 timestamped events:
document focus/blur/focusin/focusout/close and input-event types, window focus,
picker disabled/inert/option-child changes, and modal-open changes. Snapshots
record actual event target, current active element, document.hasFocus(), picker
connection/disabled state, and modal-open state. Explicit before/after markers
surround the existing single picker focus call. No key text, player inventory,
source screenshots or account data is collected. Evidence joins the existing
synthetic spending JSON before context cleanup; capture failure is reported
without replacing the original acceptance error. Observers are removed when
captured. Additional diagnostic commands may affect timing; a passing run alone
will not establish the root cause or claim a focus fix.

A deterministic runtime test checks bounded storage, read-only state, increasing
timestamps and observer detachment. Actual CI timelines are required to decide
whether a product repair or an interaction-readiness correction is justified.

Local diagnostics validation: full runtime suite 619 tests, 618 passed, one
Windows-only skip and zero failures; focused diagnostics test, formatting and
repository contracts passed. These results validate instrumentation only, not
the unresolved native-browser focus behavior.
Independent diagnostics review passed, including a separate 15-test diagnostics
and dialog-focus run. Review confirms read-only bounded capture, detached
observers, fail-fast repetitions and unchanged original acceptance assertions;
no root-cause or product-fix approval is implied.

## Progress restoration diagnostics extension (2026-10-29)

Diagnostic PR #29 head `95a1832`, quality `40974264910`, engine job
`123798295090`, failed WebKit's progress completion focus even with the existing
2000ms exact-endpoint wait. This disproves treating the earlier observational
wait alone as a complete resolution of native focus loss. No application repair
is claimed. The original progress assertions and deadlines remain intact.

Firefox spending artifact `12942715460` records five passing picker attempts.
Attempt one shows the modal heading explicitly blurring at 56ms; native close
then restores an outside initiating button at 58ms despite the no-restore intent.
The common switch disables that button; it blurs at 63ms, close dispatches at
64ms, picker readiness arrives at 79ms and picker focus at 98ms. This establishes
a native restoration/disabled-blur sequence on a successful run, not proof that
it caused the Windows or WebKit failure. The failing progress path has no such
timeline yet; speculation is not an application patch.

The same bounded diagnostic recorder now supports the progress dialog, initiating
select and row replacement. Its optional test-owned focus/close wrappers record
before/after calls and delegate exactly once using Reflect.apply, preserving
receiver, arguments, return and exceptions; original descriptors are restored
at capture end unless another owner replaced them. No extra focus/close calls
are made. A wrapper around the otherwise unchanged setProgress core captures up
to 20 per-operation timelines of 100 events each in the existing journey JSON.
These wrappers and diagnostic roundtrips may affect timing, so passes alone are
not a root-cause proof.

Supplemental `node tests/browser/focus-diagnostic.mjs webkit` uses the existing
owned-server and browser-health guards, then runs the exact draftAndProgress
scenario in five fresh contexts, fail-fast. Its JSON is
`test-results/upgrade023-independent/webkit-focus-diagnostic-journeys.json`.
The regular suite retains its default full sequence; only an explicitly supplied
diagnosticProgressOnly option selects the supplemental subset. No full-suite
job, assertion, HTTP/health check or deadline is removed or weakened. This
supplement is for prompt native-browser evidence, not replacement acceptance.

Independent source review passed with an explicit limitation: unlike the earlier
event-only collector, optional native-call wrappers modify test-page prototypes
while installed. They are observational instrumentation, not strictly read-only,
and may perturb timing. No application code is changed and the goal remains an
actual failing native trace. The reviewer separately passed both diagnostics
unit tests and verified the unchanged full-suite default and core assertions.
Local validation of the extension: full runtime suite 620 tests, 619 passed,
one Windows-only skip, zero failures; formatting and repository contracts pass.
Native focused/full CI remains pending; local checks certify only instrumentation.

## Confirmed WebKit close-dispatch focus refusal (2026-10-29)

Supplemental native run `40976297636`, head `3fac5c27`, job `123805045019`,
failed in the fourth fresh context. Artifact `12942128446`, SHA-256
`54279367f983a51fb35f9219ee0135583e4d00970ef57fbea305448fbe688b88`, retains
the failing `progressFocus[15]` completion→incomplete trace. At 76ms close is
called with BODY active; at 93ms row replacement and the close event have run.
The restoration callback calls focus on the correct connected, enabled SELECT,
but the immediate after-call active element is still BODY. document.hasFocus()
is true and :modal is false. BODY remains active at 2162ms. This was a failed
focus acquisition during close dispatch, not focus acquired then stolen later,
and not merely an assertion sampled before restoration was attempted.

The shared helper previously posted a task only if a closing control still had
focus and later blurred. With BODY already active it called restoration directly
inside close dispatch, where the actual WebKit trace proves focus can be ignored.
The repair uses the existing single cancellable MessageChannel task in that
branch too. There is exactly one restoration attempt, no timer/retry/polling, no
extra test focus command and no acceptance deadline increase. Pending restoration
still cancels on pointer/key input, navigation, reopen, supersession or newer
outside focus. An already-closed helper call now also restores from one posted
task rather than synchronously; this deliberately avoids the same native-cleanup
boundary. The no-restore navigation branch is unchanged, so the original Windows
picker failure remains separately open and must not be claimed fixed here.

A deterministic regression models the observed ignored focus during native close
cleanup. It fails baseline with the exact assertion “Never attempt restoration
inside native close dispatch” (1 attempt versus expected 0), then passes this
repair with exactly one later attempt. Existing successful restoration contracts
now await their specified posted completion; all 20 focus lifecycle tests pass,
including five additional BODY-branch cancellation/newer-focus cases. The mock
BODY/documentElement now implement EventTarget like actual DOM elements; an
initial mock-only TypeError was corrected before recording the baseline failure.
Actual repaired WebKit diagnostic repetitions and the full required suite remain
necessary; local lifecycle tests are not a native-browser pass.

Before committing, review of native outside restoration found an important
compatibility boundary: if native close has already returned focus to the old
initiator, that same baseline must not suppress a requested correction target.
The queued close branch therefore snapshots its current active element and
allows that unchanged baseline; a different outside focus chosen before the task
still cancels restoration. The post-blur branch continues to reject any newer
outside focus. Two additional tests cover native-origin→correction and a newer
outside target superseding that baseline (22 focus tests total). Pointer/key,
navigation, reopen and supersession cancellation remain unchanged.

Independent final source review passed all 22 focus lifecycle tests and the
allowed-native-baseline refinement. Full local runtime validation passed 628
tests total: 627 passed, one Windows-only skipped, zero failures. Formatting,
repository contracts and diff checks passed. Native repaired acceptance remains
pending, and the Windows no-restore picker regression is not closed by this patch.

### Native verification and cancellation instrumentation refinement (2026-10-30)

At PR29 head `0da63238`, supplemental run `40977334067` passed both jobs:
WebKit job `123808515056` completed five fresh progress contexts (20 captured
progress transitions), and Windows Chromium job `123808514787` completed twenty
fresh cancellation contexts. WebKit artifact `12942563273` shows the previously
failing BODY-at-close branch acquiring the correct SELECT immediately after the
posted focus call (for example, close at 156ms, focus at 157ms). This verifies the
scoped restoration repair in actual WebKit; full required suites remain separate.
Windows artifact `12943525880` still shows native close returning to the old,
subsequently disabled button before BODY, but contains no failing picker trace.
Those passes do not establish a cause or repair for the original Windows failure.

To reduce diagnostic timing distortion, cancellation now enables the existing
transparent native-call wrappers before opening the modal and removes the two
extra protocol evaluate calls immediately surrounding the original picker focus.
The wrapper records immediate focus-call before/after state synchronously and
forwards the original call exactly once. Original change, ready wait, modal
assertion, single picker focus, durable-state assertion and strict 2000ms focus
endpoint remain unchanged. There is no application change, additional wait,
retry or deadline increase. Instrumentation can still perturb timing; native
verification of this refinement remains pending at this commit.

Refinement verification: independent source review passed; 24 focused diagnostic
and modal-focus contracts passed. Full runtime suite passed 630 tests with one
Windows-only skip and no failures (631 total); targeted formatting, repository
checks and `git diff --check` passed. Local native browser launch remains blocked
by the documented environment restriction; the next authorized CI run is required
for the refined cancellation observation.

### Final bounded cancellation sample (2026-10-30)

Timing-faithful head `df5b63f` supplemental run `40977822703` passed Windows
job `123810110403` (20 fresh cancellation contexts) and WebKit job
`123810110641` (five progress contexts). Windows artifact `12943781074`
(SHA-256 `1a75c9f0a81a99050e56a8c86812888c134bf5ce9c4e2e68047cb4952782d963`)
shows all twenty native closes returning to the old button, followed by its
blur before picker focus; cleanup preceded successful picker acquisition by
22.1–30.0ms. No historical Windows failure was reproduced. The transparent
page-realm wrapper captures application focus calls, but not Playwright's
locator focus invocation; DOM focus/focusin events still capture acquisition.

A final bounded sample expands only the supplemental cancellation branch to
100 fresh contexts, still fail-fast under the unchanged workflow job budget.
The default full suite remains five cancellation contexts with every other
scenario and assertion unchanged. There is no production change, timeout
increase or failed-test retry. No further count escalation is planned. A green
sample is limited negative evidence, not proof of the original Windows cause
or a claim that the separately proven WebKit restoration repair fixes it.

The final sample's three dispatcher contracts passed, including fail-fast evidence
and unchanged default coverage; independent source review, targeted formatting,
repository checks and diff checks passed. Actual 100-context execution is pending
CI, not counted as completed coverage here.
