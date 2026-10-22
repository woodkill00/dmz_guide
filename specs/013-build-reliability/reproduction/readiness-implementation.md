# C12 / A2 owned-server readiness implementation evidence

Requirements: FR-004, FR-005, FR-008 and SC-002. Scoped implementation for T010–T012.
Source baseline: `db8a6e237aa822205ed346b178a3c7dc8fafea5c`; verification below is
against the uncommitted readiness patch in the isolated 013 worktree, not a final
commit or CI result. Executed 2026-10-22 on Linux, Node v24.19.0, Python 3.12.14.

## Scope and implementation

- `scripts/server-readiness.mjs` is the one dependency-free Node lifecycle used by
  both browser checks and the Python extraction verifier. It is verification
  tooling and is not added to the distributable.
- `tests/browser/server.mjs` is only a small shared browser adapter. Both existing
  entrypoints await readiness before browser launch, preserve their assertions
  and health monitors, check child health before completion, and await cleanup
  before printing their existing success messages.
- `scripts/verify-release.py` retains archive safety, manifest hashes and native
  link checks, then invokes that same Node helper for the extracted server and
  exact extracted `/maps/index.html` bytes. Success is printed only after the
  helper has verified and stopped its child successfully. An independent Python
  watchdog bounds a stalled helper; portable stdin cancellation lets the Node
  helper await its own child cleanup even on Windows, without killpg assumptions.
- No `serve.mjs`, author, catalog, profile, schema, build, package or workflow
  changes are part of this readiness patch.

Identity uses the actual existing server's exact newline-delimited
`DMZ Guide: http://127.0.0.1:<port>` stdout line. The server emits that only from
its successful listen callback. The helper requires this marker from its own
child before probing, requires that child still be alive before and after the
probe, requires HTTP 200 and HTML Content-Type without redirects, and hashes the
complete response against the expected local file. A test-only nonce or public
server contract change is unnecessary under that reviewed contract.

Defaults are a monotonic 15-second startup deadline, at most one second per
request including the body, a one-MiB expected/received body bound, 64-KiB retained
tails per continuously drained output stream, and two seconds for SIGTERM plus
two seconds for SIGKILL/close. Test options may shorten but cannot expand these
limits. Default ports are OS-selected on IPv4 loopback; release of the temporary
reservation can race, but a racing listener cannot supply the owned child's
successful-bind marker. TEST_PORT remains an explicit browser override. Cleanup
uses only the spawned ChildProcess, never a PID discovered by port.

Startup and probe errors include phase, elapsed time, endpoint, child PID/status,
last probe failure, bounded output tails and truncation indicators. Primary
failures survive cleanup. Child failures after readiness remain fatal at browser
completion/stop. Stop is awaited and idempotent. The CLI handles ordinary SIGINT,
SIGTERM and private-stdin cancellation by cancelling startup and stopping its
owned server. Uncatchable termination such as SIGKILL is not claimed recoverable.

The independent Python watchdog waits 22 seconds, then requests private-stdin
cancellation and allows five seconds for graceful helper/owned-child cleanup.
If the helper does not respond, Python terminates then, if necessary, kills only
that helper, awaiting at most one second after each operation. Forced termination
reports that the owned server's cleanup could not be confirmed and never reports
release success. This backstop for a broken/stalled helper is distinct from the
normal <=15-second readiness plus <=4-second child-cleanup contract. It does not
pretend that killing a parent necessarily kills its children on every platform.

## Tests first and observed results

Before creating the shared helper or changing entrypoints, these commands failed
as expected because the proposed module did not yet exist:

```sh
node --test tests/runtime/server-readiness.test.mjs
python3 -m unittest discover -s tests -p test_release_server.py -v
```

The first implementation test run had 22/26 passes. Four failing assertions
identified lost last-probe diagnostics at overall deadline and asynchronous spawn
error reporting. Those implementation problems were corrected without weakening
the assertions. The focused suite then passed 26/26. Five further tests added
exact marker fragmentation/prefix rejection, bounded failure diagnostics,
pre-launch expected-size bounds and non-expandable configuration/origin limits.

Final focused commands and results:

```sh
node --test tests/runtime/server-readiness.test.mjs tests/runtime/browser-health.test.mjs
# 38 tests, 38 passed, 0 failed/cancelled/skipped; 8.725 seconds.

python3 -m unittest discover -s tests -p test_release_server.py -v
# 8 tests passed; 18.772 seconds. The never-ready case exercises the real
# default 15-second CLI deadline and asserts <20 seconds including cleanup.
# A further targeted watchdog/package rerun passed 4 tests in 2.804 seconds.

/workspace/shared/dmz-release/node_modules/.bin/prettier --check \
  scripts/server-readiness.mjs tests/browser/server.mjs \
  tests/browser/run.mjs tests/browser/engines.mjs \
  tests/runtime/server-readiness.test.mjs
# All matched files use Prettier code style.

git diff --check
# Exit 0, no diagnostics.
```

The Prettier executable came from the already installed sibling checkout; no
package installation or dependency modification was needed.

## Coverage and limits

The 31 readiness tests cover exact valid content and actual unchanged serve.mjs;
unrelated occupied-port HTTP 200 (zero pre-marker probes and unrelated listener
left alive); early exit/bind failure; wrong content/type; no listener or missing,
wrong, prefixed and chunk-fragmented marker; HTTP 503 and redirects; stalled
headers/body; over-limit body; child exit during probing; continuously drained
verbose output and truncation in success/failure diagnostics; bounded cleanup
including a SIGTERM-resistant Linux fixture; post-readiness child death; caller
cancellation; spawn error; oversized expected file; and configuration limits.
Owned fixture PIDs are verified absent after normal and failure cleanup.

Six integration cases execute the actual unmodified-in-test browser entrypoints
against temporary synthetic servers. A module loader replaces only Playwright
with a launch-boundary marker/intentional throw. Early exit and wrong content
never reach browser launch; exact valid content does. Neither path can emit
browser-suite success. No real browser launches and no existing browser test
assertion is replaced or removed from production source. Seven existing
browser-health runtime tests also pass unchanged.

Four Python extraction integration cases execute a temporary copy of the actual
verifier and shared helper against synthetic release ZIPs: actual serve.mjs/exact
bytes passes; exited child, wrong content and default-deadline exhaustion fail
without release-success text. Package/hash/native-link checks still execute
before the server check. Four additional tests cover outer-watchdog cancellation
of the real helper and awaited server-PID disappearance, KeyboardInterrupt with
the same awaited cleanup, bounded forced termination of a synthetic unresponsive
helper with an honest unconfirmed-cleanup diagnostic, and execution of the actual
packager in an isolated synthetic fixture whose ZIP excludes the readiness
helper while retaining serve.mjs.

This is focused Linux/Node24 evidence, not final-head acceptance. Full documented
checks, real package extraction, real three-engine/Studio browser suites,
independent implementation review and exact-head Linux/Windows/Node22 plus
Linux/Node24 CI remain integration gates. SIGTERM resistance/escalation semantics
are platform-dependent; Windows results are not inferred from Linux execution.
No A4 repair, publication, PR, merge or deployment occurred in this work.
