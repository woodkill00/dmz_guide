# Rollout, variant identity and preservation-test contract

## Authoritative flags / activation

New trusted repository config `src/ui/presentation-flags.json` has schema version1 and exactly five surface IDs: `guide`, `map`, `safe-runs`, `studio`, `manager`; each value is `legacy` or `modern`. All begin `legacy`. This is build/startup configuration, NOT player storage, URL parameters, cookies or an account setting. Invalid/missing required records or unknown values fail preparation with existing retained-build/startup error behavior, never silently mount a different variant.

Precedence: validated process-local `DMZ_UI_VARIANT=legacy|modern` override (test/explicit local preview startup only), then repository surface record. No value means the repository record. An explicitly set invalid override fails preparation rather than falling back. It does not authorize a deployment or provider job. Each guide build/static renderer and map Vite/Studio/Manager startup resolves configuration once, emits consistent local assets/config, and does not dynamically switch an active editor. Changing a flag requires rebuild/restart/reload for that surface; old loaded page remains on its original variant until deliberate reload. Service origins/databases stay unchanged.

Guide no-JS reference output is rendered in its selected variant at build time. Map/safe help and startup fallback remain honestly available without functional Leaflet. Runtime cannot opt into modern using an unaudited query/localStorage flag. Themes/density preferences never override rollout configuration.

Emit immutable root markers `data-ui-surface`, `data-ui-variant`, `data-ui-contract=071-v1`; set `data-ui-mounted=071-v1` only after actual redesigned adapter mount succeeds. Requested and effective variant, active adapter/feature ID, source build/hash and origin are part of each receipt. Invalid override/missing adapter/wrong scope must fail a modern test, not produce a passing legacy screenshot. Static/no-JS evidence uses rendered surface/variant/contract without falsely claiming JS mount. Code must not set mounted marker before required host/handlers are ready.

## Legacy fallback ownership

During incremental migration an unmigrated tool keeps its exact legacy handler behind a declared adapter map. If its content fits the single host, mount only that content with one active form and label its effective tool adapter `legacy-content`. If it requires the full old workspace/dialog layout, suspend/unmount the modern workspace first and set active owner `legacy-fallback`; never stack the old UI beneath another modern pane. Guards run before either transition; Return to workspace preserves task/domain context. Root markers and receipts explicitly identify fallback. A successful fallback is not evidence that the tool's modern layout passed.

Each story gate has a fixture declaration of expected migrated surfaces/feature IDs and temporary fallback IDs. US2 default promotion requires all mapped map-tool adapters from T031 to use the accepted host or a specifically reviewed retained-content adapter with modern geometry; full legacy-workspace fallbacks must be zero for a claimed completed map redesign. Unsupported targets never become blank modern panels.

## Test modes and assertion preservation

Run existing baseline suites with `DMZ_UI_VARIANT=legacy` and assert effective legacy mode. Keep legacy066split-pane resize geometry as a baseline behavior; it is intentionally replaced by the approved modern single-body layout, not silently called passing in modern mode. New071suites explicitly opt into modern and assert effective mounted contract/feature identity before interaction. Reuse domain fixtures/numeric/source/storage/safety assertions against modern adapters. Retire/replace only intentionally changed presentation geometry with a documented old→new mapping and independent approval; never weaken data/focus/camera/draft/worker guards. T003preservation ledger owns that mapping.

Registry/static admission tests and browser target activation are different gates. `tests/browser/ui-feature-coverage.mjs` opens every allowlisted77target plus explicit nested author/manager/generated families in synthetic contexts, asserts the requested scoped handler identity/variant and safe Back/unavailable state, and executes no mutation/import/check/apply actions. Stub local fixtures/health/provider endpoints and block unapproved egress. Controlled fixture bootstrap may initialize stores; compare seeded domain values/revisions after readiness and nonmutating entry rather than pretending initialization is zero writes. No owner profile or source imagery is used.

## Promotion / rollback

T070may change ONLY independently accepted surface records from legacy to modern after their manual/automated and rollback gates; no process override is a committed default promotion. Rollback changes the same surface record back, rebuilds/restarts and reloads deliberately, leaving original preference bytes and domain records untouched. Tests prove both variants/effective identities. No toggling or server restart is allowed to bypass unresolved commits, missing recovery or a dirty-departure warning. Preserve source/build identity and CSP in both variants.
