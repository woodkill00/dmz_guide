# Validation quickstart
Use Node22/24 and Python3; npm ci. Select feature explicitly with SPECIFY_FEATURE_DIRECTORY=specs/016-accessible-release-evidence.
Run focused runtime tests for image descriptions, recovery inventory and release manifest, then npm test, python3 scripts/check.py, npm run build, npm run format:check, python3 scripts/package-release.py and python3 scripts/verify-release.py.
Expected: shared asset descriptions differ by record; decorative alt empty; legacy valid; malformed data rejected before save. Read-only inventory leaves bytes unchanged and rejects pending/tampered eligibility. Package covers all shipped payload, rejects missing/extra/duplicate/tampered members before execution. Hosted browser/visual gates remain required, not implied by local runtime tests.
