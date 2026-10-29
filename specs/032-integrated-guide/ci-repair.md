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
