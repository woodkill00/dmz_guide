# Implementation Plan: Trustworthy build and test outcomes

**Branch**: `013-build-reliability` | **Date**: 2026-10-22 | **Spec**: [spec.md](spec.md)
**Status**: A3/C12/A2/A1 requirements and production ownership approved on 2026-10-22; A4 repair amendment independently approved with explicit narrow author-store ownership grant.

## Summary

Repair reproduced last-good-reader loss using sibling staging and rollback-aware promotion. Replace false-success readiness checks with bounded child-bind/live/content evidence. Select the existing documented Node 22/24 support explicitly in a three-combination CI matrix. Repair the demonstrated repeated-save snapshot defect through a narrow existing-mutex capture boundary, preserving pending recovery.

## Technical Context

- Runtime: existing dependency-free ES modules, Node 22.x and 24.x; Python 3.11 release checks; existing Playwright 1.58.2 browser suites.
- Storage: local public build directories only. No browser storage, schema or public catalog change.
- Validation: Node test runner, Python unittest, format/check scripts, existing browser/Studio suites, clean extracted package checks, Linux/Windows CI.
- Failure limits: readiness 15 seconds total, 1 second per HTTP request including body, 64 KiB tail per output stream, cleanup at most 5 seconds.
- Source baseline: `db8a6e237aa822205ed346b178a3c7dc8fafea5c` in isolated worktree. Integrator owns all PRs and final-main evidence.

## Constitution Check

Pre-design and post-design: conforms to small reversible slices, evidence before completion, preservation of prior valid state, private/public separation and static/local architecture. No constitution amendment, migration or additional service. Custom requirements checklist stays reviewer-owned. Unreproduced A4 coordination is excluded.

## Phase 0: Research

See [research.md](research.md) and [reproduction/proposal.md](reproduction/proposal.md). Source-confirmed A3 destructive output replacement has an actual injected-EIO reproduction. A2/C12 false-success reproduction and all six A4 controls are complete and independently verified. Production changes do not start until owning artifacts and reproductions are reviewed.

## Phase 1: Design

### A3 staging and promotion

Introduce `scripts/build-output.mjs` to own output lifecycle and expose a narrowly dependency-injectable filesystem boundary for tests. `scripts/build.mjs` continues existing catalog/render work but writes all generated routes/assets to a unique sibling candidate directory. Validate expected output existence/readability and route/asset inventory before promotion. Do not alter source catalog, HTML semantics or release filtering.

Acquire an exclusive root-local build lock before staging or promotion. The lock serializes cooperating builds; it is not an author-store lock. A lock held by another build or retained after an uncertain interruption causes a diagnosed unsuccessful build, never speculative lock theft. Store build-control and candidate/previous directories under an ignored root-local `.build-state/` on the same filesystem as dist. All candidate paths are unique and controlled, not imported/user path input.

Once complete, move existing dist to a unique retained previous directory, then move the candidate into dist. On promotion failure attempt to restore previous dist. Never delete the only complete OLD tree. If rollback fails, report the exact retained path and that dist is not the old build; do not overwrite an unexpected concurrent destination. Remove only artifacts created by this successful attempt once fresh promotion is confirmed. On pre-promotion failure remove the current incomplete candidate when safe, retain OLD unchanged and report it. On uncertain hard interruption preserve material and lock for explicit inspection, document recovery; do not auto-prune arbitrary old directories.

Injected failure tests use module-level operation injection or a test-only Node preload, not a production environment flag. Diagnostics are emitted by the build CLI and flow into the existing Studio rebuild outcome; no page banner is inserted into retained HTML. Success logging moves after promotion.

### C12/A2 readiness contract

No reader server contract change is required. Existing `serve.mjs` prints `DMZ Guide: http://127.0.0.1:<port>` only from its successful listen callback. Readiness requires that exact child-owned stdout line, a child still alive before and after the probe, successful HTTP status and exact expected route bytes (or their SHA-256).

A reusable Node helper under `tests/browser/server.mjs` chooses an available loopback port with a temporary bound socket, releases it, starts the child with explicit HOST/PORT, captures bounded stdout/stderr immediately, and waits for bind identity plus exact `dist/index.html` content. A port-selection race is harmless: absence of the child bind marker or child exit fails instead of accepting the racing listener. Existing `TEST_PORT` may remain an explicit override for collision tests; default browser ports become isolated.

The helper returns `base`, live-child status and bounded `stop()`. It is integrated only into `tests/browser/run.mjs` and `tests/browser/engines.mjs`; preserve health monitors, screenshot paths and all assertions. Studio has a separate authenticated startup protocol and is not changed without a separately reviewed integration need.

The extracted-release verifier invokes the same dependency-free Node helper through a CLI adapter rather than maintaining a separate Python polling implementation. The shared helper lives in `scripts/server-readiness.mjs`; browser consumers use `tests/browser/server.mjs` as needed. Python supplies the extracted serve.mjs path, exact extracted maps page, route and expected bytes, bounds the outer subprocess lifetime and preserves child-only cleanup. The helper is verification tooling in the source checkout only, never added to the static reader release. Both consumers use identical bind/live/content/deadline behavior, with separate entrypoint integration tests.

### A1 bounded runtime support

Preserve Linux/Windows full baseline runtime jobs on Node 22.x; add one Linux Node 24.x job running npm ci, format, runtime tests, build, package and extraction verification, without duplicate full browser suites. Explicitly select Node 22.x for the existing Firefox/WebKit job. Use an official SHA-pinned `actions/setup-node` version after its source is verified, not a guessed SHA. Update package engines/lock metadata and runtime docs to the bounded supported majors if approved by integration owner. Three combinations total: Linux22, Windows22, Linux24. Repository Python checks also explicitly select Node22 because the extraction-verifier regressions invoke the Node helper; this duplicates an existing platform-major combination, not a fourth one. Feature prerequisite coverage remains owned by integrator.

### A4 snapshot-repair amendment (approved 2026-10-22)

The controlled investigation is complete: pending/interrupted/active writer and one completed save fail cleanly, but three completed `store.save` calls 0 → 1 → 0 → 1 evade sequential metadata revalidation and actual build publishes version0/alpha0/beta1. See reproduction/a4-analysis.md and a4-results.json; reviewer independently reproduced all six cases.

Approved narrow repair: export `withRepositorySnapshot({ root }, operation)` from `scripts/author-store.mjs`. Resolve root before passing it to existing `withLock`/`serial`, reuse its cross-process current.lock and owner-token release, then inspect pending recovery without changing it before running the callback. Lock contention (live/dead/unverifiable) fails immediately using current error behavior; no retry/reclaim/recovery. The callback performs only raw `readCatalog` and `prepareBundledAssets`, never a queued `store.read/save` or another locking API. In `scripts/build.mjs` acquire this wrapper while reading catalog and materializing validated bundled bytes; release before render/copy/output promotion. Existing catalog external-edit guards remain untouched. Build-only `.build-state` lock is acquired before repository snapshot lock; author operations never acquire the build-output lock, so there is no reciprocal order.

Tests must cover normalized root aliases, successful and throwing callbacks releasing only their own token, other-owner lock preservation, pending journal preservation, concurrent separate-process writer exclusion, captured media matching the snapshot, no recursive queue use, and the original controlled ABA sequence returning one whole revision or refusal. Preserve existing save/recovery tests and explicit version semantics. This is not a global readCatalog lock and does not claim protection against non-cooperating external editors. No author.mjs or catalog.mjs edit is proposed.

## Ownership and touched paths

- Build worker: `scripts/build.mjs`, proposed `scripts/build-output.mjs`, `tests/runtime/build-output.test.mjs`, `tests/runtime/build-cli.test.mjs`, `specs/013-build-reliability/**`.
- Integration-owner approval required: `.gitignore`, `.github/workflows/quality.yml`, `package.json`, `package-lock.json`, `docs/release.md`, `docs/quickstart.md`, literal runtime support text only in `README.md` and `scripts/package-release.py`, `tests/browser/run.mjs`, `tests/browser/engines.mjs`, `scripts/verify-release.py`, proposed `scripts/server-readiness.mjs` and readiness helpers/tests. Ownership approved by integration owner for these paths.
- A4 approved amendment ownership: only `scripts/author-store.mjs` narrow snapshot export, `scripts/build.mjs` integration and `tests/runtime/build-snapshot.test.mjs` after independent amendment approval and explicit integration-owner grant.
- Forbidden without new gate: `scripts/author.mjs`, `scripts/catalog.mjs`, broader `scripts/author-store.mjs` changes beyond the approved export, private profile files, shared schemas/contracts.

## Verification and rollout

Reproduce before repair; retain baseline evidence. Unit/fault tests cover first build, complete replacement, write/copy/validation failure, first rename failure, second rename failure, rollback failure, lock collision and preserved interruption material. Readiness fault tests cover occupied port/wrong content/early exit/hung body/never-ready/excess output and exact successful content; run actual extraction verifier as end-to-end test. Run documented check/format/runtime/build/package, then existing browser/Studio engine coverage. Windows promotion fault injection and Linux/Windows exact-head CI are merge gates, not claims based on Linux tests. Integrator applies a reviewed bounded commit, runs independent review, and monitors exact-head/final-main CI.

## Complexity Tracking

One built-in-only Node readiness implementation is reused by Python verification and Node browser harnesses. No cross-language framework or broad orchestrator extraction. The build lock is isolated from author transaction semantics; no speculative shared coordination.

## Bounded Windows fixture diagnosis after documentation-head failure

Only tests/runtime/build-windows.test.mjs changes: select the installed Program Files/PowerShell/7/pwsh.exe if it exists (the actual runner shell logged this path), else the existing powershell.exe; never retry a failed host with another executable. Preserve the same no-profile/noninteractive native FileShare.None operation and five-second READY deadline. Add bounded stdout/stderr and monotonic spawn/script/READY/exit timings, observe the helper still alive during promotion, and await owned-child exit after the existing two-second graceful period with at most one additional second to confirm forced termination. Require normal helper completion for a passing native test. No product deadline, rename/OLD assertion, workflow concurrency, browser assertion or filesystem-based skip policy changes. Cold legacy-host startup is an unproven hypothesis; actual exact-head Windows execution is required.
