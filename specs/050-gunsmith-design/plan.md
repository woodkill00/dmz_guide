# Plan

Manual pinned Spec Kit lifecycle, constitution reviewed. Retain049. Add pure `gunsmith-view.mjs` rendering helpers and scoped stylesheet; integrate into armory renderer while retaining evidence tables. Extend armory client with roster preview/filter/slot handoff and builder initialization with validated weapon query. Private storage/domain schemas remain unchanged.

Official artwork is collected explicitly into ignored `.local/weapon-art/`. Add fixed-ID readonly endpoint to the existing local guide server; validate no symlinks/size/raster signature before returning art. Missing valid figure returns a project-authored SVG unavailable notice. No local art in static dist/release or Git. Art is cropped visually through SVG viewport geometry, not rewritten or invented. Source attribution and local-use register retain source/date/context. No user screenshot copied.

Rendering remains escaped and source scoped. Native list links and tables survive no-JS; preview enhancement selects visible rows, synchronizes buttons/search/class and clears empty state without stale weapon actions. Actual supported slots drive semantic links; slots unavailable for a weapon are not fabricated. Gun art remains base artwork when choosing an attachment, with explicit label.

Verification: Node render/escaping and endpoint security tests; actual browser interactions, saved-state isolation, layouts/themes/text sizes and no-JS on desktop/mobile/all3 engines; axe; existing048/049 tests; repository/format/build. Independent definition/implementation review through reviewer-owned checklist. No remote publication.
