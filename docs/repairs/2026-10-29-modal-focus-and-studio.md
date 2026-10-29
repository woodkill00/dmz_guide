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
