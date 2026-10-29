# Feature Specification: Workspace help page
**Branch**: feat/026-workspace-help. **Created**:2026-10-28. **Status**:Implemented and verified locally; see acceptance.md.
**Input**: A document page explaining how everything works with links to the tools.

## User Scenarios & Testing
### US1 Read the guide (P1)
From the map, open a dedicated help page without losing a current draft. Read a quick start, use a contents list, and follow instructions for navigation/grid, website/category masks, duplicates, updates, custom points, icon creation, Explore/saved views/completeness/discrepancies, source review/calibration/backgrounds, backups/recovery and local-data limits. Page works at360px and by keyboard, even when terrain assets are missing.
**Acceptance**: visible Help link on map; help is readable and has valid heading anchors and navigation back to map; no external data required.
### US2 Open the right tool (P2)
Use help links to open the corresponding panel/subsection directly. These links navigate only; updates, filters, saves, imports and destructive actions require their normal explicit controls.
**Acceptance**: icons opens creator, points opens editor, Explore subtabs open correctly, update link opens controls without fetching source sites. Unknown targets safely leave normal map. Failed workspace startup gives a visible explanation rather than an empty destination.

## Requirements
- FR001 Dedicated linked help page with quick start, contents, complete shipped-workflow explanations and map return link; no invented live/completeness guarantees.
- FR002 Working links for map/key/layers/grid/updates, points/icons/sources/review/backups, Explore search/duplicates/saved views/completeness/discrepancies; source links for all five providers.
- FR003 Navigation never starts collection, changes saved state, runs reset or submits a form. Opening Help preserves map draft (separate tab). Destination initialization waits for readiness, fails visibly, and ignores unknown/untrusted target parameters.
- FR004 Accessible headings, labeled landmarks/links, visible focus, no360px horizontal overflow; static help readable without terrain or JavaScript; production build includes help.
- FR005 Document local-only storage versus backup, snapshot history/dedup/review distinctions, reference cards, game grid versus image pixels, safe update/recovery and supported icon scope. Explain user actions without exposing implementation internals in normal flows.

## Success Criteria
- SC001 Offline browser tests validate help contents/anchors, every tool target and five source URLs, no automatic update/state mutation, keyboard/mobile and draft preservation.
- SC002 Unit/build/full browser/repository checks and independent requirements/UI/navigation review pass; analyze/converge closes findings.

## Key Entities and Edge Cases
Help section(anchor/title/explanation/tool link); allowlisted tool destination. Missing terrain, startup delay/storage error, unknown/malicious query, browser back/reload, simultaneous existing map tab, unsaved form. No new user-data schema.

## Assumptions and Clarifications
A local standalone help page is intended, not an external document service. Help opens in a separate tab preserving drafts; tool links use the help tab to return to map. Navigation is not action authorization. No blocking ambiguity remains; existing guards/limits unchanged.
