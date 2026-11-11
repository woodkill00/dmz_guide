# Plan

1. Map only equivalent X01 category types to existing Hajin category IDs. Choose the official Hajin Exfil and Ammo Armor Cache icons, COD Central Hajin Safe/Bounty/Key icons, and MapGenie Hajin Spawn icon. Do not relabel or merge categories.
2. Read the local current-capture pointer and only the selected providers' category metadata, with bounded reads and exact local path validation. Return no icon if unavailable.
3. Render matching X01 markers in the same pin shape and icon size as Hajin; use the selected icon in category controls. Preserve the existing X01 icon fallback and all selection behavior.
4. Test mapping, validation, fallback, map selection and category controls in both X01 views, then inspect desktop/mobile visuals and run relevant build/browser gates.

Alternative considered: copy the currently downloaded Hajin images into the X01 asset folder. Those files are generation-specific and local-only; copying them would drift after a Hajin source refresh. Dynamic local lookup keeps one active icon asset per type.
