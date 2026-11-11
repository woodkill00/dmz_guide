# Quick-entry tracker redesign — research and proposal

Date: 2026-11-08. Owner: feature 071, US3/US4/US5 extension. Status: planning only; production UI and private data unchanged. Manual bounded planning artifacts, not a claim that Spec Kit skills or independent approval ran.

## Evidence

Reviewed https://tools.tcno.co/dmz, /unlocks and /fob through web extraction and a fresh Playwright Chromium context on 2026-11-08. Desktop 1440×1000 and mobile 390×844 screenshots are private in .local/quick-entry/. Reviewed current local Inventory and Upgrades in another fresh browser context; no real player profile opened or modified. Inspected inventory-window, inventory-save, progression, needed-page, armory-workbench and armory-workspace modules. Source's button-labelled controls and explanatory text are observed; exhaustive persistence/failure behavior was not tested. The optional Count controls toggle was clicked; no count edit was performed. Do not infer save correctness or accessibility compliance from screenshots.

## What works in the reference

- Shared section navigation keeps manuals, blueprints and upgrades in a recognizable tracker workspace.
- Grouped icon cards and a Small option make broad scans efficient; category filters narrow a large catalog.
- Search accepts names and ingredients. Found/unfound filters support finishing a checklist.
- FOB requirements expose quantities alongside their upgrades; optional count controls support entry without a separate edit page.
- Remaining-material summary connects tracking with what to collect next.
- Details are available on demand; the unlock page distinguishes finding a blueprint from meeting crafting prerequisites.

## Tradeoffs and improvements for our design

The full reference is not literally one screen: its desktop landing/header/share area pushes the tracker below the initial viewport, and its expanded remaining-items summary can be long. Adopt the focused working area, not that header overhead. Names must remain available in our default compact mode; image-only grids impose recall, hover and accessibility costs. Put frequent actions inline and descriptions behind a stable details disclosure. Keep optional icon view for users who recognize game icons.

The reference FOB page explicitly describes automatic completion when requirements are ready. Our saved stock is shared across goals; readiness is not purchase/completion. Retain explicit manual completion and the existing separately confirmed spending transaction. Do not auto-complete or auto-spend. The reference's upgrade counts also differ from our catalog. That is a separate data-audit lead, not grounds to import unsupported costs or certify completeness.

## Current local friction

Inventory's large heading, catalog paragraph, pack selector, export, six filter controls, paging, help and links appear before its actual rows. Upgrades similarly places a budget summary, catalog paragraph and multi-filter form above the list. Existing nested category/tier groups and safe draft/version handling already solve important problems: reuse them. Our armory already stores manual ownership, acquired attachment IDs and blueprint names in its separate workspace; expose these through the existing store instead of duplicating them in inventory.

## Design decision

One consistent tracker shell, four linked pages: Inventory, Weapon tracking, Upgrades, Needed. Each has its own URL and focused body, shared local navigation, selected pack/context, concise save state and search. One active section at a time avoids a giant all-purpose dashboard. Existing reference/gunsmith/detail pages remain available. One screen means the normal action and relevant list are visible together, not shrinking every item into a fixed-height viewport.
