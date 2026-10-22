# Build reliability acceptance evidence

Date: 2026-10-22. Feature: 013-build-reliability. Baseline: `db8a6e237aa822205ed346b178a3c7dc8fafea5c`.

## Verdict and scope

**Source/runtime acceptance is approved for candidate head `b54b2312e27a008b75bad04ab7f342ae4ef68ba6`, tree `5e2f740641da336bcb2cf65ead3f208e18cc9529`.** All six jobs in hosted [run 39764754220](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220) succeeded, and an independent reviewer confirmed the source and actual logs, including Windows filesystem behavior. This is candidate-tree evidence, not a main-branch or deployment claim. The new documentation-only closeout still requires publication, independent review and its own exact-head checks through the integration owner; parent merge and exact-main verification remain **pending**.

Delivered scope: A3 staged output with full expected-file digest validation and rollback-aware OLD retention; C12/A2 shared owned-server readiness and portable bounded cleanup; A1 explicit Node22.x baseline/Linux+Windows with Node24.x Linux compatibility; A4 narrowly approved existing author mutex around catalog/media capture after the actual repeated-save defect was demonstrated. No author.mjs/catalog.mjs, schema, public-content, private-profile, account, hosting, credential or security-setting changes. Packaging behavior is unchanged apart from the supported-Node wording in START-HERE. Browser changes preserve all existing assertions and health monitors.

## Reproductions before repair

- A3: actual unchanged build with failure on the second generated page exits 1 after deleting OLD index/sentinel and leaving partial output. See reproduction/proposal.md and a3-write-failure.mjs.
- C12/A2: actual unchanged extraction verifier reports success after its own server has exited with EADDRINUSE, because unrelated HTTP 200 satisfies polling. The browser loop reproduction exhausts failed probes and continues. See reproduction/readiness-assessment.md and results.
- A4: pinned six-case actual-build harness confirms ordinary active writer, pending/dead-writer recovery and single completed save protections. Repeated completed saves 0→1→0→1 evade sequential rereads and publish version0/alpha0/beta1, matching no committed revision. See reproduction/a4-analysis.md and a4-results.json. Independent reviewer reproduced all six outcomes; unchanged harness repeated after repair still reproduces the original baseline bug, not the repaired code.

Built-in requirements checklist and both custom requirement/design checklists passed before their respective production changes. The A4 amendment received a separate reviewer gate and explicit author-store export ownership grant. New tests ran red before their implementation. Independent source review then found pre-lock output inspection, incomplete output-inventory validation and missing Python outer watchdog; each was reproduced or confirmed and repaired under T023–T025.

## Historical local verification before hosted acceptance

Environment: Linux, Node v24.19.0, Python 3.12.14. Dependencies reused from the existing sibling checkout via ignored local links, not installed or changed. Commands below ran against the original isolated feature implementation before integration. They are preserved as historical evidence; the later exact-tree hosted results below supersede the local platform limitations for candidate acceptance.

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

A3 tests exercise actual write/copy/promotion failures, invalid source, silent omitted pack/media/module output, process exit between directory moves, rollback failure, first build, obsolete-route replacement, build collision, retained interruption material and competing-promotion inspection order. Failed regeneration retains unchanged OLD bytes; failed rollback retains OLD at the reported previous path and does not claim usable dist. Native Windows test uses a real PowerShell FileShare.None handle; the later hosted Windows result below confirms execution rather than a skip. If that filesystem permits the rename despite the handle, the test explicitly reports a skip/limitation rather than fabricating Windows denial evidence. Portable injected fault paths also passed in that Windows run.

A4 tests verify normalization into the existing serial queue, owner-only release including thrown callbacks and replaced owner tokens, live/dead/unverifiable lock refusal, prepared/applying journal preservation, separate-process save/recovery exclusion, actual single-save and repeated ABA barriers, crash-retained lock, and non-cooperating external-edit detection. Actual build excludes writers during capture; a media-changing save at first output write then succeeds, while generated catalog, HTML, bundled manifest and raster remain wholly captured revision0. Raw capture avoids recursively entering queued store APIs; rendering/output work occurs after release.

Readiness tests verify exact own stdout bind identity, live status before/after full-body content hash, occupied unrelated listener preservation with no pre-bind probes, exit/content/type/status/redirect failures, stalled headers/body, 1 MiB response cap, 64 KiB tails, 15-second total startup and <=1-second requests, bounded owned-process cleanup and entrypoint launch barriers. Python integration exercises the real 15-second default deadline plus independent 22-second emergency watchdog, portable stdin cancellation with <=5 seconds helper cleanup, then bounded terminate/kill fallback that explicitly does not claim confirmed child cleanup. Static ZIP exclusion of verification helper is tested through the real packager.

## Historical local browser and platform limitations

`npm run test:browser` reaches the real Chromium launch after successful owned-server startup, then fails before browser assertions: Chromium exits SIGABRT with `socket() failed: Operation not permitted` in this local environment. `npm run test:engines` fails at Firefox launch because its Playwright executable is absent. No sandbox weakening, dependency download, alternate access-route retry or success claim followed these failures. Studio browser suites use the same unavailable local engines and were not redundantly attempted. Clean package was rebuilt afterward so the test-only zoom CSS is absent.

No local Node22 or Windows execution is claimed. The hosted results below establish those checks on their actual platforms: Chromium Linux/Windows, Firefox/WebKit and Studio coverage, with precisely Linux22, Windows22 and Linux24 runtime/build combinations. The new setup-node action is SHA-pinned to verified official v7.1.0. No full browser × Node-major cross product was added.

## Historical convergence before hosted acceptance

Pinned manual full feature-cycle fallback completed through implementation and an append-only convergence assessment. No optional extension/workflow runner was installed or claimed run; no extension hooks are configured. Constitution unchanged.

Assessment covered 9 FR, 4 SC, 17 acceptance scenarios, five technical decisions, ten constitution principles and all existing tasks. No further production-code gap found. Two partial acceptance gaps were appended as T026/T027: actual integrated platform/browser evidence and independent exact-head source approval/final-main verification. At that earlier assessment T016/T018/T022 remained open. The separate final closeout below records which candidate obligations are now satisfied and which parent gates remain pending. No PR, merge or deployment was performed by this worker.

## Integration verification

Integration started atop 012 candidate `6ce2b1d1f43fba63a0acd34d712fe9a58d45f450`, preserving 011/012 browser and Studio acceptance calls. Local check and formatting passed. The CI feature prerequisite loop explicitly selects specs/011–013 as well as existing artifacts. Initial independent local source approval covered `db06ff25ce4e295749a054edf3ec59b4343150d1`; after the shared workspace was lost, the restored integrated source was reviewed independently rather than claiming unverified identity to the unavailable original object. The earlier controlled comparison found all 196 original production files byte-identical to the pinned baseline. The integrated candidate below packages 197 files and has its own verified tree and hosted evidence.

## First integrated hosted run and portable test correction

Integrated candidate 6d920438245e61c488d5c8d028e9d4a55058983b, run 39763661795, passed Linux Node24 compatibility and repository checks on both platforms. Actual Windows job 119773701935 exposed 19 test harness failures caused by raw absolute Windows paths passed to Node's `--import`: seven build-cli, six snapshot, six readiness entrypoint cases. The native Windows open-handle promotion test passed in this run; full Windows acceptance did not. Convert only those three test files' preload specifiers through `pathToFileURL(...).href`, retaining every assertion. All 71 focused regressions pass locally after this correction; independent review approved the exact bounded test delta. The fresh exact-tree Windows run recorded below now passes all of those retained assertions. The integrated source also carries the independently diagnosed 012 Studio callback correction, with its original failing browser assertions unchanged.

## Exact hosted candidate evidence

The GitHub run API identifies PR #13 head `b54b2312e27a008b75bad04ab7f342ae4ef68ba6`, run attempt 1, completed successfully at 2026-10-22 10:44:58 UTC. Actions actually checked out synthetic merge [`1457802b523c20d59f288e4de57494b1c52228a3`](https://github.com/woodkill00/dmz_guide/commit/1457802b523c20d59f288e4de57494b1c52228a3), not the branch commit directly. GitHub's commit API and the independent reviewer confirm its tree is `5e2f740641da336bcb2cf65ead3f208e18cc9529`, exactly the candidate head's tree. The restored local commit `cc4debd8ba5f9e92a83e9ca41cf42085e2b23ca5` has that same tree before this documentation edit. Thus these are exact source-tree results, without pretending the synthetic merge is already merged to main.

| Hosted job | Selected runtime | Actual results |
| --- | --- | --- |
| [Windows runtime](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220/job/119777440963) | Node 22.23.3 | 274/274 runtime tests passed, zero skipped; formatting, 154-route build, Chrome reader/Studio, clean package and 197-hash extraction passed |
| [Linux runtime](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220/job/119777441313) | Node 22.23.3 | 273/274 passed, zero failed, one native-Windows-only skip; formatting, build, Chrome reader/Studio and 197-hash extraction passed |
| [Linux compatibility](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220/job/119777441289) | Node 24.22.0 | 273/274 passed, zero failed, one native-Windows-only skip; formatting, build, package and 197-hash extraction passed; no duplicate full browser suite |
| [Linux browser engines](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220/job/119777441063) | Node 22.23.3 | Firefox and WebKit reader, page actions and Studio suites passed |
| [Linux repository](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220/job/119777441035) | Python 3.11; Node 22.23.3 | Repository checks: zero failures; 25/25 Python tests passed; explicit feature prerequisites passed |
| [Windows repository](https://github.com/woodkill00/dmz_guide/actions/runs/39764754220/job/119777441198) | Python 3.11; Node 22.23.3 | Repository checks: zero failures; 25/25 Python tests passed; explicit feature prerequisites passed |

### Actual Windows filesystem and snapshot evidence

The Windows log records `ok 83` for the native exclusive-open-file OLD-preservation test, followed by its diagnostic that native file-sharing denial exercised the actual directory rename failure path. It was **not skipped**. The same job passes actual build write/copy/promotion failures, omitted pack/media/module detection, interrupted promotion, rollback restoration and rollback-failure retention. This is native filesystem plus real CLI/fault-path evidence, not an inference from Linux injection.

Windows also records the actual-build repeated ABA test passing (`ok 78`), alongside single-save exclusion, active-writer refusal, pending-recovery preservation, crash-retained owner lock and existing non-cooperating-edit guards. The catalog/media snapshot and post-capture writer tests remain unchanged; no retry, automatic recovery or broader locking was added to obtain a pass.

### Strict browser/Studio and release evidence

Both Chrome jobs reach reader success only after the existing health monitor and awaited owned-server cleanup. Firefox/WebKit logs also reach reader and Studio success with the unchanged page-error/CSP/console checks. The logs retain explicit 011 draft-safety and 012 recovery/focus/image-limit acceptance, plus Studio stale conflict/export, repeat-save, restart/fresh clone, read-only reader, 1,000-asset paging and narrow/200% reflow checks. The known intentionally malformed codec fixtures remain isolated diagnostics, not a blanket suppression of browser errors.

All three runtime/build jobs rebuild after browser work where applicable, package the public output, and verify 197 extracted file hashes, native links, live owned Node child and exact expected content. Verification tooling is not added to the reader ZIP. This does not claim physical-device testing, formal accessibility certification, deployment or independent visual approval; visual evidence is handled by its separate review owner.

### Independent approval and final closeout

On 2026-10-22 the independent reviewer confirmed all six terminal-success statuses and inspected the four runtime/browser job logs, verifying the exact synthetic-merge/head tree identity, actual Windows native-denial and ABA evidence, supported runtime versions, strict reader/Studio completion and owned extraction results. The implementation worker independently inspected all six job logs, including both repository/Python jobs. Source/runtime gates for the b54 candidate tree are approved. Reviewer-owned requirement checklists were not modified by this closeout.

The final pinned converge pass was append-only and added T028 (record the now-available hosted evidence) and T029 (new documentation-head and parent release gates). It assessed 9 FR, 4 SC, 17 acceptance scenarios, five technical decisions, ten constitution principles and all prior tasks; no production gap was found. A separate implement pass then updated this evidence and marked T016/T018/T022/T026/T028 satisfied for the reviewed candidate tree. T027/T029 stay unchecked. Hooks are absent; no optional runner or extension is claimed run.

**Still pending:** integration-owner publication of this documentation-only commit, independent documentation-delta review and fresh checks for that new head, any separately approved parent merge, and exact-main verification. Candidate CI does not complete those later gates. No production/test/shared-ledger changes, remote publication, merge or deployment are performed by this documentation worker.

Local documentation-closeout checks: explicit feature prerequisites, `python3 scripts/check.py` and `git diff --check` passed. The restored checkout has no local Prettier command, so `npm run format:check` could not launch it; the identical configured file/glob check passed using the existing sibling checkout's pinned Prettier 3.6.2 executable, without installation or source edits. This local documentation check is not a replacement for the new remote-head CI gate.
