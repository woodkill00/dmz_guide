# Implementation evidence and open work

## First vertical slice — 2026-11-13

Implemented a generated `/missions/audit/` page with 24 scoped Orders page targets, recorded Order/Story section targets, status filters, local editorial save/reload, source-change indication, bounded import preview/export, an undo event and links from Missions/Home/feature navigation. The local editorial state does not change the player's mission progress. The current official starter has zero recorded Order/Story missions, so the live page shows 24 unrecorded slots and an empty Story group.

Verification:

- `node --test tests/runtime/mission-audit.test.mjs tests/runtime/ui-feature-coverage.test.mjs`: 6/6 pass after schema changes.
- `node --test tests/runtime/site-topology.test.mjs tests/runtime/mission-audit.test.mjs tests/runtime/ui-feature-coverage.test.mjs`: 14/14 pass against stable build output.
- `npm run build`: 1,867 generated routes, success.
- `node tests/browser/mission-audit-run.mjs`: empty coverage, Fill later persistence, status filter, keyboard activation and 390px/200% page width pass in Chromium.
- `npm test` after serializing build/test: 998/998 pass, 0 failures, 263.3 seconds.

The earlier 997/998 run overlapped a build that replaced `dist` while the site topology test read it. After the build finished, focused topology tests and the serialized full suite passed. This is recorded as a verification orchestration mistake, not hidden as a product repair.

## Still open

The mission audit still needs full history/restore tests, source-fingerprint migration and stale relink review, spoiler and import-failure browser tests, broader keyboard and text-zoom checks, and independent reviewer checklist approval. Source-backed mission records have not been imported. Connected preparation, match lifecycle, whole-workspace backup, source-change queue, weapon qualifier review, content health, Home refinements and the final cross-page release audit remain open in `tasks.md`. No complete-game mission coverage or full feature acceptance is claimed.

## Connected preparation increment — 2026-11-13

The Collection workbench now shows a short next-action list derived from its existing unfinished-goal shopping projection. Known shortages are ordered before uncertain amounts; tracked missions and next upgrade tiers are labeled, and each item links to its record and the existing Why needed / locations explanation. This projection creates no new stock or game facts. A focused synthetic unit test and the Collection workbench browser journey pass. T009–T011 remain open because the complete mission→item→recipe→key→map journey and exact bidirectional links are not yet implemented and verified.
