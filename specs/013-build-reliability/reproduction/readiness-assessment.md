# C12 / A2 readiness assessment

Status: defects reproduced; production repair and independent acceptance are not claimed.

Baseline: `db8a6e237aa822205ed346b178a3c7dc8fafea5c`.
Requirements: FR-004, FR-005 and SC-002 of this change.

## Exact command and observed result

From the repository root:

```sh
python3 specs/013-build-reliability/reproduction/readiness-false-success.py
```

Executed 2026-10-22 with Python 3.12.14 and Node v24.19.0 on Linux. Exit 0 means the
pre-repair defects were successfully reproduced, not that readiness is correct.
The first run completed in 0.397 seconds. The recorded rerun is in
`readiness-results.jsonl`.

An additional guard check temporarily bound port 4189 using a harness-owned socket
without accepting connections, then reran the command above. The reproducer
selected port 37139, labeled the temporary port-value substitution, reproduced the
same verifier exit 0 / actual server exit 1, and did not contact the reserved
listener. Exact recorded output is in `readiness-port-fallback.json`. The guard
socket was then closed. This checks fallback safety; it does not alter the primary
unchanged-verifier evidence at port 4189.

- The actual, unchanged `scripts/verify-release.py` ran against a synthetic release
  ZIP containing the actual, unchanged `scripts/serve.mjs` and one minimal,
  explicitly synthetic HTML page. Manifest checks passed on both actual files.
- Port 4189 was free and was atomically reserved by the harness's unrelated
  loopback HTTP server. No port substitution was needed on the first recorded run.
- A temporary PATH observation shim executed the real Node binary and unchanged
  `serve.mjs`. The shim only recorded and relayed that process's stdout, stderr and
  exit status. It did not synthesize the Node failure or modify verifier logic.
- The real `serve.mjs` exited 1 with `EADDRINUSE`. The unrelated server withheld its
  HTTP 200 until that exit had been recorded, eliminating the startup race.
- Despite that confirmed failure, the verifier exited 0 and printed:
  `Clean extraction verified: 2 file hashes, native links, Node-only loopback HTTP200.`
- Six further cases executed the verbatim readiness-loop source extracted from
  `tests/browser/run.mjs` and `tests/browser/engines.mjs`, with synthetic fetches and
  an immediate test clock. Both loops reached their post-readiness continuation
  after every request returned 503 or rejected: 80 attempts in `run.mjs`, 100 in
  `engines.mjs`. Both also continued after one unrelated HTTP 200.

The browser cases prove control-flow defects in the actual loops; they do not claim
that a full browser suite passes against an unrelated service. No Playwright import,
browser launch, build, package command, or full browser suite ran.

## Source evidence

- `scripts/verify-release.py:40-52`: fixed endpoint; any HTTP 200 breaks the loop;
  no child-liveness, bind-identity, response-body or final-ready assertion precedes
  success output. The child return value at line 55 is ignored. Stderr is piped but
  never drained or reported. The request has a 2-second timeout, but there is no
  total startup deadline.
- `tests/browser/run.mjs:9-21`: spawned process is not checked; failures are
  swallowed; loop exhaustion leads directly to browser launch. `fetch(base)` has
  no abort signal or per-request deadline.
- `tests/browser/engines.mjs:10-23`: same issue, with 100 attempts, then test setup
  and engine launch. `fetch(base)` has no abort signal or per-request deadline.
- Both browser entrypoints pipe stdout/stderr without consuming them and kill the
  child in `finally` without awaiting bounded termination. These are source-level
  diagnostic/cleanup observations, not separately reproduced failures here.

## Harness safety and limits

- All executable fixtures and release artifacts live in a new temporary directory.
  Only `readiness-*` assessment artifacts are added to the repository.
- Binding 127.0.0.1:4189 is both the free-port check and reservation. If another
  listener owns it, the harness does not request or stop that listener: it binds an
  OS-assigned free port and substitutes only that single port value at the two
  matching references in a temporary verifier copy. Output explicitly labels the
  substitution and whether the verifier remained byte-for-byte unchanged.
- The verifier has a 15-second outer watchdog, its observed Node child has an
  8-second watchdog, and browser-loop execution has a 5-second watchdog. Each
  spawned group has at most 2 seconds of final wait after owned-group termination.
  HTTP handler observation waits are capped at 6 seconds. These are reproduction
  guardrails, not claims about production timeout behavior.
- Subprocess stdout/stderr are regular temporary files limited to 64 KiB each by
  Linux `RLIMIT_FSIZE`; captured/read output is also capped at 64 KiB. The harness
  is Linux/POSIX assessment tooling, not evidence of Windows execution.
- Cleanup stops only the harness-created listener and process groups. It does not
  identify or kill processes by port. Temporary fixture removal is asserted by
  successful context-manager completion.
- Assertions intentionally describe the defective baseline and should fail or
  require reassessment once the implementation changes. Permanent regression tests
  must invert the expected outcome, using the production helper rather than
  preserving the extracted-loop reproduction as the acceptance implementation.

## Proposed shared readiness contract

Use one Node-standard-library lifecycle helper for both browser entrypoints and
the release verifier's server check. Python can invoke its CLI adapter for the
extracted release; browser entrypoints can import the same implementation. Avoid
independent polling implementations with subtly different success conditions.

1. **Owned launch:** accept an absolute server entrypoint, working directory,
   loopback host, requested port, expected route and expected byte digest. Track
   the exact spawned child and attach startup-error, exit and close observers
   immediately. A child failure is fatal even if an HTTP response arrives.
2. **Post-bind identity:** require an unambiguous startup handshake emitted only
   after that child's `listen` callback. Include actual host/port and a per-launch
   nonce through a private IPC channel, or a rigorously parsed bounded stdout
   protocol. A non-owned listener cannot satisfy the handshake. Prefer an
   OS-assigned port where supported, without weakening occupied-port regression
   coverage.
3. **Response attribution and content:** opt-in test mode may expose that same
   per-launch nonce in a response header. Do not send the nonce in the probe
   request and merely accept an echo. Require the nonce, HTTP 200, expected content
   type, and exact expected body SHA-256 derived from the intended build. Reject
   redirects and mismatches. Recheck child liveness before and after probing. A
   generic title or a shared static header alone is not build identity.
4. **Finite waiting:** use one monotonic total deadline of at most 15 seconds;
   each request, including body consumption, must finish within at most 1 second
   and the remaining overall budget. Abort timed-out requests and retry only
   within the budget. Bound body bytes, for example 1 MiB or a smaller explicitly
   configured limit. Exhaustion throws a specific readiness failure, never falls
   through. Child exit and caller cancellation interrupt waiting immediately.
5. **Bounded diagnostics:** continuously drain both output streams without
   backpressure deadlock, retaining bounded tails, for example 64 KiB per stream.
   Failure identifies phase, elapsed time, endpoint, child exit/signal, last probe
   error/status and truncated stdout/stderr tails. Do not mask an earlier primary
   failure with a secondary cleanup error.
6. **Owned cleanup:** return an awaited, idempotent disposer or expose a
   `withOwnedServer(options, callback)` operation. Terminate only the spawned
   child; wait up to 2 seconds, then escalate if required and await exit for up to
   2 further seconds, keeping total cleanup within 5 seconds. Remove observers,
   abort in-flight requests and close handles. Cleanup cannot target an existing
   service merely because it owns the desired port. Retain existing browser
   health assertions and fail if the owned server exits during the test body.

Required permanent fixtures: valid owned child/content, unrelated occupied-port
200, immediate child exit, bind error, wrong content, missing/wrong nonce,
non-200 exhaustion, never-listening child, stalled headers/body, oversized body,
verbose output, exit during probe and cleanup escalation. Failures must occur
before browser launch or release-success text and within SC-002's 20-second total
including cleanup. Include direct entrypoint integration checks so testing the
helper alone cannot hide a caller that ignores its result.

## Workflow scope

Repository instructions, README, constitution, lifecycle/change-type guidance,
the actual installed implement/analyze/converge skill instructions and available
owning change artifacts were reviewed. This delegated assessment supplies
reproduction evidence to the parent's bounded full-cycle repair. It does not
claim any optional bug extension or full lifecycle command ran, mark reviewer
checklists complete, or authorize production implementation.
