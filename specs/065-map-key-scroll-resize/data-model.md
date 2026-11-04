# Data Model: Map Key Scrolling and Resizing

This repair introduces no persistent or domain data.

The divider's current control-section size is ephemeral presentation state for the open page. Its lower and upper bounds are derived from the current sidebar dimensions and the minimum visible space reserved for each section. Reloading starts from the responsive default; no local storage, IndexedDB, map-layer selection, or backup format is changed.
