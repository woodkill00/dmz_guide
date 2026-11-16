# Acceptance — COD Central Orders completion

Date: 2026-11-16. Feature branch: feat/085-codcentral-order-completion.

## Delivered

- Added COD Central reported tasks for Astronaut and Stalking the Stalker, retaining visible provider disagreement.
- Added all five reported X01 chapter reward lists to the directory and individual mission pages. Rewards are references, not inventory grants.
- Added chapter links for Hajin/X01 details and selected paraphrased X01/Hajin location notes. Provider screenshots remain at the source.
- Completed an 87-entry source identity/chapter/task-presence receipt: 81 Orders plus six Story missions; zero gaps. This is not gameplay or full semantic verification.
- Guarded source intel against appearing in an unrelated content pack.

## Verification

- `node scripts/check-python.mjs`: 0 failures (first full check).
- `npm test`: 1,033 passed, 0 failed on final rerun.
- `npm run build`: 2,042 independent HTML routes and 404 page.
- `node tests/browser/mission-directory.mjs`: PASS at mobile viewport, including X01 reward disclosure and chapter link.
- `npm run format:check`: PASS.
- `git diff --check`: PASS.
- Independent reviewer: source/data/rendering review and browser/build review, no remaining P1/P2; reviewer checklist complete with no remaining scoped blocker.

## Limits

COD Central reports are community observations. Chapter placements may vary; disagreements and current-build uncertainty stay visible. The guide links provider tips and images rather than copying them into the public repository.
