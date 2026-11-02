# Acceptance — 058

Local-only implementation on `feat/058-home-navigation-workflows`, based on 057 (`949e332`). Manual pinned Spec Kit full-cycle fallback; no automated skill invocation or remote publication is claimed. All implementation checks below passed; the independent final gate is recorded in the reviewer-owned checklist.

## Delivered behavior

- FR001/007: actionable Home, pinned/recent workspaces, guarded read-only progress snapshots and explicit checks of the four fixed local service origins.
- FR002: one registry of 73 destinations; grouped shared navigation, menu filtering, breadcrumbs and searchable feature directory; existing tools retained.
- FR003: 1,171 safe public search entries, including all feature destinations; bounded queries/results, separate mission/upgrade/progression types and exact reference/planning/grid links.
- FR004: catalog/version-bound display filters, expansion and scroll; Back-to-results; repeated Back/reload recovery; existing dirty-draft guards remain authoritative.
- FR005: map Search/Layers/Routes/Trackers toolbar, Advanced, bounded read-only selection inspector, selected-marker highlight and persisted display controls; existing popup actions and route progress remain authoritative.
- FR006: separate Missions entry, requirements/manual progress and clear unknown coverage; upgrades and missions included in the verified journeys.

## Executed evidence

Ignored `.local/` logs are local receipts, not public game data or release artifacts.

| Check | Result | Receipt |
|---|---|---|
| Repository checker | 0 failures | `.local/hub058-repository-final.log` |
| Root runtime tests | 768 passed; no failures, skips or cancellations | `.local/hub058-runtime-final.log` |
| Root formatting | All matched files pass | `.local/hub058-format-final.log` |
| Guide build | 896 independent routes plus 404 | `.local/hub058-build-final.log` |
| Full Chromium regression | Pass, exit 0, strict browser health; all existing suites plus the new journeys | `.local/hub058-browser-final.log` |
| Progression journey | Chromium, Firefox and WebKit pass; spoiler/manual progress, confirmations, reload, recovery and nonconsumption retained | `.local/hub058-progression-final.log` |
| New user journeys and existing navigation regressions | Chromium, Firefox and WebKit pass with strict browser health, including keys, compact UI and upgrade dashboard | `.local/hub058-home-final.log` |
| Late regression suites | Community, offline, reflow, showcase, draft safety, recovery truthfulness and reader flow pass in Chromium | `.local/hub058-late-final.log` |
| Accessibility | 60 axe scans, zero violations: five pages × two viewport/text scales × two themes × three engines | `.local/hub058-a11y-final.log` |
| Existing metadata floor | 84 cases per engine, 252 total | `.local/hub058-metadata.log` |
| Map unit tests | 178 passed, no failures/skips/cancellations | `.local/hub058-map-unit-final.log` |
| Map typecheck/build | Pass; existing large-chunk advisory remains | `.local/hub058-map-build-frozen.log` |
| Map workflow browsers | All three engines pass: toolbar, layers/search, inspector/mobile/display reset and authoritative waypoint/tracker controls | `.local/hub058-map-browser-final.log` |
| Live applications | Guide, map, Studio and manager shared navigation; Home/search/Missions smoke pass | `.local/hub058-live-final.log` |

Public build identity `a90800a64c6ad2b0b17a5c829136e5951f2e3859edf891a88674ad9beff392d1`: all 158 captured source-file hashes match the tested `dist/assets/build-identity.json`. No build is replaced while browser verification is running.

## Verified journeys and limits

Home → Upgrades → current requirements → material reference → Back → explicit completion → Home summary; status changes leave inventory untouched. Home → Missions → fictional training requirements/prerequisites → manual progress → detail/Back → Home summary. Other journeys cover keys/stash/trip/grid, weapon/detail/attachments, unified search/keyboard, pins/recents, map waypoint/tracker actions, blocked/hung storage, held reads, repeated departure/Back, service allowlist and responsive layouts.

The current non-fictional native catalogs contain no DMZ Orders/story definitions. Mission coverage is shown as unknown, with a link to the existing separate map mission tracker. The automated mission-progress test uses a clearly labeled fictional catalog; it does not establish real mission facts. Search covers safe public records, not private/map-workspace data. Service reachability is transport evidence, not application-health certification. Provider catalogs, game accuracy, road accuracy, private cross-origin synchronization and public deployment are outside this change.

Actual Home desktop/mobile and synthetic map-inspector screenshots were reviewed independently. No original user screenshots, credentials, profile data or downloaded provider assets are added to history.
