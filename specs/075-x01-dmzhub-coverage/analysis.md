# Pre-implementation analysis

- Existing X01 page plots 48 COD Central positions only. DMZHub public map metadata reports 76 first-floor and 49 second-floor features, including categories absent from COD Central such as safes, weapon lockers, corpses, hidden entrances and bosses.
- DMZHub's public API requests returned HTTP 200 in a headed local Playwright browser. The same endpoints returned HTTP 403 to direct PowerShell/headless requests. Capture uses the normal site page and its public API without challenge bypass.
- DMZHub tile metadata declares a 4096×4096 image, two distinct surface IDs, and normalized marker positions. COD Central uses a separate 1320×1188 frame. A shared position transform is not established.
- DMZHub category icon URLs are public WebP assets. Raw API payloads and raster/icon copies remain ignored; a bounded sanitized snapshot is suitable for review.

## Convergence

- An initial capture rejected feature 718 because it assumed every geometry was a point. Eight features use bounded LineString geometry (mine traps, hidden entrances and Wheelson path); the importer and viewer now validate and display those paths with selectable markers.
- The first visual pass showed the whole 4096-square tile sheet with excessive margins. The viewer now fits the provider's own grid frame for the initial view and Fit floor action; all captured points remain inside it.
- A 390px screenshot showed a cropped facility despite Fit floor: the old minimum zoom of -2 could not fit a 4096-square source frame in a phone viewport. The DMZHub view now permits -4; a fresh 390px screenshot shows the full facility without horizontal page overflow.
- The COD Central page's earlier "direct collection unavailable" wording was corrected and links to the separately aligned DMZHub view.
