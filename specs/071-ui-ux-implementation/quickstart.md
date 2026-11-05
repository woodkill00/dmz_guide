# Validation quickstart (planned implementation checks)

This turn executes planning analysis and repository/document checks only. Commands below are existing future regression entry points, not tests claimed passing for unimplemented UI.

From canonical MW4 on supported Node22/24 and Python3:

```powershell
py -3 scripts/check.py
npm test
npm run build
npm run map:test
npm run map:build
npm --prefix tools/hajin-map run test:workflows
npm --prefix tools/hajin-map run test:menu
npm --prefix tools/hajin-map run test:safes
npm run test:home
npm run test:keys
npm run test:sitemap
```

New planned files from tasks.md are run directly with Node/Playwright or added to the appropriate existing runner without removing fixtures. Use fresh synthetic contexts, stub only allowlisted data/operations, collect page/console/request errors and exact source hashes. Existing broad map browser aggregate has a previously recorded065failure; do not claim it passes without reproducing/repairing and documenting its owning cause. New shell/preservation must not ignore it at default-promotion gate.

Validate US1 native shell/no-JS and unavailable ports; US2 Layers/Find/detailBack/routeidentity/Safe runs/held workers; US3 all five list/progression journeys; US4 weapon/applicability/unknown evidence; US5 per-owner author/preview/recovery. Exact mandatory stress variants/geometry are in contracts/layout.md; domain/async states in lifecycle.md; feature/state/column/management coverage in workspaces.md and feature-coverage.md.

Manual gates: actual browser zoom200%, reflow-equivalent400%, on-screen keyboard/visualViewport, keyboard+screenreader sampling and touch routes. Record actual device/browser/action/result; root-font scaling or synthetic resize does not fulfill these gates. Pending manual work prevents production default promotion, not completion of this pre-implementation plan.

Rollback rehearsal toggles presentation flag off, checks old preference bytes and all domain revisions/values unchanged, then re-enables display without replaying writes. Never use an owner profile in public screenshots or test imports. No server deployment/push/provider collection is implied.


## Explicit variants after T009/T010 implementation

Use DMZ_UI_VARIANT=legacy for retained baseline suites. Start isolated preview/test build/server processes with validated DMZ_UI_VARIANT=modern for new071suites, then assert rendered surface/variant/contract and actual mounted handler before testing. The environment override selects presentation only; it cannot collect data or merge stores. See contracts/rollout.md for precedence/static no-JS/default promotion and exclusive fallback. Do not run new suites against unchanged default legacy and call the redesign verified. Include tests/browser/ui-feature-coverage.mjs actual target activation; its static runtime counterpart alone is insufficient. These flags/tests are planned, not available or executed in this documentation turn.
