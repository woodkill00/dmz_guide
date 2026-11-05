# Compact workspace notification repair

Manual bounded full-cycle fallback, pinned Spec Kit v1.2.2; no bug-extension commands invoked.

Assessment/reproduction: on map startup, Private workspace ready spans nearly the whole map because .workspace-toast sets both left and right16px; padding12px16px inflates the short status. Popup-mode CSS again sets both horizontal edges. Expected FR001: short messages size to content, capped to map width and a compact360px maximum, with6px10px padding. FR002: long messages wrap and remain readable, without truncation; status/live semantics and existing dismissal timer remain unchanged. FR003: normal/popup modes and320px/desktop map widths remain inside their map, without horizontal page overflow.

Plan/clarification: CSS-only change to existing toast rule and popup override; preserve position, message logic, timer, pointer pass-through and private state. No new data or source claims. No ambiguity requiring user input.

Tasks: assess existing constraints; implement content-width/right-auto with border-box map-relative maximum ; verify actual startup plus synthetic long text at320px/1440px, normal/popup state; typecheck/build and independent review. No new permanent test for this low-impact reversible sizing change; use ignored browser measurement/screenshot evidence.

Analysis: both base and popup selectors must drop the right-edge constraint; otherwise popup specificity restores the wide banner. Available inline budget is parent width minus32px/24px respectively. Notification remains pointer-transparent to preserve map interaction. Existing dialog workspace-status stays unchanged.

Verification/convergence: complete; independent final review passed.

Verification: Chromium actual local startup and synthetic long text,1440px/320px, normal and popup-selector states:8 cases pass, no page errors or horizontal document overflow. Short ready notice measures145×29px instead of spanning1132px of desktop map. Long text wraps inside360px desktop/288px narrow (296px popup mode). role=status and pointer-events:none preserved. Receipts .local/notification068-results.json and .local/notification068-{1440,320}.png (ignored). Popup state exercised with a synthetic class-bearing element to isolate the CSS selector, not a fabricated marker-data test. Strict TypeScript/three-entry Vite build passed (.local/notification068-build.log); whitespace check passed. Definition/source review passed; final receipt review passed. Scope stayed CSS-only, no regression suite claim or new source acquisition.
