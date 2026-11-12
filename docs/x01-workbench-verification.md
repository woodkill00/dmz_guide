# X01 workbench verification

The X01 workbench is available at `http://127.0.0.1:5175/x01-workspace.html` while the map server is running. It is a planning aid; source positions and floor connectors are not proof of traversable in-game routes.

| Check | Current evidence | Next owner check |
| --- | --- | --- |
| Source alignment | 13 first-floor and 10 second-floor unique named anchors; automated residual limits and refusal tests pass | Compare named landmarks against screenshots from the current game build |
| Crowded markers | Browser click opens a keyboard-selectable nearby list | Try a crowded safe cluster on a real touch device |
| POIs and photos | Browser test covers save, reload, image, backup and restore | Confirm a personal photo and backup restore in your normal browser |
| Updates | Browser test covers unchanged, added and invalid JSON drafts; apply requires review | Run the capture scripts when providers change and inspect source imagery separately |
| Routes | Unit test covers proximity-based connector hypotheses, missing connectors and access warnings; browser test covers order and persistence | Walk a planned route in X01 and record doors, blocked passages and build number |
| Responsive | Browser tests pass at 1280, 390 and 320 CSS pixels with no horizontal overflow | Test a physical phone and landscape orientation |
| Accessibility | WCAG 2 A/AA and 2.1 AA automated scan passes at 320 pixels; controls have keyboard buttons and labels | Perform screen reader and 200% text zoom checks on physical devices |

To record a gameplay result, select the source marker or private POI, open **Gameplay observations**, enter the match date, game build, outcome and notes, and save. An observation belongs to the player; it does not silently modify the source snapshot or turn a schematic route into a verified road path. The [gameplay worksheet](gameplay-verification.md) provides a longer field checklist.
