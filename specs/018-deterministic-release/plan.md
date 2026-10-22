# Implementation Plan: Deterministic releases
**Branch**:018-deterministic-release | **Date**:2026-10-22 | **Spec**:[spec.md](spec.md)

## Summary
Change only final archive serialization, keeping016 validated payload and manifest unchanged. Canonical ZIP metadata avoids packaging-clock variance.

## Technical Context
Python3.11+ standard-library zipfile/unittest; Node22/24 existing build. No dependencies or migration. Windows/Linux supported; local evidence records actual environment and does not imply hosted results. Existing50000-entry/512MiB archive safety limits unchanged. Full source identity detects package script changes, so always rebuild after editing it.

## Constitution Check
Reviewed existing constitution, unchanged. Principles3/6 preserve integrity and bounded untrusted input checks;7 keeps a small reversible archive-only slice;8 requires reproduced red-first defect, independent gate and actual two-build evidence. Pre/post design gates pass with no exception. No extensions.yml or extension hooks exist.

## Project Structure and Ownership
- scripts/package-release.py: only final zip writer, no validation/source/build changes.
- tests/test_release_reproducibility.py: real independent build/package regression, clock/mtime/permissions perturbation, metadata/member/ZIP comparison and changed-input negative assertion.
- docs/reproducible-releases.md: policy and reproducible clean-checkout procedure.
- specs/018-deterministic-release/: lifecycle, reviewer checklist and acceptance evidence.
No build.mjs, reader/editor/Studio or shared017 hook changes.

## Design
Combine validated payload plus manifest bytes into one sorted mapping. Each member uses ZipInfo(name, date_time=(1980,1,1,0,0,0)), create_system=3, external_attr=(stat.S_IFREG|0o644)<<16, internal_attr=0, ZIP_DEFLATED, explicit compresslevel9; empty comments/extras. ZipFile archive comment empty. ZIP version fields remain standard-library deterministic defaults; UTF8 flag is selected consistently by zipfile for non-ASCII names. No timestamp environment variables and no file metadata propagation. Keep manifest version2/content unchanged.

## Verification
Before production: real016 build, two package runs at controlled2020/2024 clocks and different file mtimes show equal member hashes but unequal ZIP hashes. Fixed-clock mtime-only control confirms actual cause. Automated regression uses two fresh copied source trees (no reused dist/cache/Git); same unknown Git identity explicit, real independent node builds, mocked packaging clock distinct and ordinary permissions distinct. Compare all members, exact manifest/identity/ZIP, metadata. Changed valid source then rebuild must produce different output, not normalized away. Actual acceptance additionally uses two clean detached Git worktrees of one committed revision, verifies git status clean before each build, retains archives and logs. Python3.11 compatibility source parsing locally, real3.11 hosted. Full Python/runtime/check/build/package verifier gates remain.
