# Acceptance evidence — 006
2026-10-21. Runtime: Node v24.19.0. No public deployment.
- Independent requirements gate: reviewer approved 9/9 in checklists/review.md before application implementation.
- Red phase: node --test tests/runtime/locations.test.mjs failed with missing locations module, as expected before implementation.
- Green phase: same command passed 6/6, zero failures, covering LI-001/002/003/007 and defensive frames/floors/version changes.
- Syntax checks passed for src/client/maps.mjs, src/ui/maps-page.mjs and tests/browser/maps.mjs.
- Browser module is implemented, NOT EXECUTED locally. Parent-confirmed sandbox socket denial means no local browser retry or sandbox weakening. Hosted sandboxed Google Chrome evidence is pending.
- Integration build/shared styles/common generation guard and shared planner module are parent-owned and pending integration. Review is not runtime acceptance.
- Full isolated runtime suite after npm ci --cache /tmp/dmz-npm-cache: 30/30 pass. Browser regression now also validates a generated original raster through 005 buildTransfer before saving an overlay and checks new bounds/version/floor plus rapid pack changes. Browser execution remains pending parent CI.
- Repository check `python3 scripts/check.py`: 0 failures. `npm run build`: passed against the isolated foundation; /maps route registration is intentionally parent-owned, so this is not integrated route evidence.
- Independent source review found pending raster decode needed cancellation/time limit, unrevealed goal spoiler names needed masking, and explicit record scope needed effective build display. T014 implements fixes; pure tests now 7/7, and browser module adds deliberately never-settling decode timeout/cancel regression. Actual browser run remains pending.
