# Validation guide

Use the isolated feature checkout and explicit `SPECIFY_FEATURE_DIRECTORY=specs/013-build-reliability` for every lifecycle operation. Baseline reproductions run against a pristine `db8a6e2` source checkout or temporary copy, not an already repaired build.

1. Run `node specs/013-build-reliability/reproduction/a3-write-failure.mjs /path/to/baseline`. Expected baseline: exit 1 from actual build, OLD sentinel/reader lost and partial replacement present. The harness labels this a reproduced defect and removes its own synthetic temp directory.
2. Run the readiness and A4 commands documented in their adjacent reproduction reports. They must retain exact commands and distinguish assertion success from the product bug outcome.
3. After approval and implementation, run the focused build-output/readiness tests, then `npm run format:check`, `npm test`, `npm run build`, `python3 scripts/check.py`, `python3 -m unittest discover -s tests -v`, `npm run package`, and `python3 scripts/verify-release.py`.
4. Run the existing `npm run test:browser`, `npm run test:engines`, `npm run test:studio`, and `npm run test:studio -- --engines` with installed browser dependencies. A missing dependency is unavailable evidence, not a pass.
5. Record exact-head Linux/Windows/Node22 and Linux/Node24 CI outcomes. Review retained OLD diagnostics, failed promotion/rollback paths and interruption material before merge. Do not auto-delete unknown build or author recovery directories.
