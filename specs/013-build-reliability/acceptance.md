# Build reliability acceptance evidence

Date: 2026-10-22. Feature: 013-build-reliability. Baseline: `db8a6e237aa822205ed346b178a3c7dc8fafea5c`.

## Verdict and scope

Local implementation and regression evidence are complete; merge acceptance is **pending** independent exact-head review and actual supported-major Linux/Windows/browser CI. This report describes the isolated feature tree prepared for the integration owner, not deployed/main behavior. The eventual local handoff commit is identified by the integration record; this document does not invent a self-referential commit hash.

Delivered scope: A3 staged output with full expected-file digest validation and rollback-aware OLD retention; C12/A2 shared owned-server readiness and portable bounded cleanup; A1 explicit Node22.x baseline/Linux+Windows with Node24.x Linux compatibility; A4 narrowly approved existing author mutex around catalog/media capture after the actual repeated-save defect was demonstrated. No author.mjs/catalog.mjs, schema, public-content, private-profile, account, hosting, credential or security-setting changes. Packaging behavior is unchanged apart from the supported-Node wording in START-HERE. Browser changes preserve all existing assertions and health monitors.

## Reproductions before repair

- A3: actual unchanged build with failure on the second generated page exits 1 after deleting OLD index/sentinel and leaving partial output. See reproduction/proposal.md and a3-write-failure.mjs.
- C12/A2: actual unchanged extraction verifier reports success after its own server has exited with EADDRINUSE, because unrelated HTTP 200 satisfies polling. The browser loop reproduction exhausts failed probes and continues. See reproduction/readiness-assessment.md and results.
- A4: pinned six-case actual-build harness confirms ordinary active writer, pending/dead-writer recovery and single completed save protections. Repeated completed saves 0→1→0→1 evade sequential rereads and publish version0/alpha0/beta1, matching no committed revision. See reproduction/a4-analysis.md and a4-results.json. Independent reviewer reproduced all six outcomes; unchanged harness repeated after repair still reproduces the original baseline bug, not the repaired code.

Built-in requirements checklist and both custom requirement/design checklists passed before their respective production changes. The A4 amendment received a separate reviewer gate and explicit author-store export ownership grant. New tests ran red before their implementation. Independent source review then found pre-lock output inspection, incomplete output-inventory validation and missing Python outer watchdog; each was reproduced or confirmed and repaired under T023–T025.

## Local verification

Environment: Linux, Node v24.19.0, Python 3.12.14. Dependencies reused from the existing sibling checkout via ignored local links, not installed or changed. Commands below ran against the completed production changes in this feature worktree; exact-head CI remains separately required.

| Command / check | Observed result |
| --- | --- |
| Explicit `SPECIFY_FEATURE_DIRECTORY=specs/013-build-reliability` prerequisite check with require-spec/require-tasks/include-tasks | Correct feature directory and required artifacts |
| `npm run format:check` | Passed |
| `npm test` | 263 tests: 262 passed, 0 failed, 1 native-Windows-only skip; 10.537 seconds |
| Build CLI/output/Windows focused tests | 21 passed; native Windows test skipped on Linux |
| Snapshot + author-store + catalog + bundled-assets + build-output + build-cli | 101/101 passed, including 19 snapshot regressions |
| Readiness + unchanged browser-health focused tests | 38/38 passed |
| `python3 -m unittest discover -s tests -v` | 25/25 passed; 8 extraction/watchdog/package cases included |
| `python3 scripts/check.py` | 0 failures |
| `npm run build` | 154 independent routes and 404 page |
| `npm run package && python3 scripts/verify-release.py` | 196 public files; clean extraction verifies 196 hashes, native links and exact content from its owned Node child |
| `git diff --check` | Passed |

A3 tests exercise actual write/copy/promotion failures, invalid source, silent omitted pack/media/module output, process exit between directory moves, rollback failure, first build, obsolete-route replacement, build collision, retained interruption material and competing-promotion inspection order. Failed regeneration retains unchanged OLD bytes; failed rollback retains OLD at the reported previous path and does not claim usable dist. Native Windows test uses a real PowerShell FileShare.None handle; CI must execute it on Windows. If that filesystem permits the rename despite the handle, the test explicitly reports a skip/limitation rather than fabricating Windows denial evidence. Portable injected fault paths still execute on Windows CI.

A4 tests verify normalization into the existing serial queue, owner-only release including thrown callbacks and replaced owner tokens, live/dead/unverifiable lock refusal, prepared/applying journal preservation, separate-process save/recovery exclusion, actual single-save and repeated ABA barriers, crash-retained lock, and non-cooperating external-edit detection. Actual build excludes writers during capture; a media-changing save at first output write then succeeds, while generated catalog, HTML, bundled manifest and raster remain wholly captured revision0. Raw capture avoids recursively entering queued store APIs; rendering/output work occurs after release.

Readiness tests verify exact own stdout bind identity, live status before/after full-body content hash, occupied unrelated listener preservation with no pre-bind probes, exit/content/type/status/redirect failures, stalled headers/body, 1 MiB response cap, 64 KiB tails, 15-second total startup and <=1-second requests, bounded owned-process cleanup and entrypoint launch barriers. Python integration exercises the real 15-second default deadline plus independent 22-second emergency watchdog, portable stdin cancellation with <=5 seconds helper cleanup, then bounded terminate/kill fallback that explicitly does not claim confirmed child cleanup. Static ZIP exclusion of verification helper is tested through the real packager.

## Browser and platform limitations

`npm run test:browser` reaches the real Chromium launch after successful owned-server startup, then fails before browser assertions: Chromium exits SIGABRT with `socket() failed: Operation not permitted` in this local environment. `npm run test:engines` fails at Firefox launch because its Playwright executable is absent. No sandbox weakening, dependency download, alternate access-route retry or success claim followed these failures. Studio browser suites use the same unavailable local engines and were not redundantly attempted. Clean package was rebuilt afterward so the test-only zoom CSS is absent.

No local Node22 or Windows execution is claimed. Exact integrated CI must retain Chromium Linux/Windows, Firefox/WebKit and Studio coverage while testing precisely Linux22, Windows22 and Linux24 runtime/build combinations. The new setup-node action is SHA-pinned to verified official v7.1.0. No full browser × Node-major cross product was added.

## Convergence and remaining gates

Pinned manual full feature-cycle fallback completed through implementation and an append-only convergence assessment. No optional extension/workflow runner was installed or claimed run; no extension hooks are configured. Constitution unchanged.

Assessment covered 9 FR, 4 SC, 17 acceptance scenarios, five technical decisions, ten constitution principles and all existing tasks. No further production-code gap found. Two partial acceptance gaps were appended as T026/T027: actual integrated platform/browser evidence and independent exact-head source approval/final-main verification. T016/T018/T022 remain honestly open for those obligations. No PR, merge or deployment was performed by this worker.

## Integration verification
Integrated atop012 candidate6ce2b1d1f43fba63a0acd34d712fe9a58d45f450, preserving011/012 browser and Studio acceptance calls. Local npm run check and format:check pass. CI feature prerequisite loop now explicitly selects specs/011–013 as well as existing artifacts. Independent local source approval was fordb06ff25ce4e295749a054edf3ec59b4343150d1; exact remote integrated review and hosted Windows/browser gates remain required. All196 production outputfiles were byte-identical to the pinned baseline in the worker controlledcomparison.

## First integrated hosted run and portable test correction
Integrated candidate 6d920438245e61c488d5c8d028e9d4a55058983b, run39763661795, passed Linux Node24 compatibility and repository checks on both platforms. Actual Windows job119773701935 exposed 19 test harness failures caused by raw absolute Windows paths passed to Node's `--import`: seven build-cli, six snapshot, six readiness entrypoint cases. The native Windows open-handle promotion test passed in this run; full Windows acceptance did not. Convert only those three test files' preload specifiers through `pathToFileURL(...).href`, retaining every assertion. All71 focused regressions pass locally after this correction; independent review approved the exact bounded test delta. A fresh exact-head Windows run remains required. The integrated source also carries the independently diagnosed 012 Studio callback correction, with its original failing browser assertions unchanged.
