# Modern workspaces preview

The modern presentation is an opt-in local preview. Default rollout flags remain legacy while acceptance checks are completed. Existing pages keep the variant they loaded.

In PowerShell, build the Guide preview with:

```powershell
$env:DMZ_UI_VARIANT = 'modern'
npm run build
npm start
```

Start the separate map with the same environment setting in another terminal:

```powershell
$env:DMZ_UI_VARIANT = 'modern'
npm run map:dev
```

Restart any already-running local service with the modern setting to preview that surface. Rebuilding the Guide alone does not switch a running Map, Studio or Manager. Keep any unsaved work in its current tab until it is saved or deliberately cancelled.

Studio and the weapon manager also accept the same setting. They keep their original ports, repository operations and data ownership. Starting the Guide does not start the other services.

Home, Map, DMZ Guide, DMZ FOB and DMZ Weapons are the primary sections. Search covers public reference material; map locations and private workspace search are separate scopes. Tools / All features retains the full directory. Menus and links also have a native no-JavaScript path where their feature supports it.

On the map, **Map view** gives terrain space and **Task view** restores the task. Small or short windows use a single view; very constrained windows allow normal page scrolling. Task changes keep original controls rather than copying forms. Marker details use the task region; Back returns to the originating task or marker where it still exists.

Save/Discard/Stay protects the active draft. Save waits for the owning controller's confirmed storage result. A slow or uncertain result is not permission to submit again. Use the stated status/recovery action; existing failed drafts and backups remain owned by their original workspace. Workflows that require a preview retain that review step.

Density affects display spacing only. Invalid saved display preferences are preserved and use a usable session fallback. The Guide, main map, Safe runs, Studio and manager do not automatically share profiles or backups.

Remove the override to use the configured defaults:

```powershell
Remove-Item Env:DMZ_UI_VARIANT
npm run build
```

Run the scoped automated suites against an already-built modern reader with `npm run test:ui:modern`, or the map-only suites with `npm run test:ui:map`. The runner uses disposable browser profiles and synthetic fixtures, runs owning services serially, and does not rebuild a reader while tests are using it. These suites do not replace the separately documented manual and performance gates.


When the map and left menu fit side by side, drag the grip on the menu’s right edge to resize it. Focus the divider and use Left/Right arrows for16px steps, Shift+arrows for64px, or Home/End for the allowed limits. The map keeps usable terrain space and remembers your width in this browser. Temporary viewport constraints clamp the displayed width without replacing that preference. Full task, Half, Peek and narrow layouts hide the horizontal divider.


**All map categories** groups imported markers by type, such as Keys, Locations, Safes and Fortresses. A type checkbox controls its represented source categories; a mixed checkbox means some are enabled. Named sites and original provider labels remain in the website sections for detailed checks. Unmapped types are grouped under Other. Show all / Hide all still applies to the whole relevant section.


The map key starts with compact Grid and Show all / Hide all controls. Its short source-marker count has an info button for full coverage, duplicate, alignment and custom/reviewed counts. Updates opens Check sources / Review staged; opening that menu does not run a check. Busy, unavailable, error and recovery feedback remains visible. Escape closes the info or update disclosure first; details expand in the menu rather than covering the map.


**Safe Run map** is a separate page at http://127.0.0.1:5175/safes.html. Open it from the main map toolbar, Home quick tools or the map startup page. The toolbar link opens a new tab so the main-map draft stays in place. Choose a reported spawn or manual start, include/exclude safes, then optimize or manually reorder stops. Safe Run keeps its own saved plan and road worker; road mode uses only its available local road file, with gaps labelled. The Main map link returns to the normal viewer. At narrow widths, use Map view / Plan safe run to switch between its terrain and controls.
