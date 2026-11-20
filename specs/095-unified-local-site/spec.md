# Feature Specification: Unified local guide and maps

Branch `feat/095-unified-local-site` ·2026-11-20 · owner authorized planning and implementation. Existing staged088/093/094 work remains intact; no commit/merge/publication implied.

## User Scenarios & Testing

### US1 / P1: Open one local site

One startup command opens guide, Hajin, X01/both floors, Safe Run and Loot Run on one address. Stopping5175 does not disable them. Restart recognizes the same service without duplicate listeners or silent port changes.

### US2 / P1: Keep saved work safe

Guide inventory/progress remains on4173. Map databases/settings stay separate. The new map address explains recovery from5175; nothing is deleted or silently merged. Explicit legacy startup enables existing validated Hajin/X01 export→preview→restore. A bounded map-only preference transfer covers local run selections/settings. Different browsers/profiles remain distinct.

### US3 / P1: Navigate and plan

Navigation, item/key highlights and reviewed collection/run/boss handoffs use the new namespace with exact sender/window/nonce validation. Refresh/back/forward preserve path/query/hash. Native guide `/maps/` remains its catalog. Unknown routes404 rather than opening the wrong application.

### US4 / P2: Maintain the installation

Missing dependencies/bundles, occupied ports and build failures have actionable messages and retain last-good artifacts. Source updates/references preserve current permission/token/body/path protections. Optional repository authoring stays explicitly on4174. Standalone guide archives and explicit map development remain supported.

## Requirements

- FR01 One owned HTTP listener serves guide and compiled map frontend on127.0.0.1:4173 by default. No normal-use second Vite listener or iframe proxy dependency.
- FR02 Canonical `/map/`, `/map/x01/`, `/map/safes/`, `/map/loot/` plus existing seven HTML entries as map-local aliases; preserve bounded query/hash/tool deep links and native guide routes.
- FR03 Map links/snapshots/terrain/icons/floors/APIs resolve under `/map/`. Stored source identities stay unchanged. Navigation and handoffs retain exact origin/window/nonce checks, never wildcard acceptance or arbitrary proxying.
- FR04 One documented command builds as requested, starts/recognizes the correct service and supports explicit SkipBuild. Ready means both app bundles usable. Unrelated occupied ports are not killed/reused; no port drift. Author stays opt-in.
- FR05 Guide profile/armory/key and map/X01 storage retain names/formats and remain separate. No automatic clear/reset/rebind/ownership inference or load-time source writes.
- FR06 Visible migration guidance preserves old5175 data, gives explicit legacy startup/recovery links and uses existing validated workspace/X01 backups. Map-only preference transfer requires bounded inert validation, target comparison and explicit apply; originals never auto-cleared.
- FR07 Local map imagery/captures remain outside frontend artifacts/guide dist/archive. Serve only finite audited regular assets beneath safe roots; no arbitrary project/private directory exposure.
- FR08 Local source-update/reference APIs keep existing loopback/Host/Origin/token/method/body/path rules and disposal. Updates disabled by default; no newly exposed author API.
- FR09 Failed builds/startup retain prior valid artifacts, explicit recovery ownership and diagnostics. Use fixed local artifact roots and safe existing publication; no cleanup outside verified owned trees.
- FR10 Guide-only archives remain independently runnable. Unified mode explains missing local map installation; standalone map development remains explicit. No new public release/deployment claim.
- FR11 Test canonical/alias/deep routes, security/process/failure cases, namespace isolation, legacy transfer/conflicts and map rendering. Three-engine journeys cover all maps/floors, reload/highlights/handoffs, keyboard/mobile, guide state preservation. Independently analyze/review/fix and record actual receipts.

## Success Criteria

SC01 With5175 stopped, one command serves guide+four maps on4173; terrain/markers and both X01 floors render when installed local assets exist.

SC02 Guide state is unchanged through map use; map saves/reloads are separate. Synthetic legacy workspace/preferences restore only after preview/confirmation, old source untouched.

SC03 Registered map navigation/deep links reach intended maps/tools from either surface, with no root-path asset escape; handoffs reject wrong windows/origins/payloads.

SC04 Occupied ports, missing/corrupt bundles, unsafe paths/methods and failed builds have tested refusal/recovery without private-file exposure.

## Assumptions and Boundaries

Local unification, not hosting/authentication/Git automation. Preserve127.0.0.1 because hostname/port changes storage origin. Author4174 remains separate. Browser storage cannot be moved by a server alone; migration is explicit and retains originals. No new game facts, source collection or redistribution rights inferred. Existing staged predecessor acceptance is historical, not095 proof.

Convergence clarification T011: app and backup formats/DB names are retained; the internal X01 row may use the versioned bounded photo-byte envelope described in contracts/local-site.md, with legacy Blob row compatibility. This is required by reproduced WebKit Blob persistence failure, not a public content-format migration.
