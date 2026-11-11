# Gear section label

2026-11-08 · feature071 / quick-entry. User requests Equipment be named Gear. The item-type label already used Gear, but the outer family heading and Needed family/filter still displayed the internal Equipment key.

Scope/plan: use the existing presentation alias for those visible family headings, list accessibility names and Needed category option text. Retain internal group/filter keys, source metadata, item IDs, section order, quantities and blueprint flags; no migration or storage write. This is a label-only parity repair, not a taxonomy rewrite. Add a real-browser outer-header assertion to the existing ordering journey, then run it and the existing Needed layout regression. Reviewer-owned checklists remain unchanged; no independent approval/skill invocation is claimed.

Implementation: Inventory's outer category heading now displays Gear. Needed's outer family heading, list label and chooser display Gear as well. Internal Equipment values remain compatible with existing filters and collapse controls. Verification follows below.

Verified: the live ordering journey asserts the outer Inventory header is Gear and passes ordering/filter/draft checks (`.local/quick-entry/gear-label-browser.log`). Existing Needed layout/model-parity, category filters, quantity/blueprint preservation, both themes and narrow/short viewport checks passed (`gear-label-needed.log`). Formatting and repository checks passed; whitespace check has only pre-existing line-ending notices. Modern build succeeded with 1516 routes plus 404 (`gear-label-build.log`). No production code changed after verification and no actual player profile was edited.
