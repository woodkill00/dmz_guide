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
