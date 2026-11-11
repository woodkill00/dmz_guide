# Pre-implementation analysis

- DMZHub X01 page is indexed with floor, key-room and update summaries, but direct fetch returns a browser challenge. Importing its live marker payload is blocked; the app links to the source without circumventing that control.
- COD Central exposes two X01 raster URLs and server-rendered marker coordinates. The raster and marker positions use the same provider frame and can be plotted together. Its 48 marker buttons form a partial source snapshot, not a complete X01 inventory.
- DMZHub's key-room grid references differ from COD Central for several names. Matching by name plus floor alone is insufficient to merge or move pins. The first release keeps DMZHub as a reference link and does not plot those uncalibrated coordinates.
- Existing Hajin workspace records have fixed `hajin` applicability; opening X01 in a separate page preserves their storage and backups. No shared map migration is needed for this slice.

## Convergence review

- The first desktop visual check found duplicate Leaflet and custom zoom buttons. The native Leaflet control is now disabled; the custom controls remain keyboard accessible.
- Search matches descriptions as well as names, so a query can return related rooms in addition to the named target. The browser journey selects the named printer result rather than asserting one result.
- Missing local imagery has an explicit setup message and keeps the marker list available; the browser journey simulates the 404.
- DMZHub live point import, cross-provider pin deduplication, custom X01 points and cross-floor road routing remain outside this initial slice. The provider challenge and grid conflict are recorded in `sources.md`; no coordinates are guessed or silently merged.
