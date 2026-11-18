# Compact camo workspace

User request: adapt https://wzstats.gg/mw4/camo-tracker to our tracker.

## User stories

US1 (P1): See completionist progress and expand classes to find a weapon.
US2 (P1): Select a small camo circle, read its source requirement inline and save or undo completion.
US3 (P2): Search and switch views on narrow screens without large blurry cards or obstructing dialogs.

## Requirements

- FR01: Same directory route, nine native class accordions, four-medal summary, search/class filters and Challenges/Prestige/Mode mastery views. All 35 weapon links usable without JavaScript.
- FR02: Expanded rows show weapon names and small circular local swatches. One selected inline detail per weapon with requirement, source and completion checkbox. Detail pages retain four progression tiers and separate mastery view with compact circles.
- FR03: Preserve red remaining, yellow next-to-track, green completed, accessible text and visible focus. Yellow is the user's tracking convention, not proof of game eligibility. Never infer completion.
- FR04: One shared save session retains revision checks, valid-current checks, single-flight writes, transaction-confirmed success, failed-candidate export/retry/reload and lifecycle/focus guards. No migration or unrelated private state changes.
- FR05: Gold/Platinum/Harmonic count 35 known weapons; Divergence and six mastery unlocks are shared identities. Published 33-unlock gates remain separate from coverage. Filtering never changes global denominators.
- FR06: Bounded validated same-origin catalog only, verified against generated roster/progress metadata. Failure leaves links usable and editing unavailable. No WZStats art, ads, scripts or unobserved mechanics copied.
- FR07: No page overflow at 320–1920 CSS px or 200% zoom. Keyboard, independent collapse, image fallback, light/dark and no-JS remain usable. Preview artwork stays below native 128px size.

## Clarifications

Keep existing facts and progress. Use original styling inspired by the observed public overview. No bulk completion, account linking, source import or weapon-level input. Existing dedicated pages retain no-JS requirements. Private state and inventory are unchanged.

## Measurable interaction rules

Circles target 44–48 CSS px (minimum 24px at narrow widths); main overview maximum 960px. Class summaries report Gold/Platinum/Harmonic against class weapon counts and label Divergence Shared. Search temporarily expands matches and restores pre-search disclosure state when cleared; classes can otherwise be opened independently. Challenges shows Military/Special/Completionist; Prestige shows its four rows; Mode mastery labels six shared MP/DMZ challenges. Catalog loading has a 10-second deadline and streaming 2MiB cap; metadata mismatch fails closed. Selected detail text uses textContent and fixed validated URLs. Dedicated source requirements stay accessible without JavaScript.
