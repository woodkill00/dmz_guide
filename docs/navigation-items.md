# Navigation, site map and items

After rebuilding and starting the guide, use **Items** in the shared navigation bar for the compact item directory. Choose a content pack or **All packs**, then search, filter by type and sort by name, type or evidence status. Catalog groups remain separate and fictional examples are labeled. Detail links open the exact stable record. Private browser records stay in the separately labeled private reader/editor.

**Site map** lists guide workspaces and all bundled public content records, grouped by catalog. Protected spoiler titles stay masked. Selected catalog identity follows same-origin workspace navigation; item details retain their owning catalog even if a mismatched pack query was added to the address.

**Edit** and **Remove** are local repository-authoring actions, not public website mutation or player-inventory controls. They open exact-record instructions. Start Content Studio with `npm run author`, then use the provided local link. Remove opens a preview: references block removal, Cancel leaves the draft unchanged, and confirmation only removes from the unsaved draft. Validation and a separate **Save to repository** are still required. Existing recovery and Git review apply. Nothing is automatically committed or published.

The **Local map workspace** destination explains the separate Hajin application and its default address. Start it explicitly with `npm run map:install` and `npm run map:dev`. Its private data and the guide's inventory are not synchronized. The external map link does not carry private context. Manual waypoints, incomplete roads and pixel distances are not live game GPS or verified travel measurements.

All bundled item rows remain readable without JavaScript. Filtering and sorting require JavaScript. On narrow screens the item identity and action links stack rather than creating a wide table.

## Main menu and map tools

**Boss checklist** is a direct Main navigation link on the guide, map, map handbook and Content Studio. **More** groups guide pages/authoring, map workspace tools, and map planning/trackers. It includes POIs, icon studio, source layers/updates, backups, routes, missions, collections, Match mode, reference library, search, accuracy and the remaining planner sections. The Site map lists those tool destinations too, alongside all public catalog records.

Map-tool and cross-application links open a new tab to preserve your current unsaved form and map view. Local map/guide/Studio servers must already be running on their documented ports; navigation never starts them or collects/applies an update. Tool URLs carry only fixed navigation targets, not private boss IDs, counts, notes or the current page's query/hash. Guide links retain only the existing bounded catalog identity. Menu links remain visible without JavaScript; opening interactive tools requires JavaScript.

On narrow guide/Studio pages, More expands in the page with a bounded scrolling list, so keyboard users can reach the final link even at200% text size. The map/handbook retain their bounded More overlay. The shared authored registry is `src/ui/map-destinations.json`; its tool IDs must match the strict map link parser. Add a panel there and keep coverage tests passing when extending navigation.
