# Compact responsive UI

Status: definition independently approved; implementation and Guide/map/Studio functional verification complete; independently accepted for local delivery with documented limitations; local delivery verified. Authorized 2026-11-01.

US1 Find guide, inventory, upgrade and collection actions quickly in a compact readable interface.
US2 Open and dismiss organized navigation reliably on Guide, Studio and map surfaces.
US3 Use the interface at narrow widths, enlarged text, keyboard and reduced motion without losing actions or data.

FR001 Centralize meaningful fluid spacing, content widths and control sizes using CSS variables, calc(), clamp(), min()/max(), grid/flex and rem units. Do not mechanically convert every constant to calc(); correctness requires intrinsic sizing and tested bounds. Preserve 44px primary action targets and readable text.
FR002 Compact Guide header, page headings, panels, filter bars, collection cards/stats and list spacing. Preserve existing comfortable-density choices, sticky column headers, full text, disclosures, empty/unknown/error notices, stable input geometry and all profile semantics. No hidden requirements or smaller-than-readable labels.
FR003 Organize More navigation into named groups with responsive columns and bounded scrolling. Preserve every destination and selected catalog/link-origin policy. Escape closes and returns focus to summary; outside pointer and focus departure close without stealing new focus. Native details/links work without JavaScript; do not claim application-menu roles or add keyboard traps.
FR004 Apply compatible navigation and compact surrounding UI to Studio/map/help. Preserve map gestures, floating menu positions, existing tools and persistence. No new game data, imports, remote fetching, profile migrations or external publication.
FR005 Restrict motion to short color/border feedback, respect reduced motion; no animated layout shifts. Dark/light Guide/Studio, map's existing theme, normal/200% text and 320–1920px widths retain readable controls and no document overflow. Long tables may use their existing labelled local scrolling.
FR006 Verify meaningful navigation interactions, disabled-JS fallback, exact input stability, fixed controls, target sizes, focus and menu reachability in Chromium/Firefox/WebKit; automated accessibility and actual visual inspection. Run full runtime and affected existing browser journeys, Studio/map checks appropriate to touched contracts, formatting/build/repository checks. Record exact receipts and limitations.

Clarifications: this is a presentation/navigation iteration across existing surfaces, not replacement of the mature app or gameplay/data logic. Smaller containers come from reduced wasted space rather than shrinking all text/targets. No density preference or storage change is necessary. New speculative features are deferred until this foundation is usable.

Verified convergence clarifications: inventory's manual sticky-focus reveal must not move a pressed pointer target; keyboard/programmatic occlusion recovery remains. The Studio functional HTTP response gate is explicitly amended to90seconds after a measured29.25-second full-catalog store save. This relaxes its historical30-second response bound and makes no save-latency improvement claim; actual response/content/recovery, UI readiness, image-decode and performance assertions remain separate and unchanged. See acceptance.md and the independent reviewer receipt.
