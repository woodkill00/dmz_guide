# Implementation Plan: Workspace help
2026-10-28; feat/026-workspace-help; [spec](spec.md).
## Summary/Technical Context
Static help.html with separate help.css and no scripting dependency; Vite multi-page build. Map header and information dialog link to help in a new tab. Allowlisted ?tool= destinations on existing index; wait workspace.ready then open correct tab/subtab or key/layers. Unknown target ignored; failed workspace gives visible message. No new package/schema/network service.
## Constitution check
Existing constitution reviewed, no amendment. Local privacy, inert navigation, accessible/mobile content, factual source uncertainty and no auto action all pass before/after design.
## Research/decisions
Existing app returns ready promise, uses workspace tab/dirty guards, Explore openSection helper, main owns map key/layers. Add guarded openTool method rather than simulate destructive button clicks. Query routing only at initial load, no hash listener to displace a live draft. Plain HTML makes docs usable with scripts/terrain unavailable. Help links use current doc tab; original map remains untouched. No external research needed: docs based on shipped code and local-map-workspace.md.
## Structure
help.html/src/help.css; vite.config.mjs multi-page input; src/tool-links.ts allowlist; src/main.ts links/query navigation; src/workspace/app.ts guarded tab entry. scripts/help.browser.cjs wired full runner; tests/tool-links.test.ts.
## Verification/rollback
Pure allowlist tests; offline help/noJS/anchors/tool-navigation/no-autoupdate/failed-init/mobile/focus/draft-preservation tests. Full existing checks. Independent definition and implementation review. Revert new help/router code without any data migration; no persistence changes.
