# Compact data context and item experience redesign

Date: 2026-11-10. Manual pinned Spec Kit extension under 071. User requests removing bulky catalog/profile scaffolding from ordinary pages and an in-depth redesign plan for slimmer, modern, usable item pages. Initial delivery compacted data context and provided a clickable concept. The user subsequently approved implementation for all item references and the item directory, then added possible-map-area links (IP-8). Implementation is now in the shared renderer; the separate concept remains a read-only design reference. Executed evidence is recorded in analysis.md.

## Current problems and root causes

Private/shared pages insert a catalog selector, full coverage note and local-save status above their main content. `/local/` lacks the tracker-specific disclosure wrapper, so hundreds of words precede the actual item. Tracker pages separately wrap these controls but repeat the entire selected catalog title in their summary. Native item pages and private item pages therefore have visibly different shells. The catalog menu also contains deliberately labelled test catalogs and historical references. These have validation/recovery uses but are not primary player tasks.

The prior item clarity pass removed repeated text and empty stats panels, but item identity, actions, build choices, overview, loot/unlocks, uses and evidence still appear as a long stack of generic panels. This is content cleanup rather than a designed item workspace. Primary actions compete with supporting metadata; private pages add a generic library heading and scaffolding above the item.

## Required outcomes

CX-1: ordinary private/tracker pages show only a compact Data & backup disclosure, closed initially. Existing selectors, exports, context IDs and draft guards remain the sole storage owners. Current data/version/coverage stay available inside it; test catalogs remain deliberately selectable there.
CX-2: normal saved status no longer consumes a paragraph. Unsaved, loading, conflicts, errors, missing selected catalogs and recovery guidance remain visible and announced. Active fictional data has an always-visible not-game-facts label even when the disclosure is closed. Never silently change the selected catalog or throw away a draft.
IP-1: a native/private item has one identity header: actual icon or explicit fallback, name, short description, category and rarity. No repeated titles, library heading, coverage essay or empty statistics cards in the normal item flow.
IP-2: three primary actions: inventory, add/change an additional-build target, and useful collection/location links. Editing and photos remain explicit secondary actions targeting the exact saved record. Profile writes and repository writes remain distinct and labelled where the user makes that choice.
IP-3: provide Overview, Where to find, Crafting, Uses and Sources sections, with stable deep links and keyboard navigation. Prefer a compact section bar and progressive disclosure, not overlapping modal panels. Critical uncertainty, missing stock and save failures cannot live only in a hidden tab.
IP-4: use the current validated planning models for owned/required/missing, additional-build quantity, blueprint ownership and eligibility. Full recipe need and shortage remain separate. Never sum independently allocated upgrade/mission/build scopes or invent quantities.
IP-5: preserve loot-type buttons and editable photo pages, recipe/mission/upgrade links, all nonempty weapon stats, earlier distinct notes and complete evidence. No stable-ID merge, profile reset, source rewrite, new game fact or archive deletion is part of a visual redesign.
IP-6: coherent compact styling: charcoal surfaces, restrained lime actions, rarity colours from stored data, fewer boxes, consistent alignment, readable labels and responsive sizing using shared tokens with calc/clamp/minmax. Pointer targets remain at least 44px; slim visual styling must not make controls hard to hit.
IP-7: a compact searchable item directory with normalized display categories, small icon/name rows and clear item/blueprint/manual distinction. Default views favour the active real catalog; explicit access to other catalogs preserves historical/private contexts rather than merging inventory by name.

## Page layout

Desktop: one 56–72px identity icon alongside title/summary and subtle category/rarity labels. A compact action strip follows. Main information takes roughly two-thirds of available width; a small progress card takes the remainder where needed. Evidence, notes and long relationship lists expand in place. Sources are accessible without occupying a permanent side column. Sidebar never overlays reading content or remains sticky when its height exceeds the viewport.

Mobile: one column. Identity wraps naturally. Inventory/build controls follow the summary, before long reference content. Section navigation wraps or scrolls in its own labelled strip, never causing whole-page overflow. All names and counts remain readable; no essential action is hover-only. Long notes scroll only inside explicitly bounded disclosures with keyboard access. At 200% zoom the layout falls back to one column.

Directory: compact rows with icon, name, rarity/type, a brief use indicator and one details link. Search/filter controls stay in one stable toolbar; filters collapse into More filters on small screens. Row height does not jump during inventory or blueprint changes. Distinct provider data and duplicate names across different catalogs do not silently become the same item.

## States

Loading skeleton, icon missing, no source description, no recipe, ambiguous recipe, unknown quantities, fully stocked, short stock, blueprint unavailable, catalog rebind required, source disagreement, private override, fictional test catalog, storage failure and unsaved edits all require deliberate layouts. Unknown is never displayed as zero. Empty nonessential panels are omitted; missing information is stated once at the point of use.

## Not approved or implemented by the concept

No account, sync, external scraping expansion, modal editor, drag panel system, map coordinates or new weapon-stat model is introduced. Existing specialized weapon/gunsmith views keep their own established layout; shared shell changes must not replace those with a generic item panel. The design concept is local, read-only with respect to saved player state and repository data.


Implementation authorization: user approved the concept and requested implementation for all item pages and the item directory. IP-1–IP-7 now enter implementation. Existing specialized gunsmith, map and mission/upgrade layouts remain outside this item presentation change. Private record editor links gain exact pack/record selection without new write ownership.

IP-8 (user extension): item pages expose possible-map-area button links next to loot information, derived from explicit item/location associations or exact named area mentions in the retained reference text. Label mention-based associations; never infer coordinates or guarantee spawns. Hajin opens the existing map search with a bounded literal area query, preserving filters, selection and source registration. Provide native location-reference fallback and honest empty/unavailable states.

IP-9 repair/extension: opening a possible-area link automatically highlights and frames exact named, positioned map records without another result click. Use temporary rings and a dismissible small source-reference label; do not infer area boundaries, item spawns or coordinates. Highlight persists through refresh/zoom, handles delayed map/source loading, and does not change source visibility or saved workspace state.
