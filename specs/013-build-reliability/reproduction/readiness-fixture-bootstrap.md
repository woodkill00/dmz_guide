# Readiness fixture bootstrap and watchdog repair

## Actual hosted findings and scope

The integration owner inspected main015 run **39788052635**, Windows job **119856334701**:

- Occupied-port expected `EADDRINUSE`, but the 700ms startup deadline expired before fixture output: diagnostic elapsed 723ms, owned PID 9068, SIGTERM, empty stdout/stderr.
- Cancellation aborted after 177ms, then failed reading absent `child.pid`. The fixture had not written its post-bootstrap PID file.

These are established hosted signatures, not proof of a Windows scheduling cause or a production readiness defect. No repeated CI run was launched by this worker. The separate older missing-marker liveness failure in run39769616269/job119793572196 remains unresolved; neither this setup masking nor the later EBUSY after-hook is asserted to explain it.

Only `tests/runtime/server-readiness.test.mjs` and owning013 artifacts change. Integration must apply the bounded diff onto current main, not publish the older local source tree. The reviewed finite owned-directory EBUSY retries and fatal exhaustion remain intact.

## Controlled red evidence

On Linux Node24.19.0, a loader added a synthetic1100ms wait before fixture JavaScript executes. It also delays only the temporary copy used by the actual-server test, never the production source file. Against the pre-handshake test source at local5615c888297243417af71f11887b6286da27fa9a:

- Occupied-port failed at725ms with startup deadline instead of EADDRINUSE.
- Cancellation failed at158ms reading nonexistent child.pid.
- All13 rejection scenarios were masked: exact semantic errors were replaced by early startup expiry, or intended marker/idle deadline cases subsequently failed reading absent child.pid. None falsely passed.
- Six success/lifecycle/diagnostic scenarios and the copied actual-server scenario also failed at roughly704–715ms before their intended assertions.

This demonstrates a brittle test setup assumption. It does not establish PID reuse, change any production deadline, or excuse a failed process-death assertion.

### Reproduce the controlled audit

Use a disposable Linux checkout of the named baseline for red, or the corrected test source for green. Create these two temporary files outside the repository. The loader affects only the named test module and its owned temporary fixture copy.

`/tmp/dmz-bootstrap-register.mjs`:

```js
import { register } from 'node:module';
register(new URL('./dmz-bootstrap-loader.mjs', import.meta.url));
```

`/tmp/dmz-bootstrap-loader.mjs`:

```js
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  if (url.endsWith('/tests/runtime/server-readiness.test.mjs')) {
    let source = String(result.source);
    const copiedServer = '  await copyFile(resolve(root, "scripts/serve.mjs"), options.entrypoint);';
    source = source.replace(copiedServer, copiedServer + '\n  await writeFile(options.entrypoint, "await new Promise((r) => setTimeout(r, 1100));\\n" + await readFile(options.entrypoint, "utf8"));');
    const marker = 'const fixtureSource = `';
    if (!source.includes(marker)) throw new Error('Expected fixture source marker missing');
    result.source = source.replace(marker, marker + '\nawait new Promise((r) => setTimeout(r, 1100));\n');
  }
  return result;
}
```

```sh
node --import /tmp/dmz-bootstrap-register.mjs --test \
  --test-name-pattern='readiness rejects|readiness accepts exact|output is continuously|cleanup escalates|child failure after readiness|split stdout|failure diagnostics retain bounded|actual serve.mjs|occupied port|caller cancellation' \
  tests/runtime/server-readiness.test.mjs
```

## Reviewed contracts

1. Occupied-port and cancellation use a5000ms atomic bootstrap handshake under the unchanged15000ms production helper cap, then an independent700ms outcome window. Occupied-port releases into the real bind collision and still requires exact EADDRINUSE, zero pre-bind probes and a surviving unrelated HTTP listener. Cancellation aborts only after an observed live handshake. Both have committed1100ms delayed variants.
2. Other demonstrated semantic fixtures use2500ms **total** helper startup, including bootstrap. Generic failures retain the original3000ms complete-failure assertion and100ms request/cleanup settings. Atomic execution evidence identifies mode, phase and PID before the exact rejected outcome is accepted; headers/body explicitly verify request-timeout lastProbe.
3. One separate cold-start regression retains the original700ms deadline. It requires the bind-phase failure before child JavaScript executes and proves actual diagnostic-owned PID death through unchanged ESRCH. Missing child.pid is only scenario evidence, never cleanup proof.

Handshake PID, child.pid and helper diagnostic PID must agree whenever bootstrap executes. Every private handshake attempt awaits helper-owned cleanup, including setup/outcome failure; cleanup failure cannot be hidden by an expected timeout. No production helper API or budget changes.

## Exact-review watchdog correction

The reviewer identified a redundant2500ms post-handshake watchdog that could expire during allowed close confirmation even though the complete attempt remained below3000ms. A simulated150ms delay of only the fixture-owned ChildProcess's actual close event reproduced this: the interim test failed at2672ms with its own watchdog error despite retained request-timeout diagnostics and successful real ESRCH proof.

The corrected generic watchdog races the entire trigger-plus-outcome against the **remaining time from one3000ms attempt origin**. The same simulated close test passed at2687ms, preserving request-timeout lastProbe and real child-death proof. `t.mock` restores the targeted event shim after the test; the child itself still exits normally through the actual helper cleanup.

A deliberately non-settling trigger now fails at the real3000ms outer deadline and still awaits owned cleanup (3005ms observed including assertions/teardown). Its negative control may finish after its intentionally expired deadline; it does not relax the ordinary3s failure assertion or the helper's100ms cleanup waits. The two original fixtures keep their separate700ms outcome contract. These simulations are not native Windows evidence.

## Verification status

Before the watchdog refinement, focused readiness/health verification passed43/43. The exact refined close-boundary and overall-exhaustion controls passed2/2. The first new cold-start control exposed an incorrect literal case/phase expectation in the test itself; it was corrected to the actual `Startup` / `bind` diagnostic, without changing product behavior or the deadline.

Final controlled audit, complete runtime, static checks, independent review and exact integrated Windows evidence are recorded separately in acceptance.md. Local Linux evidence does not satisfy the hosted Windows or parent merge/exact-main gates.
