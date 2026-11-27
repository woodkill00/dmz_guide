# Card reflow repair

The weapon name currently competes with ownership controls in one flex header. Narrow cards squeeze names and can extend descendants beyond their boundaries. This is a bounded refinement of109 FR02/FR03/FR06/FR07/FR13, using the manual repair lifecycle; no optional extension command is claimed.

- R1: Give the weapon name its own full-width first row.
- R2: Put Prestiged and Manual checkboxes, compact manual-extraction count and existing minus/plus actions on the following row. Allow natural wrapping when that row cannot fit. Preserve unknown counts as unknown.
- R3: Keep normal and Prestige camo rows and their existing details/completion controls below ownership.
- R4: Long labels on weapon and shared item cards reflow within the actual card width, including intermediate widths and200% text. Do not hide names, truncate counts or add horizontal card scrolling.
- R5: Count hover explains successful manual extractions toward three. Provide equivalent keyboard/touch help, dismissal and descriptive accessible text. Viewing help performs no save. Existing ownership/progress/persistence/recovery semantics stay unchanged.

Scope: shared weapon-card renderer/controller/styles, shared item-card containment, and reusable-card follow-through described in [sitewide.md](sitewide.md). No game facts, data imports, routes or storage schema changes. The same weapon renderer serves the dashboard and weapon picker.
