# Android Chrome and TalkBack testing

**Status: deferred by owner on 2026-11-28. Physical touch and TalkBack are not tested.** Resume when convenient; no device setup is required now. This is feature112 task T013.

Desktop browser emulation and automated accessibility checks have passed. This task separately checks the real phone's navigation, readability, tracking, maps and spoken feedback.

## 1. Start the site on the PC

Open PowerShell in the project folder and run:

```powershell
cd C:\Users\theju\Documents\coding\MW4
npm run local
```

If the site is already running, leave that process running instead of starting another copy. Confirm **http://127.0.0.1:4173/** loads on the PC. Keep the PC and local service running during testing.

## 2. Connect the phone by USB

1. Connect the Android phone with a USB cable that supports data transfer.
2. On the phone, open **Settings → About phone** and find **Build number**. Some phones place it under **Software information**.
3. Tap Build number seven times to enable Developer options. Enter the phone's unlock code on the phone if requested; do not put it in chat or the repository.
4. Open **Developer options** in Settings and enable **USB debugging**.
5. Accept the USB debugging prompt on the phone. Keep it unlocked during connection.
6. Open **Google Chrome on the PC** and enter `chrome://inspect/#devices`.
7. Enable **Discover USB devices** and confirm the phone appears.
8. Click **Port forwarding** and add this mapping:

   | Port | IP address and port |
   | --- | --- |
   | `4173` | `127.0.0.1:4173` |

9. Enable port forwarding. Leave desktop Chrome open.
10. On the phone, open a Chrome **Incognito tab** at **http://localhost:4173/**. Confirm the homepage loads.

This forwards only the guide service through USB. No LAN binding, firewall change, public deployment or authoring-port forwarding is needed. Official reference: [Chrome USB port forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/local-server).

If the phone is missing, check the cable, unlock it, accept the debugging prompt and reconnect. If the page will not open, check the PC homepage first, then the exact forwarding mapping. Record the blocked step rather than marking a test passed.

## 3. Use temporary test progress

- Keep testing in the phone's Incognito session. Do not import, reset or restore your real inventory or desktop profile.
- Use temporary quantities and completion marks. Keep the same Incognito session open for reload/navigation checks; closing all Incognito tabs can discard its data.
- Test portrait and landscape, then repeat important controls with enlarged Chrome text using the largest readable setting available on the phone.

## 4. Touch checklist

Reach each area through the site's menus to test the links too. Use the official starter catalog where a catalog choice is available. Check rows only after observing the expected behavior.

- [ ] **Home/navigation:** open Track, Orders, Weapons and each map. Expand/collapse menus and use Back. Text/actions remain readable, reachable and free of overlap.
- [ ] **Inventory/collection:** search Control Unit, set a temporary quantity of 2 and Save. Check Needed/Quick collect use that stock. Add 1 found through Quick collect; return to Inventory and reload. Quantity should be 3.
- [ ] **Upgrades:** expand a tier group, read ingredients and open their links. Try the completion control. If a confirmation appears, test Cancel first, then completion. Saved state remains after navigation/reload.
- [ ] **Orders:** open Hajin Page 1 and Gear Up, read every instruction and check a part/Order. Confirm directory/dashboard agreement after navigation/reload. Open the separate X01 directory and an individual Order.
- [ ] **Weapons:** expand a weapon type, toggle a temporary manual-owned state, use extraction +/−, then reload. Open camo instructions and mark a temporary completion. Weapon/dashboard views agree.
- [ ] **Hajin map:** tap different marker types, pan/zoom and scroll long details. Details remain selected until explicitly dismissed or another marker is selected. Controls stay reachable; the popup does not flicker away.
- [ ] **Safe/Loot Run:** select/deselect stops, reorder and try route controls. Visible route/stop order agree. Unknown safe access remains labeled unknown.
- [ ] **X01:** switch both floors, inspect a marker on each and toggle Hidden rooms. Room 202 stays on floor1. Details/layer controls are readable. Source alignment does not certify gameplay positions or traversable routes.
- [ ] **Sizing/keyboard:** repeat menus, quantity entry, completion controls and map details in portrait/landscape and enlarged text. Report clipped labels, horizontal page overflow, nested scroll traps, jumping controls or inputs covered by the keyboard.

## 5. TalkBack checklist

1. Finish the basic touch checks first.
2. Open **Settings → Accessibility → TalkBack**. Read its tutorial and how to turn it off before enabling it.
3. Enable TalkBack and return to the phone's Chrome test tab. Follow the phone's gestures; typically one-finger swipes move focus and a double-tap activates the focused control.
4. Perform the checks below and record unclear or missing spoken information.

- [ ] Navigate by headings/landmarks and identify the page.
- [ ] Menus announce expanded/collapsed states.
- [ ] Quantity and +/− controls identify the item and action.
- [ ] Ownership/completion checkboxes announce their checked state.
- [ ] Order/camo instructions are reachable without hover.
- [ ] Save a temporary change and hear a usable result/status announcement.
- [ ] Open/dismiss a confirmation; focus enters it and returns to the initiating control.
- [ ] Use the map's searchable marker list and buttons to reach location details.

Official help: [Chrome with TalkBack](https://support.google.com/accessibility/android/answer/2633135) and [TalkBack reading controls](https://support.google.com/accessibility/android/answer/6007066). An automated accessibility tree does not replace these spoken/device observations.

## 6. Record results

Use **pass**, **fail**, **blocked** or **not tested** for each area. Successful setup does not complete the checklist.

```text
Date:
Phone model:
Android version:
Chrome version:
TalkBack version (if tested):
Repository commit tested (PC: git rev-parse --short HEAD):
Phone address: http://localhost:4173/
Portrait/landscape tested:
Text-size setting:
Touch results by area:
TalkBack results by area:

Issue/page:
Steps to reproduce:
Expected behavior:
Observed behavior or spoken announcement:
Retest result after a fix:
```

Share the results with the assistant for diagnosis and receipt updates. Do not commit device serial numbers, account details, passwords, personal inventory exports or private screenshots. Leave untested areas marked not tested.

## 7. Disconnect

1. Turn TalkBack off using the method in the phone's tutorial if enabled only for testing.
2. Close temporary Incognito tabs when test progress is no longer needed.
3. Disable/remove the 4173 forwarding entry in desktop Chrome and disconnect USB.
4. Disable USB debugging if no longer needed.
5. Update the task index/results to reflect actual observations; unresolved tests stay failed, blocked or not tested.
