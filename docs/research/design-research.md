> Research appendix. Exploratory proposals and alternatives below are superseded where they differ from the canonical spec, plan, ADRs and acceptance gates. Canonical limits: 100 active goals; provisional 20,000 total records and depth 32. The final phased roadmap is S0-S8 in plan.md. Examples are illustrative unless explicitly validated; no application tests have been executed.

# DMZ Guide: design research and proposed direction

Research date: 21 October 2026. Research only; no repository changes, deployment, data copying, or account actions.

## Decision summary
Build a fast, mobile-first field reference rather than a general gaming-news portal. Primary loop: find an item or objective → see what it needs → plan a run → inspect its locations → mark personal progress. Dark is the first-visit default, with explicit Light and System choices. Keep canonical guides publicly readable and useful without Discord, sign-in, JavaScript, or an interactive map. Use a distinct original identity and licensed/original map content, never a clone of MapGenie.

## What is actually confirmed about MW4
The current official Call of Duty homepage explicitly identifies Call of Duty: Modern Warfare 4 and promotes DMZ. An October 9 official FOB guide states campaign early access October 16, DMZ early access October 20, and full launch October 23, 2026; these are announced dates, not independent live-service availability testing. It describes Hajin, persistent progression, looting, crafting, FOB stations and Orders. Thus, describing MW4 or its DMZ as merely a rumor would be incorrect against these current primary sources.

The October 19 progression article distinguishes DMZ's 70 levels from the 55-level multiplayer track. These require separate user progress fields. Do not infer existing MWII DMZ recipes, locations or progression carry over. Exact loot odds, spawn certainty, future season resets, APIs and integrations remain unverified unless individually sourced.

Sources: https://www.callofduty.com/ ; https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide ; https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-ready-for-launch-progression-prestige

Potential evidence conflict to reconcile before publishing unlock numbers: October 9 FOB prose says printer unlocks at DMZ level 2; an October 19 progression image alt text associates printer with level 1. Check the latest actual progression table and observed gameplay; do not silently choose one or treat marketing alt text as canonical numerical data.

## Competitor audit: final verified coverage
The requested roundup has eight named sites, despite its URL/title claiming ten. Use it as a discovery list, not authority for their quality: https://worldrankerpro.com/best-gaming-guide-websites/

Final coverage: six of the eight requested primary sites were successfully inspected using extracted text and/or the cloud browser, plus three directly relevant MW4 crafting competitors. TheGamer and Game Rant have my rendered desktop observations; Polygon has the review researcher’s rendered desktop observations. No rendered mobile, performance, offline-functionality or full accessibility audit was performed. IGN and Eurogamer remained blocked; access failures are not evidence of design quality.

1. IGN — attempted https://www.ign.com/wikis and https://www.ign.com/; extraction failed and domain search explicitly reported robots.txt blocking. No verified current layout findings. Audit candidate: game hub → wiki article navigation, TOC, map integration and edit provenance. These are questions for a permitted inspection, not claims observed here.
2. GameFAQs — https://gamefaqs.gamespot.com/ successfully read. Exposes game-title search, platform taxonomy, dedicated Q&A, Boards, Community and Contribute paths. Useful lesson: distinguish finding an answer from discussing it, and make contributions first-class. Tradeoff for this project: copying a multi-platform/global-news menu adds irrelevant choices to a single-game field tool. No claim about actual mobile styling or offline behavior.
3. GamePressure — https://www.gamepressure.com/ and https://www.gamepressure.com/dispatch/ successfully read. Guide page has breadcrumbs, visible last-update date, a searchable per-guide TOC and topic/chapter link groupings; global navigation separates Guides and Interactive Maps. Adopt scoped guide search, stable deep links and chapter/context grouping. Avoid a huge title-heavy TOC dumping all spoilers into the initial view. Note that the homepage's guide timestamp differed from the guide page; model article freshness explicitly instead of copying ambiguous aggregate timestamps.
4. Game Rant — https://gamerant.com/strategy-guide/ successfully inspected through cloud-browser AX and screenshot. White body, gray top bar, orange search band and large image-led featured cards with condensed headings. The Latest list exposes targeted guide titles, short summaries and bylines, including MW4 FOB and DMZ progression topics. A bottom advertisement was visible in the captured desktop state. Adopt searchable game/topic context and specific titles; avoid overlay interruptions and truncated titles that hide distinctions. No mobile behavior verified.
5. PC Gamer — https://www.pcgamer.com/guides/ successfully read. Separates Editor's Picks and Latest Guides, with author/published or updated labels, short descriptive summaries and pagination. Also exposes an extensive cross-site taxonomy and unrelated editorial/commercial surfaces. Adopt selected entry points plus recency information, but prioritize useful persistent reference rather than a chronological news feed for an in-session companion.
6. Eurogamer — https://www.eurogamer.net/guides and homepage failed; domain search explicitly reported robots.txt blocking. Current rendered design remains unverified. Audit candidate: concise answer-first guides, navigation within long articles and related-topic discovery.
7. Polygon — https://www.polygon.com/guides/ successfully inspected by the review researcher in the cloud browser. Peer-reported primary-site findings: white background, magenta accents, large two-up imagery, condensed headings, category labels, bylines and game hubs including current MW4 mission/puzzle guides. Adopt clear hubs and category context; avoid turning a task-first companion into a dense news feed. This is explicitly peer-observed, not my own screenshot inspection; no mobile testing.
8. TheGamer — https://www.thegamer.com/category/game-guides/ successfully inspected through cloud-browser AX and screenshot. Dark charcoal header, white content, orange accent and large three-panel image-led features; Latest guide list has bylines and descriptive summaries. Bottom banner, small video overlay and horizontal scrollbar were visible in one desktop snapshot. Adopt clear editorial ownership and descriptions; do not displace the answer with promotional surfaces. These observations are not a universal claim about the site.

MapGenie reference — https://mapgenie.io/call-of-duty-modern-warfare-iii/maps/urzikstan-zombies received a site-safety denial during the lead reviewer’s browser inspection; no alternate route was attempted. Current controls, persistence and mobile behavior remain unverified. Inspiration is interaction-level only; use original independently verified coordinates/descriptions and licensed map imagery. The MWIII Zombies reference is not evidence about MW4 DMZ.

Access limitations: initial /guides/ guesses for Game Rant and TheGamer returned 404 in the browser; following visible site navigation established the actual URLs above. Earlier extraction 502 errors for those sites and Polygon were resolved by permitted browser inspection. IGN/Eurogamer explicitly reported robots restrictions, which were respected. No blocked site was bypassed. The three directly relevant competitors are compared below.

## Fifteen concrete proposals, with costs and acceptance checks

1. **Task-first home.** A prominent search field and four quick actions: Find loot, Plan crafting, Open map, Continue progress. A compact Start Here path for new players; updates below utility. Pro: short path during play. Con: weaker magazine-style discovery. Gate: five representative tasks reachable in two actions from home, excluding text entry.
2. **Unified entity search.** Search items, recipes, Orders, locations and guides with type labels, aliases, keyboard navigation and shareable query URLs. Pro: solves vocabulary ambiguity. Con: requires controlled aliases and ranking. Gate: exact-name results rank first, typo/no-result states are helpful, no forced modal-only interaction.
3. **Answer-first guide template.** Summary, prerequisites, ordered steps, common failure, linked entities, sources and verified-on version. Pro: faster than narrative introductions. Con: more editorial discipline. Gate: core answer precedes promotional/related content; headings and anchor links work without JS.
4. **Item decision card.** Show uses, keep/sell guidance with reasoning, location links, crafting uses and evidence quality. Pro: gives immediate inventory decisions. Con: advice becomes stale and personal goals differ. Gate: no unconditional 'sell' when reserved by a selected plan; unknown value displays unknown, not zero.
5. **Crafting goal planner.** Pin recipes or FOB goals; aggregate requirements and subtract eligible owned inventory without double-spending shared ingredients. Pro: useful baseline capability; differentiation requires translead reviewer now/later allocation and inventory eligibility, since competitors already aggregate recipes. Con: dependency cycles, quantity semantics and recipe variants require validated data. Gate: deterministic tests for overlap, partial inventory and unsupported recipes; fictional demo data labelled everywhere.
6. **Map/list parity.** A filterable location list and map share selection, query state and entity IDs. On mobile, list is fully usable even if tiles fail. Pro: accessibility and network resilience. Con: two synchronized presentations. Gate: any marker's information and action obtainable without pointer gestures or map rendering.
7. **Mobile map workspace.** Full-height map only on its route; filters in an accessible sheet with explicit open/close buttons; desktop gets a side panel. Pro: preserves map area. Con: bottom controls can conflict with safe-area/keyboard. Gate: selected marker, attribution, close button and search results never obscured at landscape or zoom; drag is never sole interaction.
8. **Personal progress, local first.** Checklists, saved guides and pinned goals work without registration; optional export/import before cloud sync. Pro: immediate value and privacy. Con: device loss/eviction and merge conflict. Gate: clear 'stored on this device' label; versioned export, migration tests, undo for destructive reset, quota failures handled.
9. **Patch trust system.** Separate publishedAt, updatedAt and verifiedAgainstVersion; content state Verified / Needs recheck / Community report. Pro: distinguishes freshness from certainty. Con: maintenance queue. Gate: changed data marks dependent recipes/guides stale; evidence link and reviewer visible, never invented confidence percentages.
10. **Spoiler-controlled story.** Default to non-spoiler objectives, with reveal per section and preference persisted. Pro: supports progression without plot disclosure. Con: spoilers can leak through search previews/URLs/images. Gate: redaction applies to title previews, alt text, result snippets and metadata where relevant, not only blurred text.
11. **Discord as companion, not database.** Visible community link plus report-correction flow referencing canonical entity ID/version. Publish reviewed corrections back to site. Pro: community helps discovery while guides remain searchable. Con: moderation/spam burden. Gate: no mandatory Discord join; no fabricated member/live counts; any integration needs explicit scope and consent.
12. **Dark-first restrained theme.** Charcoal layers, readable neutral text, one functional accent; use danger/warning/success with labels and shapes. Light/System available. Pro: suited to low-light second-screen use. Con: dark alone does not ensure readability. Gate: real contrast checks for text, borders, focus and disabled states; no color-only category coding.
13. **Offline field packs.** Explicit 'Save guide for offline' with content version, size and delete controls; cache shell and chosen reference data, not entire global map. Pro: useful with unstable connections. Con: stale data, storage eviction, tile licenses. Gate: offline cached route reload succeeds, uncached route explains limitation, stale badge and refresh work, upgrading service worker never erases progress.
14. **Compact/comfortable density.** Default comfortable touch spacing with optional denser desktop tables; do not reduce target hit areas when text becomes compact. Pro: supports phone and multi-monitor users. Con: extra test surface. Gate: 44px preferred touch controls; visible semantic labels remain in both modes.
15. **Original field-guide visual language.** Small schematic diagrams, original icon family, clear typographic hierarchy, subtle grid motif rather than full-screen military video or copied game UI. Pro: distinct and fast. Con: original art effort. Gate: no unlicensed sprites/maps/logos or implied official affiliation; illustrations never carry essential text alone.

## Information architecture
Top-level desktop: Guides, Items & Crafting, Maps & Locations, Progression, Community. Story lives under Guides with clear spoiler status, not a competing global destination. Mobile: Home, Search, Map, Saved, More. Search and More must have text labels, not unexplained icons. Five tabs are a proposal to validate at 320px, not a rigid requirement.

Canonical entities should link bidirectionally: item ↔ recipe ↔ unlock/FOB station ↔ Order ↔ location ↔ guide. Keep URL namespaces game/version-aware to avoid mixing MWII DMZ and MW4 DMZ. Preserve any legacy URLs with explicit archive status and redirects where appropriate.

## Responsive strategy: content-led, not device-name breakpoints
Use CSS grid for structural changes and clamp/calc for continuous spacing, not a single viewport scale that shrinks the entire UI. Component min-width:0 and overflow-wrap:anywhere prevent long names from blowing out grid tracks. Keep body text at a readable rem baseline and test browser text enlargement. No fixed-height cards containing variable prose.

Illustrative CSS, to adapt to repository conventions rather than blindly paste:

```css
:root {
  color-scheme: dark;
  --space-page: clamp(1rem, 3vw, 2.5rem);
  --space-gap: clamp(.75rem, 1.5vw, 1.25rem);
  --header-height: 4rem;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font: 1rem/1.6 system-ui, sans-serif; }
.container {
  width: min(100% - var(--space-page) - var(--space-page), 90rem);
  margin-inline: auto;
}
h1 { font-size: clamp(1.75rem, 1.3rem + 2vw, 3rem); line-height: 1.15; }
.prose { max-width: 68ch; overflow-wrap: anywhere; }
.cards { display: grid; gap: var(--space-gap);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); }
.cards > *, main { min-width: 0; }
.guide-layout { display: grid; gap: var(--space-gap); }
@media (min-width: 64rem) {
  .guide-layout { grid-template-columns: minmax(0, 1fr) minmax(14rem, 18rem); }
}
.map-workspace { min-height: 24rem; height: calc(100dvh - var(--header-height)); }
.mobile-nav { padding-bottom: env(safe-area-inset-bottom, 0px); }
button, .touch-action { min-block-size: 2.75rem; }
:target { scroll-margin-top: calc(var(--header-height) + 1rem); }
```

Measure actual header height or keep map inside a flex shell if header wraps; a constant --header-height is only safe if guaranteed. Add 100vh fallback before 100dvh for older supported browsers. Use safe-area padding exactly once per edge. Avoid 100vw content wrappers, which may induce scrollbar overflow. Breakpoints should be confirmed with longest real labels and translation stress cases. Grid source order must match reading/tab order; do not cosmetically reorder meaning with CSS.

References: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/clamp ; https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Common_grid_layouts

## Accessibility and resilience gates
WCAG 2.2 AA is the target, not a claim based solely on automation. W3C reflow expects vertical reading at equivalent 320 CSS pixels without two-dimensional scrolling, except inherently two-dimensional content such as maps. Provide list parity rather than treating that exception as permission to make all controls inaccessible. W3C minimum pointer target criterion is 24×24 CSS px with specified exceptions; 44×44 is this project's preferred touch design target, not misquoted as AA minimum.

References: https://www.w3.org/WAI/WCAG22/Understanding/reflow.html ; https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

- Keyboard-only search, navigation, dialog close, filter selection, checklists and map-list flow; visible focus and no focus trap except intentional modal containment. Restore focus to opener.
- Screen reader smoke checks in VoiceOver/Safari and NVDA/Firefox or Chrome: landmarks, heading order, form errors, checked states, result count announcements without chatter.
- 200% text and 400% browser zoom, 320px reflow, long labels, reduced motion, forced colors, light/dark and system overrides.
- No hover-only tooltips for essential recipes/location information. Input labels remain visible; placeholders are not labels. Number inputs allow correction and do not reset while typing.
- Offline capability is explicitly bounded; service worker cache lifecycle, versioning and update prompts must be tested. Reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

## Visual and behavioral release matrix
Representative pages: home, search with empty/no-results/many-results, item, recipe with shortages, long guide, spoiler guide, progression, map/list, community, 404, offline. Each has loading, error and stale states where relevant.

Widths: 320, 360, 390, 430, 768, 1024, 1440 and 1920 CSS px; at least one short-height landscape phone. Test Chromium, Firefox and WebKit, plus a real iOS Safari and Android Chrome smoke pass. Automated screenshots are review evidence, not proof of real-device correctness.

Block release on unintended page overflow, clipped controls, illegible contrast, obscured focus, sticky bars covering content, unreachable close/reset buttons, incorrect data or lost progress. Pixel differences require human review rather than blanket golden-image regeneration. Mask only genuine nondeterminism and use deterministic fixtures. Capture before/after and component states, not just the home hero.

Proposed performance budgets, to validate against the chosen stack: non-map routes initially load no map library or tiles; no autoplay video; reserve image dimensions; prioritize core content and search; measure LCP/INP/CLS on realistic throttled mobile and field data once available. Use standard good Core Web Vitals targets as a release objective only after current authoritative guidance is checked by the implementation owner. No actual benchmark was run in this research task.

## Prioritization
MVP: canonical entity schema/provenance, answer-first guides, item/recipe lookup, source/version labels, local saved progress, accessible responsive shell, original map/list dataset minimum, correction channel and test matrix. Next: multi-goal crafting, offline packs, richer map routes and cloud sync after actual need. Defer: forum clone, social feed, auto-updating player stats, speculative game APIs, live vendor inventory and route optimization that pretends uncertain spawns are guaranteed.

## Direct competitors and cross-review decisions

The six-of-eight coverage above is the final audit status. A permitted future inspection or user-supplied captures would be needed for the two remaining sites; no claim of a completed eight-site visual audit is made.

### More directly relevant competitors
These are primary-site feature observations, not authoritative evidence that their game data is correct. No proprietary datasets or imagery copied.

- DMZ Codex https://dmzcodex.com/guides/dmz-fob-upgrade-priority-guide/ exposes broad linked entity taxonomy and task-oriented upgrade advice. Its https://dmzcodex.com/3d-printer-planner/ already offers search, rarity filters, per-recipe plus/minus quantities and an aggregated shopping-list concept. Therefore, 'multi-recipe shopping list' is baseline competition, not a unique invention. Its prose explicitly differentiates documented costs and incomplete information; provenance clarity is also not entirely new.
- MW4 Map https://mw4map.com/3d-printer-recipes/ is a concise source-stamped guide with small tables, FAQ, multiple language choices, direct map/locations/keys/mission links and Discord CTA. Advantage: straightforward learning-to-map transition. Opportunity: a personalized planning layer rather than merely another recipe article. Do not mistake its displayed checked date for proof of correctness.
- COD Central https://codcentral.net/blog/mw4-dmz-3d-printer-recipes/ combines a summary, linked TOC, annotated game screenshots and recipe cards with category, rarity, unlock-route filters and text search. Its article claims 104 cards, while DMZ Codex presents different counts; coverage counts are not inherently comparable and are not a safe quality metric. Opportunity: inventory/reservation logic, next-step decisions and explicit provenance at field level rather than a large browseable card corpus. Do not claim those capabilities are absent site-wide without testing all their tools.

Positioning: not 'another guide website' or 'first planner'; a translead reviewer, user-controlled run-preparation workspace connecting trusted guide facts with now/later goals and an auditable shared-resource ledger. Custom packs/editor portability may differentiate for this user's use, but competitor absence remains unproven.

### Actual cross-review outcomes
1. Delivery planner proposed Guide/Plan/Map/Progress/Community bottom tabs. I challenged missing universal Search and excess prominence of community during runs. Revised candidate: Home/Search/Map/Saved-or-Plan/More, chosen through five representative task tests rather than taste. Planner rebuttal accepted: Home must prominently expose 'Plan my next upgrade' and entity pages 'Add to plan'; generic Saved must not conceal the central feature. Goal planning and completed progress remain distinct states.
2. Delivery planner proposed persistent now/later summary. Agreed with condition: collapsible, one active lower-screen surface at a time; never stack sticky summary, mobile nav and expanded map sheet into an unusable viewport.
3. Screenshot specialist described graphite/gold active states, lime sufficiency, condensed uppercase and blueprint motifs from eight supplied screenshots. I endorse restrained original design, but require textual state labels, semantic controls, contrast validation and ordinary readable body typography. On mobile, replace the game's multi-column station UI with goal summary → requirements/owned/missing → locations. A visible Ingredient Locations button does not establish actual location coordinates.
4. Offline map imagery deferred until licensing, storage size and low-memory behavior are established; text/data packs can deliver the useful offline baseline earlier.

DMZ Codex planner baseline: the extracted primary page also exposes Copy shopping list, Clear list, 'Saved on this browser', explicit exclusion of a recipe with unknown ingredient costs, documented-tier limitation, and offline/update UI strings. These establish advertised interface features, not verified correctness or offline execution. Local-first persistence, aggregation and missing-cost warnings are therefore baseline comparison points, not defensible uniqueness claims. The strongest proposed emphasis is translead reviewer now/later allocations, distinction between collectible now and craftable now, inventory eligibility and independently validated editable packs. Any assertion competitors lack these needs broader functional testing.
