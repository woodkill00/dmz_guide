> Research appendix. Exploratory proposals and alternatives below are superseded where they differ from the canonical spec, plan, ADRs and acceptance gates. Canonical limits: 100 active goals; provisional 20,000 total records and depth 32. The final phased roadmap is S0-S8 in plan.md. Examples are illustrative unless explicitly validated; no application tests have been executed.

# dmz_guide: screenshot evidence and original mobile-first design brief

Prepared from direct visual inspection of all eight user-supplied PNGs, Screenshot (42).png through Screenshot (49).png, on 2026-10-21. Source files remain private local references. This document contains transcription and analysis, not redistributed game images. No external game-mechanics research was performed in this task.

## Executive recommendation

Build an original, dark, tactical field guide around **Upgrades / Ingredients / Tracked needs** first. The strongest evidence is the seven consecutive 3D Printer recipe screens, not maps, combat stats, vendor prices, or full progression trees. Preserve their information grammar: category → item → benefit → requirements → prerequisite → tracking action. Translate it into readable mobile pages rather than shrinking the desktop game HUD.

Use graphite layers, restrained warm gold for navigation/selection, bright but limited lime for ready/completed states, thin framing lines, and condensed display headings. Do not copy logos, operator renders, equipment art, exact screen compositions, decorative emblems, proprietary typefaces, or interface textures. Design fresh simple SVG category icons and original abstract map-grid decoration. Treat screenshots as dated observations of the shown build, never proof of final or current shipped mechanics.

## Evidence key and scope

- **Observed**: readable visible text, values, composition, or state in these captures.
- **Uncertain**: text obscured, clipped, too small, or ambiguous. Preserve uncertainty in data rather than guessing.
- **Inferred**: proposed behavior or interpretation not demonstrated by a still screenshot.
- Quantities below are **required** amounts only. The interface displays owned/required notation, but the player's balances and holdings are omitted for privacy. Fictional notation example: “Owned 2 / Required 7 / Missing 5.” Such example values must never be treated as game facts or default user inventory.
- Game/build identity and the capture date are not verified. A tiny build-like footer is visible but is not transcribed reliably. Files were inspected on the date above; that is not their capture date.

## Screen-by-screen evidence ledger

### 42: Hub / DMZ Orders PG 1

Observed: outdoor hub scene behind translucent dark panel; narrow vertical icon rail; gold Deploy control at lower left; Stash/Loadout interaction label; Backpack label. Orders:
1. **GEAR UP**: “Equip a Weapon, a Backpack, an Armor Vest, and a Medkit from Your Stash” (task label only; captured player progress omitted).
2. **CRACKSHOT**: “Knock Down 3 Firing Range Targets” (task objective only; captured player progress omitted).
3. **FIRST OP**: “Deploy to DMZ in Dynamic Ops” (task label only; captured player progress omitted).
“COLLAPSE” and “VIEW ORDERS” prompts are visible. 

Inferred opportunity: an Orders checklist with task dependencies may be useful. The screenshot does not establish the full order catalog, reward schedule, or whether all three are a strict dependency sequence. Do not infer map geometry from the hub scenery. Omit captured player names, social avatars, performance counters, recording overlays, and opaque HUD status from website content.

### 43: 3D Printer / Bank Upgrade I

Observed title **BANK UPGRADE I**. Benefit: “Increases the amount of cash your bank can hold to [currency glyph]250,000.” Requirement Cash **20,000**. Interface labels include **HOLD TO UPGRADE** and **TRACK RECIPE**; captured readiness state is omitted.

Interpretation: 250,000 is the displayed resulting capacity, not an increase of 250,000. No other requirement is visible for this recipe. The custom currency glyph should be represented as “cash” unless its official name is confirmed. Do not call it real dollars.

### 44: 3D Printer / Stash Item Upgrade I

Observed benefit: “Increases Stash item capacity by 18.” Requirements:
- Cash **10,000**.
- Rigid Synthetics **10**.
- Electronic Sensors **10**.
Upgrade, Track Recipe and Ingredient Locations controls are interface vocabulary; captured readiness state is omitted.

Inferred: readiness likely depends on sufficient materials as well as cash. Still capture does not prove interaction behavior or where the Ingredient Locations action leads.

### 45: 3D Printer / MIA Recovery Discount I

Observed benefit: “Reduces the cost of recovering an operator who is Missing In Action by 5%.” Requirements:
- Regional Combat Notes **5**.
- Control Unit **10**.
- Rigid Synthetics **10**.
Track Recipe and Ingredient Locations are visible. No cash row is visible in this recipe.

Do not extrapolate base recovery price, stacked discounts, multiplicative versus additive rules, or later tiers.

### 46: 3D Printer / Uncommon Ingredient Printing

Observed full detail title **UNCOMMON INGREDIENT PRINTING**; list-row title is clipped. Benefit: “Unlocks access to higher-rarity crafting materials.” Requirements:
- Cash **50,000**.
- Biomaterials **20**.
- High-Tenacity Fibers: required **appears 10**, but the orange cursor partially overlaps the numeric area. Mark required quantity **uncertain / verify from another capture** rather than production-confirmed.
- Comms Module **5**.

A small Roman I appears at the list item's icon. The main detail title does not include I. Do not append an unobserved suffix to its canonical display name. The screenshot does not enumerate which recipes/materials become available.

### 47: 3D Printer / Stash Weapon Upgrade I

Observed benefit: “Increases Stash weapon capacity by 6.” Requirements:
- Cash **50,000**.
- Reactive Metals **20**.
- Stock Rod **10**.
- Comms Module **5**.

Do not conflate Stash Item and Stash Weapon capacities or infer their base capacities.

### 48: 3D Printer / Epic Ingredient Printing

Observed benefit: “Unlocks access to higher-rarity crafting materials.” Requirements:
- Cash **100,000**.
- Binding Catalyst **10**.
- Printed Circuit Board **10**.
- Military Composites **5**.

Small Roman II appears at the list icon, but no explicit dependency on Uncommon Ingredient Printing is shown. Record a visible tier marker separately from a prerequisite relation. No definitive list of unlocked materials is shown.

### 49: 3D Printer / Dog Tag Case Upgrade I

Observed title **DOG TAG CASE UPGRADE I**. Captured player-specific availability state is omitted. Benefit: “Increases Dog Tag Case storage capacity by 20.” Requirements:
- Cash **10,000**.
- Rigid Synthetics **10**.
- Biomaterials **10**.
Explicit prerequisite text: **“Must have Dog Tag Case unlocked to upgrade.”** Track Recipe and Ingredient Locations are interface vocabulary; captured action availability is omitted.

Important distinction: enough cash does not mean ready; both material sufficiency and unlock status matter. Screenshot does not explain how to unlock the base Dog Tag Case.

## Shared observed taxonomy and UI vocabulary, 43–49

Category rail text: **Tracked, Upgrades, Consumables, Plate Carriers, Backpacks, Tacticals, Lethals, Field Upgrades, Fire Support, Gear, Ingredients**. These are visible categories, not proof that every category has known recipes ready for publication.

Visible upgrade list includes Bank Upgrade I, Stash Item Upgrade I, MIA Recovery Discount I, Uncommon Ingredient Printing (clipped in list; full detail visible in 46), Stash Weapon Upgrade I, Epic Ingredient Printing, Dog Tag Case Upgrade I, Gunsmith Upgrade I, Vendor Item Upgrade I. Captured player-specific lock states are omitted. Gunsmith and Vendor details are not opened: benefits, costs, and prerequisites remain unknown.

Left resource summary labels: **Synthetics; Electronics; Chemicals; Metals**. The displayed counters are player-state values, omitted here; they are not recipe ingredient quantities or confirmed conversion rates. Do not assume their relationship to named loot materials.

Right panel: **BASIC PACK**, **SORT**, **LOADOUT**, numbered inventory tiles, rarity-like colored top borders, and a **MAX 50** label beside four material counters. Meaning of MAX 50 is ambiguous from the capture alone; do not claim it is 50 backpack slots. Named items can be identified in the detail rows but unnamed inventory icons should not be assigned speculative names.

## Visual language, with original design translation

Observed palette: near-black / graphite backdrop; smoky blue-gray blueprint linework and translucent rails; gold/ochre active cards; warm off-white headings; muted olive/gray body labels; lime availability/completion; blue, purple, green, orange inventory accents. Colors below are **proposed original tokens**, not sampled proprietary values:

- Canvas #101416; raised surface #1A2022; alternate surface #222A2D.
- Primary text #F2F0E7; secondary text #BDC5C2; subdued decoration #526164.
- Selection gold #D9B866; ready lime #B8DE79; information cyan #8FC8D1; warning #F0B378.
- Filled gold/lime controls use dark canvas-colored text, not light text. Focus treatment on filled controls needs a dark separator plus an outer light ring so the ring does not directly adjoin the low-contrast gold/lime fill. Verify actual rendered adjacency, ring thickness, clipping, keyboard state, and forced-color behavior; do not claim that a cyan or light ring alone contrasts with gold.

### Measured opaque-token palette note

Relative-luminance calculations for the proposed solid, opaque tokens give main text at least **12.80:1** and secondary text at least **8.30:1** across the three proposed dark surfaces. Canvas-colored text on gold measures **9.70:1**, and on lime **12.14:1**. In contrast, cyan directly against gold is only **1.03:1**; the proposed warm off-white text token directly against gold is **1.67:1**, and against lime **1.34:1**. Therefore light text or a directly adjoining cyan/light focus ring is not a valid default for these filled controls. Use dark text and a dark separator around the fill before an outer light ring, then inspect the rendered result.

The decoration token #526164 measures only **2.26–2.87:1** against the dark surfaces. Restrict it to nonessential ornament; do not use it for essential text, required control outlines, or other boundaries necessary to identify interface components. These are mathematical checks on opaque token pairs only, **not a rendered website test or a WCAG conformance result**. Transparency, gradients, imagery, state changes, actual focus geometry, and other requirements need separate implementation tests.

Observed typography: narrow tall uppercase navigation and item names, larger squared/angular display titles, condensed/monospaced numeric treatment, italic gray descriptions. Website translation: licensed/open-source condensed display face for short headings only, readable system sans or licensed text face for descriptions, tabular numerals for counts. Avoid dense all-caps paragraphs, miniature text, and simulated worn/distressed glyphs in essential content.

Observed geometry: thin rectangular framed panels; narrow row separators; repeated icon squares; gold edge treatment; subtle diagonal chevrons/scanlines; ruler/crosshair/diagram ornament; some large rounded outer navigation shells. Website translation: consistent modest 4–8px panel radius, stable spacing scale, restrained edge accents, quiet original line pattern outside text. No game screenshot wallpaper or blur-heavy glass behind reading text.

Observed hierarchy: category icon → object icon and name → title/benefit → requirement icon/name/count → action. Website should preserve names alongside icons and prioritize requirement deficit above decorative item art.

## Concrete proposals and tradeoffs

1. **Task-first home with “Find an upgrade” search, tracked needs summary, and recently viewed recipes.** Benefit: directs players to decisions instead of a cinematic landing page. Cost: less spectacle; needs thoughtful empty states. Mobile: one column and visible search; desktop: two columns via Grid. Search uses real labels and keyboard-accessible results.

2. **Recipe list/detail on desktop, separate linked pages on phones.** Benefit: retains game familiarity without unreadable four-column HUD. Cost: phone users navigate back to compare items. Preserve filters/scroll and use real URL/history. At wide containers use grid-template-columns: minmax(15rem, 0.8fr) minmax(0, 1.6fr); default single column. Avoid nested scrolling panels on mobile.

3. **Benefit-first detail header.** Show “+18 item capacity” under Stash Item Upgrade I before requirements. Benefit: quick value assessment. Cost: structured benefit modeling is needed; cannot invent normalized benefits for unseen items. Keep full source wording available and heading font-size: clamp(1.6rem, 1.1rem + 2vw, 2.7rem). Allow wrapping, no truncation of key names.

4. **Explicit Owned / Required / Missing ingredient rows.** Benefit: removes ambiguous fractions and supports raid planning. Cost: wider rows and manual input upkeep. On mobile stack the label above compact numeric controls. Use tabular numerals; label every input with its ingredient name; do not rely solely on progress-bar color.

5. **Track recipe, not “Hold to upgrade.”** Benefit: clear distinction between guide and game; no false game-control promise. Cost: less literal visual imitation. Use an ordinary click/tap toggle with text state and accessible name. Manual “Mark completed” is separate, reversible, and says it is local planning data.

6. **Aggregate shared ingredient shopping list with allocation semantics.** Benefit: shared Rigid Synthetics or Comms Modules are not mistakenly counted as satisfying multiple upgrades. Cost: meaningful data and priority rules are required. Sum requirements for selected one-time plans, subtract owned once; let users set priority and show combined total vs allocation. Never infer game inventory synchronization. Explain whether marking complete consumes local planned inventory, and make that explicit/reversible.

7. **Locked-state prerequisite callout.** Benefit: makes Dog Tag Case prerequisite legible rather than a mysterious disabled button. Cost: incomplete prerequisite evidence can create gaps. Show “Requires Dog Tag Case unlock; unlock method not yet verified,” with source status, rather than fabricating a link to a complete unlock guide. Locks remain readable and navigable.

8. **Ingredient detail with “Used in” links.** Benefit: answers whether to keep a found item and supports shared farming plans. Cost: usefulness is limited by catalog completeness. State “Used in known recipes” instead of “all uses.” Mobile list wraps naturally; desktop can add columns. Color accents support names, not rarity guesses.

9. **Location evidence slots, not a fabricated interactive map.** Benefit: prepares for the game’s Ingredient Locations concept without manufacturing spawn claims. Cost: a map is less visually exciting at MVP. Show “Locations not yet verified” until approved evidence exists; later supply text lists and map alternatives. Never publish placeholder coordinates as factual spawn locations.

10. **Original category icons plus persistent labels.** Benefit: game-like scanning without needing protected art or tooltip discovery. Cost: more width than icon-only navigation. Desktop sidebar; mobile labeled navigation drawer and a small set of top-level destinations. Every icon has a text label or accessible name; decorative duplicates are hidden from assistive tech.

11. **Bounded tactical decoration.** Benefit: atmospheric blueprint lines and restrained gold selection make the guide feel related. Cost: too much noise hurts scanning and screenshot clarity. Restrict patterns to margins/header; disable scanline animation and respect reduced motion. No flicker/glitch on meaningful text, despite the locked-title visual in 49.

12. **Evidence/verification badge and version history on every factual entry.** Benefit: honest handling of screenshot-derived data and future balance changes. Cost: can visually clutter cards. Cards get compact status; detail exposes source type, last verified date, unknown capture date/build, uncertainty, and revision history. Keep capture metadata separate from ingestion date. Uncertain High-Tenacity Fibers count should block a “verified” recipe badge.

13. **Orders checklist as a secondary pilot, not a fully populated mission database.** Benefit: supports the three shown onboarding orders. Cost: tiny evidence set; must label as partial. Use native checkboxes, undo/reset, and an explanation that progress is manually recorded. Do not infer dependencies from row order.

14. **Local-first planning with clear export/reset controls.** Benefit: useful without authentication or transmitting player information. Cost: browser storage can be cleared or vary across devices. Explicitly explain storage scope and lack of game sync; provide accessible export/import validation and a clear reset confirmation for user-entered state. Avoid requesting game credentials.

15. **Density toggle only after good defaults.** Benefit: tablet/desktop users can scan many recipes while mobile keeps legible touch rows. Cost: extra preference and QA matrix. Maintain at least comfortable control hit areas in both modes; change spacing, not essential text size. Never use a density mode to recreate the original 2,000px-wide HUD on a phone.

## Responsive engineering rules

- Use content-driven breakpoints after testing actual recipe names, not a scaled screenshot or device-name assumptions.
- Root layout min-width: 0; child flex/grid items min-width: 0 where appropriate; long user content overflow-wrap: anywhere. Item labels wrap at natural word boundaries. Never fix clipping by hiding overflow on the whole page.
- Content container: width: min(100% - 2 * var(--gutter), 80rem); margin-inline: auto; --gutter: clamp(1rem, 3vw, 2rem). Equivalent calc(100% - 2 * var(--gutter)) is appropriate when CSS arithmetic requires it. The purpose is gutter subtraction, not an all-purpose responsiveness repair.
- Cards: grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: clamp(0.75rem, 2vw, 1.25rem). Use single-column reading order before expanding.
- Ingredient row desktop: minmax(0, 1fr) auto; mobile: label spans row, controls wrap. All inputs max-width: 100%; no fixed text-block heights.
- Clamp fluid titles and spacing with rem lower/upper bounds. Body text stays comfortably readable (proposed baseline 1rem, line-height 1.5); never use viewport units alone for essential type.
- Avoid fixed full-height panels; if desktop sticky navigation is useful, provide sensible max-height with overflow only within navigation and test keyboard access. Do not trap reading in multiple scroll regions.
- If a mobile fixed action bar is retained, reserve matching layout space including env(safe-area-inset-bottom). Prefer an in-flow action first. Test virtual keyboard, browser chrome, landscape, and zoom before adding stickiness.
- At 320 CSS px and 200%/400% zoom, details should reflow without horizontal page scroll, controls should not obscure content, and long ingredient names remain readable. Use semantic tables only where true comparisons require them; a visible accessible scroll region can host a genuinely two-dimensional comparison, not core recipe reading.
- Interactive targets should be designed around a 44×44 CSS px comfort target, clear keyboard focus, skip link, logical DOM order, and visible error text. Audit measured text/UI contrast, screen reader labels, keyboard-only use, reduced motion, forced colors, and color-vision differences.

## Suggested content model and uncertainty handling

GameItem(id, displayName, aliases, category, iconKey, rarity nullable, evidenceRefs[]).
Upgrade(id, displayName, shownTierMarker nullable, benefitText, normalizedBenefit nullable, requirements[], prerequisites[], evidenceRefs[], verificationStatus).
Requirement(itemId or cash, requiredQuantity nullable, quantityStatus, evidenceRef).
Evidence(sourceType, privateReferenceId, inspectedAt, capturedAt nullable, build nullable, transcription, confidence, notes).
UserPlan(selectedUpgradeIds, manualInventory, priority, manuallyCompleted, localSchemaVersion).

Do not seed UserPlan with the screenshot player's cash or held materials. A demo mode may use clearly labeled invented sample values, isolated from real saved plans. Separate textual labels, opaque IDs, numeric quantities, and evidence so corrections do not break saved plans. Unknown is null/explicit status, not 0.

## Proposed first implementation slice

1. Recipe catalog with the seven observed detail entries and explicit screenshot-derived status.
2. Ingredient detail and reverse usage generated from known requirements.
3. Local manual tracking and shared missing-ingredient totals, with incomplete-data warning for uncertain quantities.
4. Original responsive design tokens/components and accessible navigation.
5. Optional three-order checklist only after the primary recipe flow is tested.

Acceptance examples: Bank I displays resulting capacity 250,000 and cost 20,000 correctly; Stash Item I and Dog Tag Case I together require 20 Rigid Synthetics before subtracting owned once; Dog Tag Case is not marked ready solely because cash/materials suffice; High-Tenacity Fibers uncertain value cannot silently contribute a factual verified total; unknown locations render a truthful empty state; raw PNGs and player identifiers are absent from published assets/repository.

## Questions that remain genuinely open

The exact game's/build's identity; permission to reproduce any supplied imagery publicly; capture dates; current recipe validity; full material rarity names; High-Tenacity Fibers required quantity; printing unlock contents and dependencies; Gunsmith/Vendor upgrade details; location evidence; inventory synchronization availability; desired tracked-plan completion/consumption semantics. These do not block a labeled prototype with original art and honest unknown states.

## Peer critique integrated

Research peer agrees with the direction and emphasizes Available/Short N text, selected states, and visible focus rather than gold/lime alone; no blueprint texture behind small body copy; at most one mobile bottom action and no conflicting filter/navigation bars. The delivery-plan peer correctly separates cash cost from inventory ingredients, prerequisite gates from shortages, and capacity effects from production yields. No image contradicts these distinctions. Unknown-version screenshot records must remain out of any verified launch pack until title/build verification.

Additional planning semantics: distinguish bank cash, coarse resource counters, named material items, backpack holdings, stash holdings, and any future protected-reserve policy. The screenshots do not show conversion or automatic pooling rules, secure-slot retention/loss behavior, or reserves. Do not silently assume them. Website manual completion should ask what local ledger changes to apply, offer cancel and undo, and explicitly say it does not change the game.

## Public derivative and privacy

This public derivative omits private source hashes and captured player completion states. Original source provenance remains private. Generic design example only: a fictional order can show either “Not started” or “Complete” using both text and a non-color status indicator; neither state represents the captured player.
