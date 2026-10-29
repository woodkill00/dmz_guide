# Visible waypoint tracking acceptance
2026-10-29. Local viewer on127.0.0.1:5175, Windows/Node24.15.0. Implemented and automated-verified.

## Delivered / requirement coverage
- FR001/T003: visible Routes launcher beside My workspace, guarded direct entry, numbered-stop readable popups, foreground stop numbering and source/record text kept inert. Existing draft reopens unchanged rather than being replaced.
- FR002/T002: optional reached tokens bind to manual waypoint ID or exact record key+capture/decision version, not row number. Real drag and keyboard reorder retain progress; remove/reselect normalizes obsolete tokens. Source claims/POI visited flags are unchanged. Reset is reversible with session-only Undo until another mutation/reload; CAS still protects concurrent changes.
- FR003/T002–003/T010: selected route persists; manual reached/total/next/completed status, Show next/Mark next reached/reset/Undo in map and editor. Missing/stale next stops disable focus/reach. Empty/all-complete/deleted active routes handled. Progress/name changes reuse road geometry; delayed worker results paint latest progress and cannot restore old flags.
- FR004/T004/T007–009: reachable44px controls, current/reached marker labels and ARIA step, compact reorder rows, keyboard focus stays in tracker/row after completion. Closing-popup focus waits boundedly for visibility and respects newer focus/dialog/disposal.360×800 controls fit; popup reading remains unobscured.
- FR005/SC001–002/T005–006: exact evidence below, independent definition/UI review, analysis and convergence tasks. Existing source-reference-only backup/privacy and strict old-reader rollback limits remain.

## Executed checks
- `npm run map:test`:122passed,0failed, including three new progress/identity/old-new private backup/validation tests.
- `npm run map:build`: strict TypeScript and Vite production build passed,70modules.
- `npm run map:test:browser`:74scenario groups passed at `2026-10-29T01:57:56.532Z`; zero runtime errors/external requests. Existing029/028and earlier map scenarios retained. New focused runner `node scripts/waypoint-tracking.browser.cjs` passed three groups: actual popup/HUD reached/reset/Undo; actual drag+source-version reselect; active route reload/fresh-profile/backup/delete; draft preservation; missing next disabled; mobile bounds/axe. Delayed road worker verifies progress does not schedule another solve or lose reached styling after completion.
- `npm run test:engines`: Chromium156.0.8078.4, Firefox157.0, WebKit27.2 passed existing flows plus visible waypoint progress/launcher and progress after IndexedDB reload. Final engine report: `2026-10-29T01:59:33.621Z`, all3passed. Chromium configured WCAG2A/AA/2.1AA axe scans cover pages/tabs/Planner/popup and interactive map tracker; zero reported violations, no disabled rules. Focused mobile tracker scan also passed.
- `py -3 scripts/check.py`:0failures; diff whitespace check passed.
- Road solver/capacity algorithms and native guide source are unchanged. Feature029's constrained production capacity and native regression evidence stay separate; not rerun or presented as a new all-maximum performance claim. Hosted CI not executed remotely.

## Actual local smoke
At `2026-10-29T01:57:59.041Z`, a separate temporary browser profile used the existing local partial road graph (11segments), created three manually selected stops, solved2/2legs, marked the first reached and reloaded. Actual map showed3numbered stops/1green reached stop and next-stop highlight; status was `Route 1 · Manual progress: 1/3 reached · Next 2: Map waypoint · Road plan (unverified, partial local network) · 2/2 connected legs`. Zero runtime errors/external requests. No existing user profile was modified or sample route inserted. Private screenshot `.local/provider-research/waypoint-tracking-live.png` and result stay ignored.

## Review / convergence
integration_review independently approved R001 after defining Undo reset's revision window. fusion_research found WP-UI-R1 (final reached action discarded focus when next disabled); repaired, with row/popup focus extensions and final clean delta review. T007–010 record compact rows, draft-preserving launch, popup fade focus and cached-geometry/stale-worker repairs. No tests were weakened; pointer dragging, source staleness, all-complete focus and delayed solve assertions remain.

Road coverage is still the separately retained partial/unverified network; actual road/bridge/gate access, physical touch and screenreader testing remain owner evidence work under029manual-verification.md. This tool records manual reached actions; it does not receive live player location. No source collection, remote push/merge/deployment or account connection.
