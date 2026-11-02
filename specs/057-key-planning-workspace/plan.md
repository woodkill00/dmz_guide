# Implementation plan

057 extends the existing static key directory and detail routes. The public catalog remains build-time JSON; private progress lives in a new, isolated IndexedDB database. No existing profile, inventory, armory or map records migrate.

- FR001: pure state validation and bounded backup format in `src/domain/key-workspace.mjs`; revision-checked atomic writes, previous snapshot and explicit recovery in `src/storage/key-store.mjs`; serialized UI saves and stale-operation guards in `src/client/key-workspace-ui.mjs`.
- FR002–003: exact use-ID dependency chains drive readiness and topologically ordered trip packing. Unknown durability and source uncertainty remain visible; no automatic consumption.
- FR004: grid-only links open the companion map. Its calibrated tactical grid determines highlighted bounds. Unknown door coordinates stay unknown.
- FR005–006: room facts and all sixty source-comparison outcomes are independently validated. Preserve original Game8 records, images and player-reported hospital dependency. Conflicting grids, identity and core-count reports remain separate.
- FR007: native grouped tables/details work without JavaScript; private controls enhance them. Compact mobile cards, sticky filters, explicit labels and persistent density support smaller screens.

Verification: pure state/hostile import/catalog tests; real browser IndexedDB CAS/recovery/failure tests; complete private journeys and original image/navigation regressions in Chromium, Firefox and WebKit; narrow and 200% layouts; axe checks in both themes; companion grid parser/calibration and real viewer checks; repository runtime suite and builds; independent review and repair cycle.

Risks: browser storage is not a backup; source reports are unverified; map links require the local companion service. Recovery fails closed if damaged records exceed bounded export/history limits. No remote publication is part of this feature.
