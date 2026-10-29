# Navigation, site map and items

After rebuilding and starting the guide, use **Items** in the shared navigation bar for the compact item directory. Choose a content pack or **All packs**, then search, filter by type and sort by name, type or evidence status. Catalog groups remain separate and fictional examples are labeled. Detail links open the exact stable record. Private browser records stay in the separately labeled private reader/editor.

**Site map** lists guide workspaces and all bundled public content records, grouped by catalog. Protected spoiler titles stay masked. Selected catalog identity follows same-origin workspace navigation; item details retain their owning catalog even if a mismatched pack query was added to the address.

**Edit** and **Remove** are local repository-authoring actions, not public website mutation or player-inventory controls. They open exact-record instructions. Start Content Studio with `npm run author`, then use the provided local link. Remove opens a preview: references block removal, Cancel leaves the draft unchanged, and confirmation only removes from the unsaved draft. Validation and a separate **Save to repository** are still required. Existing recovery and Git review apply. Nothing is automatically committed or published.

The **Local map workspace** destination explains the separate Hajin application and its default address. Start it explicitly with `npm run map:install` and `npm run map:dev`. Its private data and the guide's inventory are not synchronized. The external map link does not carry private context. Manual waypoints, incomplete roads and pixel distances are not live game GPS or verified travel measurements.

All bundled item rows remain readable without JavaScript. Filtering and sorting require JavaScript. On narrow screens the item identity and action links stack rather than creating a wide table.
