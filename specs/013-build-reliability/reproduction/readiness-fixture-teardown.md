# Readiness fixture teardown and diagnostic repair

## Assessment and separate observed incidents

The integration owner inspected [017 Windows job 119833341804, run 39781214667](https://github.com/woodkill00/dmz_guide/actions/runs/39781214667/job/119833341804): at 2026-10-22 12:49:47 UTC, `readiness rejects status before continuation and cleans only its child` failed in its after-hook with `EBUSY` removing its own `dmz-readiness-LH0wQV` directory. The substantive readiness rejection, bounded-failure and child-death assertions had passed. This worker used that supplied exact evidence rather than claiming an independent log inspection. The old hook used recursive/force removal without retries. The external lock holder and duration are not established.

A different [014 Windows job 119793572196, run 39769616269](https://github.com/woodkill00/dmz_guide/actions/runs/39769616269/job/119793572196) previously failed the missing-marker test's `process.kill(pid, 0)` ESRCH assertion after 1198.6ms. Its cause remains unresolved. The test discarded the expected startup rejection, including any cleanup-failure suffix, before that assertion. This is not evidence of PID reuse or a proven product cleanup defect, and the later after-hook EBUSY does not explain it.

## Scoped intent, design and independent gate

FR-004/005/008 and SC-002/003 apply. Only the existing test-owned mkdtemp directory gains native `fs.rm` `maxRetries: 3` / `retryDelay: 100`. Exhausted removal stays fatal with exact bounded error/timing diagnostics. No directory outside that fixture is targeted. The original readiness rejection is retained if a subsequent assertion fails; its bounded prefix contains the primary/cleanup error and phase, elapsed time, PID, exit code and signal. The unchanged ESRCH assertion now also names the PID it checked.

The existing 700ms fixture startup, 100ms request and cleanup grace, 3s failure assertion, production defaults/caps, unrelated-process protection and all existing test cases remain unchanged. There is no retry of child-death assertions, new skip or swallowed error. The independent reviewer approved both the direction before implementation and the exact test diff before commit. Existing reviewer-owned checklists were read, not changed. This is the bounded manual repair fallback, not an invoked optional bug extension.

[Node 22.23.3 fs.rm documentation](https://nodejs.org/download/release/v22.23.3/docs/api/fs.html#fspromisesrmpath-options) documents native retries for EBUSY and other specified filesystem errors when recursive removal is enabled. The [pinned native rimraf source](https://raw.githubusercontent.com/nodejs/node/v22.23.3/lib/internal/fs/rimraf.js) confirms finite linear backoff and fatal exhaustion. The three delays sum to 600ms per retried operation, not a global 600ms recursive-removal guarantee.

## Controlled simulated reproduction

Environment: Linux, Node 24.19.0, local base `650d56c0b6e71ab64b14a475b66154d3440c63d6`. The repaired test source SHA-256 is `a1c45e357206a6d1bb36d5feac7debc411910b86e5645f7f2da960e3e8e6461b`. These injections test harness behavior, not native Windows sharing semantics or the cause of either hosted incident.

Create this temporary preload outside the repository, for example `/tmp/dmz-readiness-busy-preload.mjs`:

```js
import fs from 'node:fs';
import { basename } from 'node:path';
const original = fs.rmdir;
const attempts = new Map();
fs.rmdir = function (path, ...args) {
  const name = basename(String(path));
  if (!name.startsWith('dmz-readiness-')) return original.call(this, path, ...args);
  const attempt = (attempts.get(name) || 0) + 1;
  attempts.set(name, attempt);
  const inject = process.env.DMZ_FIXTURE_BUSY_MODE === 'always' || attempt === 1;
  console.error('SYNTHETIC fixture removal', JSON.stringify({ name, attempt, inject }));
  if (!inject) return original.call(this, path, ...args);
  const callback = args.at(-1);
  const error = Object.assign(new Error('Synthetic EBUSY during owned fixture rmdir'), {
    code: 'EBUSY', syscall: 'rmdir', path: String(path),
  });
  setImmediate(callback, error);
};
```

Run from the checkout, first before the correction and then afterward:

```sh
DMZ_FIXTURE_BUSY_MODE=once node --import /tmp/dmz-readiness-busy-preload.mjs --test --test-name-pattern='readiness rejects status before continuation' tests/runtime/server-readiness.test.mjs
DMZ_FIXTURE_BUSY_MODE=always node --import /tmp/dmz-readiness-busy-preload.mjs --test --test-name-pattern='readiness rejects status before continuation' tests/runtime/server-readiness.test.mjs
```

Actual controlled results:

- Before correction, a single injected EBUSY fails the selected test in its after-hook, exit 1, duration 716.331ms.
- After correction, one injected EBUSY is retried and the same test passes, exit 0, duration 817.167ms. Subsequent native calls perform the ordinary nonempty-directory removal.
- Persistent EBUSY still fails, exit 1, after exactly four injected calls. The diagnostic records `mode: status`, `code: EBUSY`, `syscall: rmdir`, the exact owned path and observed teardown 604ms. Test duration 1320.663ms. No failure is converted into success.

Separately create `/tmp/dmz-readiness-liveness-preload.mjs`:

```js
const originalKill = process.kill;
process.kill = function(pid, signal) {
  if (signal === 0) {
    console.error('SYNTHETIC liveness assertion denial', JSON.stringify({ pid, signal }));
    return true;
  }
  return originalKill.call(this, pid, signal);
};
```

```sh
node --import /tmp/dmz-readiness-liveness-preload.mjs --test --test-name-pattern='readiness rejects missing-marker before continuation' tests/runtime/server-readiness.test.mjs
```

This deliberately falsifies only the observational assertion result; it does not send a new signal or reproduce the hosted root cause. The unchanged ESRCH assertion fails, exit 1, duration 715.224ms. Its diagnostic retains the original `Startup deadline exceeded (700ms)` plus `phase: bind`, endpoint, PID, observed `exitCode: null`, `signal: SIGTERM`, empty captured streams and measured elapsed time. The original assertion is rethrown with the PID label. This demonstrates diagnostic preservation, not an actual surviving child.

## Local verification and remaining gates

- `node --check tests/runtime/server-readiness.test.mjs`: passed.
- `node --test tests/runtime/server-readiness.test.mjs tests/runtime/browser-health.test.mjs`: 38 passed, zero failed/skipped, 9.048s.
- `npm test`: 274 total, 273 passed, zero failed, one native-Windows-only skip, 10.834s.
- `python3 scripts/check.py` and `git diff --check`: passed.
- Existing pinned Prettier 3.6.2 is used without installing dependencies; final formatting validation is recorded in acceptance.md.

This Linux evidence does not establish native Windows correction or acceptance of a later integrated head. The integration owner must obtain exact-head hosted Windows results and independent review. If the distinct missing-marker failure recurs, inspect the newly retained original error before proposing a separate repair. No production or workflow change, deadline expansion, parent merge approval or final-main claim is made here.
