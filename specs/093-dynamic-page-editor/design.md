# Workbench view

Desktop: compact top row with record name, save destination, recovery/saved state, Preview, Undo/Redo, Save to repository and Cancel. Left outline lists sections and a small Add section action. Center shows the actual reader layout with insertion affordances visible only in edit mode. Right inspector shows only the selected block's fields. Reader navigation and essential page identity remain outside the editable canvas.

Below900px of available workbench width (not merely viewport width): Outline / Preview / Fields tabs and one Save bar that respects safe-area inset and keyboard height. At320px controls wrap without hiding Save or covering fields. Controls do not hover over content during ordinary reading. Avoid permanent toolbars on every paragraph; select a block to reveal its actions.

Example mission layout: Overview → Requirements (managed) → Walkthrough with step text and an image after step2 → Locations (linked map cards) → Tips (callout) → Rewards (managed) → Sources. Example item: Summary → Pictures → Loot locations → Used in recipes/upgrades/Orders (managed links) → Personal-author guide notes → Sources. Example upgrade: Current tier and requirements → Illustrated guide → Prerequisites → Related items → Sources. Templates are starting layouts; the user can add/reorder sections and mixed text/image groups.

Field panels distinguish factual fields from presentation. Choosing a managed requirement table opens canonical requirement rows; it does not create a second table of manually typed quantities. Unknown values stay unknown. Every image placement offers caption/alt, replace/select library, crop, fit and focal controls. Add image appears at each block boundary, including between mission steps. Move controls offer up/down and choose destination in addition to drag handles.

Save states are distinct: Unsaved changes → Recovery draft stored → Validated preview → Saving → Saved to repository → Rebuild needed. Return to saved preview never shows unsaved fields as committed. Stale conflict offers compare/export/reload; overwrite is not the default. A failed photo upload leaves the previously selected placement intact.
