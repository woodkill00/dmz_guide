# Local Integration Acceptance — 2026-10-26

## Scope and provenance

Additive viewer under `tools/hajin-map`, based on original local commit `84b793c`. The established native guide's `src/`, `content/`, `schemas/`, `scripts/` and dependency lock are unchanged. Root changes delegate optional `map:*` commands, document the workspace and add a separate CI workflow. Unknown-rights downloaded imagery, icon files and full location snapshots are excluded. The tool's public directory contains a retained Leaflet license, not game resources. No deployment is requested or performed.

The pinned repository skills were applied in order: specify/clarify (019 context, destination/scope defaults), plan (setup-plan and design artifacts), checklist (independently reviewed requirements quality), tasks, read-only analysis, implementation, and convergence. No extension hooks are configured. The original standalone project had hand-authored Spec Kit-style artifacts; those are not misrepresented as pinned-skill execution. The existing constitution was reviewed, not amended.

## Actual local checks

Environment: Windows, Node 24.15.0, Python 3.14.4, installed Microsoft Edge via `CHROMIUM_PATH`. Physical devices and hosted Node/OS/engine matrix are not implied by local results.

| Command / check | Actual outcome |
| --- | --- |
| `py -3 scripts/check.py` | 0 failures |
| `py -3 -m unittest discover -s tests -v` | 40 passed |
| `npm test` | 521 passed, 0 failed, 0 skipped |
| `npm run format:check` | Passed |
| `npm run build` | 154 independent HTML routes and 404 page |
| `npm run test:browser` with installed Edge | Native acceptance passed, including map/list, reader flow, private state, planning, editor/recovery and hostile-input journeys |
| `npm run map:test` | 2 coordinate and 2 bounded-input tests passed |
| `npm run map:build` | Typecheck and Vite production build passed |
| `npm run map:test:browser` | Synthetic viewer checks passed; zero page errors and zero external/source-site requests |
| Explicit 019 Bash prerequisites | Spec/plan/tasks/design context resolved |
| Tracked-source and native-output audit | No downloaded Hajin assets/snapshots/private runtime state; native application/content paths unchanged |

Synthetic checks cover full-source initial fit, marker/image alignment within two CSS pixels after zoom/resize, Map key before Layers and repeated opener clicks, individual/all/none selection, source/key synchronization, source visibility/saved mix, zero-count categories, keyboard/dialog focus, mobile layout, invalid/oversized/count-limited snapshots and retry, missing-image recovery, unavailable browser storage, two source websites sharing record IDs, and the actual 15-second hung-image-decode deadline/retry. Synthetic locations and original generated pixels are explicitly labeled and never presented as verified game facts.

Local evidence is retained in root `test-results/integration-*.log`, native browser captures, and the tool's `.local/browser-checks/` results/captures. These ignored runtime artifacts are not published as game assets.

## Failed-history qualification

The first hosted workspace jobs (Node 22/24, run 40244704149) passed install, unit/input checks and build but failed before browser assertions because the downloaded Chromium headless shell could not use Ubuntu's sandbox policy. The bounded correction uses the same installed-Chrome CI channel as the existing native browser runner and retains `chromiumSandbox: true`. No failure is relabeled as passing; local rerun, independent delta review and new hosted results are required.

The corrected runner passed the complete local synthetic suite at `2026-10-25T23:27:49.429Z`, with zero page errors/external requests. Independent delta review accepted the one-line test-launch selection after inspecting the actual failure logs and native-runner parity; assertions, production source, deadlines and sandbox setting are unchanged. Fresh hosted checks remain open. Additional local native release verification passed after a fresh build: 208 payload hashes, native links and exact owned-child served content passed extraction verification (`py -3 scripts/package-release.py`, `py -3 scripts/verify-release.py`).

The first in-progress Python run had three failures because the planned workspace guide had not yet been created; after the document was added, the complete 40-test suite passed. The first native build hit a Windows directory-rename EPERM. The owned original preview watcher was visibly watching the nested integration candidate directory; stopping that preview and rerunning the unchanged native build succeeded. This is an observed recovery, not a proven general diagnosis. No native production code, assertion, timeout or gate was weakened to obtain a pass.

## Requirement trace and convergence

FR-001/003 and SC-001/003: native unchanged-path audit, checks/build/browser evidence and ignored asset paths. FR-002 and SC-004: documented root delegation, separate strict loopback port and failure states. FR-004–008 and SC-002: bounded input tests plus synthetic browser journeys and independent code/visual review. Research acquisition helpers were deliberately excluded; future remote acquisition needs separate review rather than silently importing original research tooling.

Convergence found no missing buildable viewer requirement after the bounded-read/recovery work. Independent final code/visual review accepted candidate `fb2110960f49b74fe14a312afbfa8ad726b92ae0`; see [review.md](review.md) for independently executed checks, source fingerprints and limits. This documentation-only receipt does not change the accepted application source. Remaining external gates are PR CI, normal merge and actual main result; these are reported when they happen rather than preclaimed here. This receipt does not certify real map accuracy, rights clearance, arbitrary device support, a public release or future CI results.
