# X01 source assessment · 2026-11-11

| Source | Useful X01 evidence | Current treatment |
| --- | --- | --- |
| [Activision Season 1 patch notes](https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes) | Confirms X01 as a new DMZ location, new Orders and an in-world 3D printer | Official existence/scope only; no floor geometry or marker positions |
| [DMZHub X01 map](https://dmzhub.gg/maps/x01-black-site) | User's requested source; indexed page lists two floors, key rooms, bosses and recent map updates | Linked source and ten unplotted key-room references. Direct fetch returns a browser challenge; no bypass or live marker import |
| [COD Central interactive map](https://codcentral.net/blog/mw4-dmz-map/) | Two accessible floor rasters with 48 server-rendered, normalized X01 marker positions | Plotted initial source layer. Exact v4 raster URLs/hashes are pinned; images are local-only and ignored by Git |
| [COD Central X01 access guide](https://codcentral.net/blog/mw4-dmz-how-to-get-into-x01/) | Entrance and deployment context, screenshots | Reference only; no entrance route added to the X01 floor geometry |
| [CODMunity X01 Black Sites](https://codmunity.gg/dmz/map/x01-black-site) | X01 entrance on the Hajin map | Reference only; not a complete X01 floor map |
| [DMZMap X01](https://dmzmap.com/x01/map) | Detailed two-floor layer counts, spawns, connectors, exfils and room descriptions | Comparison candidate; collection and coordinate rights for this new provider have not been resolved |
| [DMZT X01 guide](https://dmzt.app/x01/) | Printer, boss and exfil reference | Comparison candidate; no floor marker import |
| [NOMADS X01 facility](https://nomaddmzhub.com/x01/) | Upper/lower floor images and area overview | Comparison candidate; no image redistribution |

## Alignment decision

Provider grids are not interchangeable. For example, DMZHub lists Audit Room as G4 on its Second Floor, while COD Central places its X01 Audit Room marker in a different source grid/frame. The initial map plots only COD Central coordinates on COD Central's own v4 rasters. DMZHub key-room sectors remain labelled as unplotted source reports. Name similarity does not imply an identical point or floor calibration.

The optional A–J / 0–8 overlay uses COD Central's own floor-stage line percentages (vertical: 9.989, 19.977, 29.966, 39.955, 49.943, 59.932, 69.920, 79.909, 89.898; horizontal: 11.111 through 88.889). It is anchored to the same 1320×1188 raster frame as the captured markers, not a generic ten-by-nine guess.

The 48-point snapshot is a captured provider subset, not an inventory of every X01 location. Boss positions are not plotted from general area descriptions. Roads, cross-floor route edges, access requirements and current-match spawn/exfil state are unknown until separately verified.
