# Assessment and analysis

Confirmed structural cause: `.picker-card-heading` and `.picker-identity` put the full weapon name, Prestige and Manual controls in a competing flex header; extraction wording occupies a separate row. Existing camo actions use an auto-width column that also competes with labels. Shared item cards lack a universal explicit single shrinkable grid column.

Pre-implementation consistency: R1–R3/R5 map to T2 and retained data attributes; R4 maps to T3; native geometry/actions and unchanged durable state map to T4. Native help avoids a new persistence owner. Unknown extraction counts must remain `—/3`, not invented zero. No unresolved game semantics, rights or storage changes are introduced.

Final convergence: narrow/200% failures exposed inherited fieldset padding and unbroken item metadata; both were repaired without clipping text. Independent review findings about accessible count labels and help dismissal scope were resolved, and the reviewer recorded acceptance in review.md. Requirements, tasks and final browser/runtime receipts agree; no unresolved findings remain within this repair. See verification.md for the tested scope and local service result.
