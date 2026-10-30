# 033 Navigation and item directory
Status: scoped implementation authorized 2026-10-29; acceptance pending.

## Stories and acceptance
US1 P1: A reader reaches every guide workspace using a consistent dedicated navigation bar and a human sitemap. Current section is indicated. Mobile and keyboard users can reach all links without horizontal page scrolling. Sitemap lists workspace routes and all bundled public detail routes; spoiler titles remain masked.
US2 P1: A reader sees a compact items directory with item detail, Edit and Remove links, searchable by token and filterable by type and pack, sorted by name/type/status. Fixture data remains visibly separate. Query text is not persisted in the URL. No-JavaScript reading works.
US3 P1: An owner follows Remove to the exact local Studio record and sees reference-aware removal preview. Cancellation changes nothing; confirmation changes only unsaved draft; existing validation, explicit repository save and recovery remain mandatory. No browser profile or public server deletion occurs.

## Requirements
FR-001 Shared navigation exposes Items and Site map, keeps active section, contains a clear separate local map workspace destination.
FR-002 /sitemap/ lists all public workspaces and bundled content detail routes with pack context and spoiler projection; /map-workspace/ explains startup, separate storage and no live tracking.
FR-003 /items/ lists every bundled item including weapon/resource/currency with compact rows, details and Edit/Remove action links, type/pack filters and name/type/status sort. Default pack keeps fictional fixtures out of normal results.
FR-004 Existing catalog search privacy, URL validation, pack scoping and empty states remain intact. Record names and arbitrary data remain escaped.
FR-005 Remove resolves strict stable pack and record identity, opens only removal preview and blocks referenced records; no automatic confirm/save or external request.
FR-006 Preserve drafts, inventory, profiles and repository recovery contracts. Separate private browser editing is linked and labeled, not misrepresented as editing public content.
FR-007 Navigation and rows reflow at 320px and 200% text, use semantic links and keyboard-focus targets at least44px, no invented source facts.

## Clarifications
Existing public website is read-only: Edit/Remove launch instructions then explicit local Studio, not direct public mutation. All items means bundled catalogs including selectable fixtures, not another user's private content. Private content remains available through its existing reader/editor. Sitemap is human-facing; no public origin exists for canonical XML. Local map uses existing default5175 and independent startup/storage. User approval covers feature implementation and integration, not destructive bulk deletion.

## Success criteria
SC-001 Every generated workspace and public detail is discoverable through navigation/sitemap.
SC-002 Filtering/sorting never mixes record identity or exposes protected names.
SC-003 Remove intent cannot mutate until existing explicit confirmation/save; referenced deletion remains blocked.
SC-004 Runtime/build and browser navigation/directory/removal scenarios pass; unavailable physical-device certification is not claimed.

## All-page navigation repair (2026-10-30)
Extend FR-001/SC-001 coverage to the companion interactive map, static map help, local Content Studio and saved repository previews. Every generated guide HTML page (including404, details and author guidance) keeps exactly one Main navigation landmark. Reuse one escaped renderer/link definition, include explicit interactive map/help links, mark current section where applicable, preserve pack scoping on guide links and send no query/private state to other applications. Companion guide links target the default reader127.0.0.1:4173, map links use their own origin on map/help and default5175 from the guide. Cross-application and map-to-help links open a new tab to preserve drafts; no service is started or probed automatically. No Studio API/origin guard changes. Navigation is server-rendered in Help/Studio and built map HTML, keyboard-accessible without JavaScript, reflows at320px and200% text, and never consumes a fixed viewport subtraction on the map. Modal tools remain within their owning page rather than receiving duplicate navigation. Verify all built HTML, actual routes, no-JS/mobile links, draft preservation and map regressions.
