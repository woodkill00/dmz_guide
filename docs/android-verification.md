# Android and TalkBack verification

This is actual-device acceptance, separate from desktop viewport/touch emulation and Axe. Record observed results; an unconnected phone is **not tested**. The desktop's private inventory stays in its own browser. Do not import or restore that profile for these tests.

## Connect the loopback site

1. Keep `npm run local` running on the PC at http://127.0.0.1:4173/.
2. Enable Developer options and USB debugging on Android, connect by USB, and accept the debugging prompt on that phone.
3. Open desktop Chrome at `chrome://inspect/#devices`, enable **Discover USB devices**, then **Port forwarding**.
4. Forward device port **4173** to **127.0.0.1:4173** and enable forwarding.
5. On Android Chrome open **http://localhost:4173/**. Use a fresh Incognito session for synthetic quantities and progress. Keep that session open for reload/navigation checks.

Only forward the guide port; repository editing does not need to run for acceptance. This approach keeps the existing service on loopback and needs no LAN binding, firewall change or public deployment. Chrome's [USB port-forwarding instructions](https://developer.chrome.com/docs/devtools/remote-debugging/local-server) cover device discovery and troubleshooting. Disconnect USB/disable forwarding when finished.

## Touch journeys

Use the official starter catalog, synthetic data only. Test portrait, landscape and the largest readable Chrome text setting. Report any cropped label, unreachable action, nested scroll trap, jumping page or keyboard-covered input.

| Journey | Action and expected observation |
| --- | --- |
| Home/navigation | Open Track, Orders, Weapons and each map from the menu; Back returns to a usable page. Menus open/close without covering the active control permanently. |
| Inventory/Needed | Search Control Unit, enter2 and Save. Navigate to Needed/Quick collect; their shortage reflects the same stock. Add1 found through Quick collect; Inventory then shows3 after reload. |
| Upgrades | Expand a tiered group, inspect ingredient cards and operate its current completion control. Confirm/cancel remain reachable. Complete one synthetic upgrade and verify its checked state after navigation/reload. |
| Orders | Open Hajin Page1, expand Gear Up and read each task. Complete one part, then the Order; confirm the dashboard and directory agree after Back/reload. X01 has a separate five-page directory. |
| Weapons | Open a type group, use manual extraction +/− and verify the count persists after reload. Open current camo instructions and mark a synthetic completion; weapon and dashboard views agree. |
| Hajin/Safe/Loot | Tap markers, then pan/zoom. Details stay selected until explicitly dismissed or another marker is selected. Select/deselect route stops and change order; visible route/stop order agree. Unknown safe access must remain labeled unknown. |
| X01 | Switch both floors, inspect a marker on each, and toggle Hidden rooms. The first-floor Room202 entry stays on floor1; source-alignment diagnostics are not a gameplay guarantee. |

## TalkBack

Use Android Settings → Accessibility → TalkBack and its tutorial. Navigation/gestures vary by version; follow Google's [Chrome and TalkBack guide](https://support.google.com/accessibility/android/answer/2633135) and [reading controls](https://support.google.com/accessibility/android/answer/6007066).

Verify heading/landmark navigation, menu expanded/collapsed announcements, explicit names for quantity and +/− controls, checkbox checked states, instructions reachable without hover, Save/result announcements, dialog focus and return focus after closing. Use the map's searchable marker list as well as map buttons. Single-finger swipe moves focus; double-tap activates the focused element. Record actual spoken omissions or confusing labels; an accessibility-tree snapshot alone does not prove these work.

## Record results

Record device model/Android/Chrome/TalkBack versions, date, tested source revision, journey, portrait/landscape/text setting, observed result and reproducible failures. No serial numbers, accounts, personal inventory exports or private screenshots belong in public receipts. Until observed, mark physical touch and TalkBack **pending**. Do not replace them with passing desktop emulation.
