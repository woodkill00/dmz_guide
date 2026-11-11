# DMZHub X01 capture · 2026-11-11

Source page: https://dmzhub.gg/maps/x01-black-site

The public page's browser requests returned metadata from `https://api.dmzhub.gg/api/v2/maps/x01-black-site` and complete feature feeds for `x01-1st-v1-wm` and `x01-2nd-v1-wm` with `meta.truncated=false`. The capture contains 76 first-floor and 49 second-floor features in 21 categories. The source declares a 4096×4096 image for each floor and normalized feature coordinates. Eight features have LineString geometry; the rest are points. Category icons and floor tiles were downloaded only to ignored local paths for the owner's viewer. The checked-in snapshot contains sanitized feature IDs, categories, names, coordinates, icon basenames and line geometry, not user or account data.

| Category | First floor | Second floor |
| --- | ---: | ---: |
| Key Room | 6 | 4 |
| Exfil | 3 | 1 |
| Emergency Exfil | 1 | 2 |
| Player's Spawn | 7 | 8 |
| Safe | 7 | 0 |
| Weapon Locker | 10 | 7 |
| Corpse | 4 | 0 |
| Ammo Armor cache | 6 | 4 |
| Stairs | 9 | 9 |
| Ascender | 4 | 3 |
| Other categories, including labels and services | 19 | 11 |

The category counts in the application are calculated from the committed snapshot, not this table. COD Central's 1320×1188 raster and DMZHub's 4096×4096 tile frame are not interchangeable. No cross-provider duplicate is removed without a reviewed geometric transform or player verification. A source capture is evidence of what the site reported on this date, not proof that every marker is present in every match.
