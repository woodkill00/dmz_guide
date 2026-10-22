# Validation
Run `python3 -m unittest discover -s tests -p test_release_reproducibility.py -v`, then full Python discovery, `npm test`, `python3 scripts/check.py`, `npm run build`, `python3 scripts/package-release.py`, `python3 scripts/verify-release.py`.
For independent clean committed builds follow docs/reproducible-releases.md after implementation. Keep both output archives and logs. Record platform/Node/Python/zlib and revision, check clean status before builds. Same bytes are internal consistency evidence, not authenticity or hosted/browser acceptance.
