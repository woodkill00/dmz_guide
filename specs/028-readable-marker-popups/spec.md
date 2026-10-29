# Readable marker popups
2026-10-28. Scoped repair; user requests scrollable readable icon popup text.
Reproduction: long source/owned notes expand Leaflet popup without an internal scroll region;11px text and unseparated actions hinder reading.
FR001 Website, private, reviewed and search-result marker popups have a consistent title, scrollable details and separate actions. Preserve all notes and their line breaks; long words wrap; imported text remains inert.
FR002 Popup fits360×800 and1440×1000 viewports; details region keyboard-focusable with accessible label, visible focus and wheel/touch scrolling that does not pan/zoom map. Title/actions remain available while details scroll. Short notes remain compact.
FR003 Preserve links, copy/fallback, Details/edit/discrepancy, Nearby and current masks/private data. No source collection, data migration or game claims.
SC001 Synthetic long-text source and workspace popup browser reproduction passes desktop/mobile, keyboard/wheel/inert text/actions and short-popup checks; strict build and relevant regressions pass.
Clarification: scroll detail panel, not whole popup; no data-format changes. Default font14px/body line-height1.55. Physical devices/screenreader are not claimed tested.
