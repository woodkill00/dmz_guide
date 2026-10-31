# Review the proposed design
Local concept preview: http://127.0.0.1:5181/design-preview.html (separate loopback-only planning server, not the production guide/map).

Switch Inventory/Upgrades, light/dark theme or density; expand the first sample's Details or resize the window. All values are fictional. Quantity/purchase controls only explain their intended future workflow; nothing is saved.

If the preview server has stopped, from the repository root:
```powershell
py -3 -m http.server 5181 --bind 127.0.0.1 --directory specs/043-refined-upgrades-inventory
```
Alternatively open design-preview.html directly in your browser. PNG concepts are also saved here for static review. Read plan.md/spec.md/contracts/ui.md for implementation scope and planning-validation.md for exact concept checks. I001–004 remain pending; existing application screens are unchanged.

Grouped preview: filter or collapse item sections. On wide screens inspect Recipes/Upgrade uses/Mission uses/Crafts; +N expands extra sample links. On smaller screens choose Uses to reveal those lists. Sample links open a fictional reference dialog and do not change stock or progress.
