# Reproduction and verification proposal

Baseline: db8a6e237aa822205ed346b178a3c7dc8fafea5c. Reproductions use unchanged production source copied into temporary synthetic repositories. Test preloads/failpoints are not production features.

## A3 executed baseline reproduction

Command: `node specs/013-build-reliability/reproduction/a3-write-failure.mjs .`
Runtime: Node v24.19.0, Linux, 2026-10-22.
Method: OLD usable index.html and old-only sentinel; test preload injects EIO on second dist page write in actual build.mjs.
Result: build exit 1, OLD sentinel absent, OLD index replaced, partial replacement present. Actual failure reproduced before production edits.

Post-fix acceptance adds output/copy/validation failure, previous rename failure, candidate promotion failure, rollback failure, initial build, full replacement, concurrent attempt and interrupted-state retention. Windows fault injection remains mandatory; it is not established by this Linux reproduction.

## A2/C12 proposed/executing

Run actual extracted-release verifier while a synthetic unrelated server owns its target port and returns HTTP200. Delay that response until spawned server EADDRINUSE is captured, proving failed child rather than a startup race. Record actual exit/success output. Exercise browser entrypoint readiness loops separately, without claiming a full browser run. New helpers must reject wrong process, wrong body, early exit and timeout; preserve health monitors.

## A4 proposed/executing

Use valid synthetic before/after multi-file revisions and existing applyFilePlan failpoints. Actual build begins before/within/after a save; a pending journal exists in another case. Test-only file read barriers control ordering. Compare all published JSON/media with a single complete revision, and hash recovery material before/after. Existing catalog guards are acknowledged. If repeated-save ABA behavior is tested, distinguish it from the original single-save hypothesis. No coordination implementation unless a defect is reproduced and independently reviewed.
